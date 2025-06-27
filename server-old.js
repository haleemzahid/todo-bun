import { Database } from "bun:sqlite";
import { serve } from "bun";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import index from "./public/index.html";
import auth from "./public/auth.html";
import profile from "./public/profile.html";

// Initialize SQLite database
const db = new Database("todos.db");

// Create users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    profile_picture TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create sessions table for authentication
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create todos table with user association
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Authentication helper functions
async function hashPassword(password) {
  return await Bun.password.hash(password);
}

async function verifyPassword(password, hash) {
  return await Bun.password.verify(password, hash);
}

function generateSessionId() {
  return crypto.randomUUID();
}

function getSessionExpiry() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7); // 7 days from now
  return expiry.toISOString();
}

// Middleware to check authentication
function requireAuth(sessionId) {
  if (!sessionId) {
    return null;
  }
  
  const session = getSessionQuery.get(sessionId);
  if (!session) {
    return null;
  }
  
  // Check if session is expired
  if (new Date() > new Date(session.expires_at)) {
    // Clean up expired session
    deleteSessionQuery.run(sessionId);
    return null;
  }
  
  return session;
}

// Prepared statements for users and sessions
const createUserQuery = db.query("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id, username, email, created_at");
const getUserByEmailQuery = db.query("SELECT * FROM users WHERE email = ?");
const getUserByUsernameQuery = db.query("SELECT * FROM users WHERE username = ?");
const getUserByIdQuery = db.query("SELECT id, username, email, profile_picture, created_at FROM users WHERE id = ?");
const updateUserUsernameQuery = db.query("UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING id, username, email");
const updateUserPasswordQuery = db.query("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
const updateUserProfilePictureQuery = db.query("UPDATE users SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");

const createSessionQuery = db.query("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?) RETURNING *");
const getSessionQuery = db.query("SELECT s.*, u.id as user_id, u.username, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ?");
const deleteSessionQuery = db.query("DELETE FROM sessions WHERE id = ?");
const cleanupExpiredSessionsQuery = db.query("DELETE FROM sessions WHERE expires_at < datetime('now')");

// Prepared statements for todos (updated with user_id)
const getAllTodosQuery = db.query("SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC");
const getTodoByIdQuery = db.query("SELECT * FROM todos WHERE id = ? AND user_id = ?");
const createTodoQuery = db.query("INSERT INTO todos (user_id, text) VALUES (?, ?) RETURNING *");
const updateTodoQuery = db.query("UPDATE todos SET text = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING *");
const deleteTodoQuery = db.query("DELETE FROM todos WHERE id = ? AND user_id = ?");
const toggleTodoQuery = db.query("UPDATE todos SET completed = NOT completed, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING *");

// Clean up expired sessions on startup
cleanupExpiredSessionsQuery.run();

const server = serve({
  routes: {
    // Serve the HTML pages
    "/": index,
    "/auth.html": auth,
    "/profile.html": profile,
    
    // Authentication Routes
    "/api/auth/register": {
      async POST(req) {
        try {
          const { username, email, password } = await req.json();
          
          // Validation
          if (!username || !email || !password) {
            return Response.json({ error: "Username, email, and password are required" }, { status: 400 });
          }
          
          if (password.length < 6) {
            return Response.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
          }
          
          // Check if user already exists
          const existingUserByEmail = getUserByEmailQuery.get(email);
          if (existingUserByEmail) {
            return Response.json({ error: "User with this email already exists" }, { status: 409 });
          }
          
          const existingUserByUsername = getUserByUsernameQuery.get(username);
          if (existingUserByUsername) {
            return Response.json({ error: "Username is already taken" }, { status: 409 });
          }
          
          // Hash password and create user
          const passwordHash = await hashPassword(password);
          const user = createUserQuery.get(username.trim(), email.trim().toLowerCase(), passwordHash);
          
          // Create session
          const sessionId = generateSessionId();
          const sessionExpiry = getSessionExpiry();
          const session = createSessionQuery.get(sessionId, user.id, sessionExpiry);
          
          return Response.json({
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              created_at: user.created_at
            },
            sessionId: sessionId
          }, { 
            status: 201,
            headers: {
              'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}` // 7 days
            }
          });
        } catch (error) {
          console.error("Error during registration:", error);
          return Response.json({ error: "Registration failed" }, { status: 500 });
        }
      }
    },
    
    "/api/auth/login": {
      async POST(req) {
        try {
          const { email, password } = await req.json();
          
          if (!email || !password) {
            return Response.json({ error: "Email and password are required" }, { status: 400 });
          }
          
          // Find user by email
          const user = getUserByEmailQuery.get(email.trim().toLowerCase());
          if (!user) {
            return Response.json({ error: "Invalid email or password" }, { status: 401 });
          }
          
          // Verify password
          const isValidPassword = await verifyPassword(password, user.password_hash);
          if (!isValidPassword) {
            return Response.json({ error: "Invalid email or password" }, { status: 401 });
          }
          
          // Create session
          const sessionId = generateSessionId();
          const sessionExpiry = getSessionExpiry();
          const session = createSessionQuery.get(sessionId, user.id, sessionExpiry);
          
          return Response.json({
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              created_at: user.created_at
            },
            sessionId: sessionId
          }, {
            headers: {
              'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}` // 7 days
            }
          });
        } catch (error) {
          console.error("Error during login:", error);
          return Response.json({ error: "Login failed" }, { status: 500 });
        }
      }
    },
    
    "/api/auth/logout": {
      async POST(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          if (sessionId) {
            deleteSessionQuery.run(sessionId);
          }
          
          return Response.json({ message: "Logged out successfully" }, {
            headers: {
              'Set-Cookie': 'sessionId=; HttpOnly; Path=/; Max-Age=0' // Clear cookie
            }
          });
        } catch (error) {
          console.error("Error during logout:", error);
          return Response.json({ error: "Logout failed" }, { status: 500 });
        }
      }
    },
    
    "/api/auth/me": {
      async GET(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          return Response.json({
            user: {
              id: session.user_id,
              username: session.username,
              email: session.email
            }
          });
        } catch (error) {
          console.error("Error getting user info:", error);
          return Response.json({ error: "Failed to get user info" }, { status: 500 });
        }
      }
    },
    
    // Profile Management Routes
    "/api/profile/username": {
      async PUT(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          const { username } = await req.json();
          
          if (!username || username.trim() === '') {
            return Response.json({ error: "Username is required" }, { status: 400 });
          }
          
          // Check if username is already taken by another user
          const existingUser = getUserByUsernameQuery.get(username.trim());
          if (existingUser && existingUser.id !== session.user_id) {
            return Response.json({ error: "Username is already taken" }, { status: 409 });
          }
          
          const updatedUser = updateUserUsernameQuery.get(username.trim(), session.user_id);
          if (!updatedUser) {
            return Response.json({ error: "Failed to update username" }, { status: 500 });
          }
          
          return Response.json(updatedUser);
        } catch (error) {
          console.error("Error updating username:", error);
          return Response.json({ error: "Failed to update username" }, { status: 500 });
        }
      }
    },
    
    "/api/profile/password": {
      async PUT(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          const { currentPassword, newPassword } = await req.json();
          
          if (!currentPassword || !newPassword) {
            return Response.json({ error: "Current password and new password are required" }, { status: 400 });
          }
          
          if (newPassword.length < 6) {
            return Response.json({ error: "New password must be at least 6 characters long" }, { status: 400 });
          }
          
          // Get user to verify current password
          const user = getUserByIdQuery.get(session.user_id);
          if (!user) {
            return Response.json({ error: "User not found" }, { status: 404 });
          }
          
          // Get full user data including password hash
          const fullUser = getUserByEmailQuery.get(user.email);
          
          // Verify current password
          const isValidPassword = await verifyPassword(currentPassword, fullUser.password_hash);
          if (!isValidPassword) {
            return Response.json({ error: "Current password is incorrect" }, { status: 401 });
          }
          
          // Hash new password and update
          const newPasswordHash = await hashPassword(newPassword);
          updateUserPasswordQuery.run(newPasswordHash, session.user_id);
          
          return Response.json({ message: "Password updated successfully" });
        } catch (error) {
          console.error("Error updating password:", error);
          return Response.json({ error: "Failed to update password" }, { status: 500 });
        }
      }
    },
    
    "/api/profile/picture": {
      async POST(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          const formData = await req.formData();
          const file = formData.get('profileImage');
          
          if (!file || !file.name) {
            return Response.json({ error: "No file provided" }, { status: 400 });
          }
          
          // Validate file type
          if (!file.type.startsWith('image/')) {
            return Response.json({ error: "File must be an image" }, { status: 400 });
          }
          
          // Validate file size (5MB max)
          const maxSize = 5 * 1024 * 1024;
          if (file.size > maxSize) {
            return Response.json({ error: "File size must be less than 5MB" }, { status: 400 });
          }
          
          // Create uploads directory if it doesn't exist
          const uploadsDir = './uploads';
          if (!existsSync(uploadsDir)) {
            Bun.file(uploadsDir).writer();
          }
          
          // Generate unique filename
          const fileExtension = file.name.split('.').pop();
          const fileName = `profile_${session.user_id}_${Date.now()}.${fileExtension}`;
          const filePath = join(uploadsDir, fileName);
          
          // Save file
          const arrayBuffer = await file.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          writeFileSync(filePath, buffer);
          
          // Update user profile picture path in database
          updateUserProfilePictureQuery.run(fileName, session.user_id);
          
          return Response.json({ 
            message: "Profile picture updated successfully",
            filename: fileName 
          });
        } catch (error) {
          console.error("Error uploading profile picture:", error);
          return Response.json({ error: "Failed to upload profile picture" }, { status: 500 });
        }
      },
      
      async GET(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          const user = getUserByIdQuery.get(session.user_id);
          if (!user || !user.profile_picture) {
            return new Response(null, { status: 404 });
          }
          
          const filePath = join('./uploads', user.profile_picture);
          if (!existsSync(filePath)) {
            return new Response(null, { status: 404 });
          }
          
          const file = Bun.file(filePath);
          return new Response(file);
        } catch (error) {
          console.error("Error getting profile picture:", error);
          return new Response(null, { status: 500 });
        }
      },
      
      async DELETE(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          const user = getUserByIdQuery.get(session.user_id);
          if (user && user.profile_picture) {
            const filePath = join('./uploads', user.profile_picture);
            if (existsSync(filePath)) {
              unlinkSync(filePath);
            }
          }
          
          // Remove profile picture from database
          updateUserProfilePictureQuery.run(null, session.user_id);
          
          return Response.json({ message: "Profile picture removed successfully" });
        } catch (error) {
          console.error("Error removing profile picture:", error);
          return Response.json({ error: "Failed to remove profile picture" }, { status: 500 });
        }
      }
    },
    
    // API Routes (protected)
    "/api/todos": {
      // GET all todos for authenticated user
      async GET(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          const todos = getAllTodosQuery.all(session.user_id);
          return Response.json(todos);
        } catch (error) {
          console.error("Error fetching todos:", error);
          return Response.json({ error: "Failed to fetch todos" }, { status: 500 });
        }
      },
      
      // POST create new todo for authenticated user
      async POST(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          const { text } = await req.json();
          
          if (!text || text.trim() === "") {
            return Response.json({ error: "Todo text is required" }, { status: 400 });
          }
          
          const todo = createTodoQuery.get(session.user_id, text.trim());
          return Response.json(todo, { status: 201 });
        } catch (error) {
          console.error("Error creating todo:", error);
          return Response.json({ error: "Failed to create todo" }, { status: 500 });
        }
      }
    },
    
    // Individual todo operations (protected)
    "/api/todos/:id": {
      // GET single todo
      async GET(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          const { id } = req.params;
          const todo = getTodoByIdQuery.get(parseInt(id), session.user_id);
          
          if (!todo) {
            return Response.json({ error: "Todo not found" }, { status: 404 });
          }
          
          return Response.json(todo);
        } catch (error) {
          console.error("Error fetching todo:", error);
          return Response.json({ error: "Failed to fetch todo" }, { status: 500 });
        }
      },
      
      // PUT update todo
      async PUT(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          const { id } = req.params;
          const { text, completed } = await req.json();
          
          if (text === undefined || completed === undefined) {
            return Response.json({ error: "Text and completed status are required" }, { status: 400 });
          }
          
          const todo = updateTodoQuery.get(text.trim(), completed, parseInt(id), session.user_id);
          
          if (!todo) {
            return Response.json({ error: "Todo not found" }, { status: 404 });
          }
          
          return Response.json(todo);
        } catch (error) {
          console.error("Error updating todo:", error);
          return Response.json({ error: "Failed to update todo" }, { status: 500 });
        }
      },
      
      // DELETE todo
      async DELETE(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          const { id } = req.params;
          const result = deleteTodoQuery.run(parseInt(id), session.user_id);
          
          if (result.changes === 0) {
            return Response.json({ error: "Todo not found" }, { status: 404 });
          }
          
          return Response.json({ message: "Todo deleted successfully" });
        } catch (error) {
          console.error("Error deleting todo:", error);
          return Response.json({ error: "Failed to delete todo" }, { status: 500 });
        }
      }
    },
    
    // Toggle todo completion status (protected)
    "/api/todos/:id/toggle": {
      async PATCH(req) {
        try {
          const cookies = req.headers.get('Cookie') || '';
          const sessionId = cookies.split(';')
            .find(c => c.trim().startsWith('sessionId='))
            ?.split('=')[1];
          
          const session = requireAuth(sessionId);
          if (!session) {
            return Response.json({ error: "Not authenticated" }, { status: 401 });
          }
          
          const { id } = req.params;
          const todo = toggleTodoQuery.get(parseInt(id), session.user_id);
          
          if (!todo) {
            return Response.json({ error: "Todo not found" }, { status: 404 });
          }
          
          return Response.json(todo);
        } catch (error) {
          console.error("Error toggling todo:", error);
          return Response.json({ error: "Failed to toggle todo" }, { status: 500 });
        }
      }
    },
    
    // Serve the authentication page
    "/auth": {
      GET() {
        return auth;
      }
    },
    
    // Serve the profile page
    "/profile": {
      GET() {
        return profile;
      }
    }
  },
  
  // Enable development mode for hot reloading and detailed errors
  development: true,
  
  // Handle 404s for unmatched routes
  async fetch(req) {
    return new Response("Not Found", { status: 404 });
  }
});

console.log(`🚀 Todo API Server running at ${server.url}`);
console.log(`📝 Open ${server.url} to use the Todo app`);

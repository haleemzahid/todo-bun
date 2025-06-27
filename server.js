import { Database } from "bun:sqlite";
import { serve } from "bun";
import index from "./public/index.html";
import auth from "./public/auth.html";

// Initialize SQLite database
const db = new Database("todos.db");

// Create users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
const getUserByIdQuery = db.query("SELECT id, username, email, created_at FROM users WHERE id = ?");

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

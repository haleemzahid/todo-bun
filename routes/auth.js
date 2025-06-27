import { userQueries, sessionQueries } from '../utils/database.js';
import { hashPassword, verifyPassword, generateSessionId, getSessionExpiry, requireAuth, extractSessionId } from '../utils/auth.js';

export const authRoutes = {
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
        const existingUserByEmail = userQueries.getByEmail.get(email);
        if (existingUserByEmail) {
          return Response.json({ error: "User with this email already exists" }, { status: 409 });
        }
        
        const existingUserByUsername = userQueries.getByUsername.get(username);
        if (existingUserByUsername) {
          return Response.json({ error: "Username is already taken" }, { status: 409 });
        }
        
        // Hash password and create user
        const passwordHash = await hashPassword(password);
        const user = userQueries.create.get(username.trim(), email.trim().toLowerCase(), passwordHash);
        
        // Create session
        const sessionId = generateSessionId();
        const sessionExpiry = getSessionExpiry();
        const session = sessionQueries.create.get(sessionId, user.id, sessionExpiry);
        
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
        const user = userQueries.getByEmail.get(email.trim().toLowerCase());
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
        const session = sessionQueries.create.get(sessionId, user.id, sessionExpiry);
        
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
        const sessionId = extractSessionId(req);
        
        if (sessionId) {
          sessionQueries.delete.run(sessionId);
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
        const sessionId = extractSessionId(req);
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
  }
};

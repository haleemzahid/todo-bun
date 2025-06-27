import { serve } from "bun";
import index from "./public/index.html";
import auth from "./public/auth.html";
import profile from "./public/profile.html";

// Import route modules
import { authRoutes } from "./routes/auth.js";
import { todoRoutes } from "./routes/todos.js";
import { profileRoutes } from "./routes/profile.js";

// Import database initialization (this will run the setup)
import "./utils/database.js";

const server = serve({
  port: process.env.PORT || 3000,
  routes: {
    // Serve the HTML pages
    "/": index,
    "/auth.html": auth,
    "/profile.html": profile,
    
    // Authentication Routes
    ...authRoutes,
    
    // Profile Management Routes
    ...profileRoutes,
    
    // Todo Routes
    ...todoRoutes,
    
    // Serve pages with clean URLs
    "/auth": {
      GET() {
        return auth;
      }
    },
    
    "/profile": {
      GET() {
        return profile;
      }
    }
  },
  
  // Enable development mode for hot reloading and detailed errors
  development: process.env.NODE_ENV !== 'production',
  
  // Handle 404s for unmatched routes
  async fetch(req) {
    return new Response("Not Found", { status: 404 });
  }
});

console.log(`🚀 Todo API Server running at ${server.url}`);
console.log(`📝 Open ${server.url} to use the Todo app`);
console.log(`🔐 Authentication: ${server.url}auth.html`);
console.log(`👤 Profile Settings: ${server.url}profile.html`);

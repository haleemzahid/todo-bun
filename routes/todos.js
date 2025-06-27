import { todoQueries } from '../utils/database.js';
import { requireAuth, extractSessionId } from '../utils/auth.js';

export const todoRoutes = {
  "/api/todos": {
    // GET all todos for authenticated user
    async GET(req) {
      try {
        const sessionId = extractSessionId(req);
        const session = requireAuth(sessionId);
        
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        
        const todos = todoQueries.getAll.all(session.user_id);
        return Response.json(todos);
      } catch (error) {
        console.error("Error fetching todos:", error);
        return Response.json({ error: "Failed to fetch todos" }, { status: 500 });
      }
    },
    
    // POST create new todo for authenticated user
    async POST(req) {
      try {
        const sessionId = extractSessionId(req);
        const session = requireAuth(sessionId);
        
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        
        const { text } = await req.json();
        
        if (!text || text.trim() === "") {
          return Response.json({ error: "Todo text is required" }, { status: 400 });
        }
        
        const todo = todoQueries.create.get(session.user_id, text.trim());
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
        const sessionId = extractSessionId(req);
        const session = requireAuth(sessionId);
        
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        
        const { id } = req.params;
        const todo = todoQueries.getById.get(parseInt(id), session.user_id);
        
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
        const sessionId = extractSessionId(req);
        const session = requireAuth(sessionId);
        
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        
        const { id } = req.params;
        const { text, completed } = await req.json();
        
        if (text === undefined || completed === undefined) {
          return Response.json({ error: "Text and completed status are required" }, { status: 400 });
        }
        
        const todo = todoQueries.update.get(text.trim(), completed, parseInt(id), session.user_id);
        
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
        const sessionId = extractSessionId(req);
        const session = requireAuth(sessionId);
        
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        
        const { id } = req.params;
        const result = todoQueries.delete.run(parseInt(id), session.user_id);
        
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
        const sessionId = extractSessionId(req);
        const session = requireAuth(sessionId);
        
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        
        const { id } = req.params;
        const todo = todoQueries.toggle.get(parseInt(id), session.user_id);
        
        if (!todo) {
          return Response.json({ error: "Todo not found" }, { status: 404 });
        }
        
        return Response.json(todo);
      } catch (error) {
        console.error("Error toggling todo:", error);
        return Response.json({ error: "Failed to toggle todo" }, { status: 500 });
      }
    }
  }
};

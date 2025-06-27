import { Database } from "bun:sqlite";
import { serve } from "bun";
import index from "./public/index.html";

// Initialize SQLite database
const db = new Database("todos.db");

// Create todos table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Prepared statements for better performance
const getAllTodos = db.query("SELECT * FROM todos ORDER BY created_at DESC");
const getTodoById = db.query("SELECT * FROM todos WHERE id = ?");
const createTodo = db.query("INSERT INTO todos (text) VALUES (?) RETURNING *");
const updateTodo = db.query("UPDATE todos SET text = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *");
const deleteTodo = db.query("DELETE FROM todos WHERE id = ?");
const toggleTodo = db.query("UPDATE todos SET completed = NOT completed, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *");

const server = serve({
  routes: {
    // Serve the HTML page
    "/": index,
    
    // API Routes
    "/api/todos": {
      // GET all todos
      async GET() {
        try {
          const todos = getAllTodos.all();
          return Response.json(todos);
        } catch (error) {
          console.error("Error fetching todos:", error);
          return Response.json({ error: "Failed to fetch todos" }, { status: 500 });
        }
      },
      
      // POST create new todo
      async POST(req) {
        try {
          const { text } = await req.json();
          
          if (!text || text.trim() === "") {
            return Response.json({ error: "Todo text is required" }, { status: 400 });
          }
          
          const todo = createTodo.get(text.trim());
          return Response.json(todo, { status: 201 });
        } catch (error) {
          console.error("Error creating todo:", error);
          return Response.json({ error: "Failed to create todo" }, { status: 500 });
        }
      }
    },
    
    // Individual todo operations
    "/api/todos/:id": {
      // GET single todo
      async GET(req) {
        try {
          const { id } = req.params;
          const todo = getTodoById.get(parseInt(id));
          
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
          const { id } = req.params;
          const { text, completed } = await req.json();
          
          if (text === undefined || completed === undefined) {
            return Response.json({ error: "Text and completed status are required" }, { status: 400 });
          }
          
          const todo = updateTodo.get(text.trim(), completed, parseInt(id));
          
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
          const { id } = req.params;
          const result = deleteTodo.run(parseInt(id));
          
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
    
    // Toggle todo completion status
    "/api/todos/:id/toggle": {
      async PATCH(req) {
        try {
          const { id } = req.params;
          const todo = toggleTodo.get(parseInt(id));
          
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

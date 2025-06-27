# 🚀 Bun Todo API - Full-Stack Practice Project

A complete Todo application built with **Bun.js**, **SQLite**, **Vanilla JavaScript**, and **Tailwind CSS**. Perfect for junior developers to learn API development, database operations, and frontend-backend integration!

## 🎯 Learning Objectives

This project teaches you:
- **REST API Development** with Bun.js
- **Database Operations** with SQLite
- **Frontend-Backend Communication** with Fetch API
- **Modern UI Development** with Tailwind CSS
- **Error Handling** and **Loading States**
- **CRUD Operations** (Create, Read, Update, Delete)

## 🛠️ Tech Stack

- **Backend**: Bun.js (Runtime + HTTP Server)
- **Database**: SQLite (with bun:sqlite)
- **Frontend**: Vanilla JavaScript + HTML5
- **Styling**: Tailwind CSS
- **Architecture**: RESTful API

## 📁 Project Structure

```
bun-todo-app/
├── server.js          # Main server file with API routes
├── package.json       # Project dependencies and scripts
├── todos.db           # SQLite database (created automatically)
├── public/
│   ├── index.html     # Main HTML page
│   └── app.js         # Frontend JavaScript application
└── README.md          # This file
```

## 🚀 Quick Start

### Prerequisites
- [Bun.js](https://bun.sh) installed on your system

### Installation & Setup

1. **Clone/Download the project**
   ```bash
   cd bun-todo-app
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Start the development server**
   ```bash
   bun run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 📚 API Documentation

### Base URL: `http://localhost:3000/api`

### Endpoints

#### 📋 Get All Todos
```http
GET /api/todos
```
**Response:**
```json
[
  {
    "id": 1,
    "text": "Learn Bun.js",
    "completed": false,
    "created_at": "2025-01-01T10:00:00.000Z",
    "updated_at": "2025-01-01T10:00:00.000Z"
  }
]
```

#### ➕ Create Todo
```http
POST /api/todos
Content-Type: application/json

{
  "text": "New todo item"
}
```

#### 📝 Update Todo
```http
PUT /api/todos/:id
Content-Type: application/json

{
  "text": "Updated todo text",
  "completed": true
}
```

#### 🔄 Toggle Todo Status
```http
PATCH /api/todos/:id/toggle
```

#### 🗑️ Delete Todo
```http
DELETE /api/todos/:id
```

#### 📖 Get Single Todo
```http
GET /api/todos/:id
```

## 🎓 Code Explanation for Junior Developers

### 1. Server Setup (server.js)

```javascript
// Import Bun's built-in modules
import { Database } from "bun:sqlite";  // SQLite database
import { serve } from "bun";            // HTTP server

// Create database connection
const db = new Database("todos.db");
```

**Key Concepts:**
- **ES6 Imports**: Modern JavaScript module system
- **SQLite**: Lightweight, file-based database
- **Database Connection**: Persistent connection to store data

### 2. Database Schema

```sql
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Auto-incrementing ID
  text TEXT NOT NULL,                    -- Todo text (required)
  completed BOOLEAN DEFAULT FALSE,       -- Completion status
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Key Concepts:**
- **Primary Key**: Unique identifier for each record
- **Data Types**: INTEGER, TEXT, BOOLEAN, DATETIME
- **Constraints**: NOT NULL, DEFAULT values
- **Auto-increment**: Automatic ID generation

### 3. Prepared Statements (Security Best Practice)

```javascript
const getAllTodos = db.query("SELECT * FROM todos ORDER BY created_at DESC");
const createTodo = db.query("INSERT INTO todos (text) VALUES (?) RETURNING *");
```

**Why Prepared Statements?**
- **Security**: Prevents SQL injection attacks
- **Performance**: Compiled once, executed multiple times
- **Type Safety**: Parameter binding with validation

### 4. REST API Routes

```javascript
const server = serve({
  routes: {
    "/api/todos": {
      async GET() { /* fetch all todos */ },
      async POST(req) { /* create new todo */ }
    },
    "/api/todos/:id": {
      async GET(req) { /* fetch single todo */ },
      async PUT(req) { /* update todo */ },
      async DELETE(req) { /* delete todo */ }
    }
  }
});
```

**Key Concepts:**
- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)
- **Route Parameters**: `:id` captures dynamic values
- **Async/Await**: Handle asynchronous database operations

### 5. Error Handling

```javascript
try {
  const todos = getAllTodos.all();
  return Response.json(todos);
} catch (error) {
  console.error("Error fetching todos:", error);
  return Response.json({ error: "Failed to fetch todos" }, { status: 500 });
}
```

**Best Practices:**
- **Try-Catch Blocks**: Catch and handle errors gracefully
- **HTTP Status Codes**: 200 (success), 400 (bad request), 500 (server error)
- **Error Messages**: User-friendly error responses

### 6. Frontend JavaScript (app.js)

```javascript
class TodoApp {
  async apiCall(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    return await response.json();
  }
}
```

**Key Concepts:**
- **Classes**: Organize related functionality
- **Fetch API**: Make HTTP requests to the backend
- **Async/Await**: Handle promises elegantly
- **JSON**: Data exchange format between frontend and backend

## 🎨 Features

### ✅ Core Functionality
- ➕ **Add Todos**: Create new todo items
- ✏️ **Edit Todos**: Click edit button or double-click to modify
- ✅ **Toggle Completion**: Mark todos as done/undone
- 🗑️ **Delete Todos**: Remove todos with confirmation
- 🔍 **Filter Todos**: View All, Pending, or Completed items

### 🎨 UI/UX Features
- 📱 **Responsive Design**: Works on desktop and mobile
- 🎯 **Real-time Stats**: Live count of total, completed, and pending todos
- 🔄 **Loading States**: Visual feedback during API calls
- ⚠️ **Error Handling**: User-friendly error messages
- 🎨 **Modern Design**: Clean, professional interface with Tailwind CSS

### 🚀 Technical Features
- ⚡ **Fast Performance**: Bun.js runtime for speed
- 🔄 **Hot Reloading**: Automatic restart during development
- 💾 **Persistent Storage**: SQLite database saves data permanently
- 🔒 **SQL Injection Protection**: Prepared statements for security
- 📝 **Input Validation**: Server-side and client-side validation

## 🧪 Testing the API

### Using cURL

```bash
# Get all todos
curl http://localhost:3000/api/todos

# Create a new todo
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"text":"Learn API testing"}'

# Update a todo
curl -X PUT http://localhost:3000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"text":"Learn API testing with cURL","completed":true}'

# Toggle todo completion
curl -X PATCH http://localhost:3000/api/todos/1/toggle

# Delete a todo
curl -X DELETE http://localhost:3000/api/todos/1
```

### Using Browser Developer Tools

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try these commands:

```javascript
// Fetch all todos
fetch('/api/todos').then(r => r.json()).then(console.log);

// Create a new todo
fetch('/api/todos', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({text: 'Test todo'})
}).then(r => r.json()).then(console.log);
```

## 🚧 Extending the Project

### Ideas for Junior Developers

1. **Add User Authentication**
   - User registration/login
   - JWT tokens
   - Protected routes

2. **Add Categories/Tags**
   - Categorize todos
   - Color-coded tags
   - Filter by category

3. **Add Due Dates**
   - Date picker component
   - Sort by due date
   - Overdue notifications

4. **Add Search**
   - Search todos by text
   - Real-time search results
   - Search highlighting

5. **Add Bulk Operations**
   - Select multiple todos
   - Bulk delete/complete
   - Bulk edit

6. **Add Data Export**
   - Export to JSON/CSV
   - Import todos from file
   - Backup/restore functionality

## 🛠️ Development Commands

```bash
# Start development server (with hot reload)
bun run dev

# Start production server
bun run start

# Install new dependencies
bun add package-name

# View database (optional - install sqlite3 CLI)
sqlite3 todos.db ".tables"
sqlite3 todos.db "SELECT * FROM todos;"
```

## 📖 Learning Resources

### Bun.js
- [Official Documentation](https://bun.sh/docs)
- [HTTP Server Guide](https://bun.sh/docs/api/http)
- [SQLite Integration](https://bun.sh/docs/api/sqlite)

### Web APIs
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [REST API Design](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)

### Frontend Development
- [Vanilla JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [DOM Manipulation](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **Database locked**
   ```bash
   # Remove database file and restart
   rm todos.db
   bun run dev
   ```

3. **Module not found**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules
   bun install
   ```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

This is an educational project! Feel free to:
- Add new features
- Fix bugs
- Improve documentation
- Share your variations

---

**Happy Coding! 🎉**

*Built with ❤️ using Bun.js for junior developers to learn full-stack development*

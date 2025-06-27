# 🚀 Bun Todo API - Full-Stack Practice Project

A complete Todo application built with **Bun.js**, **SQLite**, **Vanilla JavaScript**, and **Tailwind CSS**. Features user authentication, profile management, and a clean modular architecture. Perfect for junior developers to learn full-stack development!

## ✨ Features

- 🔐 **User Authentication** (Register/Login/Logout)
- 👤 **Profile Management** (Username, Password, Profile Picture)
- ✅ **Todo Management** (Create, Read, Update, Delete)
- 🎨 **Modern UI** with Tailwind CSS
- 📱 **Responsive Design**
- 🏗️ **Modular Architecture**
- 🗄️ **SQLite Database** with proper relationships
- 🔒 **Session-based Authentication**
- 📁 **File Upload** for profile pictures

## 🎯 Learning Objectives

This project teaches you:

- **REST API Development** with Bun.js
- **Database Design** and **Relationships** with SQLite
- **Authentication** and **Session Management**
- **File Upload** and **Handling**
- **Frontend-Backend Communication** with Fetch API
- **Modern UI Development** with Tailwind CSS
- **Modular Code Architecture**
- **Error Handling** and **Loading States**
- **CRUD Operations** (Create, Read, Update, Delete)

## 🛠️ Tech Stack

- **Backend**: Bun.js (Runtime + HTTP Server)
- **Database**: SQLite (with bun:sqlite)
- **Frontend**: Vanilla JavaScript + HTML5
- **Styling**: Tailwind CSS
- **Architecture**: RESTful API with modular routes
- **File Storage**: Local file system for profile pictures

## 📁 Project Structure

```
bun-todo-app/
├── server.js                 # Main server file
├── package.json             # Project dependencies and scripts
├── todos.db                 # SQLite database (created automatically)
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── todos.js             # Todo CRUD routes
│   └── profile.js           # Profile management routes
├── utils/
│   ├── database.js          # Database setup and queries
│   └── auth.js              # Authentication utilities
├── uploads/                 # Profile picture storage
├── public/
│   ├── index.html           # Main todo app page
│   ├── auth.html            # Login/Register page
│   ├── profile.html         # Profile settings page
│   ├── app.js               # Main todo app frontend
│   ├── auth.js              # Authentication frontend
│   └── profile.js           # Profile management frontend
└── README.md                # This file
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

5. **Create an account**

   - Go to `/auth.html` to register a new account
   - Login with your credentials
   - Start managing your todos!

## 📚 API Documentation

### Base URL: `http://localhost:3000/api`

### Authentication Endpoints

#### 🔐 Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### 🔑 Login User

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### 👤 Get Current User

```http
GET /api/auth/me
```

#### 🚪 Logout User

```http
POST /api/auth/logout
```

### Profile Management Endpoints

#### 📝 Update Username

```http
PUT /api/profile/username
Content-Type: application/json

{
  "username": "newusername"
}
```

#### 🔒 Change Password

```http
PUT /api/profile/password
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

#### 📷 Upload Profile Picture

```http
POST /api/profile/picture
Content-Type: multipart/form-data

[Form data with 'profileImage' file field]
```

#### 🖼️ Get Profile Picture

```http
GET /api/profile/picture
```

#### 🗑️ Delete Profile Picture

```http
DELETE /api/profile/picture
```

### Todo Endpoints (Authenticated)

#### 📋 Get All Todos

```http
GET /api/todos
```

**Response:**

```json
[
  {
    "id": 1,
    "user_id": 1,
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

### 1. Modular Architecture

The project is organized into separate modules for better maintainability:

```text
routes/
├── auth.js      # Authentication logic
├── todos.js     # Todo CRUD operations
└── profile.js   # Profile management

utils/
├── database.js  # Database setup and queries
└── auth.js      # Authentication utilities
```

**Benefits:**

- **Separation of Concerns**: Each module has a specific responsibility
- **Maintainability**: Easier to find and modify code
- **Scalability**: Easy to add new features
- **Testability**: Modules can be tested independently

### 2. Database Setup (utils/database.js)

```javascript
// Import Bun's built-in SQLite module
import { Database } from "bun:sqlite";

// Create database connection
const db = new Database("todos.db");

// Export prepared queries for reuse
export const userQueries = {
  create: db.query("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING *"),
  getByEmail: db.query("SELECT * FROM users WHERE email = ?")
};
```

**Key Concepts:**

- **ES6 Imports**: Modern JavaScript module system
- **SQLite**: Lightweight, file-based database
- **Database Connection**: Persistent connection to store data
- **Prepared Statements**: Secure, reusable database queries

### 3. Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_picture TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for authentication
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Todos table
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Key Concepts:**

- **Primary Keys**: Unique identifiers for each record
- **Foreign Keys**: Create relationships between tables
- **Data Types**: INTEGER, TEXT, BOOLEAN, DATETIME
- **Constraints**: NOT NULL, UNIQUE, DEFAULT values
- **Relationships**: Users have many todos and sessions

### 4. Authentication System (utils/auth.js)

```javascript
// Password hashing with Bun's built-in API
export async function hashPassword(password) {
  return await Bun.password.hash(password);
}

// Session-based authentication
export function requireAuth(sessionId) {
  const session = sessionQueries.get.get(sessionId);
  if (!session || new Date() > new Date(session.expires_at)) {
    return null; // Not authenticated
  }
  return session;
}
```

**Security Features:**

- **Password Hashing**: Never store plain text passwords
- **Session Management**: Secure user sessions with expiration
- **Authentication Middleware**: Protect routes that require login

### 5. REST API Structure

```javascript
// Authentication routes (routes/auth.js)
export const authRoutes = {
  "/api/auth/register": { POST: registerHandler },
  "/api/auth/login": { POST: loginHandler },
  "/api/auth/logout": { POST: logoutHandler }
};
```

**REST Principles:**

- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)
- **Status Codes**: 200 (success), 401 (unauthorized), 404 (not found)
- **JSON Responses**: Consistent data format
- **Resource-based URLs**: Clear, predictable endpoints

### 6. Error Handling

```javascript
try {
  const user = await createUser(userData);
  return Response.json({ user }, { status: 201 });
} catch (error) {
  console.error("Registration failed:", error);
  return Response.json({ error: "Registration failed" }, { status: 500 });
}
```

**Best Practices:**

- **Try-Catch Blocks**: Catch and handle errors gracefully
- **Logging**: Console.error for debugging
- **User-Friendly Messages**: Don't expose internal errors
- **HTTP Status Codes**: Proper error status codes

### 7. Frontend Architecture (public/app.js)

```javascript
class TodoApp {
  constructor() {
    this.todos = [];
    this.user = null;
    this.init();
  }

  async apiCall(url, options = {}) {
    // Centralized API communication
    const response = await fetch(url, {
      credentials: 'include', // Include cookies
      ...options
    });
    return response.json();
  }
}
```

**Frontend Patterns:**

- **Classes**: Organize related functionality
- **Async/Await**: Modern asynchronous JavaScript
- **Fetch API**: Native browser HTTP client
- **Event Handling**: Responsive user interactions
    "/api/todos": {
      async GET() { /*fetch all todos */ },
      async POST(req) { /* create new todo */ }
    },
    "/api/todos/:id": {
      async GET(req) { /* fetch single todo */ },
      async PUT(req) { /* update todo */ },
      async DELETE(req) { /* delete todo*/ }
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

### Production Deployment

For production deployment, consider:

- **Environment Variables**: Use `.env` files for configuration
- **HTTPS**: Enable SSL/TLS for security
- **Database**: Consider PostgreSQL for production
- **Process Management**: Use PM2 or similar for process management
- **Reverse Proxy**: Nginx or Apache for production traffic

## 🎯 Extension Ideas

Ready to level up? Try implementing these features:

### Beginner Extensions

- 📅 **Due Dates**: Add date picker for todo deadlines
- 🏷️ **Categories**: Organize todos by category/tags
- 🔍 **Search**: Find todos by text content
- � **Progress Bar**: Visual completion percentage
- 🌈 **Color Themes**: Multiple UI color schemes

### Intermediate Extensions

- 📱 **Drag & Drop**: Reorder todos with mouse/touch
- 🌙 **Dark Mode**: Toggle between light/dark themes
- 💾 **Import/Export**: Backup and restore todos (JSON/CSV)
- 📧 **Email Notifications**: Send todo reminders
- 🔄 **Todo Sharing**: Share todos with other users

### Advanced Extensions

- 🔄 **Real-time Sync**: WebSocket updates across tabs
- 📊 **Analytics**: Charts and insights about productivity
- 🔗 **API Integration**: Connect with external services (Google Calendar, Slack)
- 🏢 **Team Features**: Shared todos and collaboration
- 🤖 **AI Integration**: Smart todo suggestions and categorization

## �📖 Learning Resources

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
   # Kill process on port 3000 (Linux/Mac)
   lsof -ti:3000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **Database locked**

   ```bash
   # Remove database file and restart
   rm todos.db
   bun run server.js
   ```

3. **Module not found**

   ```bash
   # Reinstall dependencies
   rm -rf node_modules
   bun install
   ```

4. **File upload not working**

   ```bash
   # Check uploads directory exists
   mkdir uploads
   chmod 755 uploads
   ```

5. **Authentication issues**

   ```bash
   # Clear cookies and refresh browser
   # Or check browser dev tools > Application > Cookies
   ```

## 🎓 What You'll Learn

By building and extending this project, you'll gain experience with:

### Backend Development

- **API Design**: RESTful principles and best practices
- **Database Management**: Schema design, relationships, queries
- **Authentication**: Session management, password hashing
- **File Handling**: Upload, storage, and retrieval
- **Error Handling**: Graceful error management
- **Security**: Input validation, SQL injection prevention

### Frontend Development

- **DOM Manipulation**: Dynamic content updates
- **Event Handling**: User interaction management
- **Async Programming**: Promises, async/await patterns
- **State Management**: Application state in vanilla JS
- **UI/UX Design**: Responsive, accessible interfaces
- **Error Handling**: User-friendly error display

### Full-Stack Integration

- **HTTP Communication**: Frontend-backend integration
- **JSON APIs**: Data serialization and transfer
- **Authentication Flow**: Login/logout implementation
- **File Upload**: Client-server file transfer
- **Real-time Updates**: Dynamic UI updates

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

This is an educational project! Feel free to:

- Add new features
- Fix bugs  
- Improve documentation
- Share your extensions
- Help other learners

## 🙏 Acknowledgments

- **Bun.js Team**: For creating an amazing JavaScript runtime
- **Tailwind CSS**: For the excellent utility-first CSS framework
- **MDN Web Docs**: For comprehensive web development documentation

---

**Happy Coding! 🚀**

*Built with ❤️ for learning and practice*

- Share your variations

---

**Happy Coding! 🎉**

*Built with ❤️ using Bun.js for junior developers to learn full-stack development*

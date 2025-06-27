import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";

// Create data directory for production if it doesn't exist
const dataDir = process.env.NODE_ENV === 'production' ? '/app/data' : '.';
if (process.env.NODE_ENV === 'production' && !existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Database path - use persistent volume in production
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/data/todos.db' 
  : 'todos.db';

// Initialize SQLite database
const db = new Database(dbPath);

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

// Prepared statements for users and sessions
export const userQueries = {
  create: db.query("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id, username, email, created_at"),
  getByEmail: db.query("SELECT * FROM users WHERE email = ?"),
  getByUsername: db.query("SELECT * FROM users WHERE username = ?"),
  getById: db.query("SELECT id, username, email, profile_picture, created_at FROM users WHERE id = ?"),
  updateUsername: db.query("UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING id, username, email"),
  updatePassword: db.query("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"),
  updateProfilePicture: db.query("UPDATE users SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
};

export const sessionQueries = {
  create: db.query("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?) RETURNING *"),
  get: db.query("SELECT s.*, u.id as user_id, u.username, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ?"),
  delete: db.query("DELETE FROM sessions WHERE id = ?"),
  cleanupExpired: db.query("DELETE FROM sessions WHERE expires_at < datetime('now')")
};

// Prepared statements for todos
export const todoQueries = {
  getAll: db.query("SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC"),
  getById: db.query("SELECT * FROM todos WHERE id = ? AND user_id = ?"),
  create: db.query("INSERT INTO todos (user_id, text) VALUES (?, ?) RETURNING *"),
  update: db.query("UPDATE todos SET text = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING *"),
  delete: db.query("DELETE FROM todos WHERE id = ? AND user_id = ?"),
  toggle: db.query("UPDATE todos SET completed = NOT completed, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING *")
};

// Clean up expired sessions on startup
sessionQueries.cleanupExpired.run();

export default db;

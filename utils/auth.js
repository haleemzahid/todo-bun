import { sessionQueries } from './database.js';

// Authentication helper functions
export async function hashPassword(password) {
  return await Bun.password.hash(password);
}

export async function verifyPassword(password, hash) {
  return await Bun.password.verify(password, hash);
}

export function generateSessionId() {
  return crypto.randomUUID();
}

export function getSessionExpiry() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7); // 7 days from now
  return expiry.toISOString();
}

// Middleware to check authentication
export function requireAuth(sessionId) {
  if (!sessionId) {
    return null;
  }
  
  const session = sessionQueries.get.get(sessionId);
  if (!session) {
    return null;
  }
  
  // Check if session is expired
  if (new Date() > new Date(session.expires_at)) {
    // Clean up expired session
    sessionQueries.delete.run(sessionId);
    return null;
  }
  
  return session;
}

// Extract session ID from request cookies
export function extractSessionId(req) {
  const cookies = req.headers.get('Cookie') || '';
  return cookies.split(';')
    .find(c => c.trim().startsWith('sessionId='))
    ?.split('=')[1];
}

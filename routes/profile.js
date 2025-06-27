import { writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { userQueries } from '../utils/database.js';
import { requireAuth, extractSessionId, hashPassword, verifyPassword } from '../utils/auth.js';

export const profileRoutes = {
  "/api/profile/username": {
    async PUT(req) {
      try {
        const sessionId = extractSessionId(req);
        const session = requireAuth(sessionId);
        
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        
        const { username } = await req.json();
        
        if (!username || username.trim() === '') {
          return Response.json({ error: "Username is required" }, { status: 400 });
        }
        
        // Check if username is already taken by another user
        const existingUser = userQueries.getByUsername.get(username.trim());
        if (existingUser && existingUser.id !== session.user_id) {
          return Response.json({ error: "Username is already taken" }, { status: 409 });
        }
        
        const updatedUser = userQueries.updateUsername.get(username.trim(), session.user_id);
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
        const sessionId = extractSessionId(req);
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
        const user = userQueries.getById.get(session.user_id);
        if (!user) {
          return Response.json({ error: "User not found" }, { status: 404 });
        }
        
        // Get full user data including password hash
        const fullUser = userQueries.getByEmail.get(user.email);
        
        // Verify current password
        const isValidPassword = await verifyPassword(currentPassword, fullUser.password_hash);
        if (!isValidPassword) {
          return Response.json({ error: "Current password is incorrect" }, { status: 401 });
        }
        
        // Hash new password and update
        const newPasswordHash = await hashPassword(newPassword);
        userQueries.updatePassword.run(newPasswordHash, session.user_id);
        
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
        const sessionId = extractSessionId(req);
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
        userQueries.updateProfilePicture.run(fileName, session.user_id);
        
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
        const sessionId = extractSessionId(req);
        const session = requireAuth(sessionId);
        
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        
        const user = userQueries.getById.get(session.user_id);
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
        const sessionId = extractSessionId(req);
        const session = requireAuth(sessionId);
        
        if (!session) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        
        const user = userQueries.getById.get(session.user_id);
        if (user && user.profile_picture) {
          const filePath = join('./uploads', user.profile_picture);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        }
        
        // Remove profile picture from database
        userQueries.updateProfilePicture.run(null, session.user_id);
        
        return Response.json({ message: "Profile picture removed successfully" });
      } catch (error) {
        console.error("Error removing profile picture:", error);
        return Response.json({ error: "Failed to remove profile picture" }, { status: 500 });
      }
    }
  }
};

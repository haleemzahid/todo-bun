# Deployment Guide

## Deploy to Railway (Recommended)

### Prerequisites
- GitHub account
- Railway account (railway.app)

### Steps:

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect the Dockerfile and deploy

3. **Add Volume for SQLite (Important!)**
   - In Railway dashboard, go to your project
   - Click on "Variables" tab
   - Add volume mount: `/app/data` (for persistent SQLite storage)
   - Update database.js to use `/app/data/todos.db` for production

4. **Environment Variables**
   - Set `NODE_ENV=production`
   - Set `PORT=3000` (Railway will override this)


## Alternative: Deploy to Render (Free Plan Available)

### Why Render?

- ✅ **Free Plan**: 750 hours/month (enough for personal projects)
- ✅ **Easy GitHub Integration**: Auto-deploy from GitHub
- ✅ **Built-in SSL**: Automatic HTTPS certificates
- ✅ **Persistent Disks**: SQLite storage with free disk allocation
- ✅ **Custom Domains**: Free subdomain + custom domain support

### Prerequisites

- GitHub account
- Render account (render.com)

### Deployment Steps

1. **Push to GitHub** (if not already done)

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

2. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub (recommended)

3. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Choose your todo app repository

4. **Configure Build Settings**
   - **Name**: `your-todo-app` (or any name you prefer)
   - **Environment**: `Docker`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: Leave empty (Docker handles this)
   - **Start Command**: Leave empty (Docker handles this)

5. **Add Persistent Disk (Important!)**
   - Scroll down to "Disk"
   - Click "Add Disk"
   - **Name**: `data`
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB (free tier allows up to 1GB)

6. **Set Environment Variables**
   - Add `NODE_ENV` = `production`
   - Add `PORT` = `10000` (Render's default)

7. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - First deployment takes 5-10 minutes

### Free Plan Limitations

- **750 hours/month**: Service sleeps after 15 minutes of inactivity
- **1 GB disk**: Enough for SQLite + uploads for personal use
- **Slower builds**: Free tier has lower priority
- **Cold starts**: 30-60 second delay when service wakes up

### Render Configuration Tips

- **Auto-Deploy**: Enable auto-deploy from GitHub for continuous deployment
- **Health Checks**: Render automatically monitors your app
- **Logs**: View real-time logs in the Render dashboard
- **Custom Domain**: Add your domain in service settings (free)

## Important Notes:

### SQLite Persistence
- SQLite files are ephemeral on most platforms
- You MUST use persistent volumes/disks
- Consider migrating to PostgreSQL for production

### File Uploads
- Uploaded files (profile pictures) also need persistent storage
- Use the same volume for both database and uploads

### Environment Variables
- Set NODE_ENV=production for all deployments
- Ensure PORT is configurable (already handled in server.js)

### Security Considerations
- Add HTTPS redirect in production
- Set secure session cookies
- Add rate limiting
- Validate all inputs

## Recommended Production Improvements:

1. **Migrate to PostgreSQL** (more reliable for production)
2. **Add Redis for sessions** (better than SQLite for auth)
3. **Use cloud storage** for file uploads (AWS S3, Cloudinary)
4. **Add monitoring** and error tracking
5. **Implement proper logging**
6. **Add backup strategy** for data


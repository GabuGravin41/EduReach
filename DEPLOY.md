# EduReach Deployment Guide - Railway

## Prerequisites
- Railway account
- GitHub repository (push your code first)

---

## STEP 1: Deploy Backend

1. **Go to Railway** → New Project → Deploy from GitHub
2. **Select your repository**
3. **Railway will auto-detect Django** - let it deploy
4. **Wait for first deployment to complete**
5. **Go to Settings** → Add these environment variables:
   ```
   SECRET_KEY=django-insecure-your-random-secret-key-change-this
   DEBUG=False
   GEMINI_API_KEY=your-gemini-api-key
   ```
6. **Copy your backend URL** (looks like: `https://edureach-backend-production.up.railway.app`)
7. **Go back to Settings** → Add these environment variables:
   ```
   ALLOWED_HOSTS=your-backend-url.up.railway.app,localhost
   CORS_ALLOWED_ORIGINS=https://your-frontend-url.up.railway.app
   ```
   (Leave frontend URL blank for now, we'll update it)

8. **Redeploy** (Settings → Redeploy)

---

## STEP 2: Deploy Frontend

1. **Railway** → New Project → Deploy from GitHub
2. **Select same repository**
3. **Go to Settings** → Root Directory → Set to: (leave blank - root is fine)
4. **Go to Settings** → Add environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend-url.up.railway.app/api
   ```
   (Use the backend URL from Step 1)

5. **Go to Settings** → Build Command:
   ```
   npm install && npm run build
   ```

6. **Go to Settings** → Start Command:
   ```
   npm start
   ```

7. **Copy your frontend URL** (looks like: `https://edureach-production.up.railway.app`)

8. **Go back to Backend project** → Settings → Update `CORS_ALLOWED_ORIGINS`:
   ```
   CORS_ALLOWED_ORIGINS=https://your-frontend-url.up.railway.app,http://localhost:3000
   ```

9. **Redeploy both projects**

---

## STEP 3: Test

1. Open your frontend URL
2. Try to login
3. Check browser console for errors

---

## If You Get Errors:

**405 Error**: Backend environment variables not set correctly
**CORS Error**: `CORS_ALLOWED_ORIGINS` doesn't match your frontend URL exactly
**Network Error**: `VITE_API_BASE_URL` is wrong or backend is down

---

## Quick Reference:

**Backend needs:**
- `SECRET_KEY`
- `DEBUG=False`
- `ALLOWED_HOSTS=your-backend.railway.app`
- `CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app`
- `GEMINI_API_KEY`

**Frontend needs:**
- `VITE_API_BASE_URL=https://your-backend.railway.app/api`
- `GEMINI_API_KEY`

**Build/Start:**
- Backend: Auto-detected (uses Procfile)
- Frontend Build: `npm install && npm run build`
- Frontend Start: `npm start`

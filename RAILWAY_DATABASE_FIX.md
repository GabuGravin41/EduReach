# Railway Database Issue - CRITICAL FIX NEEDED

## 🚨 The Problem

Your backend is crashing with `sqlite3.OperationalError: no such table: courses_course` because:

1. **Migrations run successfully** when container starts
2. **Railway restarts the container** (normal behavior)
3. **SQLite database file is DELETED** (containers are ephemeral)
4. **App tries to query non-existent tables** → 500 errors

**Root Cause:** Railway containers don't persist files between restarts. Your `db.sqlite3` file is created, then immediately lost when the container restarts.

---

## ✅ SOLUTION: Add PostgreSQL Database (RECOMMENDED)

This is the proper, production-ready solution:

### Step 1: Add PostgreSQL to Railway

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically:
   - Create a PostgreSQL database
   - Set the `DATABASE_URL` environment variable in your backend service
   - Link it to your backend

### Step 2: Verify Environment Variable

1. Go to your backend service in Railway
2. Click **"Variables"** tab
3. Confirm `DATABASE_URL` is set (should be auto-added by Railway)
4. It should look like: `postgresql://user:pass@host:port/dbname`

### Step 3: Redeploy

1. Your backend will automatically detect `DATABASE_URL`
2. It will use PostgreSQL instead of SQLite
3. Migrations will run on PostgreSQL
4. **Data will persist across restarts** ✅

### Step 4: Update Frontend Environment Variable

You need to tell your frontend where the backend is:

**In Railway Frontend Service:**
1. Go to **Variables** tab
2. Add: `VITE_API_BASE_URL` = `https://your-backend-url.railway.app/api`
3. Replace `your-backend-url` with your actual backend Railway URL

**Example:**
```
VITE_API_BASE_URL=https://edureach-backend-production.up.railway.app/api
```

### Step 5: Required Backend Environment Variables

Make sure these are set in your Railway backend service:

```bash
# Required
DATABASE_URL=postgresql://...  # Auto-set by Railway when you add PostgreSQL
GEMINI_API_KEY=your_actual_gemini_api_key
SECRET_KEY=your_secret_key_here

# Recommended
DEBUG=False
ENVIRONMENT=production
ALLOWED_HOSTS=your-backend-domain.railway.app
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.railway.app
```

---

## 🔧 Alternative: SQLite with Persistent Volume (NOT RECOMMENDED)

If you really want to keep SQLite (not recommended for production):

### Option A: Use Railway Volume

1. In Railway backend service, go to **"Settings"**
2. Add a **Volume**
3. Mount path: `/data`
4. Add environment variable: `SQLITE_PATH=/data/db.sqlite3`
5. Redeploy

**Limitations:**
- Volumes may not be available on free tier
- SQLite has concurrency issues
- Not production-ready

### Option B: Accept Data Loss (TESTING ONLY)

If you're just testing and don't care about data persistence:
- Do nothing, but know that **all data will be lost on every restart**
- You'll need to recreate test data after each deployment

---

## 📋 Quick Checklist

- [ ] Add PostgreSQL database in Railway
- [ ] Verify `DATABASE_URL` is set in backend variables
- [ ] Set `VITE_API_BASE_URL` in frontend variables
- [ ] Set `GEMINI_API_KEY` in backend variables
- [ ] Set `SECRET_KEY` in backend variables
- [ ] Set `ALLOWED_HOSTS` in backend variables
- [ ] Set `CORS_ALLOWED_ORIGINS` in backend variables
- [ ] Redeploy both services
- [ ] Test API endpoints

---

## 🎯 Expected Result After Fix

**Backend logs should show:**
```
Running migrations...
  Applying contenttypes.0001_initial... OK
  ...
Collecting static files...
Starting Gunicorn server...
[INFO] Listening at: http://0.0.0.0:8080
```

**Frontend should:**
- Successfully fetch courses, posts, assessments
- No more 500 errors
- Data persists across restarts

---

## 🆘 If You Need Help

**Backend URL format:** `https://[service-name]-production.up.railway.app`
**Frontend URL format:** `https://[service-name]-production.up.railway.app`

Make sure:
1. Backend `CORS_ALLOWED_ORIGINS` includes your frontend URL
2. Frontend `VITE_API_BASE_URL` points to your backend URL
3. Both services are deployed and running

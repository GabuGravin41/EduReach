# 🚀 RAILWAY DEPLOYMENT SETUP GUIDE

**Deploying EduReach to Railway.app**

Backend: `edureach-production.up.railway.app`  
Frontend: `melodious-cooperation-production.up.railway.app`

---

## ✅ FILES YOU HAVE (All Present!)

### Backend ✅
- ✅ `backend/Procfile` - Gunicorn command configured
- ✅ `backend/runtime.txt` - Python 3.11 specified
- ✅ `backend/requirements.txt` - All dependencies listed
- ✅ `backend/manage.py` - Django management
- ✅ `backend/edureach_project/wsgi.py` - WSGI application

### Frontend ✅
- ✅ `railway.json` - Railway configuration
- ✅ `package.json` - Dependencies and build script
- ✅ `vite.config.ts` - Vite build configuration
- ✅ `server.js` - Express server for production
- ✅ `index.html` - Entry point
- ✅ `tsconfig.json` - TypeScript config

### Configuration Files ✅
- ✅ `.gitignore` - Git ignore rules
- ✅ `public/` directory - Static assets
- ✅ Build output will go to `dist/`

---

## 🔧 PRE-DEPLOYMENT SETUP (Do This Now)

### Step 1: Update Settings for Railway

Your settings.py already has the right configuration, but let me verify the DATABASE URL setup:

**Status:** ✅ Already configured! `settings.py` will auto-detect `DATABASE_URL` in production.

### Step 2: Update Frontend Environment Variables

Create `.env.production` file in root:

```bash
# .env.production
VITE_API_BASE_URL=https://edureach-production.up.railway.app/api
VITE_ENVIRONMENT=production
```

### Step 3: Update Vite Config for Environment Variables

Your `vite.config.ts` already loads environment variables correctly!

### Step 4: Verify .gitignore

Make sure these are ignored:
```bash
node_modules/
dist/
.env
.env.local
.env.*.local
```

---

## 📋 RAILWAY DEPLOYMENT CHECKLIST

### Backend Setup (edureach-production.up.railway.app)

#### 1. Create Backend Project on Railway
```
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Select your repository
5. Choose branch (main)
6. Configure root directory: "backend"
```

#### 2. Set Environment Variables
In Railway Dashboard → Your Backend Project → Variables:

```
DEBUG=False
SECRET_KEY=<generate-new-key>
ALLOWED_HOSTS=edureach-production.up.railway.app
CORS_ALLOWED_ORIGINS=https://melodious-cooperation-production.up.railway.app
GEMINI_API_KEY=<your-api-key>
ENVIRONMENT=production
```

#### 3. Add PostgreSQL Database
```
1. In Railway dashboard
2. Click "Add New Service"
3. Select "Database"
4. Choose PostgreSQL
5. Railway auto-populates DATABASE_URL
```

#### 4. Verify Procfile
Already correct:
```
web: gunicorn edureach_project.wsgi:application --bind 0.0.0.0:$PORT
```

#### 5. Deploy Backend
```
1. Push code to GitHub
2. Railway auto-deploys on push
3. Monitor deployment logs
4. Run migrations after first deploy
```

### Frontend Setup (melodious-cooperation-production.up.railway.app)

#### 1. Create Frontend Project on Railway
```
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Select your repository
5. Choose branch (main)
6. Configure root directory: "/" (root)
```

#### 2. Set Build Settings
```
Build Command: npm run build
Start Command: npx serve -s dist -l $PORT
```

#### 3. Set Environment Variables
In Railway Dashboard → Your Frontend Project → Variables:

```
VITE_API_BASE_URL=https://edureach-production.up.railway.app/api
VITE_ENVIRONMENT=production
NODE_ENV=production
```

#### 4. Verify railway.json
Already configured correctly:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npx serve -s dist -l $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 5. Deploy Frontend
```
1. Push code to GitHub
2. Railway auto-deploys on push
3. Monitor deployment logs
```

---

## 🔐 STEP-BY-STEP DEPLOYMENT

### Step 1: Backend Deployment (15 minutes)

**1. Prepare Settings**

Generate new SECRET_KEY:
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

Save the output - you'll need it.

**2. Create Backend Project on Railway**
```
1. Visit https://railway.app/dashboard
2. Click "Create New Project"
3. Select "Deploy from GitHub"
4. Search and select your repository
5. Wait for it to connect
```

**3. Configure Backend Project**
```
1. Click on your project
2. Go to Settings
3. Set Root Directory to: "backend"
4. Save settings
```

**4. Add Database**
```
1. Click "Add Service" → "Database"
2. Select PostgreSQL
3. Click "Create"
4. Rails will auto-add DATABASE_URL to your environment
```

**5. Set Environment Variables**
```
In your Railway project dashboard:

Variables → New Variable:

Name: DEBUG
Value: False

Name: SECRET_KEY
Value: <paste-generated-key>

Name: ALLOWED_HOSTS
Value: edureach-production.up.railway.app

Name: CORS_ALLOWED_ORIGINS
Value: https://melodious-cooperation-production.up.railway.app

Name: GEMINI_API_KEY
Value: <your-gemini-key>

Name: ENVIRONMENT
Value: production
```

**6. Deploy Backend**
```
1. Push latest code to GitHub
2. Railway should auto-detect and deploy
3. Wait for deployment to complete
4. Check logs for errors
```

**7. Run Migrations**

After successful deployment:
```
1. In Railway dashboard, click "Console"
2. Or use: railway run python backend/manage.py migrate
3. Or click your backend service → "Console" tab
4. Run: python manage.py migrate
5. Verify success message
```

**8. Verify Backend**
```bash
curl https://edureach-production.up.railway.app/api/
# Should return API root or authentication error (that's OK)
```

---

### Step 2: Frontend Deployment (15 minutes)

**1. Create Frontend Project on Railway**
```
1. Visit https://railway.app/dashboard
2. Click "Create New Project"
3. Select "Deploy from GitHub"
4. Select your repository
5. This time, DON'T set root directory (use root)
```

**2. Configure Build & Start**
```
In Railway Settings:

Build Command: npm run build
Start Command: npx serve -s dist -l $PORT
```

**3. Set Environment Variables**
```
In your Railway project dashboard:

Variables → New Variable:

Name: VITE_API_BASE_URL
Value: https://edureach-production.up.railway.app/api

Name: NODE_ENV
Value: production

Name: VITE_ENVIRONMENT
Value: production
```

**4. Deploy Frontend**
```
1. Push code to GitHub
2. Railway auto-deploys
3. Wait for build and deployment
4. Check logs
```

**5. Verify Frontend**
```
1. Visit https://melodious-cooperation-production.up.railway.app
2. Should see login page
3. Check browser console (F12) for errors
```

---

## 🧪 TESTING DEPLOYMENT

### Test 1: Backend API

```bash
# Test API is accessible
curl https://edureach-production.up.railway.app/api/

# Test login endpoint
curl -X POST https://edureach-production.up.railway.app/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Should return 401 (not found) or error (that's OK, means API is up)
```

### Test 2: Frontend Loads

```
1. Open https://melodious-cooperation-production.up.railway.app
2. Should see login page
3. Check browser console (F12)
   - No 404 errors
   - No CORS errors
   - No connection refused
```

### Test 3: Complete Workflow

```
1. Login (or register new account)
2. Go to Courses
3. Create new course
4. Add video (use any YouTube video ID)
5. Take lesson
6. Write notes
7. Download notes
8. Test AI chat
9. Create assessment
10. Take assessment
```

### Test 4: Check for Errors

```
Backend logs:
1. Railway Dashboard → Backend Service → Logs
2. Look for:
   - Database connection errors
   - API errors
   - Migration errors

Frontend logs:
1. Browser Console (F12)
2. Network Tab (check for 404/500 errors)
3. Railway Dashboard → Frontend Service → Logs
```

---

## ❌ TROUBLESHOOTING

### Issue: 500 Error on Backend

**Check these:**
```
1. Is database connected? 
   → Check Railway dashboard, verify PostgreSQL service

2. Are environment variables set?
   → Check Variables in Railway dashboard

3. Have migrations run?
   → Railway console: python manage.py migrate

4. Check logs:
   → Railway Dashboard → Backend → Logs
```

### Issue: Frontend Shows Blank Page

**Check these:**
```
1. Is build successful?
   → Check Railway Deploy logs

2. Is API URL correct?
   → Check VITE_API_BASE_URL variable
   → Should be: https://edureach-production.up.railway.app/api

3. Check browser console:
   → F12 → Console tab
   → Look for errors

4. Check Network tab:
   → F12 → Network tab
   → Look for failed requests (404, 500, CORS)
```

### Issue: CORS Error

**Frontend sees:** "Access-Control-Allow-Origin header missing"

**Fix:**
```
1. Backend railway.json:
   Verify: CORS_ALLOWED_ORIGINS includes frontend domain
   Should be: https://melodious-cooperation-production.up.railway.app

2. In Railway variables:
   CORS_ALLOWED_ORIGINS=https://melodious-cooperation-production.up.railway.app

3. Restart backend service:
   Railway Dashboard → Backend → Restart
```

### Issue: API Timeout

**Frontend shows:** "Request timeout" or "Network Error"

**Fix:**
```
1. Check backend is running:
   curl https://edureach-production.up.railway.app/api/

2. Check Railway logs for errors

3. Check backend resource limits:
   Railway → Backend Service → Settings
   May need to upgrade compute

4. AI requests might be slow:
   Default timeout is 30s (backend) / 120s (AI frontend)
```

### Issue: Database Connection Failed

**Backend logs show:** "could not translate host name" or "connection refused"

**Fix:**
```
1. Is PostgreSQL service added?
   → Railway Dashboard → Services
   → Should see "PostgreSQL" service

2. Is DATABASE_URL set?
   → Railway → Variables
   → Should see DATABASE_URL (auto-generated)

3. Restart PostgreSQL:
   → Railway → PostgreSQL → Restart
```

---

## 📊 DEPLOYMENT CHECKLIST

### Before Backend Deployment
- [ ] Generated new SECRET_KEY
- [ ] Updated ALLOWED_HOSTS (edureach-production.up.railway.app)
- [ ] Updated CORS_ALLOWED_ORIGINS (melodious-cooperation-production.up.railway.app)
- [ ] Set GEMINI_API_KEY
- [ ] Created backend project on Railway
- [ ] Set all environment variables
- [ ] Added PostgreSQL database

### Before Frontend Deployment
- [ ] Built locally: `npm run build`
- [ ] No build errors
- [ ] Set VITE_API_BASE_URL correctly
- [ ] Created frontend project on Railway
- [ ] Set NODE_ENV=production
- [ ] Tested locally: `npm run build && npm start`

### After Backend Deployment
- [ ] API is accessible
- [ ] Migrations ran successfully
- [ ] Environment variables visible in Railway dashboard
- [ ] PostgreSQL connected
- [ ] Logs show no critical errors

### After Frontend Deployment
- [ ] Frontend loads
- [ ] API requests go to correct URL
- [ ] No CORS errors in browser console
- [ ] Login page appears
- [ ] Navigation works

### Final Testing
- [ ] Can login/register
- [ ] Can create course
- [ ] Can add video
- [ ] Can write notes
- [ ] Can download notes
- [ ] AI chat works
- [ ] Assessments work
- [ ] No errors in logs

---

## 🔗 USEFUL LINKS

- **Railway Dashboard:** https://railway.app/dashboard
- **Backend URL:** https://edureach-production.up.railway.app
- **Frontend URL:** https://melodious-cooperation-production.up.railway.app
- **Backend Logs:** Railway Dashboard → Backend → Logs
- **Frontend Logs:** Railway Dashboard → Frontend → Logs

---

## 📝 ENVIRONMENT VARIABLES SUMMARY

### Backend (Railway Variables)
```
DEBUG=False
SECRET_KEY=<generated-key>
ALLOWED_HOSTS=edureach-production.up.railway.app
CORS_ALLOWED_ORIGINS=https://melodious-cooperation-production.up.railway.app
GEMINI_API_KEY=<your-key>
ENVIRONMENT=production
DATABASE_URL=<auto-set-by-postgres>
```

### Frontend (Railway Variables)
```
VITE_API_BASE_URL=https://edureach-production.up.railway.app/api
NODE_ENV=production
VITE_ENVIRONMENT=production
```

---

## 🎉 YOU'RE READY!

You have all the files needed:
- ✅ Procfile (backend)
- ✅ runtime.txt (Python 3.11)
- ✅ requirements.txt (dependencies)
- ✅ railway.json (frontend config)
- ✅ package.json (frontend deps)
- ✅ vite.config.ts (build config)
- ✅ server.js (express server)

**Next Step:** Follow the step-by-step deployment guide above!

Expected time: 30-45 minutes total

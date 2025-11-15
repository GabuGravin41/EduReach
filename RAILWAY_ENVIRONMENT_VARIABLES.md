# 🔐 RAILWAY ENVIRONMENT VARIABLES - EXACT VALUES

## Backend Variables (railway.app Dashboard)

### Step 1: Generate SECRET_KEY

Run this command:
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

Copy the output (looks like: `django-insecure-xyz123abc...`)

### Step 2: Set These Variables in Railway

**For Backend Project (edureach-production.up.railway.app):**

| Variable | Value | Notes |
|----------|-------|-------|
| `DEBUG` | `False` | Must be False in production |
| `SECRET_KEY` | Paste generated key | From step 1 above |
| `ALLOWED_HOSTS` | `edureach-production.up.railway.app` | Your backend domain |
| `CORS_ALLOWED_ORIGINS` | `https://melodious-cooperation-production.up.railway.app` | Your frontend domain |
| `GEMINI_API_KEY` | Your actual Gemini API key | Get from Google Cloud |
| `ENVIRONMENT` | `production` | Tells app this is production |

### Step 3: PostgreSQL

Railway will automatically create PostgreSQL and set `DATABASE_URL` for you. You don't need to manually add it.

### Step 4: Verify All Variables

In Railway Dashboard, click "Variables" tab, you should see:
```
✅ DEBUG = False
✅ SECRET_KEY = django-insecure-...
✅ ALLOWED_HOSTS = edureach-production.up.railway.app
✅ CORS_ALLOWED_ORIGINS = https://melodious-cooperation-production.up.railway.app
✅ GEMINI_API_KEY = (hidden, but set)
✅ ENVIRONMENT = production
✅ DATABASE_URL = postgresql://... (auto-generated)
```

---

## Frontend Variables (railway.app Dashboard)

**For Frontend Project (melodious-cooperation-production.up.railway.app):**

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_BASE_URL` | `https://edureach-production.up.railway.app/api` | Where frontend talks to backend |
| `NODE_ENV` | `production` | Production build mode |
| `VITE_ENVIRONMENT` | `production` | Used in frontend code |

### Verify All Variables

In Railway Dashboard, click "Variables" tab, you should see:
```
✅ VITE_API_BASE_URL = https://edureach-production.up.railway.app/api
✅ NODE_ENV = production
✅ VITE_ENVIRONMENT = production
```

---

## 🔄 How to Add Variables to Railway

### Method 1: Railway Dashboard (Easy)

1. Go to https://railway.app/dashboard
2. Click your Backend project
3. Click "Variables" tab
4. Click "New Variable"
5. Enter variable name, then value
6. Click "Deploy Trigger" to redeploy with new variables

### Method 2: Railway CLI

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Set variables
railway variables set DEBUG False
railway variables set SECRET_KEY <your-key>
railway variables set ALLOWED_HOSTS edureach-production.up.railway.app
# ... etc
```

---

## 📝 Step-by-Step Example

### Example: Setting DEBUG Variable

1. Open https://railway.app/dashboard
2. Click "Backend" project (edureach-production)
3. Click "Variables" tab in left sidebar
4. Click "+ New Variable"
5. In "Variable Name" box, type: `DEBUG`
6. In "Variable Value" box, type: `False`
7. Press Enter or click Add
8. See "DEBUG = False" appear in the list
9. Click "Deploy" button (Railway will auto-redeploy)

---

## ✅ Complete Copy-Paste Template

### Backend Variables (Copy and paste these into Railway Variables)

```
DEBUG
False

SECRET_KEY
<PASTE-YOUR-GENERATED-KEY-HERE>

ALLOWED_HOSTS
edureach-production.up.railway.app

CORS_ALLOWED_ORIGINS
https://melodious-cooperation-production.up.railway.app

GEMINI_API_KEY
<PASTE-YOUR-GEMINI-KEY-HERE>

ENVIRONMENT
production
```

### Frontend Variables (Copy and paste these into Railway Variables)

```
VITE_API_BASE_URL
https://edureach-production.up.railway.app/api

NODE_ENV
production

VITE_ENVIRONMENT
production
```

---

## 🔍 Verify Variables Are Set

### Check Backend Variables
```bash
# In Railway Console for backend
echo $DEBUG
echo $SECRET_KEY
echo $ALLOWED_HOSTS
echo $CORS_ALLOWED_ORIGINS
echo $GEMINI_API_KEY
```

### Check Frontend Variables
```bash
# In Railway Console for frontend
echo $VITE_API_BASE_URL
echo $NODE_ENV
echo $VITE_ENVIRONMENT
```

---

## 🚨 Important Notes

1. **SECRET_KEY must be unique** - Generate a new one, don't reuse old ones
2. **DEBUG must be False** - Never set to True in production
3. **CORS_ALLOWED_ORIGINS must match frontend domain exactly** - Including protocol (https://)
4. **GEMINI_API_KEY must be valid** - AI features won't work without it
5. **DATABASE_URL is auto-generated** - Don't manually set it when PostgreSQL is connected

---

## 🧪 Test Variables Are Working

### Test Backend
```bash
curl https://edureach-production.up.railway.app/api/
# Should get a response (401 or JSON), not 500 error
```

### Test Frontend Reaches Backend
```
1. Visit https://melodious-cooperation-production.up.railway.app
2. Open browser console (F12)
3. Look for any CORS errors
4. Try to login - should attempt to connect to backend
```

---

## 📞 If Something Goes Wrong

### Check Backend Logs
```
Railway Dashboard → Backend → Logs tab
Look for:
- "Production validation failed" = env vars missing
- "psycopg2" error = database issue
- "GEMINI_API_KEY" = missing API key
```

### Check Frontend Logs
```
Railway Dashboard → Frontend → Logs tab
Look for:
- Build errors
- Connection refused = backend unreachable
```

---

## 🎯 Ready to Deploy!

1. ✅ Generate SECRET_KEY
2. ✅ Add all backend variables to Railway
3. ✅ Add all frontend variables to Railway
4. ✅ Push code to GitHub
5. ✅ Wait for Railway to deploy
6. ✅ Test!

**Questions?** See RAILWAY_DEPLOYMENT_SETUP.md for detailed guide.

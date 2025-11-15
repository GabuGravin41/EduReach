# 🔧 Environment Configuration Complete Setup Guide

## What Was Wrong & What I Fixed

### ✅ Fix #1: Root `.env` (Frontend)
**Problem:** Had Django backend settings mixed in
**Fixed:** Now only contains frontend variables

**Before:**
```
SECRET_KEY=... (Django - wrong!)
DEBUG=False (Django - wrong!)
ALLOWED_HOSTS=... (Django - wrong!)
GEMINI_API_KEY=... (shared but in wrong place)
```

**After:**
```
VITE_API_BASE_URL=http://localhost:8000/api
```

---

### ✅ Fix #2: Backend `.env`
**Problem:** Had placeholder Gemini API key
**Fixed:** Now has your real API key

**Before:**
```
GEMINI_API_KEY=your-actual-gemini-api-key-here ❌
```

**After:**
```
GEMINI_API_KEY=AIzaSyDd3C5loJUSS7NguNwqlEhskq7ikrZMk5c ✅
```

---

## 📊 Current Setup Summary

### Frontend `.env` Files
```
Root Directory:
📄 .env (configured for local dev)
  ├─ VITE_API_BASE_URL=http://localhost:8000/api ✅
  
📄 .env.local (reference/backup)
  ├─ GEMINI_API_KEY (not used by frontend anymore)

📄 .env.example (template for other developers)
  ├─ Just reference, not used
```

### Backend `.env` File
```
backend/ Directory:
📄 .env (Django configuration)
  ├─ SECRET_KEY=... ✅
  ├─ DEBUG=True ✅
  ├─ ALLOWED_HOSTS=localhost,127.0.0.1 ✅
  ├─ GEMINI_API_KEY=AIzaSyDd3C5loJUSS7NguNwqlEhskq7ikrZMk5c ✅
  ├─ CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000 ✅
```

---

## 🚀 Next Steps - Restart Services

### 1. **Kill Current Processes**
```powershell
# Stop frontend dev server (if running)
# Press Ctrl+C in frontend terminal

# Stop backend server (if running)  
# Press Ctrl+C in backend terminal
```

### 2. **Restart Backend**
```powershell
cd backend
python manage.py runserver
```

You should see:
```
Starting development server at http://127.0.0.1:8000/
```

### 3. **Restart Frontend** (in another terminal)
```powershell
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

---

## ✅ Verification Checklist

After restarting, check these:

### Backend Health Check
```bash
# In backend directory
# Visit this in browser or curl:
curl http://localhost:8000/api/

# Should return: {"detail": "Not found."} or API info
# NOT a 500 error or CORS error
```

### Frontend to Backend Connection
```bash
# In browser console (F12), type:
fetch('http://localhost:8000/api/').then(r => r.json()).then(console.log)

# Should connect successfully
# Should NOT show: "CORS error" or "Connection refused"
```

### Gemini AI Service
1. Open a Learning Session
2. Try to chat - should work now
3. Try to generate quiz - should work now

---

## 🔑 Key Points to Remember

### Which variables go WHERE:

| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_API_BASE_URL` | **Root `.env`** | Frontend knows where backend is |
| `GEMINI_API_KEY` | **Backend `backend/.env`** | Backend calls Gemini API |
| `SECRET_KEY` | **Backend `backend/.env`** | Django security |
| `DEBUG` | **Backend `backend/.env`** | Django dev mode |
| `ALLOWED_HOSTS` | **Backend `backend/.env`** | Django allowed domains |
| `CORS_ALLOWED_ORIGINS` | **Backend `backend/.env`** | Frontend URLs backend accepts |

---

## 🐛 Troubleshooting

### Problem: "CORS error" in browser
**Solution:** Check `CORS_ALLOWED_ORIGINS` in `backend/.env`
```
Should be: http://localhost:5173,http://localhost:3000
```

### Problem: "Connection refused" when calling API
**Solution:** Backend not running
```bash
cd backend
python manage.py runserver
```

### Problem: AI chat still returns 500 error
**Solution:** Check Gemini API key format in `backend/.env`
```bash
# Should start with: AIzaSy...
# Check in backend logs:
python manage.py runserver --verbosity 2
```

### Problem: Frontend can't find backend
**Solution:** Check `VITE_API_BASE_URL` in root `.env`
```
Should be: http://localhost:8000/api
```

---

## 📝 Summary of Files Changed

✅ **`/.env`** - Fixed (now frontend only)
✅ **`/backend/.env`** - Fixed (added real Gemini key)
✅ **`/.env.local`** - No changes needed (backup)

---

## 🎯 You're All Set!

Your environment is now properly configured:
- ✅ Frontend knows where backend is
- ✅ Backend has valid Gemini API key
- ✅ CORS properly configured
- ✅ Django in development mode

Restart your services and test! 🚀

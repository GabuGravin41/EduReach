# 📋 .env Configuration Quick Reference

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR COMPUTER                        │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐      ┌──────────────┐    ┌─────────┐
│  Frontend    │      │   Backend    │    │ Gemini  │
│ (Port 5173)  │      │ (Port 8000)  │    │   API   │
│   React      │◄────►│   Django     │◄──►│ (Cloud) │
│   Vite       │      │  DRF         │    │         │
└──────────────┘      └──────────────┘    └─────────┘
      │ reads               │ reads
      │                     │
      ▼                     ▼
    .env                  .env
    file                  file
```

---

## 📄 File Configuration Details

### ROOT `.env` (edureach/.env)
**Purpose:** Frontend configuration
**Used by:** Vite (React dev server)
**Read when:** Frontend starts

```ini
# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8000/api
```

**What it does:**
- Tells React where the backend API is located
- Frontend uses this URL to make API calls
- Example: `POST http://localhost:8000/api/ai/chat/`

---

### BACKEND `.env` (edureach/backend/.env)
**Purpose:** Django backend configuration
**Used by:** Django when running `python manage.py runserver`
**Read when:** Backend starts

```ini
# Django Settings
SECRET_KEY=django-insecure-...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# External APIs
GEMINI_API_KEY=AIzaSyDd3C5loJUSS7NguNwqlEhskq7ikrZMk5c
GEMINI_MODEL_NAME=gemini-2.5-flash

# Cross-Origin Settings
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**What each does:**

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | Django encryption key for sessions/tokens |
| `DEBUG=True` | Show detailed error pages in development |
| `ALLOWED_HOSTS` | Which domains can access the backend |
| `GEMINI_API_KEY` | Your Google Gemini API key for AI features |
| `CORS_ALLOWED_ORIGINS` | Which frontend URLs are allowed to call this backend |

---

## 🔄 How They Work Together

### Scenario: User chats with AI

```
1. User types message in React frontend
   ↓
2. Frontend reads VITE_API_BASE_URL from /.env
   ↓
3. Frontend sends POST to: http://localhost:8000/api/ai/chat/
   ↓
4. Backend receives request, checks CORS_ALLOWED_ORIGINS
   ✓ Request allowed (http://localhost:5173 is in list)
   ↓
5. Backend uses GEMINI_API_KEY to call Gemini API
   ↓
6. Backend returns response to frontend
   ↓
7. Frontend displays AI response
```

---

## ✅ Your Current Configuration is:

### ✅ ROOT .env
```
VITE_API_BASE_URL=http://localhost:8000/api
```
Status: ✅ CORRECT

### ✅ BACKEND .env
```
SECRET_KEY=django-insecure-your-secret-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
GEMINI_API_KEY=AIzaSyDd3C5loJUSS7NguNwqlEhskq7ikrZMk5c
GEMINI_MODEL_NAME=gemini-2.5-flash
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```
Status: ✅ CORRECT

---

## 🚀 Quick Test Commands

### Test Frontend Can Reach Backend
```powershell
# In frontend directory
curl http://localhost:8000/api/
```
Expected: Response from Django (not an error)

### Test Backend Configuration
```powershell
# In backend directory
python manage.py shell
>>> from django.conf import settings
>>> print(settings.GEMINI_API_KEY)
AIzaSyDd3C5loJUSS7NguNwqlEhskq7ikrZMk5c
```

### Test CORS
```powershell
# Browser console (F12)
fetch('http://localhost:8000/api/').then(r => r.json()).then(console.log)
```
Expected: No CORS error

---

## 📚 Reference: Common Variables Explained

### Frontend Variables (in ROOT .env)

| Variable | Example | Meaning |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Where the backend API is |
| `VITE_GEMINI_KEY` | *(not needed)* | Gemini key never in frontend! |

### Backend Variables (in BACKEND .env)

| Variable | Example | Meaning |
|----------|---------|---------|
| `DEBUG` | `True` | Development mode (show errors) |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Allowed server addresses |
| `GEMINI_API_KEY` | `AIzaSy...` | API key from Google |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Allowed frontend URLs |
| `SECRET_KEY` | `django-insecure-...` | Encryption key for Django |

---

## ⚠️ Important Security Notes

### NEVER do this:
```
❌ Commit .env files to git
❌ Put API keys in frontend .env (exposed!)
❌ Share your GEMINI_API_KEY in public
❌ Set DEBUG=True in production
```

### DO this:
```
✅ Keep backend/.env with real secrets
✅ Keep root/.env for VITE_API_BASE_URL only
✅ Add .env to .gitignore (already done)
✅ Change SECRET_KEY for production
✅ Set DEBUG=False for production
```

---

## 🎯 You're All Set!

Both `.env` files are now correctly configured.

**Next step:** Restart your services
```powershell
# Backend
cd backend
python manage.py runserver

# Frontend (in another terminal)
npm run dev
```

Then test the AI features! 🚀

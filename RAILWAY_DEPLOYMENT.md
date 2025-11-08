# Railway Deployment Guide for EduReach

## Backend Deployment (Django)

### Environment Variables to Set in Railway:

```
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-backend-url.railway.app,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://your-frontend-url.railway.app,http://localhost:3000
GEMINI_API_KEY=your-gemini-api-key
```

### Build Command:
```bash
pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
```

### Start Command:
Already configured in `Procfile`:
```
web: gunicorn edureach_project.wsgi:application --bind 0.0.0.0:$PORT
```

## Frontend Deployment (React + Vite)

### Environment Variables to Set in Railway:

```
VITE_API_BASE_URL=https://your-backend-url.railway.app/api
GEMINI_API_KEY=your-gemini-api-key
```

### Build Command:
```bash
npm install && npm run build
```

### Start Command:
```bash
npx serve -s dist -l $PORT
```

### Install serve package:
Add to package.json dependencies or use in start command.

## Important Notes:

1. **Backend URL Configuration**: 
   - Update `ALLOWED_HOSTS` with your Railway backend URL
   - Update `CORS_ALLOWED_ORIGINS` with your Railway frontend URL

2. **Frontend API Configuration**:
   - Set `VITE_API_BASE_URL` to point to your Railway backend URL
   - The frontend will use this for all API calls

3. **Static Files**:
   - Backend uses `whitenoise` to serve static files
   - Frontend uses `_redirects` file for SPA routing

4. **Database**:
   - Currently using SQLite (not recommended for production)
   - Consider upgrading to PostgreSQL on Railway

5. **Security**:
   - Ensure `DEBUG=False` in production
   - Use strong `SECRET_KEY`
   - HTTPS is enforced when DEBUG=False

## Fixes Applied:

1. ✅ Fixed 405 error by setting `APPEND_SLASH=False` and removing trailing slashes from auth URLs
2. ✅ Added `whitenoise` for static file serving
3. ✅ Added `_redirects` file to fix MIME type errors (SPA routing)
4. ✅ Added production security settings
5. ✅ Configured CORS for production

## Testing After Deployment:

1. Test login at: `https://your-frontend-url/login`
2. Check browser console for errors
3. Verify API calls go to correct backend URL
4. Test all authentication flows

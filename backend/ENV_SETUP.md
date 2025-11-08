# Environment Variables Setup

## Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env`:
   ```env
   SECRET_KEY=your-actual-secret-key
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   GEMINI_API_KEY=your-actual-gemini-api-key
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

## Production (Railway/Render/etc.)

Set these as environment variables in your hosting platform:

### Required
- `SECRET_KEY` - Strong random secret (generate new one for production)
- `DEBUG` - Set to `False`
- `GEMINI_API_KEY` - Your Google Gemini API key
- `ALLOWED_HOSTS` - Your domain(s), e.g., `yourdomain.com,*.up.railway.app`
- `CORS_ALLOWED_ORIGINS` - Your frontend URL(s), e.g., `https://your-app.vercel.app`

### Optional
- `DATABASE_URL` - PostgreSQL connection string (if not using SQLite)
- `REDIS_URL` - Redis connection string (if using caching)

## Railway Example

```bash
railway variables set SECRET_KEY="your-prod-secret-key"
railway variables set DEBUG="False"
railway variables set GEMINI_API_KEY="your-gemini-key"
railway variables set ALLOWED_HOSTS="*.up.railway.app,yourdomain.com"
railway variables set CORS_ALLOWED_ORIGINS="https://your-frontend.vercel.app"
```

## Vercel (Frontend)

Set in Vercel project settings or CLI:

```bash
vercel env add VITE_API_BASE_URL production
# Enter: https://your-backend-domain.up.railway.app/api
```

## Security Notes

- **Never commit `.env` file to git** (it's in `.gitignore`)
- Generate a strong `SECRET_KEY` for production
- Always set `DEBUG=False` in production
- Keep your `GEMINI_API_KEY` private

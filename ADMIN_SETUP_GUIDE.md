# EduReach Admin Setup & Free Trial Guide

## 🔐 Django Admin Panel Access

### Accessing the Admin Panel

**URL:** `https://your-backend-url.railway.app/admin/`

**Current Default Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **IMPORTANT:** Change these credentials immediately after first login!

---

## 🔑 Changing Admin Credentials

### Method 1: Using the Change Password Script (Recommended)

1. **SSH into your Railway backend service** or run locally:
   ```bash
   cd backend
   python change_admin_password.py
   ```

2. Follow the prompts to set:
   - New username (optional)
   - New password (minimum 8 characters)

### Method 2: Using Django Admin Panel

1. Log in to `/admin/`
2. Click on your username in the top right
3. Click "Change password"
4. Enter new password twice
5. Click "Save"

### Method 3: Using Django Shell

```bash
cd backend
python manage.py shell
```

Then run:
```python
from django.contrib.auth import get_user_model
User = get_user_model()

admin = User.objects.get(username='admin')
admin.set_password('your_new_secure_password')
admin.save()
print("Password updated!")
```

---

## 🎁 Free Trial System

### How It Works

**All new users automatically get:**
- ✅ 1 month of **Pro tier** access (FREE)
- ✅ Unlimited courses
- ✅ Unlimited assessments  
- ✅ 200 AI queries per month
- ✅ All Pro features unlocked

**After 30 days:**
- User automatically reverts to **Free tier**
- Unless they upgrade to a paid plan

### Trial Features

**User Model Fields:**
- `trial_started_at` - When trial began
- `trial_ends_at` - When trial expires
- `is_trial_active` - Current trial status
- `original_tier` - Tier to revert to after trial

**Automatic Behavior:**
1. User registers → Trial starts immediately
2. User gets Pro access for 30 days
3. After 30 days → Auto-reverts to Free tier
4. Trial is one-time only (can't restart)

### Checking Trial Status

Users can see their trial status in their profile:
- Days remaining
- Trial expiration date
- Current tier

---

## 📚 Creating Public Courses (Admin)

### Step 1: Log in to Admin Panel

1. Go to `https://your-backend-url.railway.app/admin/`
2. Log in with admin credentials

### Step 2: Create a Course

1. Click **"Courses"** in the left sidebar
2. Click **"Add Course"** button
3. Fill in:
   - **Title:** Course name
   - **Description:** Course details
   - **Owner:** Select your admin user
   - **Is public:** ✅ **CHECK THIS BOX** (important!)
   - **Thumbnail:** Optional image
4. Click **"Save"**

### Step 3: Add Lessons to Course

1. After saving course, scroll down to **"Lessons"** section
2. Click **"Add another Lesson"**
3. Fill in:
   - **Title:** Lesson name
   - **Video ID:** YouTube video ID (e.g., `dQw4w9WgXcQ`)
   - **Video URL:** Full YouTube URL
   - **Duration:** e.g., "15:30"
   - **Order:** Lesson sequence number
   - **Description:** Optional
4. Repeat for all lessons
5. Click **"Save"**

### Step 4: Verify on Dashboard

1. Log out of admin
2. Log in as regular user
3. Check Dashboard → **Recommended Courses**
4. First 3 public courses should appear

---

## 🎯 Dashboard Recommendations

**How it works:**
- Dashboard shows **first 3 public courses**
- Courses must have `is_public = True`
- Ordered by creation date (newest first)
- Updates automatically when you create new courses

**To change recommendations:**
1. Create more public courses in admin
2. The 3 most recent will show on dashboard
3. Or modify the filter in `Dashboard.tsx` for custom logic

---

## 🚀 Deployment Notes

### Environment Variables Needed

**Backend (Railway):**
```bash
DATABASE_URL=postgresql://...  # Auto-set by Railway
SECRET_KEY=your-secret-key-here
GEMINI_API_KEY=your-gemini-key
ALLOWED_HOSTS=your-backend.railway.app
CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app
DEBUG=False
ENVIRONMENT=production
```

**Frontend (Railway):**
```bash
VITE_API_BASE_URL=https://your-backend.railway.app/api
```

### After Changing Admin Password

**The password change persists in the database**, so:
- ✅ Works across deployments
- ✅ Survives container restarts
- ✅ Stored in PostgreSQL (not container)

**Important:** If you change password locally and haven't deployed yet:
1. Run migrations: `python manage.py makemigrations && python manage.py migrate`
2. Commit and push changes
3. Railway will redeploy with new database schema

---

## 📋 Quick Checklist

- [ ] Access admin panel at `/admin/`
- [ ] Change default admin credentials
- [ ] Create 3+ public courses
- [ ] Add lessons to each course
- [ ] Verify courses appear on dashboard
- [ ] Test user registration (should get Pro trial)
- [ ] Confirm trial expires after 30 days

---

## 🆘 Troubleshooting

### Can't access admin panel
- Check backend URL is correct
- Verify backend is deployed and running
- Try: `https://your-backend.railway.app/admin/` (with trailing slash)

### Courses not showing on dashboard
- Ensure `is_public = True` in admin
- Check if courses have lessons
- Verify frontend is fetching from correct API URL

### Trial not starting
- Check if `users.signals` is imported in `apps.py`
- Run migrations: `python manage.py migrate`
- Verify user is not superuser/staff (they don't get trials)

### Password change not persisting
- Make sure you're using PostgreSQL (not SQLite)
- Verify `DATABASE_URL` is set in Railway
- Check database connection in Railway logs

---

## 📞 Support

If you encounter issues:
1. Check Railway deployment logs
2. Verify all environment variables are set
3. Ensure migrations have run successfully
4. Test locally first before deploying

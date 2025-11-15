# 🚀 DEPLOYMENT QUICK REFERENCE

## ⚡ 5-Minute Setup

### Terminal 1: Backend Migrations
```bash
cd backend
python manage.py makemigrations notes
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

**Expected Output:**
```
Migrations for 'notes':
  notes/migrations/0001_initial.py
    - Create model Note

Running migrations:
  Applying notes.0001_initial... OK
```

### Terminal 2: Frontend
```bash
npm run dev
```

**Expected:**
```
Local: http://localhost:5173/
```

### Browser: Test
1. Open http://localhost:5173
2. Login
3. See Dashboard (NO DUMMY COURSES - all from API)
4. Create a course
5. Add YouTube video
6. Play video
7. Write notes
8. Click "PDF" to download
9. ✅ PDF should download

---

## 🎯 Quick Test Checklist

### Minimum Viable Test (5 minutes)
- [ ] Backend migrations succeed
- [ ] Frontend loads
- [ ] Can create a course
- [ ] Course appears in My Courses
- [ ] Can click course and see lesson
- [ ] Video plays
- [ ] Can write notes
- [ ] Can download notes (any format)

### Full Test (30 minutes)
- [ ] Login works
- [ ] Courses load from API
- [ ] Create course with real YouTube video
- [ ] Course validation passes
- [ ] Video plays without errors
- [ ] Transcript displays
- [ ] AI chat works
- [ ] Notes save locally
- [ ] Download TXT/MD/PDF works
- [ ] Create assessment works
- [ ] Take assessment works
- [ ] Quiz generation works
- [ ] Discussions work
- [ ] Can ask questions
- [ ] Can upvote answers

---

## 📊 API Endpoints (Quick Reference)

### Courses
```
GET    /api/courses/              # List courses
POST   /api/courses/              # Create course
GET    /api/courses/{id}/         # Course detail
PATCH  /api/courses/{id}/         # Update
DELETE /api/courses/{id}/         # Delete
```

### Lessons
```
GET    /api/lessons/              # List lessons
POST   /api/lessons/              # Create lesson
PATCH  /api/lessons/{id}/         # Update
GET    /api/lessons/{id}/fetch_transcript/  # Get transcript
```

### Notes (NEW)
```
GET    /api/notes/                          # My notes
POST   /api/notes/save_or_update/           # Save/update for lesson
GET    /api/notes/by_lesson/?lesson_id=1   # Get lesson notes
```

### Assessments
```
GET    /api/assessments/          # List assessments
POST   /api/assessments/          # Create assessment
```

### Discussions
```
GET    /api/community/channels/             # Course discussion channels
GET    /api/community/threads/              # All discussion threads
POST   /api/community/threads/              # Create thread
POST   /api/community/replies/              # Add reply
POST   /api/community/replies/{id}/upvote/  # Upvote
```

---

## 🔧 Common Issues & Fixes

### "No courses showing"
**Problem:** Dummy courses removed, no API courses
**Fix:** 
1. Create a course first
2. Check backend is running
3. Check auth token valid

### "Can't create course"
**Problem:** API error or validation fails
**Fix:**
1. Check backend console for error
2. Check YouTube video is valid
3. Check CORS configured

### "Notes download not working"
**Problem:** File doesn't download
**Fix:**
1. Check notes have content
2. Check browser allows downloads
3. Check console for JavaScript errors

### "Migration failed"
**Problem:** `python manage.py migrate` fails
**Fix:**
```bash
# Show what migrations exist
python manage.py showmigrations

# Check for errors
python manage.py migrate --plan

# If stuck, rollback and retry
python manage.py migrate notes zero
python manage.py migrate notes
```

---

## 📋 Files That Changed

### Backend
- ✅ `backend/notes/models.py` - Note model
- ✅ `backend/notes/views.py` - NoteViewSet
- ✅ `backend/notes/serializers.py` - NoteSerializer
- ✅ `backend/notes/urls.py` - Routes
- ✅ `backend/notes/admin.py` - Admin
- ✅ `backend/edureach_project/settings.py` - Added notes app
- ✅ `backend/edureach_project/urls.py` - Added notes routes

### Frontend
- ✅ `components/NotesPanel.tsx` - Enhanced with download
- ✅ `components/icons/DownloadIcon.tsx` - New icon
- ✅ `src/hooks/useNotesDownload.ts` - New hook
- ✅ `App.tsx` - Removed dummy data

---

## 🚀 Deployment (Choose One)

### Option 1: Railway (Recommended)
```bash
# Backend
cd backend
railway init
railway link
railway deploy

# Frontend
cd ..
railway init
railway link
railway deploy
```

### Option 2: Vercel
```bash
# Frontend only
vercel deploy --prod

# Backend separately on Railway/Heroku
```

### Option 3: Docker
```bash
# Build and run with Docker
docker-compose up -d
```

---

## 🎓 What to Tell Users

### For Course Creation:
1. Click "Create Course"
2. Enter title and description
3. Paste YouTube video URL
4. Click "Validate"
5. Click "Create"
6. Course ready to share!

### For Note Taking:
1. Open course
2. Click "Start Lesson"
3. Write notes in notes panel
4. Click TXT/MD/PDF to download
5. Notes ready to share!

### For Assessments:
1. Click "Assessments"
2. Create exam or AI quiz
3. Take assessment
4. See results
5. Learn from feedback

### For Discussions:
1. Open course
2. Click "Discussions"
3. Ask a question
4. Reply to others
5. Upvote helpful answers

---

## 📞 Support Commands

```bash
# Check backend status
curl http://localhost:8000/api/courses/

# Check frontend status
curl http://localhost:5173/

# Test authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/notes/

# Check database
python manage.py dbshell
SELECT * FROM notes_note;

# Check logs
tail -f backend.log
tail -f frontend.log

# Restart services
python manage.py runserver 0.0.0.0:8000
npm run dev
```

---

## ✅ Pre-Deployment Checklist

- [ ] All migrations applied
- [ ] Frontend loads without errors
- [ ] Backend responds to requests
- [ ] Can create course
- [ ] Can take lesson
- [ ] Can write/download notes
- [ ] Can create assessment
- [ ] Can use discussions
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Database backups configured
- [ ] CORS configured for prod URL
- [ ] SSL/HTTPS enabled
- [ ] Static files configured
- [ ] Email configured (if needed)
- [ ] Logging configured
- [ ] Monitoring set up

---

## 🎉 Success Indicators

After deployment, you should see:
- ✅ Users can create courses
- ✅ Users can watch videos
- ✅ Users can take notes
- ✅ Users can download notes
- ✅ Users can create assessments
- ✅ Users can participate in discussions
- ✅ No 404 errors
- ✅ No 500 errors
- ✅ Fast load times
- ✅ Responsive on mobile
- ✅ Works on all browsers

---

## 🚦 Go/No-Go Decision

### ✅ GO TO PRODUCTION IF:
- [x] All migrations applied
- [x] All tests pass
- [x] No console errors
- [x] Backend responding
- [x] Frontend loading
- [x] All features working
- [x] Database backed up
- [x] Environment vars set
- [x] Monitoring configured

### ❌ DO NOT DEPLOY IF:
- [ ] Migrations failing
- [ ] Tests failing
- [ ] Console errors present
- [ ] Features broken
- [ ] No backups
- [ ] Missing env vars
- [ ] CORS not configured
- [ ] SSL not set up

---

## 📊 Performance Targets

- ✅ Page load < 3 seconds
- ✅ API response < 500ms
- ✅ Video playback smooth
- ✅ Notes save instantly
- ✅ PDF download < 2 seconds
- ✅ Discussion load < 1 second
- ✅ Mobile Lighthouse > 80

---

## 🔐 Security Checklist

- [ ] CORS properly configured
- [ ] Auth tokens working
- [ ] HTTPS enabled
- [ ] CSRF protection on
- [ ] SQL injection prevented (Django ORM)
- [ ] XSS prevented (React default)
- [ ] No sensitive data in frontend
- [ ] API validation present
- [ ] Database encrypted
- [ ] Backups encrypted

---

## 📞 Emergency Contacts

- Backend Issues: Check logs, restart service
- Frontend Issues: Clear cache, hard refresh (Ctrl+Shift+R)
- Database Issues: Check connection, verify credentials
- API Issues: Check CORS, verify endpoints

---

**Ready to deploy!** 🚀

Questions? Check:
1. DEPLOYMENT_READY.md (detailed guide)
2. DEPLOYMENT_WORKFLOW.md (architecture)
3. Backend logs
4. Browser console
5. Network tab (F12)

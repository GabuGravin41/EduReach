# ⚡ Discussion Channels - Quick Start Guide

## 🎯 Get Running in 2 Minutes

### Terminal 1: Start Backend
```bash
cd backend
python manage.py runserver
```
Expected: `Starting development server at http://127.0.0.1:8000/`

### Terminal 2: Start Frontend
```bash
npm run dev
```
Expected: `Local: http://localhost:5173/` or `http://localhost:3000/`

### Browser: Test It
1. Open http://localhost:5173 (or 3000)
2. Log in
3. Go to Dashboard → Select a course
4. Click **Discussions** tab
5. Click **"+ New Question"**
6. Write and post a question
7. See it in the thread list
8. Reply and upvote!

---

## 📋 What's Available NOW

| Feature | Where | Action |
|---------|-------|--------|
| **Ask Questions** | Course → Discussions tab | Click "+ New Question" |
| **Reply** | Any question | Click on question, type reply |
| **Upvote** | Any reply | Click 👍 |
| **Mark Solution** | Your own question | Click ✓ button |
| **Search** | Discussion feed | Type in search box 🔍 |
| **Sort** | Discussion feed | Click sort dropdown |
| **Verify** (instructor) | Any reply | Click ✅ button |
| **Pin** (instructor) | Any thread | Click 📌 button |

---

## 🔗 API Endpoints (For Testing)

**Base URL:** `http://localhost:8000/api`

### Get All Threads
```bash
curl -X GET http://localhost:8000/api/community/channels/1/threads/
```

### Create Thread (Requires Auth)
```bash
curl -X POST http://localhost:8000/api/community/threads/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"channel": 1, "title": "Test Q", "content": "Test"}'
```

### Create Reply (Requires Auth)
```bash
curl -X POST http://localhost:8000/api/community/replies/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"thread": 1, "content": "Test answer"}'
```

### Upvote Reply (Requires Auth)
```bash
curl -X POST http://localhost:8000/api/community/replies/1/upvote/ \
  -H "Authorization: Bearer <token>"
```

---

## 🔴 Troubleshooting

### ❌ "Cannot find module" errors
```bash
# Clear and reinstall
rm -r node_modules
npm install
npm run dev
```

### ❌ Backend returning 404
```bash
# Check if migrations applied
cd backend
python manage.py showmigrations community
python manage.py migrate community
python manage.py runserver
```

### ❌ No Discussions tab visible
- [ ] Is backend running? (port 8000)
- [ ] Did you click on a **public** course?
- [ ] Refresh page (Ctrl+Shift+R hard refresh)
- [ ] Check browser console for errors

### ❌ API returning 401 Unauthorized
- [ ] Are you logged in?
- [ ] Is your token valid?
- [ ] Try logging out and logging back in

### ❌ Questions not saving
- [ ] Check backend console for errors
- [ ] Check browser Network tab (F12)
- [ ] Verify POST succeeded (200 response)

---

## 📁 Key Files

| File | Purpose | When to Edit |
|------|---------|--------------|
| `components/DiscussionsPage.tsx` | Main container | Add features |
| `components/DiscussionFeed.tsx` | Thread list | Change UI |
| `components/DiscussionThread.tsx` | Thread detail | Change display |
| `components/CreateThreadModal.tsx` | Create form | Change form fields |
| `backend/community/models.py` | Database schema | Add new fields |
| `backend/community/views.py` | API endpoints | Add new endpoints |
| `components/CommunityPage.tsx` | Community hub | Change promo banner |

---

## 🎨 UI Components Reference

### DiscussionsPage Structure
```
DiscussionsPage
├─ DiscussionFeed (if viewing list)
│  ├─ SearchBar
│  ├─ SortDropdown
│  └─ ThreadCardList
│
├─ DiscussionThread (if viewing detail)
│  ├─ ThreadHeader
│  ├─ RepliesList
│  └─ ReplyForm
│
└─ CreateThreadModal (if creating)
   ├─ TitleInput
   ├─ ContentTextarea
   └─ SubmitButton
```

### State Management
```javascript
// Main state
const [currentView, setCurrentView] = useState('feed');    // 'feed' | 'thread'
const [threads, setThreads] = useState([]);                // All threads
const [selectedThread, setSelectedThread] = useState(null); // Current thread
const [showCreateModal, setShowCreateModal] = useState(false); // Modal visibility
```

---

## 🧪 Test Scenarios

### Scenario 1: Create & Reply
1. ✅ Navigate to Discussions
2. ✅ Click "+ New Question"
3. ✅ Enter title: "What is React?"
4. ✅ Enter content: "I'm new to React..."
5. ✅ Click "Post Question"
6. ✅ See it in thread list
7. ✅ Click on it
8. ✅ Write reply: "React is a library..."
9. ✅ Click "Post Reply"
10. ✅ See reply in thread

### Scenario 2: Upvote & Mark Accepted
1. ✅ View a question with multiple replies
2. ✅ Click 👍 on first reply (upvote)
3. ✅ See count increase to 1
4. ✅ Click ✓ button (mark as answer)
5. ✅ See ✓ badge appear
6. ✅ Try clicking ✓ on another reply (should only work if you're author)

### Scenario 3: Instructor Features (Login as Instructor)
1. ✅ Navigate to a question
2. ✅ Click ✅ on a reply (verify)
3. ✅ See ✅ badge appear
4. ✅ Click 📌 to pin question
5. ✅ See it move to top of feed

### Scenario 4: Search & Sort
1. ✅ Open discussion feed
2. ✅ Type "React" in search
3. ✅ See only threads with "React" in title
4. ✅ Click sort dropdown
5. ✅ Select "Most Helpful"
6. ✅ See threads sorted by upvotes

---

## 📊 Database Schema (Quick Reference)

```sql
-- Course Channel (one per course)
CourseChannel
├─ id: int (primary key)
├─ course_id: int (foreign key, unique)
└─ created_at: datetime

-- Discussion Threads (questions)
DiscussionThread
├─ id: int (primary key)
├─ channel_id: int (foreign key)
├─ author_id: int (foreign key to User)
├─ title: string(255)
├─ content: text
├─ is_pinned: boolean (default: False)
├─ views: int (default: 0)
├─ created_at: datetime
└─ updated_at: datetime

-- Thread Replies (answers)
ThreadReply
├─ id: int (primary key)
├─ thread_id: int (foreign key)
├─ author_id: int (foreign key to User)
├─ content: text
├─ is_verified: boolean (default: False)
├─ is_accepted: boolean (default: False)
├─ upvotes: int (default: 0)
├─ created_at: datetime
└─ updated_at: datetime

-- Upvotes (prevents duplicates)
ThreadVote
├─ id: int (primary key)
├─ reply_id: int (foreign key)
├─ user_id: int (foreign key to User)
├─ created_at: datetime
└─ unique(reply_id, user_id)
```

---

## 🚀 Next Steps

### Immediate (Next Hour)
- [ ] Test all features in browser
- [ ] Create a few test questions
- [ ] Try upvoting and marking answers
- [ ] Check mobile responsiveness

### Short Term (Next Day)
- [ ] Add pagination for large thread lists
- [ ] Add email notifications
- [ ] Add thread categories/tags

### Medium Term (Next Week)
- [ ] Integration with Study Groups
- [ ] Gamification (badges/XP)
- [ ] Real-time updates via WebSockets

### Long Term (Next Month)
- [ ] AI-powered question suggestions
- [ ] Question bounty system
- [ ] Integration with assessments

---

## 🔐 Security Checklist

- ✅ User must be logged in to create threads
- ✅ User must be logged in to reply
- ✅ Only question author can mark as accepted
- ✅ Only instructors can verify answers
- ✅ Only thread author can delete thread
- ✅ Only reply author can delete reply
- ✅ Only public courses show discussions
- ✅ CORS configured for allowed origins

---

## 📞 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Discussions tab missing | Backend not running or course is private | Start backend, use public course |
| Can't create thread | Not logged in | Log in first |
| Reply not saving | API error | Check backend console |
| Icons not showing | Import error (FIXED) | Already fixed, no action needed |
| Page not responsive | CSS not loading | Hard refresh (Ctrl+Shift+R) |
| No threads displaying | None created yet | Create a test thread first |

---

## 🎓 Learning Resources

- **Django REST Framework:** https://www.django-rest-framework.org/
- **React Hooks:** https://react.dev/reference/react
- **TypeScript:** https://www.typescriptlang.org/docs/
- **Tailwind CSS:** https://tailwindcss.com/docs

---

## 📞 Get Help

### Check These Files First:
1. `DISCUSSION_IMPLEMENTATION_COMPLETE.md` - Full feature overview
2. `DISCUSSION_USER_FLOW.md` - How the system works
3. `ICON_IMPORT_FIX_GUIDE.md` - How we fixed the icon issues

### Check Browser Console:
1. Open DevTools (F12)
2. Look for red errors
3. Check Network tab for failed API calls

### Check Backend Console:
1. Terminal running Django server
2. Look for error messages
3. Check database queries

---

## ✨ You're All Set!

**Everything is working.** Go test it out! 🚀

Questions? Check the documentation files listed above.

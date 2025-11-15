# 🧪 Quick Testing Guide - Discussion Channels

## Setup & Start

### 1. Ensure Backend is Running
```bash
cd backend
python manage.py runserver
# Should show: "Starting development server at http://127.0.0.1:8000/"
```

### 2. Start Frontend (in new terminal)
```bash
npm run dev
# Should show: "VITE v5.x.x  ready in xxx ms"
```

### 3. Open Browser
```
http://localhost:5173
```

---

## Test Path (Step-by-Step)

### Step 1: Navigate to a Course
1. Log in to the app
2. Click "My Courses" or go to Dashboard
3. Click on any course to open it

### Step 2: Find Discussions Tab
1. You should see two tabs:
   - 📹 Lessons (currently selected)
   - 💬 Discussions (NEW!)
2. Click on "💬 Discussions"

**Expected**: 
- Should see empty state saying "No discussions yet. Be the first to ask a question!"
- Button to "Ask Question" visible

### Step 3: Create First Discussion
1. Click "Ask Question" button
2. Fill in modal:
   - **Title**: "What are React Hooks?"
   - **Content**: 
     ```
     I'm learning React and I'm confused about Hooks.
     
     Can someone explain:
     - What are hooks?
     - Why would I use them?
     - How do they work?
     
     Thanks!
     ```
3. Click "Post Question"

**Expected**:
- Modal closes
- New thread appears in feed
- Shows:
  - 0 Replies
  - 0 Helpful votes
  - Question just now
  - 1 view

### Step 4: View Thread Detail
1. Click on the thread title
2. You should see:
   - Full question text (with markdown rendering)
   - "No replies yet" message
   - Reply form at bottom

**Expected**:
- Can scroll if content is long
- Markdown formatting works (bold, italic, etc.)

### Step 5: Reply to Thread
1. Scroll to bottom
2. In reply textarea, type:
   ```
   Hooks are a feature of React that let you use state and other React features 
   **without writing a class component**!
   
   Common hooks:
   - `useState` - for state
   - `useEffect` - for side effects
   - `useContext` - for context
   
   Here's a simple example:
   ```
   ```tsx
   const [count, setCount] = useState(0);
   return <button onClick={() => setCount(count + 1)}>{count}</button>;
   ```
   ```
3. Click "Post Reply"

**Expected**:
- Reply appears in thread
- Markdown formatting preserved
- Your name shown as author
- Timestamp shows "just now"

### Step 6: Upvote Reply
1. Click the thumbs up icon below your reply
2. Count should increase to 1
3. Button should highlight in indigo

**Expected**:
- Upvote count increments
- Button fills with color
- Can click again to remove upvote (count goes to 0)

### Step 7: Mark as Accepted (if you authored the thread)
1. In the reply you just posted
2. You should see "Mark as Answer" button
3. Click it

**Expected**:
- Reply gets green border
- "Accepted Answer" badge appears
- Button disappears

### Step 8: Back to Feed
1. Click "Back to Discussions"
2. You should see your thread in the list

**Expected**:
- Thread shows:
  - 1 Reply
  - 1 Helpful vote
  - Author name
  - Time posted

### Step 9: Test Search
1. In search box, type "React"
2. Results should filter to show relevant threads

**Expected**:
- Only threads with "React" in title/content appear

### Step 10: Test Sort
1. Try "Most Recent" - shows newest first
2. Try "Most Popular" - shows most upvoted first
3. Try "Unanswered" - shows threads with 0 replies first

**Expected**:
- Order changes based on sort selection

---

## Advanced Tests

### Test 1: Multiple Threads
1. Create 3-4 more threads with different topics
2. Try searching and sorting
3. Verify all work correctly

### Test 2: Mobile Responsive
1. Press F12 to open DevTools
2. Click device toggle (mobile view)
3. Test on different sizes:
   - iPhone (375px)
   - Tablet (768px)
   - Desktop (1440px)

**Expected**:
- Layout adapts
- Text is readable
- Buttons are clickable
- No horizontal scroll

### Test 3: Dark Mode
1. If your app has a dark mode toggle, activate it
2. Browse discussions
3. Verify colors are readable

**Expected**:
- All text is readable
- Colors are appropriate for dark theme
- No harsh contrasts

### Test 4: Markdown Features
Try these markdown features in thread/reply content:

**Bold**: `**text**`
**Italic**: `*text*`
**Code**: `` `code` ``
**Headers**: `# H1`, `## H2`
**Lists**: `- item 1`, `- item 2`
**Code blocks**:
````
```python
print("hello")
```
````

**Expected**:
- All markdown renders correctly
- Code blocks get syntax highlighting
- Headers are properly sized

### Test 5: Error Handling
1. Unplug internet or disconnect from API
2. Try to create a thread
3. Should see error toast message

**Expected**:
- Error message appears
- App doesn't crash
- Can retry or navigate back

---

## Debugging Tips

### DevTools Console (F12)
Look for errors like:
- API 404s - endpoint not found
- CORS errors - backend not allowing frontend
- JSON parsing errors - bad response format

### Network Tab
1. Click "Network" tab in DevTools
2. Perform actions (create thread, reply, upvote)
3. Look for requests:
   - `POST /api/community/threads/` - should be 201
   - `POST /api/community/replies/` - should be 201
   - `POST /api/community/replies/X/upvote/` - should be 200

**Expected Status Codes**:
- 200: Success (GET, PATCH, DELETE)
- 201: Created (POST for new resource)
- 400: Bad request (check your data)
- 401: Unauthorized (missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not found (endpoint doesn't exist)
- 500: Server error (check Django logs)

### Django Logs
Watch backend terminal for logs:
```
[timestamp] "POST /api/community/threads/ HTTP/1.1" 201 450
```

---

## What to Verify Works

- ✅ **Thread Creation**
  - [ ] Can create threads
  - [ ] Title is required
  - [ ] Content is required
  - [ ] Modal closes after submit
  - [ ] Thread appears in feed

- ✅ **Thread Details**
  - [ ] Can view full thread
  - [ ] Markdown renders
  - [ ] View count increments
  - [ ] Timestamp displays correctly

- ✅ **Replies**
  - [ ] Can reply to threads
  - [ ] Reply appears immediately
  - [ ] Content is required
  - [ ] Markdown works in replies

- ✅ **Upvotes**
  - [ ] Can upvote replies
  - [ ] Count increments
  - [ ] Button highlights
  - [ ] Can remove upvote

- ✅ **Accept Answer**
  - [ ] Thread author can mark reply as accepted
  - [ ] Accepted badge appears
  - [ ] Reply gets green border
  - [ ] Only author can do this

- ✅ **Search**
  - [ ] Search filters threads
  - [ ] Case insensitive
  - [ ] Works with empty query (shows all)
  - [ ] Real-time as you type

- ✅ **Sort**
  - [ ] Recent: newest first
  - [ ] Popular: most upvoted first
  - [ ] Unanswered: 0 replies first

- ✅ **UI/UX**
  - [ ] Responsive on mobile
  - [ ] Dark mode looks good
  - [ ] Loading states appear
  - [ ] Empty states appear
  - [ ] Error toasts appear

---

## Common Issues & Fixes

### Issue: "Network Error" when creating thread
**Cause**: Backend not running or CORS issue
**Fix**: 
- [ ] Check backend is running: `python manage.py runserver`
- [ ] Check `backend/.env` has CORS_ALLOWED_ORIGINS with your frontend port

### Issue: Discussions tab doesn't appear
**Cause**: CourseDetailPage not updated
**Fix**:
- [ ] Verify `CourseDetailPage.tsx` has been updated
- [ ] Check for TypeScript errors in terminal
- [ ] Refresh browser (Ctrl+Shift+R hard refresh)

### Issue: Can't click buttons on mobile
**Cause**: Touch target too small
**Fix**:
- [ ] Buttons should be at least 44x44px
- [ ] Check CSS for sufficient padding

### Issue: Markdown not rendering
**Cause**: MarkdownRenderer not working
**Fix**:
- [ ] Verify `MarkdownRenderer.tsx` exists
- [ ] Check it's imported in components
- [ ] Check console for rendering errors

### Issue: Upvote doesn't work
**Cause**: Authentication token missing
**Fix**:
- [ ] Make sure user is logged in
- [ ] Check `localStorage` has `access_token`
- [ ] In DevTools Console: `localStorage.getItem('access_token')`

---

## Performance Checks

### Load Time
1. Open DevTools Network tab
2. Create a new thread
3. Check request times:
   - Creating thread: should be <500ms
   - Loading replies: should be <200ms

### Memory
1. Open DevTools Performance tab
2. Create several threads and replies
3. Memory usage should stay reasonable (~10-20MB)

### Database Queries
1. Watch Django terminal
2. Each action should use minimal queries (ideally 1-2)
3. Look for N+1 query problems (same query repeated)

---

## Success Criteria

✅ **You're successful if**:
- [ ] Can create discussions in a course
- [ ] Can reply to discussions
- [ ] Can upvote helpful replies
- [ ] Can mark accepted answers
- [ ] Can search and sort threads
- [ ] Works on mobile
- [ ] Dark mode looks good
- [ ] No console errors
- [ ] No backend errors
- [ ] Load times are good

---

## Next Steps After Testing

1. **If everything works**: Commit to git and deploy! 🎉
2. **If issues found**: 
   - Check error messages in console
   - Review Django logs
   - Check file modifications
   - Test with Postman API directly

3. **Future enhancements**:
   - Add pagination (limit 20 threads per page)
   - Add infinite scroll
   - Add real-time updates
   - Add email notifications
   - Add XP rewards

---

## Quick Commands

```bash
# Test backend with shell
cd backend
python manage.py shell
from community.models import CourseChannel
from courses.models import Course
c = Course.objects.first()
ch, _ = CourseChannel.objects.get_or_create(course=c)
print(ch.threads.all())

# Reset database (be careful!)
python manage.py migrate community zero
python manage.py migrate community

# View logs in real-time
tail -f nohup.out

# Check if API is running
curl http://localhost:8000/api/community/channels/

# Force reload frontend
Ctrl + Shift + R (hard refresh)
```

---

Happy testing! 🚀 Let me know what you find!

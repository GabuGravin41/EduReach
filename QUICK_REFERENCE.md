# ⚡ Quick Reference Card - Community Features

## What to Build First

```
┌─────────────────────────────────────────────────────────────┐
│                    🎤 DISCUSSION CHANNELS                   │
│                        (Start Here)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  IMPACT:    ⭐⭐⭐⭐⭐ (Solves core problem)                 │
│  EFFORT:    3-4 days (Very manageable)                    │
│  COMPLEXITY: ⭐⭐ (Easy - basic CRUD + threading)         │
│  USER VALUE: Very High (Students need Q&A)                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  What It Does:                                             │
│  ✓ Every course gets a discussion channel                 │
│  ✓ Students ask questions about course                    │
│  ✓ Peers provide answers (threaded replies)              │
│  ✓ Instructors can verify correct answers               │
│  ✓ Most helpful answers float to top (upvotes)          │
│  ✓ Searchable by topic                                   │
│                                                             │
│  User Experience:                                          │
│  Course Page → Click "Discussions" tab                    │
│    ↓                                                       │
│  See all Q&A for this course                              │
│    ↓                                                       │
│  Click question → See all replies                         │
│    ↓                                                       │
│  Upvote helpful answer → Float to top                     │
│    ↓                                                       │
│  Instructor verifies → Gets checkmark ✅                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Backend (Copy-Paste Ready Code in DISCUSSION_CHANNELS_BUILD.md)

```
Step 1: Models (Copy from guide)
├─ CourseChannel (one per course)
├─ DiscussionThread (questions/topics)
├─ ThreadReply (answers to questions)
└─ ThreadVote (track upvotes)

Step 2: Serializers
├─ UserBasicSerializer
├─ ThreadReplySerializer
├─ DiscussionThreadSerializer
└─ CourseChannelSerializer

Step 3: ViewSets
├─ CourseChannelViewSet
├─ DiscussionThreadViewSet
├─ ThreadReplyViewSet
└─ UpvoteReplyView

Step 4: Wire URLs → Done!

Step 5: Test
├─ Django shell test
└─ Postman test
```

### Frontend

```
Components to Build:
├─ CourseDetailPage.tsx (add Discussions tab)
├─ DiscussionFeed.tsx (list all threads)
├─ DiscussionThreadDetail.tsx (view thread)
├─ ThreadReplyCard.tsx (individual reply)
├─ ReplyForm.tsx (create reply)
└─ CreateThreadModal.tsx (new question)

Connect to APIs:
├─ useQuery for GET threads/replies
├─ useMutation for POST/PATCH replies
├─ Upvote handler
└─ Error handling
```

---

## Files to Read (In Order)

```
1. COMMUNITY_STRATEGY_SUMMARY.md
   └─ Read this to understand the VISION
   └─ Time: 10 minutes

2. COMMUNITY_PRIORITIES.md
   └─ See why Discussion is #1
   └─ Time: 5 minutes

3. DISCUSSION_CHANNELS_BUILD.md
   └─ Step-by-step implementation
   └─ Copy-paste all code
   └─ Time: 1-2 hours (for reference while building)

REFERENCE WHILE BUILDING:
├─ FEATURE_MATRIX.md (API endpoints, components)
├─ COMMUNITY_ECOSYSTEM_VISUAL.md (how it connects)
└─ COMMUNITY_PAGE_VISION.md (detailed specs)
```

---

## Timeline

```
TODAY (30 min)
├─ Read COMMUNITY_STRATEGY_SUMMARY
└─ Decide to build Discussion Channels

MONDAY-TUESDAY (Backend)
├─ Models + Serializers
├─ ViewSets + URLs
└─ Test with Postman

WEDNESDAY-THURSDAY (Frontend)
├─ Build React components
├─ Connect to APIs
└─ Test end-to-end

FRIDAY
├─ Deploy to staging
└─ Get first user feedback
```

---

## Key Data Models

```
CourseChannel
├─ One per Course
└─ Links Course to discussions

DiscussionThread
├─ Question/topic in a channel
├─ Has author, title, content
├─ Can be pinned by instructor
└─ Tracks view count

ThreadReply
├─ Answer to a question
├─ Has author, content
├─ Can be marked as "accepted" by question author
├─ Can be marked as "verified" by instructor
├─ Has upvote count
└─ Replies sorted by: accepted > verified > upvotes

ThreadVote
├─ Tracks who upvoted what
└─ Ensures unique votes per user
```

---

## API Endpoints

```
GET    /api/community/channels/
       → List all course channels

GET    /api/community/channels/{id}/threads/
       → Get all threads in a course

POST   /api/community/threads/
       → Create new discussion thread

GET    /api/community/threads/{id}/
       → Get thread detail (with all replies)

POST   /api/community/replies/
       → Create reply to thread

POST   /api/community/replies/{id}/upvote/
       → Toggle upvote on reply

POST   /api/community/threads/{id}/pin/
       → Instructor pins thread

POST   /api/community/replies/{id}/verify/
       → Instructor marks as verified
```

---

## Component Layout

```
Course Detail Page
├─ 📹 LESSONS tab (existing)
├─ 🎓 ASSESSMENTS tab (existing)
│
└─ 💬 DISCUSSIONS tab (NEW!)
   │
   ├─ SearchBar + Filter
   │
   ├─ ThreadCard[] (Listed)
   │  ├─ Title
   │  ├─ Author + time
   │  ├─ Preview
   │  ├─ Reply count
   │  └─ Click → Detail
   │
   └─ ThreadDetail (Expanded)
      ├─ Header
      │  ├─ Title
      │  ├─ Author + time
      │  └─ Pin button
      │
      ├─ Content
      │
      ├─ ReplyCard[] (Listed by helpful)
      │  ├─ Author + time
      │  ├─ Content
      │  ├─ Upvotes
      │  ├─ ✅ Verified badge (if instructor)
      │  ├─ ✓ Accepted badge (if OP chose)
      │  └─ Upvote button
      │
      └─ ReplyForm
         ├─ Textarea
         ├─ Submit button
         └─ Login prompt (if not authed)
```

---

## Success Criteria

```
✅ Backend Ready
├─ Models created
├─ Migrations applied
├─ APIs tested
└─ Code merged

✅ Frontend Ready
├─ Components built
├─ APIs connected
├─ Responsive design
└─ Error handling

✅ User Tested
├─ Can create thread
├─ Can reply
├─ Can upvote
├─ Loads fast (<2s)
└─ Mobile works
```

---

## Then What?

After Discussion Channels launches successfully:

```
Week 3-4: Study Groups (Priority 2)
├─ Why: Cohort learning 2x retention
├─ Build: 4-5 days
└─ Impact: Very High

Week 5: Gamification (Priority 3)
├─ Why: Badges motivate
├─ Build: 3-4 days
└─ Impact: High

Week 6+: Polish & Launch Full Platform
├─ Follow system
├─ Challenges
├─ Trending & discovery
└─ Performance tuning
```

---

## Common Mistakes (Avoid These!)

```
❌ Building all 6 features at once
✅ Start with 1 feature, launch, get feedback

❌ Over-engineering the first version
✅ Get basic version working, then add features

❌ Forgetting mobile responsive design
✅ Test on phone from day 1

❌ Not testing with real users
✅ Get feedback early and often

❌ Ignoring performance (N+1 queries)
✅ Use select_related/prefetch_related in serializers

❌ Building without specs
✅ You have all specs! Read DISCUSSION_CHANNELS_BUILD.md

❌ Perfectionism on UI
✅ Ship MVP, iterate based on feedback
```

---

## Quick Wins (Do These First)

```
If you want immediate value before building full features:

1. Add course linking to existing posts (1 hour)
   └─ Post.course = ForeignKey to Course
   └─ Filter posts by course

2. Add follow system (3 hours)
   └─ UserFollow model
   └─ Follow button on profile
   └─ Show followers count

3. Auto-award badges on course completion (2 hours)
   └─ Simple: Add "Course Completionist" badge
   └─ When user completes course → Award badge
   └─ Display on profile

These give immediate community engagement wins
while you build the bigger features!
```

---

## Code Locations

```
Backend Files:
├─ Models:      backend/community/models.py
├─ Serializers: backend/community/serializers.py
├─ Views:       backend/community/views.py
├─ URLs:        backend/community/urls.py
└─ Admin:       backend/community/admin.py

Frontend Files:
├─ Components:  components/*.tsx
├─ Hooks:       src/hooks/*.ts
├─ Services:    services/geminiService.ts (for API calls)
└─ Styling:     Tailwind classes (already set up)

Config Files:
├─ Backend URL: backend/.env (CORS settings)
└─ Frontend URL: root/.env (VITE_API_BASE_URL)
```

---

## Debugging Tips

```
Backend Issues:
├─ Check migrations applied: python manage.py showmigrations
├─ Check model syntax: python manage.py shell
├─ Check serializer: Test with Postman
├─ Check ViewSet: Print self.queryset
└─ Check permissions: Ensure DRF auth configured

Frontend Issues:
├─ Check API response: Browser DevTools Network tab
├─ Check component render: React DevTools
├─ Check hooks: useMutation, useQuery errors
├─ Check styling: Tailwind classes
└─ Check responsive: Dev tools mobile view

Common Errors:
├─ 404: Check URL routing
├─ 403: Check permissions
├─ 500: Check backend logs
├─ CORS: Check backend/.env CORS_ALLOWED_ORIGINS
└─ Null replies: Check prefetch_related in serializer
```

---

## Resources

```
Full Documentation:
├─ COMMUNITY_INDEX.md (you are here!)
├─ COMMUNITY_STRATEGY_SUMMARY.md (overview)
├─ COMMUNITY_PAGE_VISION.md (detailed specs)
├─ DISCUSSION_CHANNELS_BUILD.md (implementation)
└─ FEATURE_MATRIX.md (reference)

Code Templates:
└─ All in DISCUSSION_CHANNELS_BUILD.md (copy-paste ready!)

Testing:
├─ Django shell commands in DISCUSSION_CHANNELS_BUILD.md
├─ Postman curl examples in DISCUSSION_CHANNELS_BUILD.md
└─ Frontend testing: Build components, test manually

Deployment:
├─ Push to git when backend tested
├─ Deploy to staging
├─ Get user feedback
├─ Deploy to production
```

---

## One-Liner Summary

```
🚀 Transform your boring community page into a learning hub
   where students discuss courses, form study groups,
   earn badges, and complete courses together.
   
💪 Start with discussion channels this week.
   Get it live in 2 weeks. Change your retention rates forever.
```

---

Ready? Open **DISCUSSION_CHANNELS_BUILD.md** and start building! 🚀

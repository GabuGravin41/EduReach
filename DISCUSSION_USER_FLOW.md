# 📊 Discussion Channels - User Flow & Interactions

## 🎯 Student User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│  STUDENT USER FLOW                                                  │
└─────────────────────────────────────────────────────────────────────┘

START: Dashboard
  ↓
SELECT A COURSE (must be public)
  ↓
COURSE DETAIL PAGE
  ├─── Lessons Tab ────→ View video lessons
  ├─── Assessments Tab ─→ Take quizzes
  └─── Discussions Tab ─→ [YOU ARE HERE] ✨
       ↓
       DISCUSSIONS PAGE
       ├─── Search Bar (🔍)
       ├─── Sort Dropdown
       └─── Thread List
            ├─ Thread Card 1
            │  ├─ Title
            │  ├─ Author + Time  
            │  ├─ Preview text
            │  └─ [3 replies] [12 helpful] [45 views]
            │     ↓ CLICK
            │     → VIEW THREAD DETAIL
            │        ├─ Full question
            │        ├─ Reply #1
            │        │  ├─ Content
            │        │  ├─ 👍 Upvote (12)
            │        │  └─ ✅ Verified (instructor mark)
            │        ├─ Reply #2
            │        │  ├─ Content  
            │        │  ├─ 👍 Upvote (8)
            │        │  └─ ✓ Accepted (best answer)
            │        └─ REPLY FORM
            │           └─ Write your answer → POST
            │
            ├─ Thread Card 2
            ├─ Thread Card 3
            └─ [+ NEW QUESTION BUTTON]
                     ↓ CLICK
                     → CREATE MODAL
                        ├─ Title input
                        ├─ Content textarea
                        └─ [CANCEL] [POST QUESTION]
```

### Student Actions & Results:

| Action | What Happens | API Call |
|--------|--------------|----------|
| **Click Discussions Tab** | DiscussionsPage loads all threads | `GET /api/community/channels/{id}/threads/` |
| **Search** | Filter threads by keywords | Client-side filter on fetched data |
| **Click Thread** | View detail page with all replies | `GET /api/community/threads/{id}/` |
| **Write Reply** | Submit answer in reply form | `POST /api/community/replies/` |
| **Click 👍 Upvote** | Increment helpful counter | `POST /api/community/replies/{id}/upvote/` |
| **Click Mark as Answer** | Mark as solution (if you're OP) | `POST /api/community/replies/{id}/mark_as_accepted/` |
| **Create New Thread** | Ask a question about course | `POST /api/community/threads/` |

---

## 👨‍🏫 Instructor User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│  INSTRUCTOR USER FLOW                                               │
└─────────────────────────────────────────────────────────────────────┘

START: Dashboard
  ↓
SELECT MY COURSE
  ↓
COURSE DETAIL PAGE
  ├─── Lessons Tab
  ├─── Assessments Tab  
  └─── Discussions Tab ──→ [INSTRUCTOR VIEW] 👨‍🏫
       ├─ See all student discussions
       ├─ Identify unanswered questions
       └─ Thread List
          ├─ Thread: "How do hooks work?" (2 replies)
          │  │
          │  └─ Reply #1 (8 upvotes)
          │     ├─ Content
          │     ├─ [👍 Upvote]
          │     └─ [✅ VERIFY] ← Instructor action
          │        → Adds instructor badge
          │
          ├─ Thread: "Array methods question" (0 replies) 🚩 UNANSWERED
          │  └─ [PIN THREAD] ← Instructor action
          │     → Moves to top
          │
          └─ Thread: "Project deployment" (5 replies)
```

### Instructor Actions & Results:

| Action | What Happens | Icon | API Call |
|--------|--------------|------|----------|
| **Click ✅ Verify** | Mark as official/correct answer | ✅ | `POST /api/community/replies/{id}/verify/` |
| **Click 📌 Pin** | Move thread to top (important) | 📌 | `POST /api/community/threads/{id}/pin/` |
| **View Discussions** | Monitor student engagement | 👀 | `GET /api/community/channels/{id}/threads/` |
| **Reply to Thread** | Answer student questions | 💬 | `POST /api/community/replies/` |
| **Upvote Answer** | Support helpful peer answers | 👍 | `POST /api/community/replies/{id}/upvote/` |

---

## 🔄 Data Flow & Component Interaction

```
┌──────────────────────────────────────────────────────────────────┐
│                     REACT COMPONENT FLOW                         │
└──────────────────────────────────────────────────────────────────┘

CourseDetailPage (Parent)
  │
  ├─ State: activeTab = "discussions"
  │
  └─ Renders DiscussionsPage
     │
     ├─ State: 
     │  ├─ currentView: "feed" | "thread"
     │  ├─ threads: []
     │  ├─ selectedThread: null
     │  └─ showCreateModal: boolean
     │
     ├─ OnMount: fetchThreads()
     │  └─ Call: GET /api/community/channels/{courseId}/threads/
     │     └─ Update: threads = response
     │
     └─ Renders: 
        ├─ View = "feed"
        │  │
        │  └─ DiscussionFeed
        │     │
        │     ├─ Props: threads[], onThreadClick(), onCreateClick()
        │     │
        │     ├─ Input: searchTerm (onChange = filter threads)
        │     ├─ Dropdown: sortBy (Recent, Helpful, Unanswered)
        │     │
        │     └─ Map threads:
        │        └─ ThreadCard
        │           └─ onClick → setCurrentView("thread")
        │                        setSelectedThread(thread)
        │
        ├─ View = "thread"  
        │  │
        │  └─ DiscussionThread
        │     │
        │     ├─ Props: thread
        │     │
        │     ├─ Renders:
        │     │  ├─ Thread Header (title, author, time, views)
        │     │  ├─ Thread Content (markdown rendered)
        │     │  ├─ Replies List:
        │     │  │  └─ Map thread.replies:
        │     │  │     └─ ReplyCard
        │     │  │        ├─ Content (markdown)
        │     │  │        ├─ 👍 Upvote btn → onClick upvoteReply()
        │     │  │        ├─ ✅ Verify btn (instructor only)
        │     │  │        └─ ✓ Mark Answer (question author only)
        │     │  │
        │     │  └─ ReplyForm
        │     │     ├─ Textarea for content
        │     │     └─ POST btn → createReply() → refetch thread
        │     │
        │     └─ Back Button → setCurrentView("feed")
        │
        └─ CreateThreadModal
           └─ When showCreateModal = true:
              ├─ Textarea: title
              ├─ Textarea: content
              └─ Buttons: [Cancel] [Post Question]
                 └─ onClick POST → createThread()
                    └─ GET /api/community/threads/
                       └─ Update threads list
```

---

## 📡 API Call Sequence Diagram

### Scenario: User asks a question and gets an answer

```
STUDENT BROWSER              REACT CODE              DJANGO API              DATABASE
      │                          │                       │                      │
      │                          │                       │                      │
      ├─ Click Discussions ─────→│ fetchThreads()       │                      │
      │                          │─────────────────────→│ GET /threads/         │
      │                          │                       │─────────────────────→│
      │                          │                       │   SELECT * FROM      │
      │                          │                       │   threads            │
      │                          │                       │←─────────────────────│
      │                          │←─────────────────────│ [thread1, thread2]   │
      │←─────────────────────────│ Update state         │                      │
      │ Display thread list      │                       │                      │
      │                          │                       │                      │
      │                          │                       │                      │
      ├─ Click "New Question"───→│ showCreateModal()     │                      │
      │ (see modal)              │                       │                      │
      │                          │                       │                      │
      ├─ Type question ─────────→│ updateTitle()         │                      │
      │ (local state update)     │ updateContent()       │                      │
      │                          │                       │                      │
      ├─ Click POST ────────────→│ createThread()        │                      │
      │                          │─────────────────────→│ POST /threads/        │
      │                          │   {title, content}   │─────────────────────→│
      │                          │                       │   INSERT INTO threads│
      │                          │                       │←─────────────────────│
      │                          │                       │   id: 42             │
      │                          │←─────────────────────│ {id, title, ...}     │
      │←─────────────────────────│ refetchThreads()      │                      │
      │ Close modal              │────────────────────→│ GET /threads/         │
      │ Show new thread          │                       │─────────────────────→│
      │                          │                       │ [thread1, thread2, thread42]
      │                          │                       │←─────────────────────│
      │                          │←─────────────────────│                      │
      │ New thread appears!      │ Update state         │                      │
      │                          │                       │                      │
      │                          │                       │                      │
[After some time...]            │                       │                      │
      │                          │                       │                      │
      │ ANOTHER STUDENT:         │                       │                      │
      │ Clicks thread 42 ───────→│ fetchThreadDetail()  │                      │
      │                          │─────────────────────→│ GET /threads/42/      │
      │                          │                       │─────────────────────→│
      │                          │                       │   SELECT * + replies │
      │                          │                       │←─────────────────────│
      │                          │←─────────────────────│ {id, title, replies}│
      │←─────────────────────────│ Update state, render  │                      │
      │ See thread + replies     │                       │                      │
      │                          │                       │                      │
      ├─ Type reply ────────────→│ updateReplyContent()  │                      │
      ├─ Click POST REPLY ──────→│ createReply()         │                      │
      │                          │─────────────────────→│ POST /replies/        │
      │                          │   {thread: 42, ...}  │─────────────────────→│
      │                          │                       │   INSERT INTO replies│
      │                          │                       │←─────────────────────│
      │                          │←─────────────────────│ {id, thread_id, ...}│
      │←─────────────────────────│ refetchThread()       │                      │
      │ Reply posted!            │────────────────────→│ GET /threads/42/      │
      │                          │                       │                      │
      │                          │                       │                      │
[ORIGINAL STUDENT COMES BACK...]│                       │                      │
      │ Clicks upvote (👍) ─────→│ upvoteReply()         │                      │
      │                          │─────────────────────→│ POST /replies/{id}/upvote/
      │                          │                       │─────────────────────→│
      │                          │                       │   INSERT INTO votes  │
      │                          │                       │   UPDATE upvotes+1   │
      │                          │                       │←─────────────────────│
      │                          │←─────────────────────│ {upvotes: 1}         │
      │←─────────────────────────│ Update reply upvotes  │                      │
      │ See 👍 count increase    │                       │                      │
      │                          │                       │                      │
      ├─ Click Mark as Answer ──→│ markAsAccepted()      │                      │
      │                          │─────────────────────→│ POST /replies/{id}/mark_as_accepted/
      │                          │                       │─────────────────────→│
      │                          │                       │   UPDATE is_accepted=true
      │                          │                       │←─────────────────────│
      │                          │←─────────────────────│ {is_accepted: true}  │
      │←─────────────────────────│ Update reply display  │                      │
      │ Reply marked with ✓      │                       │                      │
```

---

## 💾 Data Persistence

```
┌─────────────────────────────────────────────────────┐
│  WHAT GETS SAVED TO DATABASE                        │
└─────────────────────────────────────────────────────┘

WHEN STUDENT ASKS A QUESTION:
  ├─ CourseChannel
  │  └─ Created once per course (if not exists)
  │
  └─ DiscussionThread
     ├─ id: auto-generated
     ├─ channel_id: which course
     ├─ author_id: who asked
     ├─ title: question title
     ├─ content: question body
     ├─ is_pinned: false (initially)
     ├─ views: 0 (initially)
     ├─ created_at: current timestamp
     └─ updated_at: current timestamp

WHEN STUDENT REPLIES:
  └─ ThreadReply
     ├─ id: auto-generated
     ├─ thread_id: which question
     ├─ author_id: who answered
     ├─ content: answer text
     ├─ is_verified: false (initially)
     ├─ is_accepted: false (initially)
     ├─ upvotes: 0 (initially)
     ├─ created_at: current timestamp
     └─ updated_at: current timestamp

WHEN STUDENT UPVOTES:
  └─ ThreadVote
     ├─ id: auto-generated
     ├─ reply_id: which answer
     ├─ user_id: who upvoted
     └─ created_at: current timestamp
     
     Note: If user tries to upvote same reply twice,
           database constraint prevents duplicate

WHEN ANSWER IS VERIFIED (instructor):
  └─ ThreadReply
     └─ is_verified: true ← Updated
        → Shows ✅ badge in UI

WHEN ANSWER IS MARKED ACCEPTED (question author):
  └─ ThreadReply
     └─ is_accepted: true ← Updated
        → Shows ✓ badge in UI
```

---

## 🎨 UI State Transitions

```
DiscussionsPage States:
┌─────────────────────────────────────────────────┐
│                                                 │
│  FEED VIEW (default)                            │
│  ├─ Loading: Show spinner                       │
│  │  └─ After API: Show thread list              │
│  │                                              │
│  ├─ Thread List Visible                         │
│  │  ├─ Click thread → DETAIL VIEW               │
│  │  ├─ Click "+ NEW" → SHOW MODAL               │
│  │  └─ Type search → Filter threads              │
│  │                                              │
│  └─ Empty State (if no threads)                 │
│     └─ Show "No discussions yet, start one!"    │
│                                                 │
└─────────────────────────────────────────────────┘
         ↕ (clicking updates state)
┌─────────────────────────────────────────────────┐
│                                                 │
│  DETAIL VIEW                                    │
│  ├─ Loading: Show spinner                       │
│  │  └─ After API: Show thread + replies         │
│  │                                              │
│  ├─ Full Thread Display                         │
│  │  ├─ Click ← back → FEED VIEW                 │
│  │  ├─ Click reply → Show form                  │
│  │  ├─ Click 👍 → Upvote + Update count         │
│  │  ├─ Click ✓ → Mark answered (if author)      │
│  │  └─ Click ✅ → Verify (if instructor)        │
│  │                                              │
│  └─ Empty State (if no replies yet)             │
│     └─ Show "Be first to reply!"                │
│                                                 │
└─────────────────────────────────────────────────┘
         ↕ (clicking updates state)
┌─────────────────────────────────────────────────┐
│                                                 │
│  CREATE MODAL                                   │
│  ├─ Type title → Update state                   │
│  ├─ Type content → Update state                 │
│  ├─ Click [CANCEL] → Close modal, FEED VIEW     │
│  └─ Click [POST] → Create, refetch, close       │
│                      → FEED VIEW with new Q     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## ✅ Ready to Test!

You now understand:
1. ✅ How students navigate to discussions
2. ✅ How data flows from frontend to backend
3. ✅ What gets saved to database
4. ✅ How UI updates based on actions
5. ✅ What instructors can do differently

**Next:** Open the app and test it! 🚀

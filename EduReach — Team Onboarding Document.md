# EduReach — Team Onboarding Document
**Prepared for: Incoming Team Member**
**Date: March 2026**
**Status: Active Development — MVP Stage**

---

## A Note Before You Read

This document is written to give you a real picture of where EduReach is, not a polished pitch. You are joining at a stage where the foundation is built, many features exist, but the product has real bugs that are frustrating users and slowing growth. We want you to know the honest truth so you can hit the ground running and help us fix what matters. Welcome aboard.

---

## 1. What Is EduReach?

EduReach is an AI-powered learning platform built for the African market, with a global ambition.

The core idea is simple: **learning should be active, not passive.** Most online learning platforms dump video content on you and call it a day. EduReach takes the content — particularly YouTube videos — and wraps it with tools that help you actually engage with it: AI-generated quizzes from the video transcript, study groups, challenges between friends, discussion threads, and a personal AI assistant you can ask questions to.

Think of it as the layer on top of YouTube that turns watching into studying.

The platform supports multiple roles:
- **Learners** — people who enroll in courses, take quizzes, join study groups, track their progress
- **Instructors / Creators** — people who build courses using YouTube videos, create assessments, earn money from their content
- **Admins** — platform managers with full access

It is designed to feel like a social, gamified learning environment — not a dry LMS (Learning Management System) like you'd find at a university. Users earn XP points, level up, challenge each other, and build a learning identity on the platform.

---

## 2. The Vision

The long-term vision is to become **the go-to learning infrastructure for content creators and learners across Africa and the developing world**.

Specifically:
- A place where anyone can monetize their knowledge by creating courses
- A place where learners can access quality, structured learning with AI assistance — without needing expensive subscriptions to Western platforms
- A mobile-first experience, because most of our users are on phones
- Eventually: an app (Capacitor-based mobile wrapper is already in the codebase, ready to be built out)

We are not trying to compete with Coursera or Udemy head-on on day one. We are starting with a specific niche: **people who learn from YouTube, who want more than just watching.** We wrap YouTube content with structure, accountability, and AI — and we do it affordably.

---

## 3. How We Make Money

EduReach has multiple revenue streams, all of which are at least partially implemented:

### 3.1 Subscription Tiers
Users pay monthly for access to AI features and platform capabilities.

| Tier | Target User | AI Queries/Month | Notes |
|------|-------------|-----------------|-------|
| Free | Casual visitors | 0 | Browse only, no AI |
| Learner | Casual learners | 50 | Entry level paid tier |
| Pro | Serious learners | 200 | Mid tier |
| Pro+ | Power users | Unlimited | Top tier |
| Admin | Internal | Unlimited | Internal only |

New users get a **30-day free trial** of the Learner tier automatically on signup.

### 3.2 Course Purchases (Pay-per-Content)
Instructors can set prices for their courses. Learners pay once to access. EduReach takes a platform cut.

### 3.3 Creator Tips
Learners can tip instructors directly through the platform. This is a goodwill/appreciation feature that also builds community loyalty.

### 3.4 Payment Methods Supported
This is where EduReach is specifically designed for the African market:
- **M-Pesa** (Safaricom mobile money) — the dominant payment method in East Africa
- **Paystack** — card and bank payments across Africa
- **Bank Transfer** — manual verification

This is a deliberate choice. Western platforms don't support M-Pesa. We do. That is a real competitive advantage.

---

## 4. Strategy: Starting Small, Scaling Up

We are not trying to scale to millions of users before we have a working product. The current strategy is:

**Phase 1 (Now): Fix the product.**
Get the existing features working reliably. Kill the bugs that are driving users away. Make the core experience — enroll in a course, watch a video, take a quiz, see your progress — work flawlessly.

**Phase 2: Grow the content.**
Recruit instructors. Make the creator tools compelling enough that people want to build courses here. A platform with good content sells itself more than any marketing campaign.

**Phase 3: Build the mobile app.**
The Capacitor wrapper is already scaffolded in the codebase. Once the web product is stable, packaging it as a native mobile app is a relatively short step. Mobile is where our users live.

**Phase 4: Expand AI features.**
As we grow, more AI features become viable: personalized learning paths, adaptive quizzes, performance predictions, tutor matching. These need user data to work well, which is why we are building the data infrastructure now.

**Phase 5: Regional expansion.**
Start with Kenya/East Africa, expand to Nigeria, Ghana, South Africa, and beyond. Each market has different payment preferences and language needs — our architecture is built to accommodate this.

---

## 5. The Tech Stack

You do not need to have worked with all of this before, but here is the map:

### Backend
- **Django (Python)** — the main server framework. Handles all business logic, user auth, payments, AI calls, and the database.
- **Django REST Framework** — serves a JSON API that the frontend consumes
- **PostgreSQL** — the database (production). SQLite for local development.
- **JWT Authentication** — secure, token-based login system
- **Celery + Redis** — for running background tasks (sending emails, fetching transcripts asynchronously). *Note: this is configured but not currently running in production — more on this in the challenges section.*

### Frontend
- **React 19 with TypeScript** — modern, typed UI framework
- **Vite** — fast build tool
- **Tailwind CSS** — utility-first styling
- **Zustand** — lightweight state management
- **React Query (TanStack)** — smart data fetching and caching
- **React Router v7** — page routing
- **Axios** — HTTP requests to the backend API
- **KaTeX** — math equation rendering (for STEM content)
- **Capacitor** — bridges the web app to native iOS/Android (for future mobile app)

### AI
- **OpenRouter** (primary) — a routing layer that gives us access to multiple AI models. We're currently using **Google Gemini 2.0 Flash**, which is fast and affordable.
- **Google Gemini** (fallback) — direct Gemini API if OpenRouter is unavailable
- Features: quiz generation from transcripts, AI chat assistant, essay grading, study plan generation, concept explanations

### Payments
- **Paystack** — handles card and bank payments
- **M-Pesa** — mobile money (STK Push + Paybill methods)

### Deployment
- **Backend**: Render (paid account) — Python/Django server, PostgreSQL database
- **Frontend**: Vercel or Netlify — static React build
- **Media Files**: Currently served by Django directly (needs to move to cloud storage at scale)

---

## 6. What Has Been Built

Here is an honest inventory of what exists in the codebase. "Built" means the backend API and frontend UI both exist for this feature.

### Courses & Learning
- Create and publish courses with YouTube video lessons
- Enroll in courses, track completion per lesson
- Mark lessons as complete
- Course pricing and free preview lessons
- Transcript extraction from YouTube videos (see challenges — this is broken)
- Manual transcript upload as fallback

### Assessments
- Create quizzes and exams with multiple question types: Multiple Choice, True/False, Short Answer, Essay
- Automatic grading for objective questions
- AI-powered grading for essays with written feedback
- Start attempts, submit answers, see scores
- Assessment leaderboards
- Share assessments via private invite links
- Bulk question creation
- Image upload for handwritten answers

### AI Features
- Generate quizzes automatically from a lesson's transcript
- AI chat assistant for study help
- Study plan generation
- Concept explanation tool
- Monthly quota system per subscription tier
- Context-aware (can use PDF uploads for richer AI responses)

### Community & Social
- Posts and comments (general community feed)
- Course-specific discussion threads with replies
- Voting on replies (helpful / not helpful)
- Instructor can pin important threads and mark accepted answers
- View counters on threads

### Study Groups
- Create public or private study groups
- Group posts and discussion
- Challenges (link an assessment as a competition between group members)
- Challenge leaderboards
- Invite tokens for joining private groups

### User System
- Registration with profile setup (learning goals, interests, learner type)
- JWT-based login
- Subscription tiers with 30-day free trial
- XP points and level tracking
- User profile with avatar and cover image
- In-app notifications

### Payments
- Paystack integration for cards
- M-Pesa STK Push (automatic phone prompt)
- M-Pesa Paybill (manual verification)
- Bank transfer
- Payment history
- Subscription management
- Creator earnings tracking

### Admin
- Django admin panel for platform management
- Admin dashboard in the frontend

---

## 7. What Works Well

To be fair, a significant amount of the platform does work. The core user journey — sign up, enroll in a course, take a quiz, chat with AI — functions. Here is what is reliably working:

- User registration, login, and JWT authentication
- Course creation and lesson management
- Assessment creation with all question types
- AI quiz generation (when a transcript is available)
- AI chat assistant
- Essay grading with AI feedback
- Community posts and comments
- Discussion threads
- Study groups (core functionality)
- Paystack payments (card processing)
- User XP and level system
- Django admin panel
- The API layer is well-structured and documented enough to work with

---

## 8. What Is Broken — The Honest List

These are real, user-facing problems. Some were flagged by actual users who stopped using the platform because of them.

### Critical (Users are leaving because of these)
1. **Assessment page goes blank** — The page loads, flashes "Assessments," then goes completely white. This is the highest-priority issue.
2. **Wrong UI elements showing to wrong users** — Non-creator users are seeing instructor tools (Save Assessment, View Results, etc.) that have no business being visible to them. A real user showed this to us and was confused and frustrated.
3. **YouTube transcript fetching is broken in production** — The entire AI quiz generation feature depends on transcripts. If the transcript doesn't fetch, there is no AI quiz. This is broken on the deployed server.
4. **Mark Complete does not work for regular users** — Works for the course creator's account, but not for enrolled students. Progress tracking is broken for learners.
5. **Progress bar does not update after watching a video** — No live feedback when a lesson is completed.

### High Priority
6. **Challenge notifications are missing** — You can challenge a friend, but they have no way of knowing. No notification appears anywhere on the platform.
7. **M-Pesa payment flow is incomplete** — Users pay to a Paybill number, paste their transaction code manually, and then have to wait for a developer to manually activate their subscription. This is not a scalable process and is not user-friendly.
8. **Email system is not working** — We cannot send any emails to users. No welcome emails, no payment confirmations, no password resets via email.
9. **Subscription activation is manual** — There is no way for a user to self-activate their subscription after payment. A developer has to do it.
10. **Billing page shows "renews on invalid date"** — Broken date rendering in the subscription UI.

### Medium Priority
11. **Dark mode / light mode is inconsistent** — The site appears in dark mode on some computers and light mode on others, and users cannot control it. There is no toggle.
12. **Profile image upload does not work** — The placeholder buttons for uploading a profile photo or cover image do nothing.
13. **Onboarding page needs redesign** — The sign-up onboarding flow is not polished. Not a great first impression.
14. **Profile page styling needs work** — Described internally as "ugly as hell."
15. **Start Exam / Start Quiz button naming is wrong** — Both types use the same label. Should say "Start Exam" for exams and "Start Quiz" for quizzes.
16. **Google Sign-In is not implemented** — Many users prefer logging in with Google. We don't have this yet.
17. **Analytics dashboard is missing** — Users cannot see their performance graphs, learning history, or progress over time.
18. **Celery background tasks are not running in production** — Tasks are queued but never executed. Anything that relies on background processing (like async transcript fetching) silently fails.

---

## 9. The Transcript Problem (Technical Detail)

This deserves its own section because it is the backbone of our AI features.

**Why transcripts matter:** Our AI quiz generation, study assistance, and content analysis all rely on having the text of a YouTube video. Without a transcript, none of the AI features work for that lesson.

**The problem:** YouTube does not provide a public, stable API for transcripts. Every approach to getting them involves exploiting internal endpoints that YouTube periodically changes or blocks. Our current code has five fallback methods — but three of them are completely dead (they will never work), one is impractical (downloads the entire audio file and runs AI speech-to-text, which takes minutes), and only one actually has a chance of working.

**Why it works locally but breaks in production:** On a developer's laptop, requests to YouTube look like a human browsing. On a server (Render's infrastructure), the IP address is from a known datacenter, and YouTube is suspicious of these. It either blocks them or returns empty responses.

**The fix is known:** Use browser cookies from a real YouTube session to authenticate the requests. This is free — it just requires one of us to export our browser cookies, store them securely on the server, and pass them to the transcript library. We know how to do this. It just has not been done yet.

---

## 10. Technical Debt and Architecture Issues

Beyond the bugs, here are the deeper structural things we know need attention:

- **Media file storage** — User-uploaded files (profile photos, answer images) are currently stored on the server's local disk. When the server restarts, these can be lost. We need cloud storage (like AWS S3 or Cloudinary) for anything user-uploaded.
- **Celery workers need to be set up on Render** — The background task system is configured but not running. This is a known gap.
- **No automated testing** — There is no test suite. Every change is tested manually, which is slow and error-prone. This is technical debt that compounds over time.
- **Environment variable management** — Some configuration is scattered; needs consolidation for easier onboarding and deployment.

---

## 11. The Financial Situation

We are building this with limited resources. Here is the honest picture:

**What we are spending on now:**
- Render (paid account) — server hosting for the backend and database
- OpenRouter / Gemini — AI API costs (usage-based, currently low due to low volume)
- Domain and miscellaneous infrastructure

**What we cannot afford yet:**
- A paid transcript API service (there are services that reliably fetch YouTube transcripts for ~$0.001 per video — we will use these once we have revenue)
- A dedicated mobile app developer
- Cloud storage for media files (AWS S3 or equivalent)
- Paid marketing

**What we need funding for:**
The critical investments that would unlock the next phase of the product:

| Need | Estimated Monthly Cost | Why It Matters |
|------|----------------------|----------------|
| Cloud storage (S3/Cloudinary) | ~$5–20/month | Reliable media uploads, scales with users |
| Celery worker on Render | ~$7/month | Background tasks, async processing |
| Email service (SendGrid/Mailgun) | ~$0–15/month | User notifications, payment confirmations |
| Transcript API (if free methods fail) | ~$10–50/month | Core AI feature reliability |
| Mobile app build (one-time) | Varies | Capacitor-based, web-first foundation already done |

The total monthly infrastructure cost to run this properly is realistically under **$100/month** at current scale. That is not a large number. The challenge is getting there from where we are now.

---

## 12. Immediate Priorities — What We Are Fixing Right Now

In order of urgency:

1. **Fix the transcript fetching** — The AI feature foundation. Without this, quiz generation doesn't work.
2. **Fix the assessment page blank state** — Users are leaving because of this.
3. **Fix UI permissions** — Hide instructor tools from learners.
4. **Fix Mark Complete for regular users** — Core learning feature.
5. **Fix challenge notifications** — Social features don't work without this.
6. **Set up email** — Required for any real user communication.
7. **Complete M-Pesa payment flow** — Self-activation without developer involvement.
8. **Dark mode toggle** — Basic UX expectation.
9. **Profile image uploads** — Basic user identity feature.

---

## 13. How to Get Set Up

**Clone the repository** and set up both the backend and frontend:

**Backend (Django)**
```
cd backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Then fill in your actual values
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Backend runs at: `http://localhost:8000`
Admin panel: `http://localhost:8000/admin`

**Frontend (React)**
```
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

**Key environment variables you will need:**
- `OPENROUTER_API_KEY` — for AI features (ask the team)
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — Django secret key
- `PAYSTACK_SECRET_KEY` — for payment testing
- `REDIS_URL` — if running Celery locally

---

## 14. What We Need From You

We are not looking for someone to admire the architecture. We need someone who can roll up their sleeves, read broken code, and fix things.

The most valuable things you can contribute right now:

- **Debugging instinct** — trace a bug from the frontend error, through the API response, down to the database query
- **Frontend fluency** — React, TypeScript, Tailwind. The frontend has the most visible user-facing issues.
- **Good judgment about what to fix first** — not everything can be fixed at once; knowing what unblocks users matters
- **Honest communication** — if something is more broken than it looks, say so. We would rather know than be surprised.

We are a small, honest team building something we believe in. We are not polished yet, but the bones are solid. Welcome to EduReach.

---

*Questions? Reach out directly. Nothing in this document is confidential — it is meant to be read, questioned, and used.*

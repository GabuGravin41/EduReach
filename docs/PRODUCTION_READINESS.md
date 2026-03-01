# EduReach – Production Readiness & Launch Plan

This document is the single source of truth for what must be complete before launch. Use it to track gaps, avoid half-finished features, and ensure a stable experience for users at scale.

---

## 1. Principles

- **No broken promises**: Every feature shown in the UI must work end-to-end.
- **Foolproof**: Config and code paths must not break in common setups (e.g. DEBUG=False + runserver, CORS with wildcards).
- **Scale-ready**: Assume thousands of users; avoid N+1 queries, unbounded lists, and missing indexes.
- **PWA**: Installable, responsive, and with clear offline behavior where promised.
- **Payments**: At least one reliable, understandable flow (e.g. M-Pesa Paybill + code) before going live.

---

## 2. Checklist by Area

### 2.1 Django Admin & Backend Basics

| Item | Status | Notes |
|------|--------|------|
| Admin loads without 500 | Done | Static storage when `DEBUG` or `IS_RUNSERVER`; collectstatic for runserver when DEBUG=False |
| Admin CSS/JS load | Done | `SERVE_STATIC_WHEN_RUNSERVER` + static URL; run `collectstatic` once |
| Superuser can promote staff/superuser | Done | User admin list_editable + fieldsets |
| CORS with wildcards in env | Done | Invalid origins filtered out; no raise on `*.onrender.com` |
| **Action** | | After deploy: run `collectstatic` in production; set `DEBUG=False` |

### 2.2 Payments

| Item | Status | Notes |
|------|--------|------|
| M-Pesa STK Push | Optional | Requires Daraja API credentials; use when budget allows |
| **M-Pesa Paybill + transaction code** | **In progress** | Show Paybill, Account, Amount → user pays → enters code → pending; admin confirms in Django admin |
| Card (Stripe/Paystack/Flutterwave) | Stubbed | Test tokens only; integrate one provider for launch |
| PayPal | Not started | Add when budget allows |
| Subscription upgrade after payment | Done | `SubscriptionUpgradeView`; frontend “Activate Subscription” |
| Payment history & methods list | Done | API + Billing page |
| **Action** | | 1) Finish M-Pesa Paybill flow. 2) Choose one card provider (e.g. Flutterwave), implement live. 3) Document Paybill number/account in PaymentMethod.config |

### 2.3 PWA & Offline

| Item | Status | Notes |
|------|--------|------|
| Service worker registered | Done | `sw.js`, cache app shell + offline.html |
| Install prompt | Done | App.tsx install prompt |
| manifest.webmanifest | Exists | Referenced in index.html; verify name, icons, start_url |
| Offline fallback page | Done | `offline.html` |
| Cached API GETs (read-only) | Done | sw.js caches GET for api/courses/assessments etc. |
| **Action** | | Audit: ensure manifest has correct icons and display; test “Add to Home Screen” on mobile; document which pages work offline |

### 2.4 Performance & Scale

| Item | Status | Notes |
|------|--------|------|
| List endpoints paginated | Check | Assessments, courses, posts: ensure pagination or safe limits |
| N+1 avoided | Check | Use select_related/prefetch_related on list/detail views |
| DB indexes | Check | Foreign keys, filters used in list (e.g. user_id, status) |
| Static/collectstatic in production | Required | Run collectstatic on deploy; serve via WhiteNoise or CDN |
| **Action** | | Review assessments, courses, community list views; add pagination if missing; add indexes for hot queries |

### 2.4b Marking / grading and leaderboards

| Item | Status | Notes |
|------|--------|------|
| Auto-grade MCQ, true/false, short answer | Done | `UserAttempt.calculate_score()` |
| Essay grading (AI, token-efficient) | Done | `ai_service.essay_grading.grade_essay_answer()`; model solution (explanation), max 8 output tokens, fast model |
| Passage-style / long short answers | Done | Short answers with model solution and answer length > 80 chars are AI-graded (same as essay) |
| Background grading | Done | Submit returns immediately with status `submitted` when assessment has essay/AI-gradable Qs; `POST .../run-grading/` or cron `grade_pending_attempts` finishes grading |
| AI grading counts toward quota | Done | Each AI grading call checks `can_use_ai()` and increments `ai_queries_used` (monthly limit) |
| Leaderboard (top attempts by %) | Done | `GET /assessments/{id}/leaderboard/` |
| Public results / competition | Done | `public-results`, `set-result-visibility` |
| **Token/latency** | Done | One short prompt per essay/long-answer; truncation; `prefer_openrouter=True`; background keeps submit fast |

### 2.5 Feature Parity (UI vs Backend)

| Feature | UI | Backend | Notes |
|---------|----|---------|------|
| Login / Register | Yes | Yes | JWT, refresh |
| Dashboard | Yes | Yes | |
| Courses (create, edit, lessons) | Yes | Yes | |
| Assessments (create, take, grade) | Yes | Yes | |
| Bulk create assessments | Yes | Yes | Route + API fixed |
| Public challenges | Yes | Yes | |
| Community / discussions | Yes | Yes | |
| Study groups | Yes | Yes | |
| Billing / plans | Yes | Yes | Methods + initiate + upgrade; payment flow to be finalized |
| Profile (edit, XP, tier) | Yes | Yes | |
| Admin dashboard (app) | Yes | Yes | Live stats API |
| Django Admin | Link | Yes | Static served when runserver |
| **Action** | | | Smoke-test each path; fix any 404 or “not implemented” |

### 2.6 Deployment & Environment

| Item | Status | Notes |
|------|--------|------|
| ALLOWED_HOSTS | Set | No wildcards in production; explicit domain(s) |
| CORS_ALLOWED_ORIGINS | Set | Full origins only (e.g. https://yourapp.onrender.com) |
| SECRET_KEY | Set | Strong, secret |
| DEBUG | False | In production |
| collectstatic | Run | On every deploy |
| Database | Prefer PostgreSQL | For production; SQLite only for single-instance dev |
| **Action** | | Document deploy steps (build frontend, collectstatic, migrate, gunicorn/etc.) |

---

## 3. Priority Order Before Launch

1. **Payments (M-Pesa Paybill + one card option)**  
   - M-Pesa: Paybill + Account + Amount → user enters transaction code → admin confirms.  
   - Card: Integrate one provider (e.g. Flutterwave) for real payments.

2. **Feature audit**  
   - Click through every main flow (signup, course, assessment, billing, profile, admin).  
   - Fix any broken or placeholder behavior.

3. **PWA and offline**  
   - Verify install and offline fallback; document what works offline.

4. **Performance**  
   - Pagination and indexes; no N+1 on key list pages.

5. **Deploy runbook**  
   - One-page: env vars, collectstatic, migrate, static serving, and how to confirm admin works.

6. **App load time**  
   - Vite build: `manualChunks` splits react, react-query, router, axios, vendor so the initial parse is smaller and chunks load in parallel.  
   - Ensure critical path stays minimal; lazy-loaded routes already used for heavy pages.

7. **Caching and Redis**  
   - **Do you need Redis?** For current scale, **no**. The app is fine with DB + browser cache: static assets and cached GETs (e.g. courses, assessments) use the service worker; API reads hit the DB.  
   - **Add Redis when:** you introduce a task queue (e.g. Celery) for background jobs, or you need server-side response caching (e.g. leaderboards, hot lists) under higher traffic, or you want to move sessions off the DB.  
   - **Recommendation:** Use browser cache and HTTP cache headers; run `grade_pending_attempts` via cron (no Redis). Add Redis only when you add Celery or measurable DB/response pressure.

---

## 4. M-Pesa Paybill Flow (No Daraja API Required)

- Admin creates PaymentMethod `mpesa_paybill` with config: `paybill_number`, optional `account_prefix`.
- User selects plan → selects “M-Pesa (Paybill)” → backend creates pending payment with `reference_code` = account (e.g. `EDU{user_id}_{payment_id}`).
- Frontend shows: **Paybill**: XXXX, **Account**: EDU…, **Amount**: KES XXX. “After paying, enter your M-Pesa transaction code below.”
- User pays via M-Pesa → enters code in app → POST to confirm endpoint; backend stores code in payment metadata, keeps status `pending`.
- Admin sees pending payments in Django Admin, verifies with bank/M-Pesa statement, then marks payment completed and user can “Activate Subscription.”

This gives a working, auditable flow without paying for STK Push API until budget allows.

**Before go-live:** In Django Admin → Payment methods → M-Pesa (Paybill) → set `config` to your real Paybill number, e.g. `{"paybill_number": "123456", "account_prefix": "EDU"}`. Replace `123456` with your actual Safaricom Paybill number.

---

## 5. Maintenance

- Update this doc when adding a major feature or fixing a production bug.
- Before each release, run through the checklist and “Priority order” above.
- Keep one “Deploy checklist” (env, collectstatic, migrate, smoke test admin and login) in this doc or in `DEPLOY.md`.

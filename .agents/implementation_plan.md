# EduReach Feature Implementation Plan

## Phase 1: XP / Points System (Backend)
- Add `xp_points`, `total_time_spent_minutes`, `show_xp_publicly` to `users/models.py` (User model)
- Create `XPTransaction` model to log every XP event with type, amount, context
- XP weights per assessment type: MCQ=10, True/False=5, Short Answer=15, Essay=25, Passage=20
- Bonus XP: time efficiency bonus if completed well under limit, streak bonus, perfect score bonus
- Course completion XP: 50 XP per completed lesson

## Phase 2: Backend API Endpoints
- `GET /api/users/leaderboard/` — global XP leaderboard (only public XP users)
- `PATCH /api/users/me/` — update `show_xp_publicly` preference
- `GET /api/study-groups/challenges/<id>/leaderboard/` — per-challenge leaderboard (already exists, enhance with time)
- `GET /api/assessments/<id>/leaderboard/` — per-assessment leaderboard ranked by percentage + time

## Phase 3: Bulk Assessment Creation (Backend + Frontend)  
- `POST /api/assessments/bulk-create/` — accepts array of assessment configs
- Frontend: `BulkCreateExamPage.tsx` — bulk creation wizard for Olympiad prep
  - Define a "template" (topic, time, question count, types), then generate 1-20 variants
  - Name pattern: "Physics Olympiad #1", "#2", etc.
  - AI can generate question sets per exam

## Phase 4: Study Group Leaderboard (Frontend)
- Enhance `StudyGroupsPage.tsx` to show leaderboard tab inside each group
- Shows top scorers for group's assessments, ranked by % + time taken
- Uses `ChallengeParticipation.score` + new `time_taken_seconds` field

## Phase 5: Community Tab — XP Visibility + Global Rank
- Community page shows a "Global Leaderboard" side panel
- Users see their rank even if not top 10 (pinned at bottom)
- XP privacy toggle in profile settings

## Phase 6: Profile Page Redesign
- Full redesign with stats dashboard (total XP, assessments completed, courses, time spent)
- XP level indicator and progress bar to next level
- Recent activity feed
- Achievement badges
- Privacy settings panel (show/hide XP)

# 🎯 Community Page: Quick Priority Guide

## What to Build First (Ranked by Impact)

### 🥇 Priority 1: Course Discussion Channels
**Why First?** Immediately adds value, connects posts to courses
**Build Time**: 3-4 days
**User Impact**: High - students can ask course-specific questions

**What to Build:**
1. `DiscussionThread` model (posts + replies per course)
2. `CourseChannel` model (one per course)
3. Django endpoints:
   - `GET /api/courses/<id>/discussions/`
   - `POST /api/discussions/threads/`
   - `POST /api/threads/<id>/replies/`
   - `POST /api/threads/<id>/upvote/`
4. React components:
   - `CoursePage` (tab for discussions)
   - `DiscussionThread` component
   - `ThreadReply` component

**Quick Win**: Shows course detail page tab for "Discussions" with all Q&A

---

### 🥈 Priority 2: Study Groups
**Why Second?** Enables peer learning, increases retention
**Build Time**: 4-5 days
**User Impact**: Very High - cohort-based learning drives engagement

**What to Build:**
1. `StudyGroup` + `StudyGroupMember` models
2. Django endpoints:
   - `GET /api/study-groups/` (list)
   - `POST /api/study-groups/` (create)
   - `POST /api/study-groups/<id>/join/`
   - `GET /api/study-groups/<id>/members/`
3. React components:
   - `StudyGroupsPage` (list all, create new)
   - `StudyGroupDetail` (view members, chat)
   - `StudyGroupCard` (preview card)

**Quick Win**: Users can create private study spaces around courses

---

### 🥉 Priority 3: Badges & XP System
**Why Third?** Gamification drives engagement dramatically
**Build Time**: 3-4 days
**User Impact**: High - motivates continued learning

**What to Build:**
1. `Badge` model (predefined badges)
2. `UserAchievement` model (tracks who earned what)
3. `XP` system (on Post, Comment, Assessment completion)
4. Django endpoints:
   - `GET /api/badges/`
   - `GET /api/users/<id>/achievements/`
   - Award logic (auto-trigger on course completion)
5. React components:
   - `BadgeShowcase` (display on profile)
   - `AchievementNotification` (toast when unlocked)
   - `BadgeCard` (detail view)

**Quick Win**: Award "Course Completionist" badge when user finishes course

---

### 4️⃣ Priority 4: User Follow System & Notifications
**Why Fourth?** Social layer makes community feel alive
**Build Time**: 3-4 days
**User Impact**: Medium - reduces FOMO, increases returns

**What to Build:**
1. `UserFollow` model
2. `Notification` model
3. Django endpoints:
   - `POST /api/users/<id>/follow/`
   - `GET /api/notifications/`
   - `POST /api/notifications/<id>/read/`
4. React components:
   - Follow button (on profile)
   - `NotificationCenter` (bell icon dropdown)
   - `NotificationsList` (page)

**Quick Win**: Notify when someone you follow completes a course

---

### 5️⃣ Priority 5: Challenges & Leaderboards
**Why Fifth?** Time-limited challenges create urgency
**Build Time**: 4-5 days
**User Impact**: Medium - seasonal engagement boosts

**What to Build:**
1. `Challenge` model (time-limited goals)
2. `ChallengeParticipant` model
3. Expanded leaderboard system
4. Django endpoints:
   - `GET /api/challenges/` (active + upcoming)
   - `POST /api/challenges/<id>/join/`
   - `GET /api/challenges/<id>/leaderboard/`
5. React components:
   - `ChallengesPage` (browse active)
   - `ChallengeCard` (preview + join)
   - `LeaderboardWidget` (on community page)

**Quick Win**: "Complete 3 Quizzes This Week" challenge with XP reward

---

### 6️⃣ Priority 6: Trending & Discovery
**Why Sixth?** Once community has content, surface the best
**Build Time**: 3 days
**User Impact**: Medium - helps new users find good content

**What to Build:**
1. Trending algorithm (Django view)
2. Discovery recommendations (Django view)
3. React components:
   - `TrendingSection` (sidebar widget)
   - `DiscoveryFeed` (page)
   - `RecommendationsWidget` (various pages)

**Quick Win**: "Hot Topics This Week" section on community page

---

## 📱 Quick Implementation Plan (Week by Week)

### Week 1: Discussion Channels
- Monday-Tuesday: Models + migrations
- Wednesday: API endpoints
- Thursday-Friday: React UI

### Week 2: Study Groups
- Monday-Tuesday: Models + migrations
- Wednesday: API endpoints
- Thursday-Friday: React UI

### Week 3: Badges & XP
- Monday-Tuesday: Models + migrations
- Wednesday: Award logic
- Thursday-Friday: React UI + notifications

### Week 4: Follow & Notifications
- Monday-Tuesday: Models + endpoints
- Wednesday: Notification logic
- Thursday-Friday: React UI

### Week 5+: Challenges, Trending, Polishing

---

## 🔄 How Priorities Connect

```
Discussion Channels (Priority 1)
    ↓ (Users start asking questions)
    ├─→ Study Groups (Priority 2)
    │   (Groups form around courses)
    │
    ├─→ Badges & XP (Priority 3)
    │   (Reward helpful answers)
    │
    ├─→ Follow System (Priority 4)
    │   (Follow helpful users)
    │
    └─→ Challenges (Priority 5)
        (Compete in course-related challenges)
```

---

## 💾 Database Schema Preview

### Priority 1: Discussion Channels
```sql
-- Course channels (one per course)
CREATE TABLE community_coursechannel (
    id SERIAL PRIMARY KEY,
    course_id INT UNIQUE NOT NULL,
    created_at TIMESTAMP
);

-- Discussion threads (Q&A within channel)
CREATE TABLE community_discussionthread (
    id SERIAL PRIMARY KEY,
    channel_id INT NOT NULL,
    author_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES community_coursechannel(id)
);

-- Thread replies
CREATE TABLE community_threadreply (
    id SERIAL PRIMARY KEY,
    thread_id INT NOT NULL,
    author_id INT NOT NULL,
    content TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,  -- instructor marked
    upvotes INT DEFAULT 0,
    created_at TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES community_discussionthread(id)
);
```

### Priority 2: Study Groups
```sql
CREATE TABLE community_studygroup (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    course_id INT,
    creator_id INT NOT NULL,
    max_members INT,
    status VARCHAR(20),  -- 'open', 'closed'
    created_at TIMESTAMP
);

CREATE TABLE community_studygroup_members (
    id SERIAL PRIMARY KEY,
    studygroup_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP,
    UNIQUE(studygroup_id, user_id)
);
```

### Priority 3: Badges
```sql
CREATE TABLE gamification_badge (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    rarity VARCHAR(20),  -- 'common', 'rare', 'epic'
    criteria_type VARCHAR(50),  -- 'assessment_count', 'course_completion'
    criteria_target INT
);

CREATE TABLE gamification_userachievement (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    unlocked_at TIMESTAMP,
    UNIQUE(user_id, badge_id)
);
```

---

## 🎯 Quick Wins You Can Do Today

### 1. Expand Post Model
```python
# Add to community/models.py Post model
related_course = ForeignKey(Course, blank=True, null=True)
related_assessment = ForeignKey(Assessment, blank=True, null=True)
post_type = CharField(choices=[
    ('general', 'General'),
    ('question', 'Question'),
    ('resource', 'Resource'),
    ('achievement', 'Achievement')
])
```

### 2. Add Follow System
```python
# New model
class UserFollow(models.Model):
    follower = ForeignKey(User, related_name='following')
    following = ForeignKey(User, related_name='followers')
    created_at = DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('follower', 'following')
```

### 3. Update Community Page
Show posts by type with tabs:
- "All" → All posts
- "Questions" → Only questions
- "Resources" → Only resources
- "Achievements" → Course completions, badges

---

## 🚀 Next Steps

1. **Pick Priority 1 (Discussion Channels)**
2. **Create models in `backend/community/models.py`**
3. **Generate migrations:** `python manage.py makemigrations`
4. **Create serializers in `backend/community/serializers.py`**
5. **Add endpoints in `backend/community/urls.py`**
6. **Test with Postman/curl**
7. **Build React UI in `components/`**

Ready to start? Which priority do you want to tackle first? 🚀

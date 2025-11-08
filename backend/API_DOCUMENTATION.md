# EduReach API Documentation

## Base URL
```
http://localhost:8000
```

## Authentication

All protected endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## 1. Authentication Endpoints

### Register New User
```http
POST /api/auth/registration/
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password1": "string",
  "password2": "string"
}

Response: 201 Created
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string"
  }
}
```

### Login
```http
POST /api/auth/login/
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response: 200 OK
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "tier": "free"
  }
}
```

### Logout
```http
POST /api/auth/logout/
Authorization: Bearer <token>

Response: 200 OK
```

### Refresh Token
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "jwt_refresh_token"
}

Response: 200 OK
{
  "access": "new_jwt_access_token"
}
```

---

## 2. User Endpoints

### Get Current User Profile
```http
GET /api/users/me/
Authorization: Bearer <token>

Response: 200 OK
{
  "id": 1,
  "username": "string",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "tier": "free",
  "bio": "string",
  "avatar": "url",
  "date_joined": "datetime",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Update User Profile
```http
PUT /api/users/me/
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "string",
  "last_name": "string",
  "bio": "string",
  "email": "string"
}

Response: 200 OK
```

### Upgrade User Tier
```http
POST /api/users/upgrade_tier/
Authorization: Bearer <token>
Content-Type: application/json

{
  "tier": "pro"
}

Response: 200 OK
```

---

## 3. Course Endpoints

### List All Courses
```http
GET /api/courses/
Authorization: Bearer <token> (optional)

Response: 200 OK
{
  "count": 10,
  "next": "url",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "string",
      "description": "string",
      "owner_username": "string",
      "thumbnail": "url",
      "lesson_count": 5,
      "created_at": "datetime"
    }
  ]
}
```

### Create Course
```http
POST /api/courses/
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "is_public": true
}

Response: 201 Created
```

### Get Course Details
```http
GET /api/courses/{id}/
Authorization: Bearer <token> (optional)

Response: 200 OK
{
  "id": 1,
  "title": "string",
  "description": "string",
  "owner": {
    "id": 1,
    "username": "string"
  },
  "thumbnail": "url",
  "is_public": true,
  "lessons": [...],
  "lesson_count": 5,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Get Course Lessons
```http
GET /api/courses/{id}/lessons/
Authorization: Bearer <token> (optional)

Response: 200 OK
[
  {
    "id": 1,
    "course": 1,
    "title": "string",
    "video_id": "youtube_id",
    "duration": "10:30",
    "order": 1,
    "description": "string",
    "created_at": "datetime"
  }
]
```

### Create Lesson
```http
POST /api/lessons/
Authorization: Bearer <token>
Content-Type: application/json

{
  "course": 1,
  "title": "string",
  "video_id": "youtube_id",
  "duration": "10:30",
  "order": 1,
  "description": "string"
}

Response: 201 Created
```

### Start Course (Track Progress)
```http
POST /api/progress/start_course/
Authorization: Bearer <token>
Content-Type: application/json

{
  "course_id": 1
}

Response: 201 Created
{
  "id": 1,
  "user": 1,
  "course": 1,
  "course_title": "string",
  "completed_lesson_ids": [],
  "progress_percentage": 0,
  "started_at": "datetime"
}
```

### Complete Lesson
```http
POST /api/progress/{progress_id}/complete_lesson/
Authorization: Bearer <token>
Content-Type: application/json

{
  "lesson_id": 1
}

Response: 200 OK
```

---

## 4. Assessment Endpoints

### List All Assessments
```http
GET /api/assessments/
Authorization: Bearer <token> (optional)

Response: 200 OK
```

### Create Assessment
```http
POST /api/assessments/
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "string",
  "topic": "string",
  "description": "string",
  "time_limit_minutes": 30,
  "is_public": true
}

Response: 201 Created
```

### Get Assessment Questions
```http
GET /api/assessments/{id}/questions/
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": 1,
    "question_text": "string",
    "question_type": "mcq",
    "options": ["A", "B", "C", "D"],
    "points": 1,
    "order": 1
  }
]
```

### Create Question
```http
POST /api/questions/
Authorization: Bearer <token>
Content-Type: application/json

{
  "assessment": 1,
  "question_text": "string",
  "question_type": "mcq",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "Option A",
  "points": 1,
  "order": 1,
  "explanation": "string"
}

Response: 201 Created
```

### Start Assessment
```http
POST /api/assessments/{id}/start/
Authorization: Bearer <token>

Response: 201 Created
{
  "id": 1,
  "user": 1,
  "assessment": 1,
  "status": "in_progress",
  "started_at": "datetime"
}
```

### Submit Assessment
```http
POST /api/assessments/{id}/submit/
Authorization: Bearer <token>
Content-Type: application/json

{
  "answers": {
    "1": "Option A",
    "2": "Option B",
    "3": "True"
  }
}

Response: 200 OK
{
  "id": 1,
  "status": "graded",
  "score": "8/10",
  "percentage": 80.0,
  "time_taken_minutes": 25
}
```

---

## 5. Community Endpoints

### List All Posts
```http
GET /api/posts/
Authorization: Bearer <token> (optional)

Response: 200 OK
```

### Create Post
```http
POST /api/posts/
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "string"
}

Response: 201 Created
```

### Like/Unlike Post
```http
POST /api/posts/{id}/like/
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Post liked",
  "liked": true
}
```

### Comment on Post
```http
POST /api/posts/{id}/comment/
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "string"
}

Response: 201 Created
```

---

## 6. AI Service Endpoints

### Generate Quiz from Transcript
```http
POST /api/ai/generate-quiz/
Authorization: Bearer <token>
Content-Type: application/json

{
  "transcript": "string",
  "num_questions": 5,
  "difficulty": "medium"
}

Response: 200 OK
{
  "questions": [
    {
      "question": "string",
      "type": "mcq",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "string"
    }
  ]
}
```

### Chat with AI
```http
POST /api/ai/chat/
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Explain quantum computing",
  "context": "optional context"
}

Response: 200 OK
{
  "response": "AI generated response..."
}
```

### Generate Study Plan
```http
POST /api/ai/study-plan/
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "Python Programming",
  "duration_weeks": 4,
  "skill_level": "beginner",
  "goals": "Build web applications"
}

Response: 200 OK
{
  "study_plan": "Detailed study plan..."
}
```

### Explain Concept
```http
POST /api/ai/explain/
Authorization: Bearer <token>
Content-Type: application/json

{
  "concept": "Machine Learning",
  "detail_level": "detailed"
}

Response: 200 OK
{
  "explanation": "Detailed explanation..."
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid input data",
  "details": {...}
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error message"
}
```

---

## Response Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Request succeeded with no content to return
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Permission denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Pagination

List endpoints support pagination:

```http
GET /api/courses/?page=2

Response:
{
  "count": 100,
  "next": "http://localhost:8000/api/courses/?page=3",
  "previous": "http://localhost:8000/api/courses/?page=1",
  "results": [...]
}
```

Default page size: 20 items per page

---

## Filtering and Searching

Some endpoints support filtering (to be implemented):

```http
GET /api/courses/?search=python
GET /api/assessments/?topic=mathematics
GET /api/posts/?author=username
```

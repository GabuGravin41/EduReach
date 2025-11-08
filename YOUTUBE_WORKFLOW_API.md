# Complete Video Learning Workflow

## The Full Pipeline
1. **Add YouTube video** to course → 2. **Fetch/paste transcript** → 3. **Students take notes** → 4. **AI tutor** (with access to transcript + notes) → 5. **Generate quizzes**

## Core Workflow

### 1. Create a Course
```http
POST /api/courses/
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Introduction to Python",
  "description": "Learn Python programming from scratch",
  "is_public": true
}
```

**Response:**
```json
{
  "id": 1,
  "title": "Introduction to Python",
  "description": "Learn Python programming from scratch",
  "owner": {...},
  "thumbnail": null,
  "is_public": true,
  "lessons": [],
  "lesson_count": 0,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### 2. Add a Lesson (YouTube Video)
```http
POST /api/lessons/
Authorization: Bearer <token>
Content-Type: application/json

{
  "course": 1,
  "title": "Python Basics - Variables and Data Types",
  "video_id": "rfscVS0vtbw",
  "video_url": "https://www.youtube.com/watch?v=rfscVS0vtbw",
  "description": "Learn about Python variables and data types",
  "order": 1
}
```

**Note:** You can provide either `video_id` OR `video_url`. If only URL is provided, the system will extract the video_id.

---

### 3. Fetch Transcript Automatically
```http
POST /api/lessons/{lesson_id}/fetch_transcript/
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "en",
  "force_refresh": false
}
```

**Success Response (Transcript Found):**
```json
{
  "success": true,
  "message": "Transcript fetched successfully",
  "transcript": "Welcome to this tutorial on Python...",
  "source": "youtube",
  "metadata": {
    "title": "Python Tutorial for Beginners",
    "author": "Programming with Mosh",
    "duration": 3600,
    "thumbnail_url": "..."
  },
  "available_languages": [
    {
      "language_code": "en",
      "language_name": "English",
      "auto_generated": false
    }
  ]
}
```

**Failure Response (No Transcript Available):**
```json
{
  "success": false,
  "error": "Could not extract transcript from this video",
  "message": "Please provide a manual transcript as fallback",
  "can_paste_manual": true
}
```

---

### 4. Add Manual Transcript (Fallback)
If automatic transcript extraction fails, you can paste a transcript manually:

```http
POST /api/lessons/{lesson_id}/update_manual_transcript/
Authorization: Bearer <token>
Content-Type: application/json

{
  "manual_transcript": "Hello everyone, today we're going to learn about Python variables. Variables are containers for storing data..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual transcript updated successfully",
  "manual_transcript": "Hello everyone, today we're going to learn...",
  "has_auto_transcript": false
}
```

---

### 5. Get Transcript
Retrieve the transcript (automatically fetched or manually entered):

```http
GET /api/lessons/{lesson_id}/get_transcript/
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "lesson_id": 1,
  "lesson_title": "Python Basics - Variables and Data Types",
  "transcript": "Welcome to this tutorial...",
  "source": "auto",
  "language": "en",
  "fetched_at": "2024-01-01T12:00:00Z"
}
```

`source` can be:
- `"auto"` - automatically fetched from YouTube
- `"manual"` - manually pasted by user
- `"cached"` - previously fetched and cached

---

### 6. Save Student Notes
```http
POST /api/lessons/{lesson_id}/save_notes/
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Variables are containers. Important: use snake_case naming.",
  "timestamps": [
    {"time": 120, "note": "Key concept: variable declaration"},
    {"time": 300, "note": "Example: x = 5"}
  ]
}
```

---

### 7. Get Student Notes
```http
GET /api/lessons/{lesson_id}/get_notes/
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "notes": {
    "id": 1,
    "notes": "Variables are containers...",
    "timestamps": [...],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

### 8. Ask AI Tutor (with transcript + notes context)
```http
POST /api/lessons/{lesson_id}/ai_tutor/
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Can you explain more about variable types?"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Based on the video, Python has several variable types including integers, strings, floats...",
  "has_transcript": true,
  "has_notes": true
}
```

**Note:** AI has access to the video transcript AND student's notes to provide contextual answers.

---

### 9. Generate AI Quiz from Transcript
```http
POST /api/lessons/{lesson_id}/generate_quiz/
Authorization: Bearer <token>
Content-Type: application/json

{
  "num_questions": 5,
  "difficulty": "medium"
}
```

**Response:**
```json
{
  "success": true,
  "lesson_id": 1,
  "lesson_title": "Python Basics - Variables and Data Types",
  "quiz": {
    "questions": [
      {
        "question": "What is a variable in Python?",
        "type": "mcq",
        "options": [
          "A container for storing data",
          "A type of loop",
          "A function",
          "A class"
        ],
        "correct_answer": "A container for storing data",
        "explanation": "Variables in Python are containers that store data values"
      }
    ]
  },
  "transcript_source": "auto"
}
```

---

### 10. List Lessons for a Course
```http
GET /api/courses/{course_id}/lessons/
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "course": 1,
    "title": "Python Basics - Variables and Data Types",
    "video_id": "rfscVS0vtbw",
    "video_url": "https://www.youtube.com/watch?v=rfscVS0vtbw",
    "duration": "3600",
    "order": 1,
    "description": "Learn about Python variables",
    "transcript": "...",
    "transcript_language": "en",
    "manual_transcript": "",
    "transcript_fetched_at": "2024-01-01T12:00:00Z",
    "has_transcript": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
]
```

---

## Complete Workflow Example

### Scenario: Adding a YouTube lesson with redundancy

#### Step 1: Create the lesson
```bash
POST /api/lessons/
{
  "course": 1,
  "title": "Learn Django REST Framework",
  "video_url": "https://www.youtube.com/watch?v=c708Nf0cHrs",
  "order": 1
}
```

#### Step 2: Try to fetch transcript automatically
```bash
POST /api/lessons/1/fetch_transcript/
{
  "language": "en"
}
```

**If successful:** ✅ Transcript is saved, proceed to Step 4

**If failed:** ❌ Proceed to Step 3

#### Step 3: Add manual transcript (if auto-fetch failed)
```bash
POST /api/lessons/1/update_manual_transcript/
{
  "manual_transcript": "[Paste the transcript here from YouTube manually or from other source]"
}
```

#### Step 4: Generate quiz
```bash
POST /api/lessons/1/generate_quiz/
{
  "num_questions": 10,
  "difficulty": "medium"
}
```

#### Step 5: Students can now:
- Watch the video (embedded YouTube player)
- Read the transcript
- Take AI-generated quizzes
- Track their progress

---

## Additional YouTube API Endpoints

### Extract Transcript (Standalone)
```http
POST /api/youtube/extract-transcript/
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "language": "en"
}
```

### Get Video Info
```http
GET /api/youtube/video-info/?url=VIDEO_URL
Authorization: Bearer <token>
```

---

## Error Handling

### Common Error Responses

**No Transcript Available:**
```json
{
  "success": false,
  "error": "Could not extract transcript from this video",
  "message": "Please provide a manual transcript as fallback",
  "can_paste_manual": true
}
```

**No GEMINI_API_KEY:**
```json
{
  "success": false,
  "error": "Error generating quiz: GEMINI_API_KEY is not configured in settings"
}
```

**Invalid YouTube URL:**
```json
{
  "success": false,
  "error": "Invalid YouTube URL"
}
```

---

## Progress Tracking

### Start a Course
```http
POST /api/progress/start_course/
Authorization: Bearer <token>
Content-Type: application/json

{
  "course_id": 1
}
```

### Mark Lesson as Complete
```http
POST /api/progress/{progress_id}/complete_lesson/
Authorization: Bearer <token>
Content-Type: application/json

{
  "lesson_id": 1
}
```

### Get My Progress
```http
GET /api/progress/
Authorization: Bearer <token>
```

---

## Summary of Key Features

✅ **Automatic Transcript Extraction** - Fetches transcripts directly from YouTube
✅ **Manual Transcript Fallback** - Users can paste transcripts if auto-fetch fails
✅ **Multi-language Support** - Supports multiple transcript languages
✅ **AI Quiz Generation** - Generates quiz questions from transcripts using Google Gemini
✅ **Video Metadata** - Automatically fetches video title, author, duration
✅ **Progress Tracking** - Track which lessons students have completed
✅ **Caching** - Transcripts are cached to avoid re-fetching

---

## Setup Requirements

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set GEMINI_API_KEY in your `.env` file:
```
GEMINI_API_KEY=your_google_gemini_api_key_here
```

3. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

4. Start the server:
```bash
python manage.py runserver
```

---

## Next Steps for MVP Rollout

1. ✅ Create courses
2. ✅ Add YouTube video lessons
3. ✅ Fetch transcripts (with fallback)
4. ✅ Generate AI quizzes
5. Build frontend components for video player + transcript viewer + quiz interface
6. Add user authentication
7. Deploy to production

---

**You're now ready to roll out your YouTube video learning platform! 🚀**

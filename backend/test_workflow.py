"""
Quick test script for the complete video workflow.
Run: python test_workflow.py
"""

import requests
import json

BASE_URL = "http://localhost:8000"
# You'll need to get a token first by logging in
TOKEN = "YOUR_TOKEN_HERE"  # Replace with actual token

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def test_workflow():
    print("🧪 Testing Complete Video Learning Workflow\n")
    
    # 1. Create course
    print("1️⃣ Creating course...")
    course_data = {
        "title": "Test Python Course",
        "description": "Testing the workflow",
        "is_public": True
    }
    response = requests.post(f"{BASE_URL}/api/courses/", json=course_data, headers=headers)
    if response.status_code in [200, 201]:
        course_id = response.json()['id']
        print(f"✅ Course created: ID {course_id}\n")
    else:
        print(f"❌ Failed: {response.text}\n")
        return
    
    # 2. Add video
    print("2️⃣ Adding YouTube video...")
    lesson_data = {
        "course": course_id,
        "title": "Python Basics",
        "video_url": "https://www.youtube.com/watch?v=rfscVS0vtbw",
        "order": 1
    }
    response = requests.post(f"{BASE_URL}/api/lessons/", json=lesson_data, headers=headers)
    if response.status_code in [200, 201]:
        lesson_id = response.json()['id']
        print(f"✅ Video added: ID {lesson_id}\n")
    else:
        print(f"❌ Failed: {response.text}\n")
        return
    
    # 3. Fetch transcript
    print("3️⃣ Fetching transcript...")
    response = requests.post(
        f"{BASE_URL}/api/lessons/{lesson_id}/fetch_transcript/",
        json={"language": "en"},
        headers=headers
    )
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            print(f"✅ Transcript fetched: {len(result.get('transcript', ''))} characters")
            print(f"   Source: {result.get('source')}\n")
        else:
            print(f"⚠️ Auto-fetch failed: {result.get('error')}")
            print("   → Use manual transcript fallback in production\n")
    
    # 4. Save notes
    print("4️⃣ Saving student notes...")
    notes_data = {
        "notes": "Python is great for beginners. Key concepts: variables, data types",
        "timestamps": [
            {"time": 120, "note": "Important: variable naming conventions"},
            {"time": 300, "note": "Example: x = 5"}
        ]
    }
    response = requests.post(
        f"{BASE_URL}/api/lessons/{lesson_id}/save_notes/",
        json=notes_data,
        headers=headers
    )
    if response.status_code == 200:
        print("✅ Notes saved\n")
    else:
        print(f"❌ Failed: {response.text}\n")
    
    # 5. Get notes
    print("5️⃣ Retrieving notes...")
    response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/get_notes/", headers=headers)
    if response.status_code == 200:
        notes = response.json().get('notes')
        if notes:
            print(f"✅ Notes retrieved: {notes.get('notes')[:50]}...")
            print(f"   Timestamps: {len(notes.get('timestamps', []))}\n")
    
    # 6. Ask AI tutor
    print("6️⃣ Asking AI tutor...")
    response = requests.post(
        f"{BASE_URL}/api/lessons/{lesson_id}/ai_tutor/",
        json={"message": "Can you summarize the key concepts?"},
        headers=headers
    )
    if response.status_code == 200:
        result = response.json()
        print(f"✅ AI response received")
        print(f"   Has transcript context: {result.get('has_transcript')}")
        print(f"   Has notes context: {result.get('has_notes')}")
        print(f"   Response: {result.get('response')[:100]}...\n")
    else:
        print(f"❌ Failed: {response.text}\n")
    
    # 7. Generate quiz
    print("7️⃣ Generating quiz...")
    response = requests.post(
        f"{BASE_URL}/api/lessons/{lesson_id}/generate_quiz/",
        json={"num_questions": 3, "difficulty": "easy"},
        headers=headers
    )
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            questions = result.get('quiz', {}).get('questions', [])
            print(f"✅ Quiz generated: {len(questions)} questions")
            if questions:
                print(f"   First question: {questions[0].get('question')}\n")
        else:
            print(f"❌ Failed: {result.get('error')}\n")
    
    print("=" * 60)
    print("🎉 WORKFLOW TEST COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    if TOKEN == "YOUR_TOKEN_HERE":
        print("⚠️ Please set TOKEN variable in script first")
        print("Get token by: POST /api/auth/login/")
    else:
        test_workflow()

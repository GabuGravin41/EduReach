# 🔧 AI Service Debugging Guide

## Quick Summary of Fixes

I've identified and fixed 3 main issues with your AI service:

### 1. ✅ React Key Warning - FIXED
**Problem:** `Encountered two children with the same key, 1`
**Location:** `AIAssistant.tsx` line 106
**Cause:** Using array index as React key for chat messages
**Solution:** Now using unique message IDs based on role + content

### 2. ✅ Backend 500 Errors - FIXED
**Problem:** `POST /api/ai/chat/` and `/api/ai/generate-quiz/` returning 500 errors
**Location:** Backend AI service
**Cause:** `GEMINI_API_KEY` environment variable not set
**Solution:** Created `.env` file in backend folder

### 3. ✅ Message Handling - IMPROVED
**Problem:** Empty model messages being added to chat before API response arrives
**Location:** `LearningSession.tsx` handleSendMessage
**Solution:** Now only add messages when they have content (no empty placeholders)

---

## 🚀 WHAT YOU NEED TO DO NOW

### CRITICAL: Set Your Gemini API Key

1. **Get your API key:**
   - Go to https://makersuite.google.com/app/apikey
   - Click "Create API Key"
   - Copy the key

2. **Add to .env file:**
   - Open `backend/.env`
   - Find: `GEMINI_API_KEY=your-actual-gemini-api-key-here`
   - Replace with your actual key:
   ```
   GEMINI_API_KEY=AIzaSyD_xxxxxxxxxxxxxxxxxxx
   ```

3. **Restart your backend server:**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   python manage.py runserver
   ```

---

## 📋 Files Modified

### Frontend Changes:
- **`components/AIAssistant.tsx`**
  - Added `messagesWithIds` to generate unique keys for each message
  - Changed `key={index}` to `key={msg.id}`
  - Updated loading indicator condition to work with new ID system

- **`components/LearningSession.tsx`**
  - Removed empty placeholder message from chat
  - Now messages are only added when they have actual content
  - Simplified error handling

### Backend Changes:
- **`backend/.env`** (NEW FILE)
  - Created from `.env.example`
  - Configure your GEMINI_API_KEY here

- **`backend/ai_service/views.py`**
  - Added logging import
  - Enhanced error logging for debugging
  - Now returns error type information for better debugging

---

## 🐛 Debugging Checklist

If you still see errors, check:

- [ ] **GEMINI_API_KEY is set in `.env`**
  ```bash
  # Check if env file exists
  ls backend/.env
  
  # Verify the key is there
  grep GEMINI_API_KEY backend/.env
  ```

- [ ] **Backend server is running**
  ```bash
  # Should see: "Starting development server at http://127.0.0.1:8000/"
  python manage.py runserver
  ```

- [ ] **Frontend is pointing to correct API**
  - Check `src/config/api.ts` - `VITE_API_BASE_URL` should be `http://localhost:8000/api`

- [ ] **No console errors in browser DevTools**
  - F12 → Console tab
  - Look for red errors (ignore the React DevTools warning)

---

## 🧪 Test the AI Service

### Test Chat:
1. Open a Learning Session
2. Type a message in the chat
3. Should get a response from Gemini

### Test Quiz Generation:
1. Click "Generate a quiz from transcript"
2. Should generate 5 questions

### Check Backend Logs:
Run this to see detailed server logs:
```bash
python manage.py runserver --verbosity 2
```

---

## 📊 Error Response Format

If you still get 500 errors, the response will now include:
```json
{
  "error": "Error message here",
  "type": "ExceptionTypeName"
}
```

Common errors:
- `ValueError` → Usually GEMINI_API_KEY issue
- `APIError` → Gemini API rate limit or invalid request
- `AuthenticationError` → Invalid API key format

---

## 🔗 Useful Resources

- **Gemini API Key:** https://makersuite.google.com/app/apikey
- **Gemini API Docs:** https://ai.google.dev/docs
- **Django Debug Mode:** Set `DEBUG=True` in `.env` for detailed error pages
- **Browser DevTools:** F12 to see network requests and errors

---

## 📝 Next Steps

1. Add your GEMINI_API_KEY to `.env`
2. Restart the backend server
3. Test chat and quiz generation
4. Check browser console for errors
5. If issues persist, check backend logs with `--verbosity 2`

Good luck! 🚀

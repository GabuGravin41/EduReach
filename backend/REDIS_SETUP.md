# Redis & Celery Setup Guide for EduReach

This project now uses Celery and Redis to handle heavy tasks (like local Whisper transcription) in the background.

## 1. Local Setup (Windows)

### Option A: Using Docker (Recommended)
If you have Docker Desktop installed, simply run:
```bash
docker run -d -p 6379:6379 redis
```

### Option B: Native Windows (WSL)
1. Install WSL (Ubuntu): `wsl --install`
2. Inside WSL, install Redis: `sudo apt install redis-server`
3. Start Redis: `sudo service redis-server start`

### Option C: Memurai (Redis for Windows)
Download and install [Memurai](https://www.memurai.com/get-memurai) which is a native Windows build of Redis.

---

## 2. Running Celery Workers

Once Redis is running, open a new terminal in the `backend` directory and run:

### Start the Worker:
```bash
celery -A edureach_project worker --loglevel=info -P solo
```
*(Note: `-P solo` is often required on Windows for Celery to work correctly).*

### Start the Monitoring Tool (Flower) - Optional:
```bash
celery -A edureach_project flower
```
Accessible at [http://localhost:5555](http://localhost:5555).

---

## 3. Deployment (Railway/Heroku)
1. Add a **Redis** service to your project.
2. In Railway, it will automatically provide a `REDIS_URL`.
3. Add a new **Worker** service that runs the command:
   `celery -A edureach_project worker --loglevel=info`

---

## 4. Local Whisper Prerequisites
Local Whisper requires `ffmpeg` to be installed and available in your system PATH.
- **Windows**: Install via `choco install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org/download.html).
- **Verify**: Run `ffmpeg -version` in your terminal.

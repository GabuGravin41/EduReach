# EduReach
**Active Learning for Africa & Beyond**

EduReach is a mobile-first, AI-powered learning platform that transforms passive YouTube video watching into an active, gamified study experience. It wraps standard YouTube content in a structured environment with quizzes, challenges, and AI assistance, while integrating native African payment networks like M-Pesa and Paystack.

---

## 🎯 Key Features

- **Active Learning Layer:** Turns YouTube videos into structured courses.
- **AI-Generated Assessments:** Instantly generates quizzes (Multiple Choice, True/False, Essay) from video transcripts.
- **Personal AI Tutor:** Context-aware chat assistant that explains concepts and grades essays.
- **Social & Gamified:** Earn XP, level up, and challenge friends to make learning a multiplayer experience.
- **Study Groups:** Public and private groups for discussing lessons and tracking progress.
- **Localized Payments:** Full support for M-Pesa (STK Push & Paybill) and Paystack, lowering the barrier to entry for the African market.

---

## 💻 Tech Stack

### Frontend
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Data Fetching:** React Query (TanStack) + Axios
- **Routing:** React Router v7
- **Mobile Ready:** Capacitor

### Backend
- **Framework:** Python / Django / Django REST Framework
- **Database:** PostgreSQL (Production) / SQLite (Local)
- **Authentication:** JWT (JSON Web Tokens)
- **AI Integration:** OpenRouter / Google Gemini 2.0 Flash
- **Task Queue:** Celery + Redis

---

## 🚀 Getting Started

### 1. Backend Setup (Django)
```bash
cd backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your local variables
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
The backend will run on `http://localhost:8000`.

### 2. Frontend Setup (React)
```bash
# In the project root directory
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

---

## 📚 Documentation Reference

For deeper context, team onboarding, and deployment guides, please refer to the following active documentation files:
- **[EduReach — Team Onboarding Document.md](./EduReach%20%E2%80%94%20Team%20Onboarding%20Document.md)**: The single most important document. Contains the business strategy, honest current status of the codebase, and architecture decisions.
- **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)**: Details on production deployments, setting up the admin panel, and the free trial system.
- **[ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)**: Instructions on configuring the Django Admin panel for courses.
- **[COMMUNITY_ECOSYSTEM_VISUAL.md](./COMMUNITY_ECOSYSTEM_VISUAL.md)**: Architectural diagrams of the community features.
- **[docs/PRODUCTION_READINESS.md](./docs/PRODUCTION_READINESS.md)**: A checklist for taking the app to production.

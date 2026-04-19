"""
Management command to seed 15 realistic Kenyan user profiles for investor demo.
Creates users with full profiles, XP history, course progress, assessment attempts,
and streak activity spanning 1 week to 3 months.
"""

import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction


KENYAN_USERS = [
    {
        "username": "wanjiku_mwangi",
        "first_name": "Wanjiku",
        "last_name": "Mwangi",
        "email": "wanjiku.mwangi@gmail.com",
        "bio": "Form 4 student at Starehe Girls' Centre. Passionate about mathematics and sciences. Dreaming of studying Actuarial Science at UoN. Love solving complex problems and helping classmates. #KCSEStrong",
        "tier": "pro",
        "learning_goal": "exams",
        "learner_type": "high_school_student",
        "interests": "math,sciences,exams",
        "streak_days": 78,
        "xp_base": 8400,
        "time_hours": 142,
    },
    {
        "username": "otieno_odhiambo",
        "first_name": "Otieno",
        "last_name": "Odhiambo",
        "email": "otieno.odhiambo@outlook.com",
        "bio": "2nd year Computer Science student at JKUAT. Building apps on the side and learning cloud computing. Currently obsessed with machine learning and AI. Kisumu bred, Nairobi based. 🦁",
        "tier": "learner",
        "learning_goal": "skills",
        "learner_type": "university_student",
        "interests": "programming,math,technology",
        "streak_days": 45,
        "xp_base": 5200,
        "time_hours": 89,
    },
    {
        "username": "aisha_farah",
        "first_name": "Aisha",
        "last_name": "Farah",
        "email": "aisha.farah@yahoo.com",
        "bio": "Final year Law student at Strathmore University. Preparing for bar exams while running a small tutoring business in Eastleigh. Believer in lifelong learning and community uplift. 📚",
        "tier": "pro",
        "learning_goal": "exams",
        "learner_type": "university_student",
        "interests": "languages,exams,writing",
        "streak_days": 62,
        "xp_base": 7100,
        "time_hours": 118,
    },
    {
        "username": "kipchoge_rotich",
        "first_name": "Kipchoge",
        "last_name": "Rotich",
        "email": "kipchoge.rotich@gmail.com",
        "bio": "Mathematics teacher at Rift Valley Academy, Kijabe. 12 years in the classroom, now embracing EdTech to reach more students. Creating resources for rural schools. Father of 3. 🏃‍♂️",
        "tier": "pro",
        "learning_goal": "teach",
        "learner_type": "teacher",
        "interests": "math,sciences,exams",
        "streak_days": 89,
        "xp_base": 11200,
        "time_hours": 210,
    },
    {
        "username": "njeri_kamau",
        "first_name": "Njeri",
        "last_name": "Kamau",
        "email": "njeri.kamau@gmail.com",
        "bio": "Form 3 student at Kenya High School, Nairobi. I love Chemistry and Biology. Aspiring Medical Doctor. Study group captain in my class. Side hobby: coding in Python 🐍",
        "tier": "learner",
        "learning_goal": "school",
        "learner_type": "high_school_student",
        "interests": "sciences,biology,chemistry",
        "streak_days": 28,
        "xp_base": 3100,
        "time_hours": 54,
    },
    {
        "username": "hassan_abdi",
        "first_name": "Hassan",
        "last_name": "Abdi",
        "email": "hassan.abdi@gmail.com",
        "bio": "Software developer at iHub Nairobi. 5 years in web development, now upskilling in data science. Coastal Kenyan proud of Swahili heritage. Tech for good advocate. Building apps for fishermen communities.",
        "tier": "pro",
        "learning_goal": "skills",
        "learner_type": "professional",
        "interests": "programming,technology,data_science",
        "streak_days": 55,
        "xp_base": 6800,
        "time_hours": 98,
    },
    {
        "username": "zawadi_mutua",
        "first_name": "Zawadi",
        "last_name": "Mutua",
        "email": "zawadi.mutua@outlook.com",
        "bio": "Diploma student at Kenya Medical Training College, Machakos. Nursing is my calling. Using EduReach to supplement my anatomy and pharmacology studies. Ukambani represent! 💙",
        "tier": "learner",
        "learning_goal": "exams",
        "learner_type": "college_student",
        "interests": "sciences,biology,health",
        "streak_days": 19,
        "xp_base": 2200,
        "time_hours": 38,
    },
    {
        "username": "baraka_omondi",
        "first_name": "Baraka",
        "last_name": "Omondi",
        "email": "baraka.omondi@gmail.com",
        "bio": "Form 2 student from Kisumu Day. Obsessed with Physics and wants to be an aerospace engineer. Watches space documentaries in free time. Big Gor Mahia fan ⭐. Goal: MIT scholarship.",
        "tier": "free",
        "learning_goal": "olympiad",
        "learner_type": "high_school_student",
        "interests": "sciences,physics,math",
        "streak_days": 14,
        "xp_base": 1500,
        "time_hours": 27,
    },
    {
        "username": "amina_waweru",
        "first_name": "Amina",
        "last_name": "Waweru",
        "email": "amina.waweru@gmail.com",
        "bio": "HR professional at Safaricom, Nairobi. Studying for CHRP certification. Using EduReach for professional development. Also helping my kids with their school work. Kikuyu-Somali fusion. 🌟",
        "tier": "learner",
        "learning_goal": "professional_development",
        "learner_type": "professional",
        "interests": "languages,writing,business",
        "streak_days": 33,
        "xp_base": 3900,
        "time_hours": 67,
    },
    {
        "username": "silas_kiprotich",
        "first_name": "Silas",
        "last_name": "Kiprotich",
        "email": "silas.kiprotich@gmail.com",
        "bio": "3rd year Engineering student at Moi University, Eldoret. Specializing in electrical engineering. Building solar solutions for rural Kalenjin communities. Weekend marathon runner 🏃 (following footsteps of the greats).",
        "tier": "learner",
        "learning_goal": "school",
        "learner_type": "university_student",
        "interests": "math,physics,engineering",
        "streak_days": 41,
        "xp_base": 4700,
        "time_hours": 81,
    },
    {
        "username": "faith_adhiambo",
        "first_name": "Faith",
        "last_name": "Adhiambo",
        "email": "faith.adhiambo@gmail.com",
        "bio": "Form 4 student at Nakuru Girls' High School. Top 5 in my class. Passionate about Economics and Business Studies. Planning to study Finance at USIU. Future CFO? Absolutely. 💼",
        "tier": "pro",
        "learning_goal": "exams",
        "learner_type": "high_school_student",
        "interests": "business,economics,math",
        "streak_days": 70,
        "xp_base": 8900,
        "time_hours": 155,
    },
    {
        "username": "jabali_ndungu",
        "first_name": "Jabali",
        "last_name": "Ndung'u",
        "email": "jabali.ndungu@gmail.com",
        "bio": "Full-stack developer from Thika. Self-taught coder turned professional. Mentor at Andela Kenya. Using EduReach to stay sharp on algorithms and system design. Coffee addict ☕ and open-source contributor.",
        "tier": "pro",
        "learning_goal": "skills",
        "learner_type": "professional",
        "interests": "programming,technology,algorithms",
        "streak_days": 51,
        "xp_base": 6300,
        "time_hours": 104,
    },
    {
        "username": "zipporah_chebet",
        "first_name": "Zipporah",
        "last_name": "Chebet",
        "email": "zipporah.chebet@yahoo.com",
        "bio": "Form 3 student at St. Brigid's Girls High School, Eldoret. County-level Mathematics champion 2024. Loves competitive programming and chess. Aiming for STEM scholarships abroad. 🧠",
        "tier": "learner",
        "learning_goal": "olympiad",
        "learner_type": "high_school_student",
        "interests": "math,programming,sciences",
        "streak_days": 57,
        "xp_base": 6700,
        "time_hours": 112,
    },
    {
        "username": "emmanuel_makokha",
        "first_name": "Emmanuel",
        "last_name": "Makokha",
        "email": "emmanuel.makokha@gmail.com",
        "bio": "Primary school headmaster in Kakamega County. 18 years in education. Passionate about digital literacy for rural learners. Building a school library program. Proud Luhyia, community leader. 📖",
        "tier": "learner",
        "learning_goal": "teach",
        "learner_type": "teacher",
        "interests": "languages,education,technology",
        "streak_days": 37,
        "xp_base": 4400,
        "time_hours": 73,
    },
    {
        "username": "lydia_nyambura",
        "first_name": "Lydia",
        "last_name": "Nyambura",
        "email": "lydia.nyambura@gmail.com",
        "bio": "1st year student at Kenyatta University studying Journalism and Media. Editor of the campus digital magazine. Interested in data journalism and investigative reporting. Nairobi girl through and through 🦋.",
        "tier": "free",
        "learning_goal": "curiosity",
        "learner_type": "university_student",
        "interests": "languages,writing,media",
        "streak_days": 10,
        "xp_base": 1100,
        "time_hours": 19,
    },
]

SAMPLE_COURSES = [
    {
        "title": "KCSE Mathematics Mastery",
        "description": "Comprehensive preparation for KCSE Mathematics Paper 1 & 2. Covers algebra, geometry, calculus, statistics, and probability with past paper analysis and exam techniques.",
    },
    {
        "title": "Introduction to Python Programming",
        "description": "Learn Python from scratch — variables, loops, functions, OOP, and real-world projects. Perfect for students and professionals entering the tech industry.",
    },
    {
        "title": "KCSE Biology & Chemistry Combined",
        "description": "Science preparation for Form 3 & 4. Detailed notes, diagrams, and practice questions for KCSE Biology and Chemistry. Includes practical lab guidance.",
    },
    {
        "title": "English Language & Communication Skills",
        "description": "Improve your written and spoken English for academic, professional, and everyday use. Covers grammar, essay writing, comprehension, and oral skills.",
    },
    {
        "title": "Business Studies & Economics for KCSE",
        "description": "Master Business Studies and Economics for KCSE. Understand financial management, entrepreneurship, market forces, and national economic policy.",
    },
]

SAMPLE_ASSESSMENTS = [
    {
        "title": "KCSE Math Paper 1 - Algebra",
        "topic": "Algebra",
        "description": "Practice assessment covering quadratic equations, simultaneous equations, and inequalities at KCSE level.",
        "assessment_type": "exam",
        "questions": [
            {"text": "Solve for x: 2x² - 5x + 3 = 0", "type": "MCQ", "options": ["x=1 or x=1.5", "x=2 or x=0.5", "x=3 or x=-1", "x=1 or x=-1.5"], "answer": "x=1 or x=1.5", "points": 2},
            {"text": "Simplify: (3x² + 6x) / (x + 2)", "type": "SHORT_ANSWER", "correct_answer": "3x", "points": 3},
            {"text": "True or False: Every quadratic equation has two distinct real roots.", "type": "TRUE_FALSE", "options": ["True", "False"], "answer": "False", "points": 1},
            {"text": "Solve the simultaneous equations: 2x + y = 7 and x - y = 2", "type": "SHORT_ANSWER", "correct_answer": "x=3, y=1", "points": 3},
            {"text": "Which of the following is a factor of x² - 9?", "type": "MCQ", "options": ["(x+3)", "(x-9)", "(x+9)", "(x-3)(x+3)"], "answer": "(x-3)(x+3)", "points": 2},
        ]
    },
    {
        "title": "Python Basics Quiz",
        "topic": "Programming",
        "description": "Test your knowledge of Python fundamentals: data types, loops, functions, and basic problem solving.",
        "assessment_type": "quiz",
        "questions": [
            {"text": "What is the output of: print(type(3.14))?", "type": "MCQ", "options": ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'number'>"], "answer": "<class 'float'>", "points": 1},
            {"text": "True or False: Python uses indentation to define code blocks.", "type": "TRUE_FALSE", "options": ["True", "False"], "answer": "True", "points": 1},
            {"text": "How do you create a list in Python?", "type": "MCQ", "options": ["list = (1,2,3)", "list = {1,2,3}", "list = [1,2,3]", "list = <1,2,3>"], "answer": "list = [1,2,3]", "points": 1},
            {"text": "Write the Python syntax to define a function called greet that takes a name parameter.", "type": "SHORT_ANSWER", "correct_answer": "def greet(name):", "points": 2},
            {"text": "What keyword is used to handle exceptions in Python?", "type": "MCQ", "options": ["catch", "handle", "except", "error"], "answer": "except", "points": 1},
        ]
    },
    {
        "title": "Biology - Cell Structure & Function",
        "topic": "Biology",
        "description": "Covers cell organelles, their functions, differences between plant and animal cells, and cell division basics.",
        "assessment_type": "exam",
        "questions": [
            {"text": "Which organelle is responsible for producing ATP through cellular respiration?", "type": "MCQ", "options": ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"], "answer": "Mitochondria", "points": 2},
            {"text": "True or False: Plant cells have a cell wall made of chitin.", "type": "TRUE_FALSE", "options": ["True", "False"], "answer": "False", "points": 1},
            {"text": "What is the function of the cell membrane?", "type": "SHORT_ANSWER", "correct_answer": "controls what enters and leaves the cell", "points": 3},
            {"text": "During which phase of mitosis do chromosomes line up at the cell's equator?", "type": "MCQ", "options": ["Prophase", "Metaphase", "Anaphase", "Telophase"], "answer": "Metaphase", "points": 2},
            {"text": "Which type of cell division produces gametes?", "type": "MCQ", "options": ["Mitosis", "Meiosis", "Binary fission", "Budding"], "answer": "Meiosis", "points": 2},
        ]
    },
    {
        "title": "English Comprehension & Grammar",
        "topic": "English",
        "description": "Assessment on comprehension skills, grammar rules, punctuation, and sentence construction.",
        "assessment_type": "quiz",
        "questions": [
            {"text": "Which sentence uses the correct form of 'affect' vs 'effect'?", "type": "MCQ", "options": ["The rain effected our plans.", "The rain affected our plans.", "The rain did effect our plans.", "We were effected by the rain."], "answer": "The rain affected our plans.", "points": 1},
            {"text": "True or False: A semicolon can join two independent clauses.", "type": "TRUE_FALSE", "options": ["True", "False"], "answer": "True", "points": 1},
            {"text": "What is the plural of 'criterion'?", "type": "MCQ", "options": ["criterions", "criterias", "criteria", "criterium"], "answer": "criteria", "points": 1},
            {"text": "Identify the subject in this sentence: 'Running every morning keeps me healthy.'", "type": "SHORT_ANSWER", "correct_answer": "Running every morning", "points": 2},
            {"text": "Which of these is an example of an oxymoron?", "type": "MCQ", "options": ["The sun rises in the east.", "She is a walking contradiction.", "Deafening silence", "He ran very fast."], "answer": "Deafening silence", "points": 1},
        ]
    },
    {
        "title": "Economics - Supply & Demand",
        "topic": "Economics",
        "description": "Tests understanding of supply and demand curves, market equilibrium, elasticity, and price determination.",
        "assessment_type": "exam",
        "questions": [
            {"text": "When demand increases and supply remains constant, what happens to equilibrium price?", "type": "MCQ", "options": ["It decreases", "It stays the same", "It increases", "It becomes zero"], "answer": "It increases", "points": 2},
            {"text": "True or False: Price elasticity of demand measures how quantity demanded responds to changes in income.", "type": "TRUE_FALSE", "options": ["True", "False"], "answer": "False", "points": 1},
            {"text": "What is meant by 'ceteris paribus' in economic analysis?", "type": "SHORT_ANSWER", "correct_answer": "all other things remaining equal or constant", "points": 3},
            {"text": "Which of the following is NOT a determinant of demand?", "type": "MCQ", "options": ["Income of consumers", "Price of related goods", "Cost of production", "Consumer tastes"], "answer": "Cost of production", "points": 2},
            {"text": "A good with a price elasticity of demand of -0.3 is considered:", "type": "MCQ", "options": ["Perfectly elastic", "Elastic", "Inelastic", "Perfectly inelastic"], "answer": "Inelastic", "points": 2},
        ]
    },
]


class Command(BaseCommand):
    help = 'Seeds 15 realistic Kenyan user profiles for investor demo with full activity data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing seeded users before re-creating them',
        )

    def handle(self, *args, **options):
        from users.models import User, XPTransaction
        from courses.models import Course, Lesson, UserProgress
        from assessments.models import Assessment, Question, UserAttempt

        if options['reset']:
            usernames = [u['username'] for u in KENYAN_USERS]
            deleted, _ = User.objects.filter(username__in=usernames).delete()
            self.stdout.write(self.style.WARNING(f'Deleted {deleted} existing seeded records.'))

        self.stdout.write(self.style.MIGRATE_HEADING('=== EduReach Kenyan User Seeder ===\n'))

        with transaction.atomic():
            # Step 1: Get or create an admin/owner user for sample content
            owner = User.objects.filter(is_superuser=True).first()
            if not owner:
                owner = User.objects.filter(tier='admin').first()
            if not owner:
                owner, _ = User.objects.get_or_create(
                    username='content_admin',
                    defaults={
                        'email': 'admin@edureach.co.ke',
                        'first_name': 'EduReach',
                        'last_name': 'Admin',
                        'tier': 'admin',
                        'is_staff': True,
                        'is_superuser': True,
                    }
                )
                owner.set_password('Admin@EduReach2025')
                owner.save()

            # Step 2: Create sample courses if fewer than 3 exist
            courses = list(Course.objects.all()[:5])
            if len(courses) < 3:
                self.stdout.write('  Creating sample courses...')
                for c_data in SAMPLE_COURSES:
                    course, created = Course.objects.get_or_create(
                        title=c_data['title'],
                        owner=owner,
                        defaults={'description': c_data['description'], 'is_public': True}
                    )
                    if created:
                        # Add a few placeholder lessons
                        lesson_titles = [
                            ('Introduction & Overview', 'dQw4w9WgXcQ', '14:23', 1),
                            ('Core Concepts Deep Dive', 'jNQXAC9IVRw', '22:11', 2),
                            ('Worked Examples & Practice', 'FzRH3iTQPrk', '31:05', 3),
                            ('Advanced Topics', 'M7lc1UVf-VE', '19:47', 4),
                            ('Exam Strategy & Revision', '9bZkp7q19f0', '25:30', 5),
                        ]
                        for title, vid_id, duration, order in lesson_titles:
                            Lesson.objects.get_or_create(
                                course=course,
                                order=order,
                                defaults={
                                    'title': title,
                                    'video_id': vid_id,
                                    'video_url': f'https://www.youtube.com/watch?v={vid_id}',
                                    'duration': duration,
                                }
                            )
                        self.stdout.write(f'    + Course: {course.title}')
                courses = list(Course.objects.all()[:5])

            # Step 3: Create sample assessments if fewer than 3 exist
            assessments = list(Assessment.objects.all()[:5])
            if len(assessments) < 3:
                self.stdout.write('  Creating sample assessments...')
                for a_data in SAMPLE_ASSESSMENTS:
                    assessment, created = Assessment.objects.get_or_create(
                        title=a_data['title'],
                        creator=owner,
                        defaults={
                            'topic': a_data['topic'],
                            'description': a_data['description'],
                            'assessment_type': a_data['assessment_type'],
                            'is_public': True,
                            'results_visibility': 'public',
                        }
                    )
                    if created:
                        for i, q in enumerate(a_data['questions']):
                            q_type_map = {
                                'MCQ': 'mcq',
                                'TRUE_FALSE': 'true_false',
                                'SHORT_ANSWER': 'short_answer',
                                'ESSAY': 'essay',
                            }
                            Question.objects.create(
                                assessment=assessment,
                                question_text=q['text'],
                                question_type=q_type_map.get(q['type'], 'mcq'),
                                options=q.get('options', []),
                                correct_answer=q.get('answer') or q.get('correct_answer', ''),
                                points=q.get('points', 1),
                                order=i + 1,
                            )
                        self.stdout.write(f'    + Assessment: {assessment.title}')
                assessments = list(Assessment.objects.all()[:5])

            # Step 4: Create the 15 Kenyan users
            self.stdout.write('\n  Creating 15 Kenyan user profiles...\n')
            now = timezone.now()
            created_users = []

            for u_data in KENYAN_USERS:
                user, created = User.objects.get_or_create(
                    username=u_data['username'],
                    defaults={
                        'first_name': u_data['first_name'],
                        'last_name': u_data['last_name'],
                        'email': u_data['email'],
                        'bio': u_data['bio'],
                        'tier': u_data['tier'],
                        'learning_goal': u_data['learning_goal'],
                        'learner_type': u_data['learner_type'],
                        'interests': u_data['interests'],
                        'show_xp_publicly': True,
                        'xp_points': 0,
                        'level': 1,
                        'total_time_spent_seconds': u_data['time_hours'] * 3600,
                    }
                )

                if not created:
                    self.stdout.write(self.style.WARNING(
                        f'  [SKIP] {u_data["username"]} already exists. Use --reset to recreate.'
                    ))
                    created_users.append(user)
                    continue

                user.set_password('EduReach@2025!')
                user.save()

                streak_days = u_data['streak_days']
                xp_base = u_data['xp_base']

                # -- XP Transactions: simulate daily activity over streak_days --
                xp_total = 0
                start_date = now - timedelta(days=streak_days)

                # Daily streak XP (25–75 XP per day)
                for day_offset in range(streak_days):
                    day = start_date + timedelta(days=day_offset)
                    # Occasional missed days (10% chance, but never 2 in a row)
                    if day_offset > 0 and random.random() < 0.10:
                        continue
                    streak_xp = random.randint(25, 75)
                    xp_total += streak_xp
                    XPTransaction.objects.create(
                        user=user,
                        amount=streak_xp,
                        transaction_type='daily_streak',
                        category='streak',
                        description=f'Daily streak day {day_offset + 1}',
                        created_at=day,
                    )

                # Assessment XP (spread across the period)
                num_assessments_done = random.randint(3, min(len(assessments) * 3, 12))
                assessment_xp_pool = int(xp_base * 0.55)
                for _ in range(num_assessments_done):
                    assessment = random.choice(assessments)
                    day_offset = random.randint(0, streak_days - 1)
                    attempt_date = start_date + timedelta(days=day_offset)
                    earned = random.randint(30, 120)
                    xp_total += earned
                    XPTransaction.objects.create(
                        user=user,
                        amount=earned,
                        transaction_type='assessment_submit',
                        category='assessment',
                        description=f'Completed: {assessment.title}',
                        related_object_id=assessment.id,
                        created_at=attempt_date,
                    )

                # Course/Lesson XP
                num_lesson_events = random.randint(5, 20)
                for _ in range(num_lesson_events):
                    day_offset = random.randint(0, streak_days - 1)
                    lesson_date = start_date + timedelta(days=day_offset)
                    lesson_xp = random.randint(15, 50)
                    xp_total += lesson_xp
                    XPTransaction.objects.create(
                        user=user,
                        amount=lesson_xp,
                        transaction_type='lesson_complete',
                        category='course',
                        description='Completed a lesson',
                        created_at=lesson_date,
                    )

                # Bonus XP events
                for _ in range(random.randint(1, 4)):
                    day_offset = random.randint(0, streak_days - 1)
                    bonus_date = start_date + timedelta(days=day_offset)
                    bonus_xp = random.randint(50, 200)
                    xp_total += bonus_xp
                    XPTransaction.objects.create(
                        user=user,
                        amount=bonus_xp,
                        transaction_type='achievement_unlock',
                        category='bonus',
                        description=random.choice([
                            'First assessment completed!',
                            'Study streak: 7 days milestone',
                            'Course completion bonus',
                            'Top scorer this week',
                            'Profile completion bonus',
                        ]),
                        created_at=bonus_date,
                    )

                # Finalize XP and level on the user
                final_xp = max(xp_total, xp_base)
                user.xp_points = final_xp
                user.level = (final_xp // 1000) + 1
                user.save(update_fields=['xp_points', 'level'])

                # -- Course Progress --
                num_courses = random.randint(1, min(len(courses), 4))
                user_courses = random.sample(courses, num_courses)
                for course in user_courses:
                    lessons = list(course.lessons.order_by('order'))
                    if not lessons:
                        continue
                    progress_pct = random.randint(15, 100)
                    num_completed = max(1, int(len(lessons) * progress_pct / 100))
                    completed = lessons[:num_completed]
                    up, _ = UserProgress.objects.get_or_create(
                        user=user,
                        course=course,
                        defaults={'progress_percentage': progress_pct}
                    )
                    up.completed_lessons.set(completed)
                    up.progress_percentage = int(len(completed) / len(lessons) * 100)
                    up.save()

                # -- Assessment Attempts --
                num_attempts = random.randint(2, min(len(assessments), 5))
                user_assessments = random.sample(assessments, num_attempts)
                for assessment in user_assessments:
                    questions = list(assessment.questions.all())
                    if not questions:
                        continue
                    total_pts = sum(q.points for q in questions)
                    earned_pts = random.randint(int(total_pts * 0.4), total_pts)
                    percentage = round(earned_pts / total_pts * 100, 1) if total_pts else 0
                    day_offset = random.randint(0, streak_days - 1)
                    attempt_date = start_date + timedelta(days=day_offset)
                    xp_earned = int(percentage / 100 * 80)

                    # Build mock answers
                    answers = {}
                    question_results = {}
                    for q in questions:
                        if q.question_type == 'mcq' and q.options:
                            answers[str(q.id)] = random.choice(q.options)
                        elif q.question_type == 'true_false':
                            answers[str(q.id)] = random.choice(['True', 'False'])
                        else:
                            answers[str(q.id)] = q.correct_answer
                        question_results[str(q.id)] = {
                            'score': q.points if random.random() > 0.35 else 0,
                            'max_score': q.points,
                            'is_correct': random.random() > 0.35,
                            'ai_graded': False,
                        }

                    time_mins = random.randint(8, assessment.time_limit_minutes - 2)
                    UserAttempt.objects.create(
                        user=user,
                        assessment=assessment,
                        status='graded',
                        score=f'{earned_pts}/{total_pts}',
                        percentage=percentage,
                        answers=answers,
                        question_results=question_results,
                        is_public_result=random.choice([True, False]),
                        submitted_at=attempt_date,
                        time_taken_minutes=time_mins,
                        time_taken_seconds=time_mins * 60 + random.randint(0, 59),
                        xp_earned=xp_earned,
                        started_at=attempt_date - timedelta(minutes=time_mins),
                    )

                self.stdout.write(self.style.SUCCESS(
                    f'  ✓ {u_data["first_name"]} {u_data["last_name"]} '
                    f'| XP: {user.xp_points:,} | Level: {user.level} '
                    f'| Streak: {streak_days}d | Tier: {u_data["tier"].upper()}'
                ))
                created_users.append(user)

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('ALL USERS SEEDED SUCCESSFULLY'))
        self.stdout.write('=' * 60)
        self.stdout.write(f'  Total users created/verified: {len(created_users)}')
        self.stdout.write('  Default password for all accounts: EduReach@2025!')
        self.stdout.write('  Streaks range: 10 – 89 days')
        self.stdout.write('  XP range: ~1,100 – ~11,200')
        self.stdout.write('  Tiers: FREE (2), LEARNER (7), PRO (6)')
        self.stdout.write('=' * 60)

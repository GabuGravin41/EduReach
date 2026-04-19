"""
Seed realistic community data for the EduReach investor demo.
Creates: community posts, comments, likes, discussion threads, thread replies,
thread votes, study groups with members and posts, Dalton's full profile,
and daily UserAttempt activity to power streak/analytics calculations.
"""

import random
from datetime import timedelta, date
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction


# ---------------------------------------------------------------------------
# Community post content — realistic Kenyan student/professional discussions
# ---------------------------------------------------------------------------

POSTS = [
    {
        "author": "kipchoge_rotich",
        "content": "Just finished marking my students' end-term papers and I'm blown away by the improvement! The ones using EduReach consistently scored 15-20% higher on average. The practice assessments here are genuinely preparing them better than past papers alone. 🎉 Proud teacher moment!",
        "days_ago": 2,
        "comments": [
            ("wanjiku_mwangi", "That's so encouraging Mr. Rotich! As a student I can confirm — the instant feedback after each quiz is what makes the difference. You know exactly what to revise.", 2),
            ("faith_adhiambo", "This is exactly what we needed to hear! My economics scores went from a C+ to a B+ after grinding the practice tests here. Evidence speaks.", 2),
            ("njeri_kamau", "Sir is this the same for sciences? My class teacher doesn't use EduReach yet but I'm trying to convince her 😅", 1),
            ("kipchoge_rotich", "@njeri_kamau Yes! The biology and chemistry question banks are excellent. Show her the analytics — hard to argue with data.", 1),
        ],
        "likers": ["wanjiku_mwangi", "faith_adhiambo", "aisha_farah", "otieno_odhiambo", "silas_kiprotich", "jabali_ndungu"],
    },
    {
        "author": "otieno_odhiambo",
        "content": "Hot take: Kenyan CS students spend too much time on theory and not enough building. Just shipped my first production app using Python + Django this week. Started learning Django on EduReach 3 months ago. If you're in JKUAT or any local uni studying CS — stop waiting for the perfect moment. Build now. 🔥",
        "days_ago": 3,
        "comments": [
            ("jabali_ndungu", "This! I was in your position 4 years ago. The gap between degree knowledge and job-ready skills is real, but it's closeable. Keep shipping.", 3),
            ("hassan_abdi", "Proud of you man. What stack did you go with for the frontend?", 3),
            ("otieno_odhiambo", "@hassan_abdi React + Vite. Honestly the frontend was harder than Django 😭 but it clicked after a lot of console.log debugging", 2),
            ("dalton", "Congrats! What kind of app? Would love to see it.", 2),
            ("otieno_odhiambo", "@dalton It's a school fee tracking system for a primary school near Kisumu. Nothing fancy but it's solving a real problem. Will share the link soon!", 1),
        ],
        "likers": ["jabali_ndungu", "hassan_abdi", "dalton", "amina_waweru", "emmanuel_makokha"],
    },
    {
        "author": "wanjiku_mwangi",
        "content": "KCSE candidates — can we talk about Math Paper 2? I've done every past paper from 2010 to 2024 and I'm noticing the probability questions keep changing format. This year I'm predicting they'll bring back conditional probability. Anyone else seeing this pattern? Let's discuss 👇",
        "days_ago": 4,
        "comments": [
            ("zipporah_chebet", "Ooh yes! I noticed that too. Also statistics and matrices come up every single year in Paper 2. Wanjiku have you covered the trig identities? That's where I keep losing marks.", 4),
            ("wanjiku_mwangi", "@zipporah_chebet Trig identities are painful. I made a note sheet with all the identities and keep it by my desk. The key is recognizing which identity to apply first — always start from the more complex side.", 3),
            ("kipchoge_rotich", "Excellent analysis Wanjiku. I'll add: sequences and series (specifically geometric progressions) has appeared in 9 of the last 12 years. Don't neglect it!", 3),
            ("baraka_omondi", "This is gold. Saving this thread. I've been focusing too much on algebra and neglecting stats. Time to rebalance.", 3),
            ("njeri_kamau", "Wanjiku you should write a study guide! You explain things so clearly 🙌", 2),
        ],
        "likers": ["zipporah_chebet", "baraka_omondi", "njeri_kamau", "kipchoge_rotich", "faith_adhiambo", "silas_kiprotich", "amina_waweru"],
    },
    {
        "author": "aisha_farah",
        "content": "Law school advice nobody tells you: reading cases is not enough. You need to understand the REASONING behind judgments. I've been using the discussion threads here to explain legal concepts in plain English — and it's actually making me understand them better. Teaching = learning. 📚⚖️",
        "days_ago": 5,
        "comments": [
            ("amina_waweru", "The Feynman technique! If you can't explain it simply, you don't understand it well enough. Good on you Aisha.", 5),
            ("emmanuel_makokha", "As a teacher I fully agree. I learn more when I have to explain. This is how mastery works.", 5),
            ("aisha_farah", "@amina_waweru Exactly! And the nice thing about this community is people actually ask follow-up questions that expose your gaps.", 4),
            ("dalton", "Which law course are you studying here? I want to brush up on Kenyan constitutional law.", 4),
            ("aisha_farah", "@dalton I'm mostly creating my own notes from lectures but the English course helps with argumentation skills. For constitutional law check out the Kenya Law website too — great free resource!", 3),
        ],
        "likers": ["amina_waweru", "emmanuel_makokha", "dalton", "hassan_abdi"],
    },
    {
        "author": "jabali_ndungu",
        "content": "Quick tip for developers here: I've been using EduReach's Python course to onboard junior devs at Andela. Instead of just pointing them to documentation, I assign specific lessons and then quiz them. The retention is dramatically better than just saying 'go read the docs'. 💡",
        "days_ago": 5,
        "comments": [
            ("otieno_odhiambo", "This is a great idea! Did you build custom assessments for them or use the existing ones?", 5),
            ("jabali_ndungu", "@otieno_odhiambo Mix of both. The existing Python quiz is solid for fundamentals. Then I create custom quizzes for our specific codebase patterns.", 4),
            ("hassan_abdi", "Smart onboarding. At iHub we've been doing something similar. Structured learning + hands-on projects beats unstructured self-study every time.", 4),
        ],
        "likers": ["otieno_odhiambo", "hassan_abdi", "amina_waweru", "kipchoge_rotich"],
    },
    {
        "author": "njeri_kamau",
        "content": "Finally understood osmosis after 3 weeks of confusion! The key for me was visualising the concentration gradient rather than trying to memorise the definition. Drew it out on paper, watched the lesson twice, then did the quiz. 94%! 🧫✨ Never giving up on Biology.",
        "days_ago": 6,
        "comments": [
            ("zawadi_mutua", "Congratulations!! Osmosis and diffusion confused me too. The visual approach is so helpful. Did you use any diagrams from here?", 6),
            ("njeri_kamau", "@zawadi_mutua Yes! I paused the lesson video and drew my own version of the diagram. Something about drawing it yourself makes it click.", 5),
            ("kipchoge_rotich", "This is exactly the right approach Njeri. Passive re-reading doesn't build understanding. Active recall + visual representation = real learning.", 5),
            ("baraka_omondi", "This is inspiring me to redo my Physics notes with diagrams. Force diagrams specifically have been my weakness.", 4),
        ],
        "likers": ["zawadi_mutua", "baraka_omondi", "kipchoge_rotich", "wanjiku_mwangi", "faith_adhiambo"],
    },
    {
        "author": "hassan_abdi",
        "content": "Big milestone: just got accepted to present at AfricaHacks 2025 in Nairobi! My project uses ML to help Kenyan coastal fishing communities predict optimal fishing zones using weather + tidal data. Started learning data science basics here 6 months ago. Dreams are valid. 🌊🐟",
        "days_ago": 7,
        "comments": [
            ("otieno_odhiambo", "LETS GO HASSAN! That's a real-world impact project right there. Kisumu fishermen could use something similar actually.", 7),
            ("jabali_ndungu", "This is what tech should be for. Solving actual African problems with African data. Congrats, you're inspiring.", 6),
            ("dalton", "Incredible work! Will you open source it? Would love to study the ML pipeline.", 6),
            ("hassan_abdi", "@dalton Yes planning to after the hackathon. It uses random forest for the predictions — nothing too exotic but it works really well on the historical data.", 5),
            ("amina_waweru", "Congratulations Hassan! As someone who grew up near the coast this genuinely makes me emotional. Real impact.", 5),
        ],
        "likers": ["otieno_odhiambo", "jabali_ndungu", "dalton", "amina_waweru", "aisha_farah", "kipchoge_rotich", "wanjiku_mwangi", "faith_adhiambo"],
    },
    {
        "author": "faith_adhiambo",
        "content": "Form 4 tip: start your Economics revision with the definitions. I know it sounds boring but examiners award marks for precise terminology. 'Demand' isn't just 'what people want' — it's the quantity of a good consumers are willing AND able to buy at various prices. Every. Word. Matters.",
        "days_ago": 8,
        "comments": [
            ("wanjiku_mwangi", "Faith saving lives as usual! The Economics definition questions are where most students lose easy marks. This is so true.", 8),
            ("zipporah_chebet", "Can you make a list of the must-know definitions? I'd happily contribute the math equivalents!", 7),
            ("faith_adhiambo", "@zipporah_chebet Great idea! Let's collaborate — I'll DM you. We can make a shared revision document.", 7),
            ("baraka_omondi", "I need this for Physics. The definitions in kinematics especially are very precise.", 6),
        ],
        "likers": ["wanjiku_mwangi", "zipporah_chebet", "baraka_omondi", "njeri_kamau", "kipchoge_rotich"],
    },
    {
        "author": "dalton",
        "content": "Joining this platform was a great decision. I've been out of formal education for a few years and was nervous about going back to learning. The pacing here is perfect — challenging enough to push you but not so overwhelming that you quit. Anyone else returning to learning after a break? How are you finding it?",
        "days_ago": 9,
        "comments": [
            ("amina_waweru", "Yes! I'm a working professional. The bite-sized lessons are perfect for someone with a full-time job and family. I do 30-45 mins every evening and it adds up.", 9),
            ("emmanuel_makokha", "I've been in education for 18 years but I'm learning new things every week here. It's never too late and there's no shame in being a beginner at something. Welcome Dalton!", 8),
            ("hassan_abdi", "Same here, Dalton. I was self-taught but had huge gaps. Structured learning here helped me identify and fill those gaps systematically.", 8),
            ("dalton", "Thank you all! @amina_waweru 30-45 mins daily sounds sustainable. That's my new goal.", 7),
        ],
        "likers": ["amina_waweru", "emmanuel_makokha", "hassan_abdi", "aisha_farah", "zawadi_mutua"],
    },
    {
        "author": "zawadi_mutua",
        "content": "Nursing students — the anatomy mnemonics are REAL. For the cranial nerves: 'Oh Oh Oh To Touch And Feel Very Good Velvet. Ah Heaven!' (Olfactory, Optic, Oculomotor, Trochlear, Trigeminal, Abducens, Facial, Vestibulocochlear, Glossopharyngeal, Vagus, Accessory, Hypoglossal). You're welcome 😅",
        "days_ago": 10,
        "comments": [
            ("njeri_kamau", "SAVING THIS. Biology student here and we need cranial nerves too! Thank you Zawadi!", 10),
            ("zawadi_mutua", "@njeri_kamau Happy to help! For Form 4 biology you'll mainly need the optic and olfactory ones. The full 12 is more nursing-level.", 9),
            ("dalton", "The medical/nursing students here are impressive. So much to memorise!", 9),
            ("amina_waweru", "My daughter is in Form 3 and studying biology — forwarding this to her! Thank you!", 8),
        ],
        "likers": ["njeri_kamau", "dalton", "amina_waweru", "baraka_omondi"],
    },
    {
        "author": "silas_kiprotich",
        "content": "Engineering students: please learn to love mathematics. I spent first and second year fighting it and wasted so much energy. Third year I made peace with it — now calculus feels like a puzzle I actually want to solve. Your relationship with maths changes when you stop seeing it as an obstacle and start seeing it as a tool. 🔧📐",
        "days_ago": 11,
        "comments": [
            ("otieno_odhiambo", "CS student here and same for algorithms. Once I stopped dreading Big O notation and started seeing it as a way to think about efficiency — everything clicked.", 11),
            ("wanjiku_mwangi", "This is so true! Maths became interesting to me when I started connecting it to real things. Statistics + economics = actually fascinating.", 10),
            ("baraka_omondi", "Bro I needed to hear this TODAY. Was about to cry over differential equations 😭", 10),
            ("silas_kiprotich", "@baraka_omondi Differential equations are tough! Try Khan Academy alongside the lessons here — the animations help visualise what's actually happening.", 9),
        ],
        "likers": ["otieno_odhiambo", "wanjiku_mwangi", "baraka_omondi", "zipporah_chebet"],
    },
    {
        "author": "zipporah_chebet",
        "content": "Just won the county Mathematics Olympiad! 🥇 I want to thank this community — the practice problems here pushed me beyond the standard curriculum. Also massive shoutout to @kipchoge_rotich for the extra materials. Eldoret represent! 🦁",
        "days_ago": 12,
        "comments": [
            ("kipchoge_rotich", "Congratulations Zipporah!! This is a phenomenal result. Your dedication has been extraordinary. National Olympiad next!", 12),
            ("wanjiku_mwangi", "ZIPPORAH YES!! 🎉🎉 You've been working so hard. This is so deserved. County champ!", 12),
            ("faith_adhiambo", "This is wonderful news! Proof that consistent effort pays off. So proud of you 💙", 11),
            ("baraka_omondi", "LEGENDARY! I want to achieve something like this in Physics. You're my motivation.", 11),
            ("dalton", "Incredible! Congratulations! What's the preparation process like for Olympiad level?", 10),
            ("zipporah_chebet", "@dalton The Olympiad goes way beyond the curriculum — lots of number theory, combinatorics and geometry. EduReach helped with the foundations, then I used past Olympiad papers.", 10),
        ],
        "likers": ["kipchoge_rotich", "wanjiku_mwangi", "faith_adhiambo", "baraka_omondi", "dalton", "silas_kiprotich", "otieno_odhiambo", "hassan_abdi", "njeri_kamau"],
    },
    {
        "author": "emmanuel_makokha",
        "content": "As an educator in rural Western Kenya, I want to say: digital learning tools are changing what's possible for students in areas with limited resources. We don't have a school library, but every student with a phone can access world-class content. That is extraordinary. Let's not take it for granted.",
        "days_ago": 13,
        "comments": [
            ("kipchoge_rotich", "Powerful words. Education equity is the mission. Tools like this are how we close the gap between urban and rural learners.", 13),
            ("aisha_farah", "This perspective matters so much. Thank you for sharing it. How are your students adapting to learning digitally?", 12),
            ("emmanuel_makokha", "@aisha_farah Slower at first — many are using smartphones for serious learning for the first time. But the gamification helps. They love the XP and leaderboard! 😄", 12),
            ("wanjiku_mwangi", "Mr. Makokha this is so important. Not everyone has the resources I have in Nairobi. The platform working well on mobile data matters a lot.", 11),
        ],
        "likers": ["kipchoge_rotich", "aisha_farah", "wanjiku_mwangi", "dalton", "zawadi_mutua", "amina_waweru"],
    },
    {
        "author": "amina_waweru",
        "content": "Professional development update: passed my CHRP Module 1 exam! 🎓 EduReach's English communication course helped more than I expected — the essay writing techniques improved how I structure arguments in exam answers. Unexpected benefit of a learning platform. Back to Module 2 prep now!",
        "days_ago": 14,
        "comments": [
            ("aisha_farah", "Congratulations!! CHRP is rigorous, you should be very proud. The English course helping with argument structure makes total sense — it's transferable.", 14),
            ("dalton", "Well done! How long did Module 1 preparation take you?", 13),
            ("amina_waweru", "@dalton About 3 months alongside work. I studied 45 minutes every morning before the office. Consistency over intensity!", 13),
            ("hassan_abdi", "Congratulations Amina! Module 2 is more practical from what I've heard — you'll do great.", 12),
        ],
        "likers": ["aisha_farah", "dalton", "hassan_abdi", "emmanuel_makokha", "zawadi_mutua"],
    },
    {
        "author": "baraka_omondi",
        "content": "Honest question for the community: how do you stay motivated when you're studying alone and results feel far away? I'm Form 2, aiming for an aerospace engineering scholarship, but sometimes it feels impossible. Tips? 🙏",
        "days_ago": 15,
        "comments": [
            ("silas_kiprotich", "Bro, I was exactly where you are in Form 2. What helped me: break the big goal into tiny daily targets. 'Study for aerospace' is too big. 'Finish 2 Physics lessons and the quiz' is doable.", 15),
            ("wanjiku_mwangi", "The streak system here actually helps with this! I aim to maintain my streak rather than think about KCSE every day. Small daily wins add up.", 14),
            ("emmanuel_makokha", "Baraka, the fact that you know what you want at Form 2 puts you ahead of most. Trust the process, protect your focus, and find a study group here. Community accountability is powerful.", 14),
            ("kipchoge_rotich", "I believe in you Baraka. Aerospace engineering scholarship is not impossible — I've seen students from similar backgrounds achieve it. What Physics topics are you struggling with most?", 13),
            ("baraka_omondi", "Thank you all so much! @kipchoge_rotich Vectors and projectile motion are my weak points. I understand the formulas but get confused on word problems.", 13),
            ("kipchoge_rotich", "@baraka_omondi That's very common. The key for projectile motion word problems: always draw the diagram FIRST. Resolve into horizontal and vertical components before touching a formula.", 12),
        ],
        "likers": ["silas_kiprotich", "wanjiku_mwangi", "emmanuel_makokha", "kipchoge_rotich", "njeri_kamau", "faith_adhiambo"],
    },
]

# ---------------------------------------------------------------------------
# Discussion thread content per course
# ---------------------------------------------------------------------------

COURSE_THREADS = {
    "KCSE Mathematics Mastery": [
        {
            "author": "wanjiku_mwangi",
            "title": "Quadratic equations — when to use formula vs factoring?",
            "content": "I keep getting confused about when to apply the quadratic formula versus trying to factor first. Is there a quick test to decide? My maths teacher says always try factoring but that wastes time in exams.",
            "is_pinned": False,
            "replies": [
                ("kipchoge_rotich", "Great question. Rule of thumb: if the discriminant (b²-4ac) is a perfect square, factoring will work cleanly. Otherwise go straight to the formula. In exams, if the numbers look 'nice', try factoring for 30 seconds. If not obvious — formula immediately. Time is precious.", True, True),
                ("faith_adhiambo", "Also remember completing the square! Sometimes KCSE asks you to use a specific method. Always read the question instruction carefully.", False, False),
                ("wanjiku_mwangi", "@kipchoge_rotich This is exactly what I needed! The discriminant check is genius. Never thought to test it that way.", False, False),
                ("zipporah_chebet", "Adding to this: for Olympiad level you need ALL three methods cold. But for KCSE the formula is always safe. Never lose marks for using a valid method!", False, False),
            ],
        },
        {
            "author": "baraka_omondi",
            "title": "Statistics — confused about standard deviation vs variance",
            "content": "Can someone explain the difference between standard deviation and variance in a way that actually makes sense? My textbook just gives formulas with no intuition.",
            "is_pinned": False,
            "replies": [
                ("kipchoge_rotich", "Think of it this way: variance is the average of squared differences from the mean. Standard deviation is just the square root of that — it brings the unit back to the original scale. Variance of heights in cm gives you cm². Standard deviation gives you cm again, which you can actually interpret.", True, True),
                ("silas_kiprotich", "Another way to think about it: standard deviation tells you 'on average, data points are THIS far from the mean'. Variance is the same idea but in squared units — harder to interpret intuitively.", False, False),
                ("baraka_omondi", "Oh!! The squared units thing is what I was missing. Thank you both! So we report standard deviation because it's in the same units as the data?", False, False),
                ("kipchoge_rotich", "@baraka_omondi Exactly right! And for KCSE always show your working step by step — the intermediate steps carry marks.", True, False),
            ],
        },
        {
            "author": "njeri_kamau",
            "title": "Help: Lost in Geometric Progressions 😭",
            "content": "I understand arithmetic progressions fine but geometric progressions are confusing me. Specifically the sum to infinity formula — when does it apply and when doesn't it?",
            "is_pinned": False,
            "replies": [
                ("kipchoge_rotich", "Sum to infinity (S∞ = a/(1-r)) ONLY applies when the common ratio r satisfies -1 < r < 1. If |r| ≥ 1, the series diverges — meaning it keeps growing and has no finite sum. Think about it: if r=2, each term doubles. It never settles. But if r=0.5, each term is half the previous — they get smaller and smaller toward zero.", True, True),
                ("wanjiku_mwangi", "The way I remember the condition: the ratio must be a proper fraction (between -1 and 1) for the sum to converge. If it's bigger than 1 or less than -1, the terms are growing or oscillating and growing.", False, False),
                ("zipporah_chebet", "Also: make sure you don't confuse the 'n-th term' formula (ar^(n-1)) with the 'sum of n terms' formula (a(1-r^n)/(1-r)). They're different! KCSE often tests both in one question.", False, False),
                ("njeri_kamau", "Thank you!! The convergence condition finally makes sense. So it's really about whether the terms are getting smaller or bigger. I feel silly for not seeing that before 😊", False, False),
            ],
        },
    ],
    "Introduction to Python Programming": [
        {
            "author": "otieno_odhiambo",
            "title": "List comprehensions vs for loops — which should beginners use?",
            "content": "I've seen experienced devs using list comprehensions everywhere but for loops feel more readable to me as a beginner. When should I use which?",
            "is_pinned": False,
            "replies": [
                ("jabali_ndungu", "Both are valid — readability is king. Rule: use list comprehension when the transformation is simple (one expression). Use a for loop when you need complex logic, multiple conditions, or side effects. Never sacrifice clarity for cleverness.", True, True),
                ("hassan_abdi", "I'd add: once you're comfortable with Python, list comprehensions become MORE readable, not less. It takes about 2-3 weeks of practice. Don't force it — let it click naturally.", False, False),
                ("otieno_odhiambo", "@jabali_ndungu 'Never sacrifice clarity for cleverness' — this is going on my wall. Thank you!", False, False),
                ("jabali_ndungu", "Also: nested list comprehensions (list comprehension inside a list comprehension) are almost always a mistake. If you're tempted to nest — use a for loop instead.", True, False),
            ],
        },
        {
            "author": "dalton",
            "title": "How do I properly handle errors in Python?",
            "content": "My scripts keep crashing when they hit unexpected input. I know about try/except but I'm not sure how to use it properly. What's the best practice?",
            "is_pinned": False,
            "replies": [
                ("jabali_ndungu", "Key rules: 1) Catch SPECIFIC exceptions, not bare 'except'. 2) Log the error, don't just silence it. 3) Only catch exceptions you can actually handle — let unexpected ones bubble up. Bad: `except: pass`. Good: `except ValueError as e: logger.error(f'Bad input: {e}')`", True, True),
                ("hassan_abdi", "Also learn the difference between exceptions you should catch (expected failures: file not found, bad user input) vs programmer errors (NameError, AttributeError — these mean YOUR code has a bug, fix it, don't catch it).", False, False),
                ("otieno_odhiambo", "Dalton this is something I also got wrong at first. Try: think about what can realistically go wrong at each step and handle ONLY those specific cases.", False, False),
                ("dalton", "This is so helpful! The distinction between expected failures and programmer errors is exactly what I was missing. Thank you all.", False, False),
            ],
        },
        {
            "author": "hassan_abdi",
            "title": "📌 Resources: Python learning path for complete beginners",
            "content": "Pinning this for anyone just starting the Python course. Here's the learning order that worked for me:\n\n1. Variables, data types, operators\n2. Control flow (if/elif/else)\n3. Loops (for, while) — do the exercises here twice!\n4. Functions — this is where real programming begins\n5. Lists, tuples, dictionaries, sets\n6. File I/O\n7. Object-oriented programming\n8. External libraries (start with requests or pandas)\n\nDon't skip steps. Don't rush. Build something small after each chapter.",
            "is_pinned": True,
            "replies": [
                ("jabali_ndungu", "Excellent roadmap! I'd add: after step 7, start reading other people's code on GitHub. Understanding existing code is a separate skill from writing code.", True, True),
                ("otieno_odhiambo", "This is the guide I wish I had when I started! Bookmarking.", False, False),
                ("dalton", "Thank you Hassan! I'm on step 3 (loops) and this map tells me exactly where I'm going. Feeling more confident.", False, False),
            ],
        },
    ],
    "KCSE Biology & Chemistry Combined": [
        {
            "author": "njeri_kamau",
            "title": "Photosynthesis equation — what does each part actually mean?",
            "content": "I can memorise 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ but I don't really understand what's happening. Can someone explain what each molecule is doing?",
            "is_pinned": False,
            "replies": [
                ("kipchoge_rotich", "Think of photosynthesis as a food-making factory:\n- 6CO₂ (carbon dioxide from air) = raw material 1\n- 6H₂O (water from soil) = raw material 2\n- Light energy = the power source\n- C₆H₁₂O₆ (glucose) = the food produced\n- 6O₂ (oxygen) = waste product released to air\nThe plant splits water molecules using light energy, then combines the hydrogen with CO₂ to make glucose. The oxygen is 'leftover' from splitting the water.", True, True),
                ("zawadi_mutua", "Building on this: there are TWO stages. Light-dependent reactions (need light, happen in thylakoids) produce ATP and split water. Light-independent reactions / Calvin cycle (don't need direct light, happen in stroma) use that ATP to fix CO₂ into glucose.", False, False),
                ("njeri_kamau", "This is so much clearer than my textbook! The factory analogy and the two stages make it click. Why don't textbooks explain it this way? 😭", False, False),
                ("baraka_omondi", "KCSE tip: they often ask 'why is chlorophyll green?' Answer: chlorophyll ABSORBS red and blue light for photosynthesis and REFLECTS green light — which is why we see it as green.", False, False),
            ],
        },
        {
            "author": "zawadi_mutua",
            "title": "Chemistry: Mole calculations are destroying me 😩",
            "content": "I understand what a mole is (Avogadro's number, 6.02×10²³ particles) but the calculations in KCSE papers confuse me every time. Can someone walk through an example?",
            "is_pinned": False,
            "replies": [
                ("kipchoge_rotich", "Mole calculations always follow this triangle: Moles = Mass ÷ Molar Mass. Let's try: 'How many moles in 44g of CO₂?' Molar mass of CO₂ = 12 + (16×2) = 44 g/mol. Moles = 44÷44 = 1 mole. That's 6.02×10²³ molecules. Always: 1) write the formula 2) find molar mass from periodic table 3) plug in.", True, True),
                ("njeri_kamau", "The mole triangle helps so much! Also for gas volumes: 1 mole of ANY gas at room temperature occupies 24 dm³ (24 litres). So moles of gas = volume ÷ 24. This comes up every year in KCSE Chemistry!", False, False),
                ("zawadi_mutua", "The triangle is perfect! I kept trying to remember which formula to use but the triangle shows all three relationships at once. Thank you!", False, False),
            ],
        },
    ],
    "English Language & Communication Skills": [
        {
            "author": "aisha_farah",
            "title": "Essay writing: how to write an argument that actually convinces",
            "content": "I can write factually correct essays but I struggle to make them persuasive. Any advice on how to make arguments more compelling?",
            "is_pinned": False,
            "replies": [
                ("emmanuel_makokha", "Three techniques that work:\n1. PEEL structure: Point → Evidence → Explain → Link back to question\n2. Acknowledge the counter-argument THEN refute it — shows intellectual honesty and makes your position stronger\n3. Use specific examples, not vague generalities. 'Exam performance improved by 23%' is more convincing than 'students did better'.", True, True),
                ("amina_waweru", "For professional contexts (which I deal with in HR), always start with what the reader cares about — their interest or concern — before presenting your argument. Empathy in writing is powerful.", False, False),
                ("aisha_farah", "@emmanuel_makokha The counter-argument technique is what I've been missing! In law essays, not addressing the opposing view looks like you haven't considered it.", False, False),
                ("dalton", "I struggle with conclusions most. Mine always feel like they just repeat the introduction.", False, False),
                ("emmanuel_makokha", "@dalton Good conclusions: synthesise rather than summarise. Don't just repeat — show what the evidence means together. End with a 'so what?' that gives the reader something to think about.", True, False),
            ],
        },
        {
            "author": "amina_waweru",
            "title": "📌 Common grammar mistakes Kenyans make in formal writing",
            "content": "From my experience in HR reading CVs and cover letters — here are the most common errors I see:\n\n1. 'I have went' instead of 'I have gone'\n2. 'I was told that they are coming' (tense inconsistency)\n3. 'Despite of' — it's just 'despite'\n4. 'I will be able to meet the deadline' vs 'I can meet the deadline' (be concise!)\n5. Apostrophe confusion: 'its' vs 'it's'\n\nFix these and you're already better than most applicants.",
            "is_pinned": True,
            "replies": [
                ("aisha_farah", "The 'despite of' one! I still occasionally see this in legal documents from colleagues who should know better. It's a very common Kenyan English error.", True, True),
                ("dalton", "The apostrophe one trips me up too. Rule: 'its' is possessive (the cat licked its paw), 'it's' is always 'it is' or 'it has'. If you can replace it with 'it is', use the apostrophe.", False, False),
                ("amina_waweru", "@dalton Perfect rule! And another memory trick: unlike other possessives (Sarah's, the cat's), 'its' has NO apostrophe. It's the exception.", False, False),
            ],
        },
    ],
    "Business Studies & Economics for KCSE": [
        {
            "author": "faith_adhiambo",
            "title": "Demand curves — why do they slope downward?",
            "content": "My teacher says 'demand curves slope downward because of the law of demand' but that feels circular. WHY does quantity demanded fall when price rises?",
            "is_pinned": False,
            "replies": [
                ("kipchoge_rotich", "Two economic effects explain this:\n1. SUBSTITUTION EFFECT: when a good's price rises, it becomes relatively more expensive than substitutes, so consumers switch to alternatives\n2. INCOME EFFECT: when price rises, your real purchasing power falls (your money buys less), so you buy less of the good\nThese two effects together explain why quantity demanded falls as price rises. Now you can explain the 'why', not just state the law!", True, True),
                ("faith_adhiambo", "The income effect is what I was missing! I understood substitution intuitively but never thought about how a price rise effectively reduces real income. Brilliant.", False, False),
                ("otieno_odhiambo", "Side note: there are exceptions — Giffen goods (inferior goods where income effect dominates and demand rises with price) and Veblen goods (luxury goods where high price signals status). Worth knowing for KCSE bonus marks!", False, False),
                ("wanjiku_mwangi", "Economics applied to real life: when maize flour prices spike in Kenya, many families switch to ugali made with cassava or sorghum. That's the substitution effect in action.", False, False),
            ],
        },
        {
            "author": "dalton",
            "title": "What's the difference between GDP and GNP?",
            "content": "I keep mixing these up. Can someone explain in simple terms?",
            "is_pinned": False,
            "replies": [
                ("faith_adhiambo", "Simple way:\n- GDP (Gross DOMESTIC Product) = value of everything produced WITHIN a country's borders, regardless of who produces it\n- GNP (Gross NATIONAL Product) = value of everything produced BY a country's citizens, regardless of WHERE they produce it\n\nExample: A Kenyan working in London contributes to UK GDP but Kenya's GNP. A British company's factory in Nairobi contributes to Kenya's GDP but UK's GNP.", True, True),
                ("kipchoge_rotich", "For KCSE: GNP = GDP + Net Factor Income from Abroad (income earned by Kenyans abroad minus income earned by foreigners in Kenya). Kenya's diaspora remittances affect GNP significantly!", False, False),
                ("dalton", "Oh this is so clear! The location vs nationality distinction makes it obvious. Thank you!", False, False),
                ("wanjiku_mwangi", "Also: in practice most countries report GDP more than GNP because it's easier to measure economic activity within borders than tracking citizens globally.", False, False),
            ],
        },
    ],
}

# ---------------------------------------------------------------------------
# Study groups
# ---------------------------------------------------------------------------

STUDY_GROUPS = [
    {
        "name": "KCSE 2025 Warriors 🔥",
        "description": "Form 4 students preparing together for the 2025 KCSE national examinations. We share notes, past papers, and keep each other accountable. No weak links — we all pass together!",
        "creator": "wanjiku_mwangi",
        "members": ["faith_adhiambo", "njeri_kamau", "baraka_omondi", "zipporah_chebet"],
        "is_public": True,
        "posts": [
            ("wanjiku_mwangi", "Welcome everyone! Ground rules: 1) Share only quality resources 2) Ask questions — no question is stupid 3) Help others when you can. Let's make this the best study group in Nairobi! 💪", 14),
            ("faith_adhiambo", "Just finished the Economics demand/supply chapter for the second time. My summary: focus on the determinants (things that SHIFT the curve vs things that cause MOVEMENT along it). Happy to share my notes if anyone wants!", 13),
            ("njeri_kamau", "Biology update: osmosis and diffusion finally make sense. The visualisation method works! @wanjiku_mwangi thank you for suggesting drawing it out.", 12),
            ("baraka_omondi", "Physics is tough this week. Projectile motion word problems. @zipporah_chebet do you do physics too?", 11),
            ("zipporah_chebet", "@baraka_omondi Yes! The trick for projectile motion: always split into horizontal (constant velocity) and vertical (acceleration due to gravity) components separately. Then use the right kinematic equation for each. Never mix them!", 10),
            ("wanjiku_mwangi", "Week 2 check-in! How many practice tests has everyone done this week? I did 3 Maths and 2 English. Trying to do one per subject per week minimum.", 7),
            ("faith_adhiambo", "@wanjiku_mwangi 2 Economics and 1 Business Studies for me. Economics average this week: 78%. I'll take it! 📈", 7),
            ("baraka_omondi", "Only 1 Physics 😬 I need to step it up. Committing to 3 this coming week.", 6),
        ],
    },
    {
        "name": "Kenya Tech Builders 🇰🇪💻",
        "description": "Kenyan developers, CS students and tech professionals learning and building together. From Python to cloud infrastructure — if you're building with tech in Kenya, this is your home.",
        "creator": "jabali_ndungu",
        "members": ["otieno_odhiambo", "hassan_abdi", "dalton", "silas_kiprotich"],
        "is_public": True,
        "posts": [
            ("jabali_ndungu", "Welcome to Kenya Tech Builders! This group is for people serious about building things with technology. Share your projects, ask questions, get feedback. No gatekeeping. Let's grow together. 🚀", 20),
            ("hassan_abdi", "Just pushed my first commit for the fishing zones ML project. GitHub link coming soon! Currently working on cleaning the tidal data — messy dataset but interesting patterns already emerging.", 18),
            ("otieno_odhiambo", "Shipped my school fee tracker to production! It's running on a free Railway plan. Not elegant but it works and people are using it. That's the win.", 15),
            ("jabali_ndungu", "Reminder: great code is code that ships and solves a problem. Don't let perfect be the enemy of good. @otieno_odhiambo this is exactly the right attitude.", 15),
            ("dalton", "Question: should I learn Flask or Django first? I know Python basics.", 12),
            ("jabali_ndungu", "@dalton Django. It's more opinionated (tells you how to structure things) which is actually better for beginners — fewer decisions to make. Flask gives you more freedom which means more rope to hang yourself with when you're learning.", 12),
            ("hassan_abdi", "@dalton Agreeing with Jabali. Django also has excellent documentation and a huge community. When you hit a problem, you'll find the answer faster.", 11),
            ("silas_kiprotich", "Engineering perspective: learning Django also teaches you what a proper backend architecture looks like — auth, routing, ORM, admin, middleware. Very valuable mental model.", 10),
            ("dalton", "Sold! Starting the Python course fully then Django. Thank you everyone.", 10),
            ("otieno_odhiambo", "Sharing resource: The Django Girls tutorial is genuinely excellent for complete beginners. Don't let the name put you off — it's the best free Django intro I've found.", 8),
        ],
    },
    {
        "name": "Science & Medicine Kenyans 🔬",
        "description": "Pre-med students, nursing students, Biology and Chemistry learners. Supporting each other through the toughest subjects. From KCSE sciences to university level — all welcome!",
        "creator": "zawadi_mutua",
        "members": ["njeri_kamau", "baraka_omondi", "amina_waweru"],
        "is_public": True,
        "posts": [
            ("zawadi_mutua", "Hello future doctors, nurses and scientists! This group is for all of us grinding through the life sciences. Post your questions, share mnemonics, and support each other. We all pass! 🩺", 16),
            ("njeri_kamau", "Sharing my Biology mnemonics collection! For cell organelles: **Mitochondria = powerhouse** (ATP), **Ribosomes = protein factory**, **Golgi = post office** (packages and sends proteins), **Nucleus = control centre** (DNA). Visual association is key!", 14),
            ("zawadi_mutua", "NURSING TIP OF THE WEEK: For cardiac medications — remember that Beta-BLOCKERS (metoprolol, atenolol) BLOCK the beta-adrenergic receptors → heart beats slower and with less force. Think 'blocking the heart from racing'.", 13),
            ("amina_waweru", "My daughter used the osmosis explanation from this group in her school exam and scored full marks on that question! Thank you all! The power of community learning 🙏", 10),
            ("baraka_omondi", "Physics adjacent but relevant: biophysics in Form 4 — the heart as a pump, blood pressure, viscosity. Anyone covered this already? Is it heavily tested?", 8),
            ("njeri_kamau", "@baraka_omondi It comes up in Biology! Specifically the section on transport in animals. Blood pressure measurements and the role of the heart valves. I'll share my notes this weekend.", 8),
            ("zawadi_mutua", "Mid-month check-in: How is everyone doing with their study goals? I've completed the Biology course and started Chemistry. The mole calculations thread saved me!", 5),
        ],
    },
    {
        "name": "Professionals Learning Daily 📚",
        "description": "Working professionals using EduReach to upskill, certify, and grow. We understand the struggle of balancing career, family and learning. Short on time, big on goals.",
        "creator": "amina_waweru",
        "members": ["hassan_abdi", "emmanuel_makokha", "aisha_farah", "dalton"],
        "is_public": True,
        "posts": [
            ("amina_waweru", "Welcome professionals! We all have full lives — jobs, families, responsibilities. This group is for people who still carve out time to learn. Share your wins, your struggles, and your study strategies. You're not alone.", 22),
            ("emmanuel_makokha", "My morning routine: 5:30am wake up, 30 minutes EduReach before the kids wake up. It's the only quiet time in my day. Non-negotiable. 18 days streak and counting!", 20),
            ("aisha_farah", "Law exam prep at 10pm after a full day is no joke 😅 But the 20-minute lessons here are perfect for late-night study. You don't need hours — you need consistency.", 18),
            ("hassan_abdi", "Podcast recommendation for tech professionals: Practical AI (Changelog) and Data Skeptic. They're not direct EduReach courses but complement the Python/data content here perfectly.", 15),
            ("amina_waweru", "Passed CHRP Module 1! 🎉 The 45-mins-per-day method works. Slow and steady. Celebrating with chai and mandazi tonight 😄", 14),
            ("dalton", "This group is so motivating. I thought I was too old to get back into learning seriously. Hearing everyone's routines makes me realise it's just about finding your rhythm.", 12),
            ("emmanuel_makokha", "@dalton Age is genuinely not the barrier — interest and consistency are what matter. I have colleagues who got Masters degrees in their 50s. You've got this.", 12),
            ("aisha_farah", "Strategy that's working for me: I study one topic until I can explain it to someone else without notes. Then I quiz myself. Then I move on. Slower progress but real understanding.", 9),
        ],
    },
]


class Command(BaseCommand):
    help = 'Seeds community posts, discussion threads, study groups and Dalton profile data'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Clear existing community/study group data first')

    def handle(self, *args, **options):
        from users.models import User, XPTransaction
        from community.models import Post, Comment, Like, CourseChannel, DiscussionThread, ThreadReply, ThreadVote
        from courses.models import Course, UserProgress
        from assessments.models import Assessment, UserAttempt
        from study_groups.models import StudyGroup, StudyGroupPost

        if options['reset']:
            Post.objects.all().delete()
            StudyGroup.objects.all().delete()
            DiscussionThread.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared existing community data.'))

        now = timezone.now()

        self.stdout.write(self.style.MIGRATE_HEADING('=== EduReach Community Data Seeder ===\n'))

        # Helper: get user or skip
        def get_user(username):
            try:
                return User.objects.get(username=username)
            except User.DoesNotExist:
                return None

        all_users = list(User.objects.exclude(username__in=['content_admin']))

        with transaction.atomic():
            # ---------------------------------------------------------------
            # Step 1: Update Dalton's profile
            # ---------------------------------------------------------------
            self.stdout.write('  Updating Dalton\'s profile...')
            dalton = get_user('dalton')
            if dalton:
                dalton.first_name = 'Dalton'
                dalton.last_name = 'Kariuki'
                dalton.email = 'dalton.kariuki@gmail.com'
                dalton.bio = "Nairobi-based entrepreneur and lifelong learner. Ran a small business for 5 years and now returning to structured learning. Interested in economics, technology and business strategy. Proud Kenyan, Chelsea FC fan ⚽."
                dalton.tier = 'pro'
                dalton.learning_goal = 'skills'
                dalton.learner_type = 'professional'
                dalton.interests = 'business,economics,technology'
                dalton.show_xp_publicly = True
                dalton.total_time_spent_seconds = 58 * 3600
                dalton.save()

                # Give Dalton XP and streak data
                dalton_streak = 24
                dalton_xp = 0
                start = now - timedelta(days=dalton_streak)
                for day_offset in range(dalton_streak):
                    day = start + timedelta(days=day_offset)
                    if random.random() < 0.1 and day_offset > 0:
                        continue
                    amt = random.randint(25, 65)
                    dalton_xp += amt
                    XPTransaction.objects.create(user=dalton, amount=amt, transaction_type='daily_streak',
                                                 category='streak', description=f'Day {day_offset+1} streak', created_at=day)
                for _ in range(random.randint(3, 6)):
                    day = start + timedelta(days=random.randint(0, dalton_streak-1))
                    amt = random.randint(30, 90)
                    dalton_xp += amt
                    XPTransaction.objects.create(user=dalton, amount=amt, transaction_type='assessment_submit',
                                                 category='assessment', description='Completed assessment', created_at=day)
                dalton.xp_points = dalton_xp + 2800
                dalton.level = (dalton.xp_points // 1000) + 1
                dalton.save(update_fields=['xp_points', 'level'])
                self.stdout.write(self.style.SUCCESS(f'    ✓ Dalton | XP: {dalton.xp_points:,} | Level: {dalton.level} | Streak: {dalton_streak}d'))

            # ---------------------------------------------------------------
            # Step 2: Add daily UserAttempt records to power streak analytics
            # ---------------------------------------------------------------
            self.stdout.write('\n  Building streak-compatible activity records...')
            assessments = list(Assessment.objects.all())
            if assessments:
                for user in all_users:
                    if not hasattr(user, 'xp_points') or user.xp_points == 0:
                        continue
                    existing_attempt_dates = set(
                        UserAttempt.objects.filter(user=user, submitted_at__isnull=False)
                        .values_list('submitted_at__date', flat=True)
                    )
                    # Determine streak days from XP transaction history
                    first_tx = XPTransaction.objects.filter(user=user).order_by('created_at').first()
                    if not first_tx:
                        continue
                    streak_start = first_tx.created_at.date()
                    streak_days = (now.date() - streak_start).days + 1

                    assessment = random.choice(assessments)
                    questions = list(assessment.questions.all())
                    if not questions:
                        continue

                    total_pts = sum(q.points for q in questions)
                    created_count = 0
                    for day_offset in range(streak_days):
                        check_date = streak_start + timedelta(days=day_offset)
                        # Skip if already has activity that day, or random 15% miss
                        if check_date in existing_attempt_dates:
                            continue
                        if day_offset > 0 and random.random() < 0.15:
                            continue
                        attempt_dt = timezone.make_aware(
                            timezone.datetime(check_date.year, check_date.month, check_date.day,
                                              random.randint(6, 22), random.randint(0, 59))
                        )
                        earned = random.randint(int(total_pts * 0.45), total_pts)
                        pct = round(earned / total_pts * 100, 1) if total_pts else 0
                        time_mins = random.randint(5, 20)
                        answers = {}
                        question_results = {}
                        for q in questions:
                            if q.question_type == 'mcq' and q.options:
                                answers[str(q.id)] = random.choice(q.options)
                            else:
                                answers[str(q.id)] = q.correct_answer
                            question_results[str(q.id)] = {
                                'score': q.points if random.random() > 0.4 else 0,
                                'max_score': q.points, 'is_correct': random.random() > 0.4, 'ai_graded': False,
                            }
                        UserAttempt.objects.create(
                            user=user, assessment=assessment, status='graded',
                            score=f'{earned}/{total_pts}', percentage=pct,
                            answers=answers, question_results=question_results,
                            is_public_result=False, submitted_at=attempt_dt,
                            time_taken_minutes=time_mins, time_taken_seconds=time_mins * 60,
                            xp_earned=int(pct / 100 * 30),
                            started_at=attempt_dt - timedelta(minutes=time_mins),
                        )
                        created_count += 1
                    if created_count > 0:
                        self.stdout.write(f'    + {user.username}: {created_count} daily activity records')

            # ---------------------------------------------------------------
            # Step 3: Community Posts
            # ---------------------------------------------------------------
            self.stdout.write('\n  Creating community posts...')
            post_objects = {}
            for p_data in POSTS:
                author = get_user(p_data['author'])
                if not author:
                    continue
                post_dt = now - timedelta(days=p_data['days_ago'])
                post, created = Post.objects.get_or_create(
                    author=author,
                    content=p_data['content'][:100],  # partial match key
                    defaults={'content': p_data['content']}
                )
                if created:
                    Post.objects.filter(pk=post.pk).update(created_at=post_dt, updated_at=post_dt)
                    post.refresh_from_db()
                post_objects[p_data['content'][:60]] = post

                # Comments
                for c_author_name, c_content, c_days_ago in p_data.get('comments', []):
                    c_author = get_user(c_author_name)
                    if not c_author:
                        continue
                    c_dt = now - timedelta(days=c_days_ago)
                    comment, _ = Comment.objects.get_or_create(
                        post=post, author=c_author, content=c_content[:80],
                        defaults={'content': c_content}
                    )
                    Comment.objects.filter(pk=comment.pk).update(created_at=c_dt, updated_at=c_dt)

                # Likes
                for liker_name in p_data.get('likers', []):
                    liker = get_user(liker_name)
                    if liker:
                        Like.objects.get_or_create(post=post, user=liker)

            self.stdout.write(self.style.SUCCESS(f'    ✓ {len(POSTS)} posts with comments and likes'))

            # ---------------------------------------------------------------
            # Step 4: Discussion Threads in Course Channels
            # ---------------------------------------------------------------
            self.stdout.write('\n  Creating discussion threads...')
            thread_count = 0
            reply_count = 0
            for course_title, threads in COURSE_THREADS.items():
                try:
                    course = Course.objects.get(title=course_title)
                except Course.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f'    Course not found: {course_title}'))
                    continue

                channel, _ = CourseChannel.objects.get_or_create(course=course, defaults={'name': ''})

                for t_data in threads:
                    author = get_user(t_data['author'])
                    if not author:
                        continue
                    thread, created = DiscussionThread.objects.get_or_create(
                        channel=channel,
                        title=t_data['title'],
                        defaults={
                            'author': author,
                            'content': t_data['content'],
                            'is_pinned': t_data.get('is_pinned', False),
                            'views': random.randint(12, 120),
                        }
                    )
                    if created:
                        thread_dt = now - timedelta(days=random.randint(3, 25))
                        DiscussionThread.objects.filter(pk=thread.pk).update(
                            created_at=thread_dt, updated_at=thread_dt
                        )
                        thread_count += 1

                    # Replies
                    for r_author_name, r_content, is_verified, is_accepted in t_data.get('replies', []):
                        r_author = get_user(r_author_name)
                        if not r_author:
                            continue
                        reply, r_created = ThreadReply.objects.get_or_create(
                            thread=thread,
                            author=r_author,
                            content=r_content[:80],
                            defaults={
                                'content': r_content,
                                'is_verified': is_verified,
                                'is_accepted': is_accepted,
                            }
                        )
                        if r_created:
                            r_dt = now - timedelta(days=random.randint(1, 20))
                            ThreadReply.objects.filter(pk=reply.pk).update(created_at=r_dt, updated_at=r_dt)
                            reply_count += 1
                            # Add helpful votes from random users
                            voters = random.sample(all_users, min(random.randint(2, 6), len(all_users)))
                            for voter in voters:
                                if voter != r_author:
                                    ThreadVote.objects.get_or_create(
                                        reply=reply, user=voter,
                                        defaults={'vote_type': 'helpful' if random.random() > 0.15 else 'not_helpful'}
                                    )

            self.stdout.write(self.style.SUCCESS(f'    ✓ {thread_count} threads, {reply_count} replies across {len(COURSE_THREADS)} courses'))

            # ---------------------------------------------------------------
            # Step 5: Study Groups
            # ---------------------------------------------------------------
            self.stdout.write('\n  Creating study groups...')
            for sg_data in STUDY_GROUPS:
                creator = get_user(sg_data['creator'])
                if not creator:
                    continue
                sg, created = StudyGroup.objects.get_or_create(
                    name=sg_data['name'],
                    defaults={
                        'description': sg_data['description'],
                        'creator': creator,
                        'is_public': sg_data.get('is_public', True),
                        'max_members': 50,
                    }
                )
                # Add members
                sg.members.add(creator)
                for member_name in sg_data.get('members', []):
                    member = get_user(member_name)
                    if member:
                        sg.members.add(member)

                # Add posts
                if created:
                    for post_author_name, post_content, days_ago in sg_data.get('posts', []):
                        post_author = get_user(post_author_name)
                        if not post_author:
                            continue
                        post_dt = now - timedelta(days=days_ago)
                        sgpost = StudyGroupPost.objects.create(
                            group=sg, author=post_author, content=post_content
                        )
                        StudyGroupPost.objects.filter(pk=sgpost.pk).update(
                            created_at=post_dt, updated_at=post_dt
                        )

                self.stdout.write(self.style.SUCCESS(
                    f'    ✓ Study group: {sg_data["name"]} | {sg.members.count()} members'
                ))

            # ---------------------------------------------------------------
            # Step 6: Touch UserProgress last_accessed across different days
            # ---------------------------------------------------------------
            self.stdout.write('\n  Updating course access timestamps...')
            for progress in UserProgress.objects.select_related('user'):
                days_back = random.randint(0, 5)
                new_dt = now - timedelta(days=days_back, hours=random.randint(0, 12))
                UserProgress.objects.filter(pk=progress.pk).update(
                    last_accessed=new_dt, started_at=new_dt - timedelta(days=random.randint(5, 60))
                )
            self.stdout.write(self.style.SUCCESS('    ✓ Course progress timestamps updated'))

        # Summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('COMMUNITY DATA SEEDED SUCCESSFULLY'))
        self.stdout.write('=' * 60)
        self.stdout.write(f'  Community posts: {Post.objects.count()}')
        self.stdout.write(f'  Comments: {Comment.objects.count()}')
        self.stdout.write(f'  Likes: {Like.objects.count()}')
        self.stdout.write(f'  Discussion threads: {DiscussionThread.objects.count()}')
        self.stdout.write(f'  Thread replies: {ThreadReply.objects.count()}')
        self.stdout.write(f'  Study groups: {StudyGroup.objects.count()}')
        self.stdout.write(f'  Active users with streaks: {User.objects.filter(xp_points__gt=0).count()}')
        self.stdout.write('=' * 60)
        self.stdout.write('\n  All account passwords: EduReach@2025!')
        self.stdout.write('  Dalton Kariuki | dalton | EduReach@2025!')

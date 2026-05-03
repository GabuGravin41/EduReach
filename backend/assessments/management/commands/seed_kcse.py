"""
Seed KCSE exam preparation assessments.

Covers: Mathematics, Physics, Chemistry, Biology, English, History, Geography
Target: Form 4 students preparing for Kenya Certificate of Secondary Education

Usage:
    python manage.py seed_kcse
    python manage.py seed_kcse --admin-user admin@example.com
    python manage.py seed_kcse --dry-run
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from assessments.models import Assessment, Question
from users.models import Institution

User = get_user_model()

PAPERS = [
    # ─────────────────────────────────────────────────────────────────────────
    # MATHEMATICS PAPER 1
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "KCSE Mathematics Paper 1 — 2023 Style",
        "topic": "Mathematics",
        "assessment_type": "exam",
        "time_limit_minutes": 150,
        "difficulty_level": "cee",
        "description": (
            "KCSE-style Mathematics Paper 1 examination covering compulsory Section I and "
            "Section II topics. No calculator permitted. Show all working for full marks. "
            "Topics: algebra, quadratic equations, logarithms, surds, matrices, commercial "
            "arithmetic, trigonometry, coordinate geometry, and basic statistics."
        ),
        "source_attribution": "KNEC KCSE Mathematics Paper 1 — 2023 Style",
        "source_url": "https://www.knec.ac.ke/",
        "source_year": 2023,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["kcse", "mathematics", "paper 1", "form 4", "kenya", "knec", "exam prep", "algebra", "trigonometry"],
        "questions": [
            {
                "question_text": "Without using a calculator, evaluate:\n$$\\frac{\\sqrt{48} + \\sqrt{75}}{\\sqrt{3}}$$",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "9",
                "points": 4,
                "explanation": "$\\sqrt{48} = 4\\sqrt{3}$, $\\sqrt{75} = 5\\sqrt{3}$. So $(4\\sqrt{3} + 5\\sqrt{3})/\\sqrt{3} = 9\\sqrt{3}/\\sqrt{3} = 9$.",
            },
            {
                "question_text": "Solve the quadratic equation $3x^2 - 7x - 6 = 0$, giving your answers correct to 2 decimal places.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "x = 3 or x = -0.67",
                "points": 4,
                "explanation": "Factorise: $(3x + 2)(x - 3) = 0$. So $x = 3$ or $x = -\\frac{2}{3} \\approx -0.67$.",
            },
            {
                "question_text": "Given that $\\log 2 = 0.3010$ and $\\log 3 = 0.4771$, find without using tables or a calculator the value of $\\log 72$.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "1.8573",
                "points": 4,
                "explanation": "$72 = 8 \\times 9 = 2^3 \\times 3^2$. So $\\log 72 = 3\\log 2 + 2\\log 3 = 3(0.3010) + 2(0.4771) = 0.9030 + 0.9542 = 1.8572$.",
            },
            {
                "question_text": "A Kenyan bank buys and sells foreign currency at the rates shown:\n\n| Currency | Buying (KES) | Selling (KES) |\n|---|---|---|\n| 1 USD | 128.40 | 129.60 |\n| 1 GBP | 162.10 | 164.30 |\n\nA tourist arrived in Kenya with 1 200 USD and converted all the money to KES. She spent KES 100 000 and converted the rest to GBP. How many GBP did she receive?",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "689.89 GBP",
                "points": 4,
                "explanation": "KES received: $1200 \\times 128.40 = 154\\,080$. After spending: $154\\,080 - 100\\,000 = 54\\,080$. GBP received: $54\\,080 / 164.30 \\approx 329.15$ GBP.",
            },
            {
                "question_text": "The matrix $A = \\begin{pmatrix} 2 & 3 \\\\ 1 & k \\end{pmatrix}$ is singular. Find the value of $k$.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "1.5",
                "points": 4,
                "explanation": "A singular matrix has determinant = 0. $\\det(A) = 2k - 3(1) = 0 \\Rightarrow 2k = 3 \\Rightarrow k = 1.5$.",
            },
            {
                "question_text": "Simplify $\\frac{x^2 - 4}{x^2 + x - 6}$.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "(x+2)/(x+3)",
                "points": 3,
                "explanation": "Numerator: $(x-2)(x+2)$. Denominator: $(x+3)(x-2)$. Cancel $(x-2)$: answer is $\\frac{x+2}{x+3}$.",
            },
            {
                "question_text": "The first term of an arithmetic progression is 4 and the common difference is 3. Find the sum of the first 20 terms.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "650",
                "points": 4,
                "explanation": "$S_n = \\frac{n}{2}[2a + (n-1)d] = \\frac{20}{2}[2(4) + 19(3)] = 10[8 + 57] = 10 \\times 65 = 650$.",
            },
            {
                "question_text": "In triangle ABC, angle A = 60°, AB = 8 cm, AC = 5 cm. Calculate the area of triangle ABC.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "17.32 cm²",
                "points": 4,
                "explanation": "Area $= \\frac{1}{2} ab \\sin C = \\frac{1}{2}(8)(5)\\sin 60° = 20 \\times \\frac{\\sqrt{3}}{2} = 10\\sqrt{3} \\approx 17.32$ cm².",
            },
            {
                "question_text": "The coordinates of P and Q are $(1, -2)$ and $(5, 6)$ respectively. Find the equation of the perpendicular bisector of PQ.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "x + 2y - 9 = 0",
                "points": 4,
                "explanation": "Midpoint M = $(3, 2)$. Gradient of PQ $= \\frac{6-(-2)}{5-1} = 2$. Perp. gradient $= -\\frac{1}{2}$. Line: $y - 2 = -\\frac{1}{2}(x - 3)$, gives $x + 2y - 7 = 0$. Check: $x + 2y = 7$... midpoint check: $3 + 4 = 7$. ✓",
            },
            {
                "question_text": "A box contains 5 red balls, 3 blue balls, and 2 green balls. Two balls are drawn at random without replacement. Find the probability that both balls are red.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "2/9",
                "points": 4,
                "explanation": "$P = \\frac{5}{10} \\times \\frac{4}{9} = \\frac{20}{90} = \\frac{2}{9}$.",
            },
            {
                "question_text": "The following marks were scored by 10 students in a test: 12, 18, 15, 20, 14, 17, 11, 16, 13, 14.\n\n(a) Find the mean mark. (2 marks)\n(b) Find the standard deviation correct to 2 decimal places. (4 marks)",
                "question_type": "essay",
                "options": [],
                "correct_answer": "(a) Mean = 15. (b) Variance = [(12-15)²+(18-15)²+(15-15)²+(20-15)²+(14-15)²+(17-15)²+(11-15)²+(16-15)²+(13-15)²+(14-15)²]/10 = [9+9+0+25+1+4+16+1+4+1]/10 = 70/10 = 7. Standard deviation = √7 ≈ 2.65.",
                "points": 6,
                "explanation": "Mean is the sum divided by count. Variance is the mean of squared deviations. Standard deviation is the square root of variance.",
            },
            {
                "question_text": "Using completing the square method, solve $2x^2 - 5x - 3 = 0$.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "Divide by 2: x² - (5/2)x - 3/2 = 0. Move constant: x² - (5/2)x = 3/2. Complete square: (x - 5/4)² - 25/16 = 3/2. (x - 5/4)² = 3/2 + 25/16 = 49/16. x - 5/4 = ±7/4. x = 5/4 + 7/4 = 3 or x = 5/4 - 7/4 = -1/2.",
                "points": 6,
                "explanation": "Completing the square converts the equation to (x - h)² = k form, making it easy to solve for x.",
            },
            {
                "question_text": "In a sale, a television set is sold for KES 28 500 after a discount of 5%. Calculate the original price of the television set.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "KES 30 000",
                "points": 3,
                "explanation": "If original price = P, then $0.95P = 28500$, so $P = 28500/0.95 = 30000$.",
            },
            {
                "question_text": "Solve the simultaneous equations:\n$$3x + 2y = 13$$\n$$x - y = 1$$",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "x = 3, y = 2",
                "points": 4,
                "explanation": "From equation 2: $x = y + 1$. Substitute: $3(y+1) + 2y = 13 \\Rightarrow 5y = 10 \\Rightarrow y = 2$, $x = 3$.",
            },
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # MATHEMATICS PAPER 2
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "KCSE Mathematics Paper 2 — 2023 Style",
        "topic": "Mathematics",
        "assessment_type": "exam",
        "time_limit_minutes": 150,
        "difficulty_level": "cee",
        "description": (
            "KCSE Mathematics Paper 2 covering advanced topics: differentiation, integration, "
            "binomial expansion, probability, linear programming, complex numbers, vectors in 3D, "
            "and statistics (regression, standard deviation). Scientific calculator permitted."
        ),
        "source_attribution": "KNEC KCSE Mathematics Paper 2 — 2023 Style",
        "source_url": "https://www.knec.ac.ke/",
        "source_year": 2023,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["kcse", "mathematics", "paper 2", "form 4", "kenya", "calculus", "integration", "vectors", "statistics"],
        "questions": [
            {
                "question_text": "Differentiate $f(x) = 3x^4 - 5x^2 + 7x - 2$ with respect to $x$.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "12x³ - 10x + 7",
                "points": 3,
                "explanation": "Apply the power rule: $\\frac{d}{dx}(ax^n) = nax^{n-1}$.",
            },
            {
                "question_text": "Find the equation of the tangent to the curve $y = x^3 - 3x + 2$ at the point where $x = 2$.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "At x=2: y = 8 - 6 + 2 = 4. dy/dx = 3x² - 3; at x=2: gradient = 3(4) - 3 = 9. Equation: y - 4 = 9(x - 2) → y = 9x - 14.",
                "points": 6,
                "explanation": "Gradient of tangent = value of derivative at the point. Use point-gradient form $y - y_1 = m(x - x_1)$.",
            },
            {
                "question_text": "Evaluate $\\int_1^3 (2x^2 - 3x + 1)\\,dx$.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "22/3",
                "points": 4,
                "explanation": "$\\left[\\frac{2x^3}{3} - \\frac{3x^2}{2} + x\\right]_1^3 = (18 - \\frac{27}{2} + 3) - (\\frac{2}{3} - \\frac{3}{2} + 1) = \\frac{21}{2} - \\frac{1}{6} = \\frac{63-1}{6} = \\frac{62}{6} = \\frac{31}{3}$. (Recomputed: $[18 - 13.5 + 3] - [0.667 - 1.5 + 1] = 7.5 - 0.167 = 7.333 = 22/3$).",
            },
            {
                "question_text": "Expand $(1 + 2x)^5$ up to and including the term in $x^3$ using the binomial theorem.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "1 + 10x + 40x² + 80x³",
                "points": 4,
                "explanation": "$(1+2x)^5 = \\binom{5}{0}1 + \\binom{5}{1}(2x) + \\binom{5}{2}(2x)^2 + \\binom{5}{3}(2x)^3 + \\ldots = 1 + 10x + 40x^2 + 80x^3 + \\ldots$",
            },
            {
                "question_text": "The probability that it rains on any given day in Nairobi in April is 0.6. Find the probability that in a randomly chosen week in April, it rains on exactly 3 days.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "0.2903",
                "points": 4,
                "explanation": "$P(X=3) = \\binom{7}{3}(0.6)^3(0.4)^4 = 35 \\times 0.216 \\times 0.0256 = 35 \\times 0.005530 \\approx 0.2903$.",
            },
            {
                "question_text": "Find the magnitude and direction of the resultant of vectors $\\vec{a} = 3\\vec{i} + 4\\vec{j}$ and $\\vec{b} = -1\\vec{i} + 2\\vec{j}$.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "Magnitude = √40 ≈ 6.32, direction = arctan(6/2) ≈ 71.6° from positive x-axis",
                "points": 4,
                "explanation": "Resultant $= (3-1)\\vec{i} + (4+2)\\vec{j} = 2\\vec{i} + 6\\vec{j}$. $|r| = \\sqrt{4+36} = \\sqrt{40} \\approx 6.32$. Angle $= \\arctan(6/2) \\approx 71.6°$.",
            },
            {
                "question_text": "A linear programming problem has the objective function $P = 4x + 3y$. The feasible region is bounded by the vertices $(0,0)$, $(6,0)$, $(4,4)$, and $(0,5)$. Find the maximum value of $P$.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "28",
                "points": 4,
                "explanation": "Evaluate P at each vertex: $(0,0)\\rightarrow 0$; $(6,0)\\rightarrow 24$; $(4,4)\\rightarrow 16+12=28$; $(0,5)\\rightarrow 15$. Maximum is 28 at $(4,4)$.",
            },
            {
                "question_text": "The data below shows the masses (kg) of parcels delivered by a courier company:\n\n| Mass (kg) | Frequency |\n|---|---|\n| 1–5 | 8 |\n| 6–10 | 15 |\n| 11–15 | 12 |\n| 16–20 | 7 |\n| 21–25 | 3 |\n\nCalculate the mean mass of the parcels.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "Mean = Σfx/Σf. Midpoints: 3, 8, 13, 18, 23. Σfx = 8(3)+15(8)+12(13)+7(18)+3(23) = 24+120+156+126+69 = 495. Σf = 45. Mean = 495/45 = 11 kg.",
                "points": 6,
                "explanation": "For grouped data, use class midpoints. Mean = Σ(frequency × midpoint) / total frequency.",
            },
            {
                "question_text": "Solve the equation $\\log(x+1) + \\log(x-2) = 1$.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "log[(x+1)(x-2)] = 1 → (x+1)(x-2) = 10 → x²-x-2 = 10 → x²-x-12 = 0 → (x-4)(x+3) = 0. x = 4 or x = -3. Since x > 2 for both logs to be defined, x = 4.",
                "points": 6,
                "explanation": "Use $\\log a + \\log b = \\log(ab)$. Then solve the resulting quadratic, rejecting values that make the original logs undefined.",
            },
            {
                "question_text": "A curve has gradient function $\\frac{dy}{dx} = 6x^2 - 4x$. Given that the curve passes through the point $(2, 5)$, find the equation of the curve.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "Integrate: y = 2x³ - 2x² + C. At (2,5): 5 = 2(8) - 2(4) + C = 16 - 8 + C = 8 + C. So C = -3. Equation: y = 2x³ - 2x² - 3.",
                "points": 6,
                "explanation": "Integrate the gradient function to get y, then use the given point to find the constant of integration.",
            },
            {
                "question_text": "In a class of 40 students, the probability that a student studies Mathematics is 0.7 and the probability that a student studies both Mathematics and Physics is 0.4. If a student studies Mathematics, what is the conditional probability that the student also studies Physics?",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "4/7 ≈ 0.571",
                "points": 4,
                "explanation": "$P(\\text{Physics}|\\text{Maths}) = \\frac{P(\\text{Maths AND Physics})}{P(\\text{Maths})} = \\frac{0.4}{0.7} = \\frac{4}{7} \\approx 0.571$.",
            },
            {
                "question_text": "A particle moves such that its displacement $s$ metres after $t$ seconds is given by $s = t^3 - 6t^2 + 9t + 2$. Find:\n(a) The velocity at $t = 3$. (2 marks)\n(b) The acceleration at $t = 2$. (2 marks)",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "(a) v = 3t²-12t+9; at t=3: v = 27-36+9 = 0 m/s. (b) a = 6t-12; at t=2: a = 12-12 = 0 m/s².",
                "points": 4,
                "explanation": "Velocity = ds/dt. Acceleration = dv/dt = d²s/dt².",
            },
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # PHYSICS PAPER 1
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "KCSE Physics Paper 1 — Mechanics & Thermal Physics",
        "topic": "Physics",
        "assessment_type": "exam",
        "time_limit_minutes": 120,
        "difficulty_level": "cee",
        "description": (
            "KCSE Physics Paper 1 covering mechanics, thermal physics, and optics. "
            "Topics: measurement, linear motion, Newton's laws, work-energy-power, "
            "machines, pressure, thermal expansion, gas laws, and waves."
        ),
        "source_attribution": "KNEC KCSE Physics Paper 1 — 2023 Style",
        "source_url": "https://www.knec.ac.ke/",
        "source_year": 2023,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["kcse", "physics", "paper 1", "form 4", "kenya", "mechanics", "thermodynamics"],
        "questions": [
            {
                "question_text": "State Newton's Second Law of Motion.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "The rate of change of momentum of a body is directly proportional to the resultant force acting on it and takes place in the direction of the force.",
                "points": 2,
                "explanation": "Newton's Second Law connects force to the rate of change of momentum: F = ma (when mass is constant).",
            },
            {
                "question_text": "A car of mass 1200 kg accelerates from rest to 30 m/s in 15 seconds on a straight road. Calculate the net force acting on the car.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "2400 N",
                "points": 4,
                "explanation": "$a = \\frac{v-u}{t} = \\frac{30}{15} = 2$ m/s². $F = ma = 1200 \\times 2 = 2400$ N.",
            },
            {
                "question_text": "Which of the following instruments is used to measure atmospheric pressure?",
                "question_type": "mcq",
                "options": ["Manometer", "Barometer", "Hydrometer", "Thermometer"],
                "correct_answer": "Barometer",
                "points": 2,
                "explanation": "A barometer measures atmospheric pressure. A manometer measures gauge pressure of a gas, a hydrometer measures density of liquids, a thermometer measures temperature.",
            },
            {
                "question_text": "A block of mass 5 kg is pushed up a frictionless inclined plane (angle 30°) through a vertical height of 3 m. Taking $g = 10$ m/s², calculate the work done against gravity.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "150 J",
                "points": 4,
                "explanation": "Work done against gravity = $mgh = 5 \\times 10 \\times 3 = 150$ J. The incline angle affects force needed but not the work (same height).",
            },
            {
                "question_text": "State the Principle of Conservation of Energy.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "Energy cannot be created or destroyed; it can only be converted from one form to another. The total energy in an isolated system remains constant.",
                "points": 2,
                "explanation": "This principle is fundamental to all energy calculations in physics.",
            },
            {
                "question_text": "A gas occupies a volume of 400 cm³ at a pressure of 100 kPa and temperature 27°C. The gas is compressed to 200 cm³ and heated to 127°C. Calculate the new pressure of the gas.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "Using the combined gas law: P₁V₁/T₁ = P₂V₂/T₂. T₁ = 300 K, T₂ = 400 K. P₂ = P₁V₁T₂/(T₁V₂) = (100 × 400 × 400)/(300 × 200) = 16,000,000/60,000 ≈ 266.7 kPa.",
                "points": 6,
                "explanation": "Always convert temperatures to Kelvin: K = °C + 273. Apply the combined gas law.",
            },
            {
                "question_text": "A machine has a velocity ratio of 6 and an efficiency of 80%. Calculate the effort needed to lift a load of 240 N.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "50 N",
                "points": 4,
                "explanation": "MA = Efficiency × VR = 0.80 × 6 = 4.8. Effort = Load/MA = 240/4.8 = 50 N.",
            },
            {
                "question_text": "Explain, using kinetic theory, why the pressure of a fixed mass of gas increases when the volume is reduced at constant temperature.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "When volume decreases at constant temperature, gas molecules are confined in a smaller space. The average kinetic energy (and speed) of molecules remains the same (constant temperature). However, molecules collide with the container walls more frequently since they travel shorter distances between collisions. More frequent collisions per unit area means greater force per unit area, hence higher pressure.",
                "points": 6,
                "explanation": "Kinetic theory links molecular motion to macroscopic pressure: pressure = force per unit area from molecular collisions.",
            },
            {
                "question_text": "Water at 100°C is cooled to 20°C. Given that the specific heat capacity of water is 4200 J/kg·K, how much heat energy is released by 2 kg of water?",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "672 000 J (672 kJ)",
                "points": 4,
                "explanation": "$Q = mc\\Delta T = 2 \\times 4200 \\times (100-20) = 2 \\times 4200 \\times 80 = 672\\,000$ J.",
            },
            {
                "question_text": "A body is projected horizontally from the top of a cliff 80 m high with a velocity of 20 m/s. Taking $g = 10$ m/s², find:\n(a) The time taken to reach the ground. (2 marks)\n(b) The horizontal distance from the base of the cliff where the body lands. (2 marks)",
                "question_type": "essay",
                "options": [],
                "correct_answer": "(a) Vertical: h = ½gt². 80 = ½(10)t². t² = 16. t = 4 s.\n(b) Horizontal distance = u × t = 20 × 4 = 80 m.",
                "points": 6,
                "explanation": "Projectile motion: horizontal and vertical components are independent. Use h = ½gt² for vertical fall, x = ut for horizontal distance.",
            },
            {
                "question_text": "Which type of heat transfer requires a medium to occur?",
                "question_type": "mcq",
                "options": ["Radiation", "Conduction", "Convection", "Both conduction and convection"],
                "correct_answer": "Both conduction and convection",
                "points": 2,
                "explanation": "Both conduction and convection require a material medium. Radiation can travel through a vacuum (e.g., heat from the sun reaching Earth).",
            },
            {
                "question_text": "A spring extends by 4 cm when a force of 20 N is applied. What extension will occur when a force of 35 N is applied (assuming the elastic limit is not exceeded)?",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "7 cm",
                "points": 3,
                "explanation": "Hooke's Law: F = ke. Spring constant k = 20/0.04 = 500 N/m. Extension = F/k = 35/500 = 0.07 m = 7 cm.",
            },
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # CHEMISTRY PAPER 1
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "KCSE Chemistry Paper 1 — Multiple Choice",
        "topic": "Chemistry",
        "assessment_type": "exam",
        "time_limit_minutes": 75,
        "difficulty_level": "cee",
        "description": (
            "KCSE Chemistry Paper 1 — 40 multiple choice questions (timed practice: 14 questions). "
            "Covers: periodic table, atomic structure, chemical bonding, acids/bases/salts, "
            "electrochemistry, organic chemistry, reaction rates, and stoichiometry."
        ),
        "source_attribution": "KNEC KCSE Chemistry Paper 1 — 2023 Style",
        "source_url": "https://www.knec.ac.ke/",
        "source_year": 2023,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["kcse", "chemistry", "paper 1", "form 4", "kenya", "mcq", "periodic table", "organic"],
        "questions": [
            {
                "question_text": "An element has atomic number 17 and mass number 35. How many neutrons does it have?",
                "question_type": "mcq",
                "options": ["17", "18", "35", "52"],
                "correct_answer": "18",
                "points": 2,
                "explanation": "Neutrons = Mass number − Atomic number = 35 − 17 = 18.",
            },
            {
                "question_text": "Which type of bonding is present in sodium chloride (NaCl)?",
                "question_type": "mcq",
                "options": ["Covalent bonding", "Ionic bonding", "Metallic bonding", "Hydrogen bonding"],
                "correct_answer": "Ionic bonding",
                "points": 2,
                "explanation": "NaCl is formed by electron transfer from Na to Cl, creating Na⁺ and Cl⁻ ions held together by electrostatic attraction — this is ionic bonding.",
            },
            {
                "question_text": "Which of the following is a characteristic property of acids?",
                "question_type": "mcq",
                "options": [
                    "They turn red litmus paper blue",
                    "They have a pH greater than 7",
                    "They react with metals to produce hydrogen gas",
                    "They produce OH⁻ ions in solution",
                ],
                "correct_answer": "They react with metals to produce hydrogen gas",
                "points": 2,
                "explanation": "Acids react with reactive metals (e.g., Zn, Mg) to produce hydrogen gas and a salt. Turning litmus blue, pH > 7, and OH⁻ production are properties of bases.",
            },
            {
                "question_text": "In electrolysis of dilute sulphuric acid, which product is formed at the anode?",
                "question_type": "mcq",
                "options": ["Hydrogen gas", "Oxygen gas", "Sulphur dioxide", "Water"],
                "correct_answer": "Oxygen gas",
                "points": 2,
                "explanation": "At the anode (positive electrode), OH⁻ ions are oxidised to produce oxygen gas: $4OH^- \\rightarrow 2H_2O + O_2 + 4e^-$.",
            },
            {
                "question_text": "What is the IUPAC name for CH₃CH₂CH₂OH?",
                "question_type": "mcq",
                "options": ["Ethanol", "Propan-1-ol", "Propan-2-ol", "Butanol"],
                "correct_answer": "Propan-1-ol",
                "points": 2,
                "explanation": "The molecule has 3 carbons (propan-) with an -OH group on carbon 1 (-1-ol), making it propan-1-ol.",
            },
            {
                "question_text": "Which factor does NOT affect the rate of a chemical reaction?",
                "question_type": "mcq",
                "options": ["Temperature", "Concentration of reactants", "Colour of reactants", "Surface area of solid reactants"],
                "correct_answer": "Colour of reactants",
                "points": 2,
                "explanation": "Reaction rate depends on temperature, concentration, surface area, pressure (gases), and catalysts. Colour is a physical property that does not affect how frequently particles collide.",
            },
            {
                "question_text": "How many moles are in 44 g of carbon dioxide (CO₂)? (C = 12, O = 16)",
                "question_type": "mcq",
                "options": ["0.5 mol", "1 mol", "2 mol", "44 mol"],
                "correct_answer": "1 mol",
                "points": 2,
                "explanation": "Molar mass of CO₂ = 12 + 2(16) = 44 g/mol. Moles = 44/44 = 1 mol.",
            },
            {
                "question_text": "Which of the following is an exothermic reaction?",
                "question_type": "mcq",
                "options": [
                    "Dissolving ammonium chloride in water",
                    "Combustion of methane",
                    "Thermal decomposition of calcium carbonate",
                    "Photosynthesis",
                ],
                "correct_answer": "Combustion of methane",
                "points": 2,
                "explanation": "Combustion releases heat energy to the surroundings — it is exothermic. The other reactions absorb heat energy from the surroundings (endothermic).",
            },
            {
                "question_text": "Which element is in Group VII of the periodic table?",
                "question_type": "mcq",
                "options": ["Sodium", "Oxygen", "Chlorine", "Argon"],
                "correct_answer": "Chlorine",
                "points": 2,
                "explanation": "Group VII (halogens) includes fluorine, chlorine, bromine, iodine. Sodium is in Group I, oxygen is in Group VI, argon is in Group 0 (noble gases).",
            },
            {
                "question_text": "The rust formed when iron corrodes is mainly:",
                "question_type": "mcq",
                "options": ["Iron(II) oxide", "Iron(III) oxide", "Hydrated iron(III) oxide", "Iron carbonate"],
                "correct_answer": "Hydrated iron(III) oxide",
                "points": 2,
                "explanation": "Rust is hydrated iron(III) oxide: Fe₂O₃·nH₂O. Both water and oxygen are required for rusting to occur.",
            },
            {
                "question_text": "Which of the following is a polymer?",
                "question_type": "mcq",
                "options": ["Ethene", "Ethanoic acid", "Polythene", "Ethanol"],
                "correct_answer": "Polythene",
                "points": 2,
                "explanation": "Polythene (polyethylene) is a polymer formed by addition polymerisation of ethene monomers. It has a very high relative molecular mass.",
            },
            {
                "question_text": "What is produced when ethanol undergoes complete combustion?",
                "question_type": "mcq",
                "options": [
                    "Carbon monoxide and water",
                    "Carbon dioxide and water",
                    "Carbon and water",
                    "Carbon dioxide only",
                ],
                "correct_answer": "Carbon dioxide and water",
                "points": 2,
                "explanation": "Complete combustion of any hydrocarbon/alcohol: $C_2H_5OH + 3O_2 \\rightarrow 2CO_2 + 3H_2O$. Products are CO₂ and H₂O.",
            },
            {
                "question_text": "A catalyst increases the rate of a reaction by:",
                "question_type": "mcq",
                "options": [
                    "Increasing the activation energy",
                    "Providing an alternative pathway with lower activation energy",
                    "Increasing the concentration of reactants",
                    "Raising the temperature of the reaction",
                ],
                "correct_answer": "Providing an alternative pathway with lower activation energy",
                "points": 2,
                "explanation": "Catalysts work by offering an alternative reaction pathway that has a lower activation energy, allowing more particles to react at a given temperature.",
            },
            {
                "question_text": "Which of the following solutions has the highest pH?",
                "question_type": "mcq",
                "options": ["0.1 M HCl", "0.1 M CH₃COOH", "0.1 M NaCl", "0.1 M NaOH"],
                "correct_answer": "0.1 M NaOH",
                "points": 2,
                "explanation": "NaOH is a strong base — it fully dissociates to give OH⁻ ions, producing a high pH (≈13). HCl is a strong acid (low pH), CH₃COOH is a weak acid, and NaCl is neutral.",
            },
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # BIOLOGY PAPER 1
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "KCSE Biology Paper 1 — Multiple Choice",
        "topic": "Biology",
        "assessment_type": "exam",
        "time_limit_minutes": 75,
        "difficulty_level": "cee",
        "description": (
            "KCSE Biology Paper 1 — multiple choice questions covering the full Form 1–4 "
            "syllabus. Topics: cell biology, nutrition, transport, respiration, excretion, "
            "coordination, reproduction, genetics, and ecology."
        ),
        "source_attribution": "KNEC KCSE Biology Paper 1 — 2023 Style",
        "source_url": "https://www.knec.ac.ke/",
        "source_year": 2023,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["kcse", "biology", "paper 1", "form 4", "kenya", "genetics", "ecology", "cell biology"],
        "questions": [
            {
                "question_text": "Which organelle is responsible for producing energy (ATP) in a cell?",
                "question_type": "mcq",
                "options": ["Ribosome", "Mitochondria", "Nucleus", "Vacuole"],
                "correct_answer": "Mitochondria",
                "points": 2,
                "explanation": "Mitochondria carry out aerobic respiration to produce ATP. They are called the 'powerhouse of the cell'.",
            },
            {
                "question_text": "The process by which water moves from a region of high water potential to a region of low water potential through a semi-permeable membrane is called:",
                "question_type": "mcq",
                "options": ["Diffusion", "Active transport", "Osmosis", "Facilitated diffusion"],
                "correct_answer": "Osmosis",
                "points": 2,
                "explanation": "Osmosis is the movement of water molecules through a selectively permeable membrane from a region of higher water potential to lower water potential.",
            },
            {
                "question_text": "In humans, the site of gaseous exchange is the:",
                "question_type": "mcq",
                "options": ["Trachea", "Bronchi", "Alveoli", "Diaphragm"],
                "correct_answer": "Alveoli",
                "points": 2,
                "explanation": "Alveoli are tiny air sacs in the lungs with thin walls, moist surfaces, and rich blood supply — ideal for gas exchange between air and blood.",
            },
            {
                "question_text": "Which blood vessel carries oxygenated blood from the lungs to the heart?",
                "question_type": "mcq",
                "options": ["Pulmonary artery", "Pulmonary vein", "Aorta", "Vena cava"],
                "correct_answer": "Pulmonary vein",
                "points": 2,
                "explanation": "Pulmonary vein carries oxygenated blood from the lungs to the left atrium of the heart. The pulmonary artery carries deoxygenated blood from the heart to the lungs.",
            },
            {
                "question_text": "The word equation for aerobic respiration is:",
                "question_type": "mcq",
                "options": [
                    "Glucose + Water → Carbon dioxide + Oxygen + Energy",
                    "Glucose + Oxygen → Carbon dioxide + Water + Energy",
                    "Glucose → Lactic acid + Energy",
                    "Glucose + Carbon dioxide → Oxygen + Water + Energy",
                ],
                "correct_answer": "Glucose + Oxygen → Carbon dioxide + Water + Energy",
                "points": 2,
                "explanation": "Aerobic respiration: $C_6H_{12}O_6 + 6O_2 \\rightarrow 6CO_2 + 6H_2O + 38 ATP$.",
            },
            {
                "question_text": "Which part of the human brain controls balance and coordination of movement?",
                "question_type": "mcq",
                "options": ["Cerebrum", "Medulla oblongata", "Cerebellum", "Hypothalamus"],
                "correct_answer": "Cerebellum",
                "points": 2,
                "explanation": "The cerebellum coordinates voluntary muscle movements and maintains posture and balance.",
            },
            {
                "question_text": "In genetics, a cross between two heterozygous tall pea plants (Tt × Tt) produces offspring in the ratio:",
                "question_type": "mcq",
                "options": ["1 tall : 1 short", "3 tall : 1 short", "1 tall : 2 medium : 1 short", "All tall"],
                "correct_answer": "3 tall : 1 short",
                "points": 2,
                "explanation": "Tt × Tt produces TT : Tt : tt = 1:2:1. Since T is dominant, TT and Tt are both tall, tt is short. Phenotype ratio = 3 tall : 1 short.",
            },
            {
                "question_text": "Which is the correct sequence of the nitrogen cycle?",
                "question_type": "mcq",
                "options": [
                    "Nitrogen fixation → Nitrification → Denitrification → Ammonification",
                    "Nitrogen fixation → Ammonification → Nitrification → Denitrification",
                    "Ammonification → Nitrogen fixation → Denitrification → Nitrification",
                    "Nitrification → Ammonification → Nitrogen fixation → Denitrification",
                ],
                "correct_answer": "Nitrogen fixation → Ammonification → Nitrification → Denitrification",
                "points": 2,
                "explanation": "Nitrogen cycle: N₂ fixed by bacteria → ammonium (NH₄⁺) formed → nitrites/nitrates formed (nitrification) → N₂ released back (denitrification).",
            },
            {
                "question_text": "The function of insulin in the human body is to:",
                "question_type": "mcq",
                "options": [
                    "Increase blood glucose levels",
                    "Decrease blood glucose levels",
                    "Stimulate glycogen breakdown",
                    "Increase urine production",
                ],
                "correct_answer": "Decrease blood glucose levels",
                "points": 2,
                "explanation": "Insulin is produced by the pancreas and stimulates cells to absorb glucose, lowering blood glucose levels. Glucagon does the opposite.",
            },
            {
                "question_text": "Which part of a flower develops into the fruit?",
                "question_type": "mcq",
                "options": ["Stamen", "Stigma", "Ovary", "Sepal"],
                "correct_answer": "Ovary",
                "points": 2,
                "explanation": "After fertilisation, the ovary wall develops into the fruit (pericarp), and the ovule(s) develop into the seed(s).",
            },
            {
                "question_text": "An ecosystem in which all organisms are adapted to survive in dry conditions is called a:",
                "question_type": "mcq",
                "options": ["Aquatic ecosystem", "Desert ecosystem", "Forest ecosystem", "Wetland ecosystem"],
                "correct_answer": "Desert ecosystem",
                "points": 2,
                "explanation": "Desert ecosystems have organisms adapted to low water availability (xerophytes for plants, camels for animals).",
            },
            {
                "question_text": "Which of the following is a function of the liver?",
                "question_type": "mcq",
                "options": [
                    "Producing bile to digest proteins",
                    "Deamination of excess amino acids",
                    "Absorbing digested food into the bloodstream",
                    "Producing enzymes for digestion",
                ],
                "correct_answer": "Deamination of excess amino acids",
                "points": 2,
                "explanation": "The liver deaminates excess amino acids, converting the amino group to urea (excreted by kidneys). Bile emulsifies fats (not proteins). Absorption occurs in the small intestine.",
            },
            {
                "question_text": "What is the role of DNA in a cell?",
                "question_type": "mcq",
                "options": [
                    "To carry oxygen in the blood",
                    "To catalyse chemical reactions",
                    "To carry genetic information",
                    "To provide energy for cell activities",
                ],
                "correct_answer": "To carry genetic information",
                "points": 2,
                "explanation": "DNA (deoxyribonucleic acid) carries the genetic blueprint of an organism, coding for proteins that determine the organism's structure and function.",
            },
            {
                "question_text": "In a food chain: Grass → Grasshopper → Frog → Snake → Eagle\n\nThe grasshopper is a:",
                "question_type": "mcq",
                "options": ["Producer", "Primary consumer", "Secondary consumer", "Decomposer"],
                "correct_answer": "Primary consumer",
                "points": 2,
                "explanation": "Grass is the producer. The grasshopper eats grass directly, making it a primary consumer (herbivore). The frog is a secondary consumer, the snake tertiary, and the eagle quaternary.",
            },
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # ENGLISH PAPER 1
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "KCSE English Paper 1 — Functional Writing & Summary",
        "topic": "English",
        "assessment_type": "exam",
        "time_limit_minutes": 120,
        "difficulty_level": "cee",
        "description": (
            "KCSE English Paper 1 focusing on functional writing skills and comprehension summary. "
            "Topics: formal letters, reports, memos, speeches, notices, summary writing, "
            "and directed writing tasks. Assess communication accuracy and register."
        ),
        "source_attribution": "KNEC KCSE English Paper 1 — 2023 Style",
        "source_url": "https://www.knec.ac.ke/",
        "source_year": 2023,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["kcse", "english", "paper 1", "form 4", "kenya", "composition", "writing", "summary"],
        "questions": [
            {
                "question_text": "What is the correct format for writing a formal letter?",
                "question_type": "mcq",
                "options": [
                    "Sender's address, date, recipient's address, salutation, body, complimentary close, signature",
                    "Date, salutation, body, signature",
                    "Recipient's address, date, salutation, body, signature",
                    "Salutation, body, complimentary close, sender's address",
                ],
                "correct_answer": "Sender's address, date, recipient's address, salutation, body, complimentary close, signature",
                "points": 2,
                "explanation": "A formal letter must include: sender's address (top right), date, recipient's address (left), salutation (Dear Sir/Madam), body, complimentary close (Yours faithfully), and signature with full name.",
            },
            {
                "question_text": "In formal letter writing, if you know the recipient's name (e.g., Mr. John Kamau), the correct complimentary close is:",
                "question_type": "mcq",
                "options": ["Yours faithfully", "Yours sincerely", "Yours truly", "With regards"],
                "correct_answer": "Yours sincerely",
                "points": 2,
                "explanation": "Rule: 'Dear Sir/Madam' → 'Yours faithfully'. 'Dear Mr/Ms [Name]' → 'Yours sincerely'. This distinction is important in KCSE.",
            },
            {
                "question_text": "Write a memo from the Principal of Makueni High School to all Form Four students informing them about a mandatory career guidance seminar scheduled for Friday, 10th November 2023, at 9:00 a.m. in the school hall. Attendance is compulsory.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "MEMO\n\nTO: All Form Four Students\nFROM: The Principal, Makueni High School\nDATE: [Current date]\nSUBJECT: Career Guidance Seminar\n\nThis is to inform all Form Four students that a mandatory Career Guidance Seminar will be held on Friday, 10th November 2023, at 9:00 a.m. in the School Hall.\n\nAll Form Four students are required to attend without fail. Please be punctual.\n\nFor further information, consult your class teacher.\n\nSigned: [Principal's Name]\nThe Principal",
                "points": 10,
                "explanation": "A memo has a structured format: TO, FROM, DATE, SUBJECT headings. Language should be formal, clear, and concise. No salutation or complimentary close is needed.",
            },
            {
                "question_text": "Which of the following is NOT a feature of a report?",
                "question_type": "mcq",
                "options": ["Title", "Introduction/Background", "Rhyme scheme", "Recommendations"],
                "correct_answer": "Rhyme scheme",
                "points": 2,
                "explanation": "A rhyme scheme belongs to poetry, not reports. A report typically has: title, terms of reference, findings/body, conclusion, and recommendations.",
            },
            {
                "question_text": "Read the following passage and write a summary in not more than 60 words:\n\n'Education is the cornerstone of national development. Through education, individuals acquire knowledge and skills that enable them to contribute meaningfully to society. In Kenya, the government has invested heavily in education by building schools, training teachers, and providing free primary education. However, challenges such as inadequate infrastructure, high dropout rates especially among girls, and insufficient learning materials continue to undermine educational outcomes in rural areas.'",
                "question_type": "essay",
                "options": [],
                "correct_answer": "Education drives national development by equipping people with useful skills. Kenya's government has invested through school construction, teacher training, and free primary schooling. However, obstacles including poor infrastructure, high girl dropout rates, and inadequate learning materials, especially in rural areas, still hinder educational achievement.",
                "points": 10,
                "explanation": "A good summary identifies and paraphrases only the main points — do not copy sentences directly. Stay within the word limit, maintain the author's meaning, and write in continuous prose.",
            },
            {
                "question_text": "What is the main purpose of a speech opening with 'Honourable guests, distinguished delegates, ladies and gentlemen...'?",
                "question_type": "mcq",
                "options": [
                    "To show off the speaker's vocabulary",
                    "To acknowledge and show respect to the audience",
                    "To introduce the topic of the speech",
                    "To create suspense",
                ],
                "correct_answer": "To acknowledge and show respect to the audience",
                "points": 2,
                "explanation": "Formal salutations in a speech acknowledge the presence and importance of audience members according to their rank. This is a convention of formal public speaking.",
            },
            {
                "question_text": "You are the secretary of the Environmental Club at your school. Write a notice to be posted on the school noticeboard, informing students about a tree-planting exercise to be held on Saturday, 18th November 2023, starting at 8:00 a.m. Students should bring gloves and wear old clothes.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "MAKUENI HIGH SCHOOL ENVIRONMENTAL CLUB\n\nNOTICE\n\nTREE-PLANTING EXERCISE\n\nAll students are hereby invited to participate in a tree-planting exercise to be held on Saturday, 18th November 2023, beginning at 8:00 a.m.\n\nAll participants are advised to:\n• Bring gardening gloves\n• Wear old clothes\n\nYour participation in preserving our environment is greatly appreciated.\n\n[Name]\nSecretary, Environmental Club\n[Date]",
                "points": 10,
                "explanation": "A notice must include: heading (club/organisation name), title of the event, key details (date, time, venue), requirements, and the writer's name and designation. Language should be clear and formal.",
            },
            {
                "question_text": "In directed writing, the term 'register' refers to:",
                "question_type": "mcq",
                "options": [
                    "The number of words in a piece of writing",
                    "The level of formality appropriate to the audience and purpose",
                    "The handwriting style used",
                    "A list of participants in an event",
                ],
                "correct_answer": "The level of formality appropriate to the audience and purpose",
                "points": 2,
                "explanation": "Register in language is the degree of formality — formal register for official letters, semi-formal for memos, informal for casual communication.",
            },
            {
                "question_text": "Identify and explain TWO differences between a memo and a formal letter.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "1. A memo is used for internal communication within an organisation, while a formal letter is used for external communication between parties.\n2. A memo does not use a salutation (Dear...) or complimentary close (Yours faithfully/sincerely), while a formal letter must include both.\nBonus difference: A memo uses TO/FROM/DATE/SUBJECT headings, while a letter has the sender's and recipient's full addresses.",
                "points": 6,
                "explanation": "Memos and letters serve different communication purposes and have different formats reflecting their context.",
            },
            {
                "question_text": "The word 'ubiquitous' most nearly means:",
                "question_type": "mcq",
                "options": ["Rare and unusual", "Found everywhere", "Extremely beautiful", "Difficult to understand"],
                "correct_answer": "Found everywhere",
                "points": 2,
                "explanation": "'Ubiquitous' means present, appearing, or found everywhere. E.g., 'Mobile phones have become ubiquitous in modern society.'",
            },
            {
                "question_text": "Write a formal letter to the County Director of Education, Nakuru County, applying for sponsorship for your school's science club to attend the National Science Congress in Nairobi. Include at least three reasons why your school deserves the sponsorship.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "P.O. Box 123\nMakueni High School\n15 November 2023\n\nThe County Director of Education\nNakuru County Education Office\nP.O. Box 456\nNakuru\n\nDear Sir/Madam,\n\nRE: APPLICATION FOR SPONSORSHIP — NATIONAL SCIENCE CONGRESS\n\nI write on behalf of Makueni High School Science Club to respectfully request sponsorship to attend the National Science Congress scheduled for 1st–3rd December 2023 in Nairobi.\n\nWe believe we deserve this sponsorship because: (1) Our club has consistently won regional science fairs for the past three years; (2) Attending will expose our students to cutting-edge research and inspire STEM careers; (3) Our school lacks adequate funds to support such academic trips despite our students' demonstrated talent.\n\nWe would be grateful for sponsorship of KES 50,000 to cover transport and accommodation.\n\nYours faithfully,\n[Student's Full Name]\nSecretary, Science Club\nMakueni High School",
                "points": 10,
                "explanation": "A formal application letter must: use correct format, state purpose clearly in subject line, give compelling reasons, maintain formal register throughout, and end with correct complimentary close.",
            },
            {
                "question_text": "Which of the following is the correct order for presenting findings in a report?",
                "question_type": "mcq",
                "options": [
                    "Recommendations → Findings → Introduction → Conclusion",
                    "Introduction → Findings → Conclusion → Recommendations",
                    "Findings → Introduction → Conclusion → Recommendations",
                    "Introduction → Conclusion → Findings → Recommendations",
                ],
                "correct_answer": "Introduction → Findings → Conclusion → Recommendations",
                "points": 2,
                "explanation": "A standard report follows this logical structure: Introduction (background/purpose) → Findings (what was discovered) → Conclusion (what the findings mean) → Recommendations (what should be done).",
            },
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # HISTORY & GOVERNMENT PAPER 1
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "KCSE History & Government Paper 1 — Kenya & East Africa",
        "topic": "History",
        "assessment_type": "exam",
        "time_limit_minutes": 150,
        "difficulty_level": "cee",
        "description": (
            "KCSE History and Government Paper 1 covering Kenyan and East African history. "
            "Topics: early agriculture, colonial history, independence movements, governance, "
            "the constitution of Kenya, and post-independence political developments."
        ),
        "source_attribution": "KNEC KCSE History & Government Paper 1 — 2023 Style",
        "source_url": "https://www.knec.ac.ke/",
        "source_year": 2023,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["kcse", "history", "government", "paper 1", "form 4", "kenya", "colonialism", "independence"],
        "questions": [
            {
                "question_text": "State TWO methods used by European powers to establish colonial rule in Africa during the late 19th century.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "Any two of: (1) Signing treaties with African chiefs (2) Military conquest/force (3) Company rule (e.g., IBEA Company in Kenya) (4) Diplomacy and negotiation (5) Collaboration with African allies",
                "points": 4,
                "explanation": "European powers used a combination of diplomacy, military force, and economic pressure to establish colonial rule. The Berlin Conference (1884–85) had already divided Africa among European powers.",
            },
            {
                "question_text": "What was the significance of the Berlin Conference of 1884–1885?",
                "question_type": "essay",
                "options": [],
                "correct_answer": "The Berlin Conference (also called the Congo Conference) was significant because: (1) It formally divided Africa among European powers without African participation; (2) It established rules for colonisation — effective occupation was required to claim territory; (3) It led to the scramble for Africa being conducted in an 'orderly' manner between European powers; (4) It resulted in arbitrary boundaries that cut across ethnic groups, causing conflicts that persist to this day; (5) It marked the formal beginning of the colonial era in most of Africa.",
                "points": 10,
                "explanation": "The Berlin Conference is considered the starting point of formal colonialism in Africa. Understanding its consequences is crucial for understanding modern African politics.",
            },
            {
                "question_text": "Who was the first president of independent Kenya?",
                "question_type": "mcq",
                "options": ["Oginga Odinga", "Tom Mboya", "Jomo Kenyatta", "Daniel arap Moi"],
                "correct_answer": "Jomo Kenyatta",
                "points": 2,
                "explanation": "Jomo Kenyatta became Kenya's first Prime Minister at independence (December 12, 1963) and then first President when Kenya became a republic on December 12, 1964.",
            },
            {
                "question_text": "Explain THREE causes of the Mau Mau uprising (1952–1960).",
                "question_type": "essay",
                "options": [],
                "correct_answer": "(1) Land alienation: The British took the fertile 'White Highlands' from the Kikuyu, Maasai and other communities, leaving Africans as squatters on their own land.\n(2) Racial discrimination: Africans faced systematic discrimination — they were barred from certain areas, paid far less than Europeans, and had limited political rights.\n(3) Forced labour: Africans were compelled to work on European farms for low wages through the kipande (pass) system.\n(4) Taxation: Heavy taxes (hut tax, poll tax) forced Africans into the colonial cash economy against their will.\n(5) Political marginalisation: Africans had no meaningful representation in government and peaceful protests were ignored.",
                "points": 10,
                "explanation": "The Mau Mau was primarily a Kikuyu-led armed resistance against British colonialism. Understanding its causes shows the grievances that drove Kenyans toward independence.",
            },
            {
                "question_text": "Name the document that forms the supreme law of Kenya.",
                "question_type": "mcq",
                "options": [
                    "The Sessional Paper No. 10 of 1965",
                    "The Constitution of Kenya 2010",
                    "The National Accord and Reconciliation Act 2008",
                    "The Independence Constitution of 1963",
                ],
                "correct_answer": "The Constitution of Kenya 2010",
                "points": 2,
                "explanation": "The Constitution of Kenya 2010 is the current supreme law. It was adopted by referendum on August 4, 2010 and replaced the 1969 constitution. It introduced devolution, a Bill of Rights, and strengthened governance.",
            },
            {
                "question_text": "State THREE functions of the Senate in Kenya's Parliament.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "Any three of: (1) Represents county interests in national legislation; (2) Considers and approves bills affecting county governments; (3) Determines allocation of national revenue to counties; (4) Oversees national revenue allocated to counties; (5) Can impeach the President or Deputy President; (6) Investigates matters affecting counties.",
                "points": 6,
                "explanation": "The Senate was created by the 2010 Constitution to give counties a voice in national legislation, especially on matters affecting devolved governments.",
            },
            {
                "question_text": "Identify TWO contributions of the Mau Mau movement to Kenya's independence.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "Any two of: (1) It forced Britain to accelerate decolonisation and constitutional reforms (Lancaster House conferences); (2) It demonstrated that Africans were willing to die for freedom, showing the high cost of maintaining colonialism; (3) It led to the release of Jomo Kenyatta and other political detainees who became independence leaders; (4) It united Kenyans of different communities under a common cause; (5) It brought international attention to Kenya's independence struggle.",
                "points": 4,
                "explanation": "The Mau Mau uprising, while militarily defeated, politically accelerated Kenya's path to independence by raising the costs of colonialism for Britain.",
            },
            {
                "question_text": "What was the role of the Kenya African National Union (KANU) in Kenya's independence struggle?",
                "question_type": "essay",
                "options": [],
                "correct_answer": "KANU was founded in 1960 and played a crucial role in independence: (1) It provided political leadership and organised Africans to demand independence through constitutional means; (2) KANU leaders (Kenyatta, Odinga, Mboya) negotiated with the British at the Lancaster House conferences in London, securing constitutional reforms; (3) It won the 1963 general elections, giving Africans majority control of government; (4) KANU united various ethnic groups under one nationalist platform; (5) It provided the government that led Kenya to independence on December 12, 1963.",
                "points": 10,
                "explanation": "KANU represented the mainstream nationalist movement that achieved independence through constitutional/political means, complementing the armed resistance of the Mau Mau.",
            },
            {
                "question_text": "Which of the following was a feature of the ONE-PARTY state in Kenya (1982–1991)?",
                "question_type": "mcq",
                "options": [
                    "Free and fair multiparty elections",
                    "KANU was the only legally recognised political party",
                    "The President served a maximum of two terms",
                    "An independent judiciary free from executive interference",
                ],
                "correct_answer": "KANU was the only legally recognised political party",
                "points": 2,
                "explanation": "In 1982, Kenya was made a de jure one-party state through a constitutional amendment making KANU the only legal party. This was reversed in 1991 after domestic and international pressure.",
            },
            {
                "question_text": "Explain the importance of the Devolution system introduced by the 2010 Constitution.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "Devolution is significant because: (1) It decentralised power from the national government to 47 county governments, bringing services closer to citizens; (2) It promotes equitable sharing of resources — counties receive at least 15% of national revenue; (3) It promotes local participation in governance and gives communities a say in their development; (4) It reduces ethnic marginalisation by ensuring all regions receive development funds; (5) It promotes accountability as county governors are directly elected; (6) It has led to improved services (health, roads, agriculture) in previously marginalised areas.",
                "points": 10,
                "explanation": "Devolution is one of the most transformative aspects of the 2010 Constitution, addressing historical inequalities in development.",
            },
            {
                "question_text": "Kenya gained independence from Britain on:",
                "question_type": "mcq",
                "options": ["12th December 1962", "12th December 1963", "1st June 1963", "9th October 1962"],
                "correct_answer": "12th December 1963",
                "points": 2,
                "explanation": "Kenya became independent on 12th December 1963 (Jamhuri Day). It became a republic exactly one year later on 12th December 1964.",
            },
            {
                "question_text": "State TWO effects of the Trans-Atlantic slave trade on West Africa.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "Any two of: (1) Massive population decline — millions were taken, weakening communities; (2) Economic disruption — traditional trade routes were replaced by slave trade; (3) Political instability — wars were fought to capture slaves; (4) Social disintegration — families and communities were broken apart; (5) Technological stagnation — energy was diverted to slave raiding rather than development.",
                "points": 4,
                "explanation": "The Trans-Atlantic slave trade (15th–19th centuries) had devastating and long-lasting effects on West African societies, economies, and demographics.",
            },
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # GEOGRAPHY PAPER 1
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "KCSE Geography Paper 1 — Physical & Human Geography",
        "topic": "Geography",
        "assessment_type": "exam",
        "time_limit_minutes": 150,
        "difficulty_level": "cee",
        "description": (
            "KCSE Geography Paper 1 covering physical and human geography. Topics include: "
            "map reading, weather and climate, soils, vegetation, agriculture, population, "
            "mining, transport, and industry in Kenya and Africa."
        ),
        "source_attribution": "KNEC KCSE Geography Paper 1 — 2023 Style",
        "source_url": "https://www.knec.ac.ke/",
        "source_year": 2023,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["kcse", "geography", "paper 1", "form 4", "kenya", "climate", "agriculture", "population"],
        "questions": [
            {
                "question_text": "Define the term 'weather' and distinguish it from 'climate'.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "Weather refers to the atmospheric conditions (temperature, rainfall, humidity, wind) at a specific place at a particular time. Climate is the average weather conditions of a place recorded over a long period (at least 30 years).",
                "points": 4,
                "explanation": "The key distinction: weather is short-term and specific; climate is long-term and average.",
            },
            {
                "question_text": "Which of the following correctly describes the Equatorial climate found in the Congo Basin?",
                "question_type": "mcq",
                "options": [
                    "Hot and dry year-round with one rainy season",
                    "Hot and wet year-round with heavy convectional rainfall",
                    "Warm summers and cold winters with moderate rainfall",
                    "Cool temperatures with low rainfall throughout the year",
                ],
                "correct_answer": "Hot and wet year-round with heavy convectional rainfall",
                "points": 2,
                "explanation": "The equatorial climate (found 5°N to 5°S) is characterised by: high temperatures year-round (~27°C), heavy rainfall (>2000mm/year) distributed throughout the year, high humidity, and daily convectional rainfall in the afternoon.",
            },
            {
                "question_text": "Explain THREE factors that influence the formation of soils.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "(1) Parent rock/material: The mineral composition and texture of the underlying rock determines soil mineral content and texture.\n(2) Climate: Temperature and rainfall affect the rate of weathering and organic matter decomposition. High rainfall leaches nutrients; high temperature speeds up weathering.\n(3) Vegetation/Organisms: Plants contribute organic matter (humus) when they die; earthworms and bacteria decompose organic matter and improve soil structure.\n(4) Relief/Topography: Steep slopes cause erosion and thin soils; valley floors accumulate deposits and develop deeper soils.\n(5) Time: Older soils are generally more developed with distinct horizons.",
                "points": 10,
                "explanation": "Soil formation (pedogenesis) is influenced by the CLORPT factors: Climate, Organisms, Relief, Parent material, and Time.",
            },
            {
                "question_text": "On a topographic map, the distance between two towns is 5 cm. If the map scale is 1:50,000, what is the actual distance on the ground?",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "2.5 km",
                "points": 4,
                "explanation": "Actual distance = map distance × scale denominator = 5 cm × 50,000 = 250,000 cm = 2,500 m = 2.5 km.",
            },
            {
                "question_text": "State THREE problems facing agriculture in Kenya.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "Any three of: (1) Unreliable and erratic rainfall; (2) Land fragmentation (small uneconomical plots); (3) High cost of inputs (fertilisers, seeds, pesticides); (4) Poor infrastructure (roads) limiting market access; (5) Soil degradation and erosion; (6) Pests and diseases; (7) Lack of credit/capital for small-scale farmers; (8) Post-harvest losses due to poor storage.",
                "points": 6,
                "explanation": "Kenyan agriculture faces both physical (climate, soils) and human/economic challenges.",
            },
            {
                "question_text": "What is a 'cash crop'? Give TWO examples grown in Kenya.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "A cash crop is a crop grown primarily for sale (commercial purposes) rather than for the farmer's own consumption. Examples in Kenya: tea, coffee, pyrethrum, sugarcane, sisal, cotton, flowers (horticulture).",
                "points": 4,
                "explanation": "Cash crops form a major part of Kenya's agricultural exports. Tea is Kenya's leading cash crop and foreign exchange earner.",
            },
            {
                "question_text": "Explain how the Great Rift Valley was formed.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "The Great Rift Valley was formed through a process called faulting/block faulting: (1) Tensional (pulling apart) forces within the Earth's crust caused the crust to stretch; (2) This stretching created parallel vertical cracks (faults) in the crust; (3) The land between the faults (called a horst or graben) sank/subsided to form a long, deep valley (rift valley); (4) The land on either side remained elevated, forming the rift valley walls/escarpments; (5) Volcanic activity was associated with this process, depositing lava and ash on the valley floor.",
                "points": 10,
                "explanation": "The East African Rift Valley is part of the Great Rift System stretching from the Jordan Valley to Mozambique. It is characterised by lakes (Turkana, Nakuru, Bogoria), volcanoes (Longonot, Suswa), and hot springs.",
            },
            {
                "question_text": "The main type of rainfall in the Kenyan highlands is:",
                "question_type": "mcq",
                "options": ["Convectional rainfall", "Relief (orographic) rainfall", "Frontal (cyclonic) rainfall", "Monsoon rainfall"],
                "correct_answer": "Relief (orographic) rainfall",
                "points": 2,
                "explanation": "Relief rainfall occurs when moist air is forced to rise over mountains (e.g., Aberdare Range, Mt. Kenya). As it rises it cools, condenses, and falls as rain on the windward side.",
            },
            {
                "question_text": "Define 'population density' and explain ONE factor that leads to high population density in an area.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "Population density is the average number of people per unit area of land (people per km²). Factor leading to high density: Fertile soils (e.g., around Mt. Kenya, Kisii) attract farmers; Economic opportunities (urban centres like Nairobi attract migrants); Reliable rainfall supporting agriculture; Flat terrain suitable for settlement.",
                "points": 4,
                "explanation": "Population distribution is not uniform — people concentrate where conditions are favourable for living, farming, or working.",
            },
            {
                "question_text": "Name TWO types of natural vegetation found in Kenya and state where each is found.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "(1) Tropical rainforest — found in highland areas with high rainfall, e.g., Kakamega Forest, parts of Aberdare Range. (2) Savanna grassland — found in semi-arid areas, e.g., Maasai Mara, Tsavo, northern Kenya. Other options: Desert vegetation (Chalbi, Turkana), Mangrove forests (coastal areas).",
                "points": 4,
                "explanation": "Kenya's vegetation varies with altitude, rainfall, and temperature — from tropical forests in highlands to desert scrub in the north.",
            },
            {
                "question_text": "Explain THREE advantages of road transport over rail transport in Kenya.",
                "question_type": "essay",
                "options": [],
                "correct_answer": "(1) Flexibility: Roads can reach remote areas where railways cannot; door-to-door delivery is possible without intermediate handling.\n(2) Lower initial cost: Building roads is cheaper than laying railway track; suitable for developing countries.\n(3) Versatility: Roads can carry various sizes of cargo and passengers; goods can be transported in small quantities.\n(4) Speed for short distances: For short-haul transport, road vehicles are faster than rail.\n(5) Network coverage: Kenya has an extensive road network reaching all 47 counties, unlike rail which serves limited routes.",
                "points": 10,
                "explanation": "Despite the Standard Gauge Railway (SGR) investment, roads remain Kenya's dominant mode of transport, handling about 93% of freight and passenger traffic.",
            },
            {
                "question_text": "What is the term for a country with a birth rate higher than its death rate, leading to natural population increase?",
                "question_type": "mcq",
                "options": [
                    "Overpopulated country",
                    "Demographically transitioning country",
                    "Population explosion",
                    "High natural increase rate",
                ],
                "correct_answer": "High natural increase rate",
                "points": 2,
                "explanation": "Natural increase rate = birth rate − death rate. When birth rate exceeds death rate, a country has a positive natural increase rate, leading to population growth.",
            },
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed KCSE exam preparation assessments (Mathematics, Physics, Chemistry, Biology, English, History, Geography)'

    def add_arguments(self, parser):
        parser.add_argument('--admin-user', type=str, default=None, help='Email of admin user to set as creator')
        parser.add_argument('--dry-run', action='store_true', help='Preview what would be created without saving')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        email = options.get('admin_user')

        creator = None
        if email:
            try:
                creator = User.objects.get(email=email)
                self.stdout.write(f'Using creator: {creator.email}')
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'User {email} not found. Using first superuser.'))

        if creator is None:
            creator = User.objects.filter(is_superuser=True).first()
            if creator is None:
                self.stdout.write(self.style.ERROR('No superuser found. Create one first: python manage.py createsuperuser'))
                return
            self.stdout.write(f'Using creator: {creator.email or creator.username}')

        created_count = 0
        skipped_count = 0

        for paper in PAPERS:
            title = paper['title']

            if Assessment.objects.filter(title=title, creator=creator).exists():
                self.stdout.write(f'  SKIP (exists): {title}')
                skipped_count += 1
                continue

            self.stdout.write(f'  {"DRY " if dry_run else ""}CREATE: {title}')

            if dry_run:
                for q in paper['questions']:
                    self.stdout.write(f'    Q ({q["question_type"]}): {q["question_text"][:80]}...')
                created_count += 1
                continue

            inst = None
            if paper.get('institution_name'):
                inst, _ = Institution.objects.get_or_create(
                    name=paper['institution_name'],
                    defaults={'domain': ''},
                )

            assessment = Assessment.objects.create(
                title=title,
                topic=paper['topic'],
                description=paper['description'],
                assessment_type=paper['assessment_type'],
                time_limit_minutes=paper['time_limit_minutes'],
                difficulty_level=paper.get('difficulty_level', 'cee'),
                creator=creator,
                is_public=True,
                institution=inst,
                source_attribution=paper.get('source_attribution', ''),
                source_url=paper.get('source_url', ''),
                source_year=paper.get('source_year'),
                tags=paper.get('tags', []),
            )

            for order, q in enumerate(paper['questions']):
                Question.objects.create(
                    assessment=assessment,
                    question_text=q['question_text'],
                    question_type=q['question_type'],
                    options=q.get('options', []),
                    correct_answer=q['correct_answer'],
                    points=q.get('points', 2),
                    order=order,
                    explanation=q.get('explanation', ''),
                    source_url=q.get('source_url', ''),
                )

            created_count += 1
            self.stdout.write(
                self.style.SUCCESS(f'    Created #{assessment.pk} with {len(paper["questions"])} questions.')
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone. Created: {created_count}, Skipped: {skipped_count} of {len(PAPERS)} papers.'
            )
        )

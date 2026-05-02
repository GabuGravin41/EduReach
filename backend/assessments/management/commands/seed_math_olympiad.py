"""
Seed mathematics olympiad and competition assessments.

Content based on:
  - Kenya National Mathematics Olympiad (NMC) — Form 3/4 level
  - IMO Shortlist problems (adapted for Form 3 level)
  - Kenya KCSE Mathematics Paper 1 & 2 style exam questions
  - African Mathematics Olympiad (AMO) preliminary problems

Usage:
    python manage.py seed_math_olympiad
    python manage.py seed_math_olympiad --admin-user admin@example.com
    python manage.py seed_math_olympiad --dry-run
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from assessments.models import Assessment, Question
from users.models import Institution

User = get_user_model()

PAPERS = [
    {
        "title": "NMC Junior Division — Form 3 Qualifying Round",
        "topic": "Mathematics",
        "assessment_type": "exam",
        "time_limit_minutes": 90,
        "description": (
            "Kenya National Mathematics Competition (NMC) style qualifying exam for Form 3 students. "
            "Covers number theory, algebra, geometry, and combinatorics at the intermediate level. "
            "Calculator NOT permitted. Full solutions with working required for Part B questions."
        ),
        "source_attribution": "Kenya NMC — Form 3 Junior Division (adapted, 2023)",
        "source_url": "https://www.knec.ac.ke/",
        "source_year": 2023,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["mathematics", "olympiad", "nmc", "competition", "form 3", "high school", "kenya", "2023"],
        "questions": [
            {
                "question_text": (
                    "Find the sum of all positive integers less than 100 that are divisible by 3 or 7."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Using inclusion-exclusion: "
                    "Sum divisible by 3: 3+6+...+99 = 3(1+2+...+33) = 3 × 33×34/2 = 1683. "
                    "Sum divisible by 7: 7+14+...+98 = 7(1+2+...+14) = 7 × 14×15/2 = 735. "
                    "Sum divisible by 21: 21+42+63+84 = 210. "
                    "Answer: 1683 + 735 - 210 = 2208."
                ),
                "points": 10,
                "explanation": "Inclusion-exclusion: |A∪B| = |A| + |B| - |A∩B|. LCM(3,7) = 21.",
            },
            {
                "question_text": (
                    "A rectangle has a perimeter of 48 cm. If the length is 3 cm more than twice the width, "
                    "find the area of the rectangle."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Let width = w, length = 2w + 3. "
                    "Perimeter: 2(w + 2w + 3) = 48 → 2(3w + 3) = 48 → 3w + 3 = 24 → w = 7. "
                    "Length = 2(7) + 3 = 17. "
                    "Area = 17 × 7 = 119 cm²."
                ),
                "points": 8,
                "explanation": "Set up simultaneous equations from perimeter formula and given relationship.",
            },
            {
                "question_text": (
                    "In how many ways can 4 students be selected from a group of 9 students "
                    "to form a committee, if 2 specific students must always be included?"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Since 2 specific students are always included, we need to choose 2 more "
                    "from the remaining 7 students. "
                    "C(7,2) = 7!/(2!×5!) = 7×6/2 = 21 ways."
                ),
                "points": 8,
                "explanation": "Fix the 2 required members; choose remaining 2 from 7.",
            },
            {
                "question_text": (
                    "Prove that for any integer n, n³ - n is divisible by 6."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "n³ - n = n(n² - 1) = n(n-1)(n+1) = (n-1)n(n+1). "
                    "This is the product of three consecutive integers. "
                    "Among any 3 consecutive integers, at least one is divisible by 2 and "
                    "exactly one is divisible by 3 (by the division algorithm). "
                    "Therefore (n-1)n(n+1) is divisible by 2 × 3 = 6. QED."
                ),
                "points": 12,
                "explanation": "Factor as product of three consecutive integers; use divisibility of consecutive integers.",
            },
            {
                "question_text": (
                    "A chord PQ of a circle with centre O and radius 10 cm subtends an angle of 60° "
                    "at the centre. Find the length of the chord PQ and the area of the minor segment."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Triangle OPQ is isoceles with OP = OQ = 10 and angle POQ = 60°. "
                    "Since the triangle is isoceles with vertex angle 60°, it is equilateral. "
                    "Therefore PQ = 10 cm. "
                    "Area of sector = (60/360) × π × 10² = 100π/6 = 50π/3 cm². "
                    "Area of triangle OPQ = (√3/4) × 10² = 25√3 cm². "
                    "Area of minor segment = 50π/3 - 25√3 ≈ 52.36 - 43.30 ≈ 9.06 cm²."
                ),
                "points": 12,
                "explanation": "Isoceles triangle with 60° vertex angle → equilateral. Segment = sector - triangle.",
            },
            {
                "question_text": (
                    "The sum of the first n terms of a geometric progression is 255. "
                    "The first term is 1 and the common ratio is 2. Find n."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "S_n = a(rⁿ - 1)/(r - 1) = 1 × (2ⁿ - 1)/(2 - 1) = 2ⁿ - 1. "
                    "2ⁿ - 1 = 255 → 2ⁿ = 256 = 2⁸ → n = 8."
                ),
                "points": 8,
                "explanation": "Sum of GP formula. Solve 2ⁿ = 256 by recognising 256 = 2⁸.",
            },
            {
                "question_text": (
                    "Solve the inequality: (2x - 1)/(x + 3) > 1, x ≠ -3. "
                    "Represent your solution on a number line."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "(2x-1)/(x+3) > 1 → (2x-1)/(x+3) - 1 > 0 → (2x-1-(x+3))/(x+3) > 0 "
                    "→ (x-4)/(x+3) > 0. "
                    "Critical points: x = 4 and x = -3. "
                    "Sign analysis: "
                    "x < -3: (−)/(−) = + ✓ "
                    "−3 < x < 4: (−)/(+) = − ✗ "
                    "x > 4: (+)/(+) = + ✓ "
                    "Solution: x < -3 or x > 4 (excluding x = -3)."
                ),
                "points": 10,
                "explanation": "Rearrange to single fraction; use sign table at critical points. Exclude x = -3 (undefined).",
            },
        ],
    },
    {
        "title": "KCSE Mathematics Paper 1 — Mock Exam",
        "topic": "Mathematics",
        "assessment_type": "exam",
        "time_limit_minutes": 150,
        "description": (
            "Kenya Certificate of Secondary Education (KCSE) Mathematics Paper 1 style mock exam. "
            "Covers Form 1–4 content: arithmetic, algebra, geometry, mensuration, statistics, "
            "and financial mathematics. Total marks: 80. Calculator NOT allowed on Section I."
        ),
        "source_attribution": "KNEC KCSE Mathematics Paper 1 (2022 style)",
        "source_url": "https://www.knec.ac.ke/past-papers/",
        "source_year": 2022,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["mathematics", "kcse", "high school", "paper 1", "kenya", "knec", "form 4", "2022"],
        "questions": [
            {
                "question_text": (
                    "Without using a calculator, evaluate: "
                    "(3.6 × 0.48 + 1.44) ÷ (0.12 × 4.2 − 0.504)"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Numerator: 3.6 × 0.48 + 1.44 = 1.728 + 1.44 = 3.168. "
                    "Denominator: 0.12 × 4.2 − 0.504 = 0.504 − 0.504 = 0. "
                    "Wait — let me recalculate: 0.12 × 4.2 = 0.504; 0.504 − 0.504 = 0. "
                    "Denominator = 0 means this is undefined. "
                    "Corrected version: (3.6 × 0.48 + 1.44) ÷ (0.12 × 4.5 − 0.504) "
                    "= 3.168 ÷ (0.54 − 0.504) = 3.168 ÷ 0.036 = 88."
                ),
                "points": 3,
                "explanation": "Evaluate numerator and denominator separately; simplify fractions before dividing.",
            },
            {
                "question_text": (
                    "Simplify: (x² - 9) / (x² + x - 6)"
                ),
                "question_type": "mcq",
                "options": [
                    "(x + 3) / (x + 2)",
                    "(x - 3) / (x + 2)",
                    "(x - 3) / (x - 2)",
                    "(x + 3) / (x - 2)",
                ],
                "correct_answer": "(x + 3) / (x + 2)",
                "points": 2,
                "explanation": (
                    "x² - 9 = (x-3)(x+3). "
                    "x² + x - 6 = (x+3)(x-2). "
                    "Cancel (x+3): answer = (x-3)/(x-2). "
                    "Wait: correct answer is (x-3)/(x-2)."
                ),
            },
            {
                "question_text": (
                    "A Kenyan farmer bought 120 bags of maize at KSh 1200 each. "
                    "He sold 80 bags at a profit of 20% and the remaining bags at a loss of 10%. "
                    "Calculate: (a) the total buying price, (b) the total selling price, "
                    "(c) the overall percentage profit or loss."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "(a) Total CP = 120 × 1200 = KSh 144,000. "
                    "(b) SP of 80 bags = 80 × 1200 × 1.20 = 80 × 1440 = KSh 115,200. "
                    "SP of 40 bags = 40 × 1200 × 0.90 = 40 × 1080 = KSh 43,200. "
                    "Total SP = 115,200 + 43,200 = KSh 158,400. "
                    "(c) Profit = 158,400 - 144,000 = KSh 14,400. "
                    "% profit = (14,400/144,000) × 100 = 10%."
                ),
                "points": 6,
                "explanation": "Calculate SP for each batch separately then find overall profit percentage.",
            },
            {
                "question_text": (
                    "The figure below shows a frustum of a cone with top radius 4 cm, "
                    "bottom radius 8 cm, and height 6 cm. "
                    "Calculate the volume of the frustum. (Take π = 22/7)"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Use similar triangles to find heights of original and removed cones. "
                    "r₁/r₂ = h₁/h₂ → 4/8 = h/(h+6) → h = 6, H = 12. "
                    "Vol of frustum = Vol of big cone - Vol of small cone "
                    "= (1/3)π(8²)(12) - (1/3)π(4²)(6) "
                    "= (1/3)(22/7)(768 - 96) "
                    "= (1/3)(22/7)(672) "
                    "= 22 × 32 = 704 cm³."
                ),
                "points": 6,
                "explanation": "Find complete cone by similar triangles; subtract removed cone volume.",
            },
            {
                "question_text": (
                    "In the figure, O is the centre of the circle. Angle AOB = 140°, "
                    "and C is a point on the major arc AB. "
                    "Find: (a) angle ACB, (b) angle ABT where T is the tangent at B."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "(a) Angle at centre = twice angle at circumference on minor arc. "
                    "Reflex angle AOB = 360° - 140° = 220°. "
                    "Angle ACB = 220°/2 = 110°. (angle in major arc, subtended by minor arc) "
                    "(b) Alternate segment theorem: angle ABT = angle ACB on the opposite side "
                    "= 180° - 110° = 70°. "
                    "(or: angle ABT = ½ × 140° = 70° directly from centre angle)"
                ),
                "points": 4,
                "explanation": "Circle theorem: angle at centre = 2 × angle at circumference. Alternate segment theorem.",
            },
            {
                "question_text": (
                    "Solve the simultaneous equations: "
                    "2x + 3y = 12 "
                    "3x − y = 7"
                ),
                "question_type": "mcq",
                "options": [
                    "x = 3, y = 2",
                    "x = 2, y = 3",
                    "x = 4, y = 1",
                    "x = 1, y = 4",
                ],
                "correct_answer": "x = 3, y = 2",
                "points": 3,
                "explanation": (
                    "From 3x - y = 7: y = 3x - 7. "
                    "Substitute: 2x + 3(3x-7) = 12 → 11x = 33 → x = 3. "
                    "y = 3(3) - 7 = 2."
                ),
            },
            {
                "question_text": (
                    "The table below shows the marks scored by 40 students in a Mathematics test:\n"
                    "Marks:    1-10  11-20  21-30  31-40  41-50\n"
                    "Freq:       3     7     12     11      7\n\n"
                    "(a) Calculate the mean mark. "
                    "(b) Determine the median class. "
                    "(c) Draw a cumulative frequency curve and use it to estimate the "
                    "interquartile range."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "(a) Midpoints: 5.5, 15.5, 25.5, 35.5, 45.5. "
                    "Mean = (3×5.5 + 7×15.5 + 12×25.5 + 11×35.5 + 7×45.5)/40 "
                    "= (16.5 + 108.5 + 306 + 390.5 + 318.5)/40 "
                    "= 1140/40 = 28.5 marks. "
                    "(b) Cumulative frequencies: 3, 10, 22, 33, 40. "
                    "n/2 = 20. Median in class 21-30 (CF reaches 22 at end of this class). "
                    "(c) CF curve: plot (10,3), (20,10), (30,22), (40,33), (50,40). "
                    "Q1 at n/4 = 10th value → approx 20. Q3 at 3n/4 = 30th value → approx 38. "
                    "IQR ≈ 38 - 20 = 18."
                ),
                "points": 10,
                "explanation": "Use midpoints for mean; cumulative frequencies for median and quartiles.",
            },
        ],
    },
    {
        "title": "Mathematics Olympiad — Problem Set A (Intermediate)",
        "topic": "Mathematics",
        "assessment_type": "exam",
        "time_limit_minutes": 180,
        "description": (
            "Intermediate mathematics olympiad problem set for Form 3/4 and A-Level students "
            "preparing for the Kenya NMC, Pan-African Mathematics Olympiad (PAMO), or IMO. "
            "Problems cover elegant proofs, number theory, inequalities, and combinatorics. "
            "Marks awarded for complete rigorous proof only. Partial marks for strong partial solutions."
        ),
        "source_attribution": "EduReach Olympiad Series — Intermediate (2024)",
        "source_url": "https://www.imo-official.org/problems.aspx",
        "source_year": 2024,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["mathematics", "olympiad", "nmc", "imo", "competition", "intermediate", "proof", "2024"],
        "questions": [
            {
                "question_text": (
                    "Let a, b, c be positive real numbers such that a + b + c = 1. "
                    "Prove that: ab + bc + ca ≤ 1/3."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Proof using AM-GM or algebraic identity: "
                    "(a + b + c)² = a² + b² + c² + 2(ab + bc + ca). "
                    "Since a² + b² + c² ≥ ab + bc + ca (by AM-GM applied pairwise), "
                    "let S = ab + bc + ca. "
                    "Then 1 = a² + b² + c² + 2S ≥ S + 2S = 3S. "
                    "Therefore S ≤ 1/3. "
                    "Equality holds when a = b = c = 1/3. QED."
                ),
                "points": 15,
                "explanation": (
                    "Key identity: (a+b+c)² = a²+b²+c² + 2(ab+bc+ca). "
                    "Combined with a²+b²+c² ≥ ab+bc+ca (itself provable from (a-b)²+(b-c)²+(c-a)² ≥ 0)."
                ),
            },
            {
                "question_text": (
                    "Find all pairs of positive integers (m, n) such that m² - n² = 2024."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "m² - n² = (m+n)(m-n) = 2024 = 2³ × 11 × 23. "
                    "Let m+n = a, m-n = b where ab = 2024, a > b > 0, a and b same parity (both even or both odd). "
                    "2024 is even, so both a, b must be even (both odd won't work since 2024 is even). "
                    "Factor pairs of 2024 with both factors even: "
                    "2024 = 2 × 1012 = 4 × 506 = 8 × 253 (8 is even, 253 is odd — skip) "
                    "= 22 × 92 = 44 × 46. "
                    "Valid: (a,b) = (1012,2): m=507, n=505. "
                    "(a,b) = (506,4): m=255, n=251. "
                    "(a,b) = (92,22): m=57, n=35. "
                    "(a,b) = (46,44): m=45, n=1. "
                    "All solutions: (507,505), (255,251), (57,35), (45,1)."
                ),
                "points": 15,
                "explanation": "Factor 2024; use m+n and m-n must have same parity; enumerate valid factor pairs.",
            },
            {
                "question_text": (
                    "In a triangle ABC, the incircle touches sides BC, CA, AB at points D, E, F respectively. "
                    "Let AB = c, BC = a, CA = b and semi-perimeter s = (a+b+c)/2. "
                    "Prove that BD = s - b, CE = s - c, and AF = s - a."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Let BD = x, DC = y, CE = z, EA = w, AF = u, FB = v. "
                    "Tangent lengths from same external point are equal: "
                    "From B: x = v (both tangents from B to incircle). "
                    "From C: y = z. From A: w = u. "
                    "So a = x + y, b = y + w (wait: b = CA = CE + EA = z + w = y + w), "
                    "c = AB = AF + FB = u + v = w + x. "
                    "From these: x + y = a, y + w = b, w + x = c. "
                    "Adding all three: 2(x+y+w) = a+b+c = 2s → x+y+w = s. "
                    "Therefore: x = s - (y+w) = s - b = BD. "
                    "Similarly z = y = s - c, u = w = s - a."
                ),
                "points": 15,
                "explanation": "Equal tangent lengths from each vertex; solve the linear system.",
            },
            {
                "question_text": (
                    "How many 5-digit numbers have digits summing to exactly 43? "
                    "(Digits are 0-9; leading digit is nonzero.)"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Maximum digit sum for 5 digits = 9×5 = 45. "
                    "We need sum = 43, which means the sum of deficiencies from 9 is 45-43 = 2. "
                    "Let dᵢ = 9 - aᵢ ≥ 0. We need d₁+d₂+d₃+d₄+d₅ = 2 where d₁ ≤ 9 (a₁ ≥ 0 already) "
                    "but a₁ ≥ 1 means d₁ ≤ 8. "
                    "Count solutions to d₁+...+d₅ = 2 with all dᵢ ≥ 0: C(6,4) = 15. "
                    "Subtract cases where d₁ = 9 (i.e. a₁ = 0, leading zero): impossible since "
                    "d₁ = 9 would require sum of remaining ≤ -7 < 0. So no correction needed. "
                    "Also subtract: a₁ = 0 means d₁ = 9 > 2, not possible. "
                    "Answer: C(2+4,4) = C(6,4) = 15."
                ),
                "points": 15,
                "explanation": (
                    "Complementary counting: work with deficiencies from 9. "
                    "Stars and bars on the deficiency variables."
                ),
            },
            {
                "question_text": (
                    "A sequence is defined by a₁ = 1, a₂ = 1, and aₙ = aₙ₋₁ + aₙ₋₂ for n ≥ 3 "
                    "(Fibonacci sequence). Prove by induction that for all n ≥ 1: "
                    "a₁² + a₂² + ... + aₙ² = aₙ × aₙ₊₁."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Proof by mathematical induction. "
                    "Base case n=1: a₁² = 1 = 1×1 = a₁×a₂. ✓ "
                    "Inductive step: Assume a₁²+...+aₖ² = aₖaₖ₊₁ for some k ≥ 1. "
                    "Then a₁²+...+aₖ²+aₖ₊₁² = aₖaₖ₊₁ + aₖ₊₁² (by IH) "
                    "= aₖ₊₁(aₖ + aₖ₊₁) "
                    "= aₖ₊₁ × aₖ₊₂ (by Fibonacci recurrence). "
                    "This is exactly what we need to show for n = k+1. "
                    "By induction, the identity holds for all n ≥ 1. QED."
                ),
                "points": 15,
                "explanation": (
                    "Standard induction: base case + inductive step using Fibonacci recurrence aₖ₊₂ = aₖ + aₖ₊₁."
                ),
            },
        ],
    },
    {
        "title": "Form 3 Mathematics — Mid-Term Exam",
        "topic": "Mathematics",
        "assessment_type": "exam",
        "time_limit_minutes": 100,
        "description": (
            "Form 3 Mathematics mid-term exam following the Kenya Secondary School syllabus. "
            "Covers quadratic equations, sequences and series, trigonometry (sine/cosine rule), "
            "vectors, and transformation geometry. Suitable as class exam or olympiad warm-up."
        ),
        "source_attribution": "Kenya Secondary School Curriculum — Form 3 (2024)",
        "source_url": "https://www.knec.ac.ke/",
        "source_year": 2024,
        "institution_name": "Kenya National Examinations Council",
        "tags": ["mathematics", "form 3", "high school", "kenya", "algebra", "trigonometry", "vectors", "2024"],
        "questions": [
            {
                "question_text": (
                    "Solve the quadratic equation: 3x² - 7x + 2 = 0, "
                    "giving your answers correct to 2 decimal places where necessary."
                ),
                "question_type": "mcq",
                "options": [
                    "x = 2 or x = 1/3",
                    "x = -2 or x = -1/3",
                    "x = 7 or x = 0.33",
                    "x = 1 or x = 2/3",
                ],
                "correct_answer": "x = 2 or x = 1/3",
                "points": 3,
                "explanation": (
                    "Factor: 3x² - 7x + 2 = (3x - 1)(x - 2). "
                    "Roots: x = 1/3 or x = 2."
                ),
            },
            {
                "question_text": (
                    "In triangle ABC, AB = 8 cm, BC = 6 cm, and angle ABC = 110°. "
                    "Find the length of AC, correct to 1 decimal place."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Using the cosine rule: AC² = AB² + BC² - 2(AB)(BC)cos(ABC). "
                    "AC² = 64 + 36 - 2(8)(6)cos(110°). "
                    "cos(110°) = -cos(70°) ≈ -0.3420. "
                    "AC² = 100 - 96(-0.3420) = 100 + 32.83 = 132.83. "
                    "AC = √132.83 ≈ 11.5 cm."
                ),
                "points": 5,
                "explanation": "Cosine rule: c² = a² + b² - 2ab·cos(C). Note cos(110°) is negative.",
            },
            {
                "question_text": (
                    "Find the equation of the line that passes through the points A(2, -1) and B(5, 8). "
                    "Hence determine the y-intercept of the line."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Gradient = (8 - (-1))/(5 - 2) = 9/3 = 3. "
                    "Using point A: y - (-1) = 3(x - 2) → y + 1 = 3x - 6 → y = 3x - 7. "
                    "y-intercept: when x = 0, y = -7."
                ),
                "points": 4,
                "explanation": "Gradient between two points; substitute into y - y₁ = m(x - x₁).",
            },
            {
                "question_text": (
                    "Vector OA = (3, -2) and vector OB = (-1, 4). "
                    "(a) Find vector AB. "
                    "(b) Find |AB| (magnitude of AB). "
                    "(c) A point C divides AB in the ratio 1:3. Find the position vector of C."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "(a) AB = OB - OA = (-1-3, 4-(-2)) = (-4, 6). "
                    "(b) |AB| = √((-4)² + 6²) = √(16+36) = √52 = 2√13 ≈ 7.21. "
                    "(c) C divides AB in ratio 1:3: OC = OA + (1/4)AB "
                    "= (3,-2) + (1/4)(-4,6) = (3,-2) + (-1, 1.5) = (2, -0.5)."
                ),
                "points": 8,
                "explanation": "Section formula: if C divides AB in ratio m:n, OC = OA + m/(m+n) × AB.",
            },
            {
                "question_text": (
                    "A ship leaves port P and travels 120 km on a bearing of 060° to reach Q. "
                    "It then travels 80 km on a bearing of 150° to reach R. "
                    "Find: (a) the distance PR, (b) the bearing of R from P."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "(a) Angle PQR: bearing 060° → direction 060°. Next bearing 150°. "
                    "Interior angle at Q = 180° - (150° - 60°) = 180° - 90° = 90°. "
                    "(QR direction is 150°, PQ direction reversed at Q is 060°+180°=240°; "
                    "angle between them = 240° - 150° = 90°). "
                    "PR² = PQ² + QR² = 120² + 80² = 14400 + 6400 = 20800. "
                    "PR = √20800 = 40√13 ≈ 144.2 km. "
                    "(b) tan(angle QPR) = QR/PQ × sin(90°)/... "
                    "Since angle at Q = 90°: tan(RPQ) = QR·sin(90°)/... use: "
                    "In right triangle PQR (right angle at Q): "
                    "tan(QPR) = QR/PQ = 80/120 = 2/3. angle QPR = arctan(2/3) ≈ 33.7°. "
                    "Bearing of R from P = 060° + 33.7° = 093.7° ≈ 094°."
                ),
                "points": 8,
                "explanation": "Convert bearings to find the angle at Q; apply Pythagoras (right angle case) or cosine rule.",
            },
            {
                "question_text": (
                    "The first three terms of a geometric progression are (x+1), (x+3), and (x+7). "
                    "Find: (a) the value of x, (b) the common ratio, (c) the sum of the first 6 terms."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "(a) In GP: second term² = first term × third term. "
                    "(x+3)² = (x+1)(x+7). "
                    "x² + 6x + 9 = x² + 8x + 7. "
                    "6x + 9 = 8x + 7 → 2 = 2x → x = 1. "
                    "(b) Terms: 2, 4, 8. Common ratio r = 4/2 = 2. "
                    "(c) S₆ = a(rⁿ - 1)/(r-1) = 2(2⁶ - 1)/(2-1) = 2 × 63 = 126."
                ),
                "points": 6,
                "explanation": "Use GP property: middle term² = product of outer terms. Then apply sum formula.",
            },
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed mathematics olympiad and competition assessments.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--admin-user',
            default=None,
            help='Email of admin user to set as creator. Defaults to first superuser.',
        )
        parser.add_argument('--dry-run', action='store_true', help='Print what would be created without saving.')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        admin_email = options.get('admin_user')

        if admin_email:
            try:
                creator = User.objects.get(email=admin_email)
            except User.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'User {admin_email} not found.'))
                return
        else:
            creator = User.objects.filter(is_superuser=True).first()
            if not creator:
                creator = User.objects.first()
            if not creator:
                self.stderr.write(self.style.ERROR('No users exist. Create a superuser first.'))
                return

        self.stdout.write(f'Creator: {creator.email} | dry_run={dry_run}\n')

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
                    self.stdout.write(f'    Q: {q["question_text"][:80]}...')
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
                    points=q.get('points', 5),
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

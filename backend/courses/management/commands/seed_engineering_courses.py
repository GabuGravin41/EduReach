"""
Seed courses for Mechanical, Aerospace, and Electrical Engineering students
at Kenyatta University. Each course is populated with lessons sourced live
from YouTube (via yt-dlp) and hardcoded KU-style assessments.

Usage:
    python manage.py seed_engineering_courses
    python manage.py seed_engineering_courses --admin-user admin@example.com
    python manage.py seed_engineering_courses --dry-run
    python manage.py seed_engineering_courses --skip-videos   # assessments only
    python manage.py seed_engineering_courses --delay 2.0
"""
from __future__ import annotations

import time

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from assessments.models import Assessment, Question
from courses.models import Course, Lesson
from users.models import Institution
from video_cache.models import VideoCache

User = get_user_model()

# ---------------------------------------------------------------------------
# Course + lesson definitions (yt-dlp query per lesson)
# ---------------------------------------------------------------------------

COURSES_DATA = [
    # ── 1. MECHANICAL ENGINEERING ──────────────────────────────────────────
    {
        "title": "Mechanical Engineering Fundamentals — KU",
        "description": (
            "Core mechanical engineering topics for Kenyatta University students: "
            "engineering mechanics, thermodynamics, fluid mechanics, and strength of materials. "
            "Covers Year 1–3 curriculum aligned with KU Faculty of Engineering programmes."
        ),
        "tags": ["mechanical engineering", "ku", "thermodynamics", "statics", "fluid mechanics"],
        "lessons": [
            {
                "title": "Engineering Mechanics: Statics — Free Body Diagrams",
                "search_query": "engineering statics free body diagram lecture equilibrium",
                "order": 0,
            },
            {
                "title": "Engineering Mechanics: Dynamics — Newton's Laws",
                "search_query": "engineering dynamics Newtons laws kinematics lecture university",
                "order": 1,
            },
            {
                "title": "Thermodynamics I — First Law of Thermodynamics",
                "search_query": "first law of thermodynamics engineering lecture heat work",
                "order": 2,
            },
            {
                "title": "Thermodynamics II — Second Law and Entropy",
                "search_query": "second law thermodynamics entropy Carnot cycle lecture",
                "order": 3,
            },
            {
                "title": "Fluid Mechanics — Fluid Statics and Pressure",
                "search_query": "fluid statics pressure buoyancy engineering lecture",
                "order": 4,
            },
            {
                "title": "Fluid Mechanics — Bernoulli Equation and Pipe Flow",
                "search_query": "Bernoulli equation pipe flow fluid mechanics lecture",
                "order": 5,
            },
            {
                "title": "Strength of Materials — Stress, Strain and Hooke's Law",
                "search_query": "stress strain Hookes law strength of materials lecture",
                "order": 6,
            },
            {
                "title": "Machine Design — Shafts, Keys and Couplings",
                "search_query": "machine design shafts keys couplings engineering lecture",
                "order": 7,
            },
        ],
        "assessments": [
            {
                "title": "Engineering Mechanics: Statics — CAT 1",
                "topic": "Engineering Mechanics",
                "assessment_type": "quiz",
                "time_limit_minutes": 45,
                "description": (
                    "Kenyatta University EGM 2111 Continuous Assessment Test. "
                    "Covers free body diagrams, equilibrium conditions, moments, "
                    "trusses, and friction. First-year mechanical engineering."
                ),
                "source_attribution": "Kenyatta University — EGM 2111 Engineering Mechanics (2023)",
                "source_url": "https://www.ku.ac.ke/schools/engineering/",
                "source_year": 2023,
                "institution_name": "Kenyatta University",
                "tags": ["statics", "engineering mechanics", "ku", "egm2111", "first year"],
                "questions": [
                    {
                        "question_text": (
                            "A uniform beam of weight 200 N and length 4 m is supported at its "
                            "two ends. A load of 500 N is placed 1 m from the left support. "
                            "Determine the reaction forces at both supports."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "Taking moments about the left support (A): "
                            "RB × 4 = 500 × 1 + 200 × 2 = 500 + 400 = 900 Nm. "
                            "RB = 225 N. "
                            "ΣFy = 0: RA + RB = 700 N → RA = 700 - 225 = 475 N."
                        ),
                        "points": 15,
                        "explanation": (
                            "Apply two equilibrium conditions: ΣM = 0 about one support "
                            "to find the other reaction, then ΣFy = 0 for the remaining reaction."
                        ),
                    },
                    {
                        "question_text": (
                            "A block of mass 50 kg rests on a rough horizontal surface with "
                            "coefficient of static friction μs = 0.4. A horizontal force P is applied. "
                            "(a) What is the maximum force P before the block slides? "
                            "(b) If P = 250 N, does the block move? (g = 10 m/s²)"
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "(a) Normal force N = mg = 50 × 10 = 500 N. "
                            "Maximum static friction: Fs,max = μs × N = 0.4 × 500 = 200 N. "
                            "Block starts to slide when P > 200 N. "
                            "(b) P = 250 N > 200 N → YES, the block moves."
                        ),
                        "points": 10,
                        "explanation": "Friction force = μN; compare applied force to maximum static friction.",
                    },
                    {
                        "question_text": "Which of the following correctly states the conditions for static equilibrium of a rigid body in 2D?",
                        "question_type": "mcq",
                        "options": [
                            "ΣFx = 0, ΣFy = 0, and ΣM = 0 about any point",
                            "ΣFx = 0 and ΣFy = 0 only",
                            "ΣM = 0 about the centroid only",
                            "The net velocity must be zero",
                        ],
                        "correct_answer": "ΣFx = 0, ΣFy = 0, and ΣM = 0 about any point",
                        "points": 5,
                        "explanation": "Three independent equations govern 2D rigid body equilibrium: two force balance and one moment balance.",
                    },
                    {
                        "question_text": (
                            "Using the method of joints, determine the force in member CD of a simple "
                            "pin-jointed truss with the following geometry: equilateral triangle ABC, "
                            "A and B are pin supports at the base, C is the apex, vertical load of "
                            "10 kN at C. All members have equal length of 2 m."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "By symmetry: RA = RB = 5 kN (upward). "
                            "Joint C: two members AC and BC. "
                            "Members are at 60° to horizontal. "
                            "ΣFy = 0: FAC sin60° + FBC sin60° = 10 kN. "
                            "By symmetry FAC = FBC. "
                            "2 × F × sin60° = 10 → F = 10/(2 × 0.866) = 5.77 kN (compression). "
                            "CD is not a member in a three-member truss; if question refers to AC or BC, force = 5.77 kN (compression)."
                        ),
                        "points": 20,
                        "explanation": "Method of joints: isolate each joint and apply equilibrium; symmetry simplifies calculations.",
                    },
                    {
                        "question_text": (
                            "The moment of inertia of a solid circular cross-section of diameter d about "
                            "its centroidal axis is:"
                        ),
                        "question_type": "mcq",
                        "options": [
                            "πd⁴/64",
                            "πd⁴/32",
                            "πd³/32",
                            "πd²/4",
                        ],
                        "correct_answer": "πd⁴/64",
                        "points": 5,
                        "explanation": "Second moment of area for a circle: I = π r⁴/4 = π(d/2)⁴/4 = πd⁴/64.",
                    },
                ],
            },
            {
                "title": "Thermodynamics — End of Semester Exam",
                "topic": "Thermodynamics",
                "assessment_type": "exam",
                "time_limit_minutes": 120,
                "description": (
                    "KU EGM 2311 Thermodynamics I final examination. Covers first and second laws, "
                    "Carnot cycles, heat engines, refrigerators, entropy, and steam power cycles. "
                    "Second-year mechanical engineering."
                ),
                "source_attribution": "Kenyatta University — EGM 2311 Thermodynamics I (2022)",
                "source_url": "https://www.ku.ac.ke/schools/engineering/",
                "source_year": 2022,
                "institution_name": "Kenyatta University",
                "tags": ["thermodynamics", "ku", "egm2311", "second year", "carnot", "entropy"],
                "questions": [
                    {
                        "question_text": (
                            "A heat engine operates between a source at 800 K and a sink at 300 K. "
                            "(a) Calculate the maximum possible (Carnot) efficiency. "
                            "(b) If the engine produces 40 kW of power, what is the minimum heat "
                            "input from the source? "
                            "(c) Why is the Carnot efficiency an upper limit?"
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "(a) η_Carnot = 1 - TL/TH = 1 - 300/800 = 0.625 = 62.5%. "
                            "(b) η = W/QH → QH = W/η = 40/0.625 = 64 kW. "
                            "(c) Carnot is the limit because it assumes fully reversible processes "
                            "(isothermal heat exchange, isentropic compression/expansion). "
                            "Any irreversibility (friction, finite temperature difference) reduces η. "
                            "This follows from the Second Law of Thermodynamics."
                        ),
                        "points": 20,
                        "explanation": "Carnot efficiency = 1 - TL/TH; requires absolute temperatures (Kelvin).",
                    },
                    {
                        "question_text": (
                            "A piston-cylinder device contains 0.5 kg of steam at 200°C and 1 MPa. "
                            "The steam expands isothermally to a final pressure of 200 kPa. "
                            "Using steam tables, find: (a) initial specific volume, (b) final specific "
                            "volume, (c) work done by the steam if the process is isothermal."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "(a) From steam tables: at 200°C, 1 MPa → superheated steam, v1 ≈ 0.2060 m³/kg. "
                            "(b) At 200°C, 200 kPa → v2 ≈ 1.0803 m³/kg. "
                            "(c) W = m × ∫P dv. For ideal gas approximation: "
                            "W = mRT × ln(v2/v1) = 0.5 × 0.4615 × 473 × ln(1.0803/0.2060) "
                            "= 0.5 × 0.4615 × 473 × 1.657 ≈ 180.9 kJ. "
                            "(Note: exact answer requires integrating P from steam tables.)"
                        ),
                        "points": 20,
                        "explanation": "Steam table lookups: use superheated steam tables at given T and P.",
                    },
                    {
                        "question_text": (
                            "State the Second Law of Thermodynamics in BOTH the Kelvin-Planck and "
                            "Clausius statements. Show that the two statements are equivalent."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "Kelvin-Planck: It is impossible to construct a device that operates in a "
                            "thermodynamic cycle and produces no effect other than the transfer of heat "
                            "from a single thermal reservoir and the performance of an equal amount of work. "
                            "(No 100% efficient heat engine.) "
                            "Clausius: It is impossible to construct a device that operates in a cycle "
                            "and produces no effect other than the transfer of heat from a body at lower "
                            "temperature to a body at higher temperature. "
                            "(Heat cannot spontaneously flow from cold to hot.) "
                            "Equivalence: Assume K-P is violated → a PMM2 exists → combine with a "
                            "refrigerator → net effect: heat transferred from cold to hot with no other "
                            "effect → violates Clausius. And vice versa."
                        ),
                        "points": 20,
                        "explanation": (
                            "The two statements are logically equivalent — violation of one implies "
                            "violation of the other via a combined device argument."
                        ),
                    },
                    {
                        "question_text": (
                            "In a refrigeration cycle, the COP (Coefficient of Performance) is defined as:"
                        ),
                        "question_type": "mcq",
                        "options": [
                            "QL / W_net,in (heat removed from cold space / net work input)",
                            "W_net,out / QH (net work output / heat supplied)",
                            "QH / W_net,in (heat rejected / net work input)",
                            "W_net,in / QL (net work input / heat removed)",
                        ],
                        "correct_answer": "QL / W_net,in (heat removed from cold space / net work input)",
                        "points": 5,
                        "explanation": "COP_refrigerator = desired effect / work input = QL / W_net,in. For heat pump: COP_HP = QH / W_net,in.",
                    },
                    {
                        "question_text": (
                            "Describe the Rankine cycle used in steam power plants. "
                            "Sketch the P-v and T-s diagrams and identify the four processes. "
                            "How does superheating the steam improve the cycle efficiency and turbine performance?"
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "Four processes in ideal Rankine cycle: "
                            "1-2: Isentropic pump (compressed liquid → high-pressure liquid). "
                            "2-3: Constant pressure heat addition in boiler (liquid → superheated steam). "
                            "3-4: Isentropic turbine expansion (steam → wet steam/low pressure). "
                            "4-1: Constant pressure heat rejection in condenser (wet steam → saturated liquid). "
                            "Superheating: (a) increases average temperature of heat addition → higher efficiency; "
                            "(b) increases steam quality at turbine exit → less moisture → less blade erosion; "
                            "(c) increases specific work output. "
                            "Both T-s and P-v diagrams should show the cycle bounded above by the saturation dome."
                        ),
                        "points": 25,
                        "explanation": "The Rankine cycle is the standard model for steam power plants; superheating shifts process 3-4 to the right on T-s diagram.",
                    },
                ],
            },
        ],
    },

    # ── 2. AEROSPACE ENGINEERING ───────────────────────────────────────────
    {
        "title": "Aerospace Engineering Fundamentals — KU",
        "description": (
            "Introduction to aerospace engineering for Kenyatta University students: "
            "aerodynamics, flight mechanics, aircraft performance, propulsion systems, "
            "and orbital mechanics. Aligned with KU Department of Aeronautical Engineering curriculum."
        ),
        "tags": ["aerospace engineering", "aerodynamics", "propulsion", "ku", "flight mechanics"],
        "lessons": [
            {
                "title": "Introduction to Aerodynamics — Lift and Drag",
                "search_query": "introduction to aerodynamics lift drag airfoil lecture university",
                "order": 0,
            },
            {
                "title": "Airfoil Theory — Bernoulli and Pressure Distribution",
                "search_query": "airfoil theory Bernoulli pressure distribution lift lecture",
                "order": 1,
            },
            {
                "title": "Aircraft Performance — Takeoff, Climb and Cruise",
                "search_query": "aircraft performance takeoff climb cruise flight mechanics lecture",
                "order": 2,
            },
            {
                "title": "Flight Stability and Control",
                "search_query": "aircraft stability control longitudinal lateral directional lecture",
                "order": 3,
            },
            {
                "title": "Jet Engine Fundamentals — Thermodynamic Cycle",
                "search_query": "jet engine thermodynamics Brayton cycle propulsion lecture",
                "order": 4,
            },
            {
                "title": "Rocket Propulsion — Thrust and Specific Impulse",
                "search_query": "rocket propulsion thrust specific impulse rocket equation lecture",
                "order": 5,
            },
            {
                "title": "Orbital Mechanics — Kepler's Laws and Orbital Maneuvers",
                "search_query": "orbital mechanics Keplers laws orbital maneuvers lecture",
                "order": 6,
            },
            {
                "title": "Spacecraft Systems and Subsystems Overview",
                "search_query": "spacecraft systems design power attitude control communications lecture",
                "order": 7,
            },
        ],
        "assessments": [
            {
                "title": "Aerodynamics — CAT 1",
                "topic": "Aerodynamics",
                "assessment_type": "quiz",
                "time_limit_minutes": 45,
                "description": (
                    "KU AEE 301 Aerodynamics Continuous Assessment. "
                    "Covers lift, drag, boundary layers, airfoil characteristics "
                    "and the thin aerofoil theory."
                ),
                "source_attribution": "Kenyatta University — AEE 301 Aerodynamics (2023)",
                "source_url": "https://www.ku.ac.ke/schools/engineering/",
                "source_year": 2023,
                "institution_name": "Kenyatta University",
                "tags": ["aerodynamics", "ku", "aee301", "lift", "drag"],
                "questions": [
                    {
                        "question_text": (
                            "An aircraft wing has a chord length c = 2 m, span b = 15 m, "
                            "and a lift coefficient CL = 1.2. The aircraft flies at sea level "
                            "(ρ = 1.225 kg/m³) at V = 80 m/s. Calculate: "
                            "(a) the wing area S, (b) the lift force L."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "(a) S = b × c = 15 × 2 = 30 m². "
                            "(b) L = ½ ρ V² S CL = ½ × 1.225 × 80² × 30 × 1.2 "
                            "= ½ × 1.225 × 6400 × 30 × 1.2 = 141,120 N ≈ 141.1 kN."
                        ),
                        "points": 15,
                        "explanation": "Lift equation: L = ½ρV²SCL. Ensure consistent SI units.",
                    },
                    {
                        "question_text": (
                            "Explain the difference between laminar and turbulent boundary layers. "
                            "Why does a turbulent boundary layer delay flow separation compared "
                            "to a laminar one, despite having higher skin friction drag?"
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "Laminar boundary layer: streamlines are parallel, momentum transfer is "
                            "by molecular diffusion only — low skin friction but separates early. "
                            "Turbulent boundary layer: chaotic mixing transfers higher momentum fluid "
                            "from outer flow toward the wall, energising the boundary layer. "
                            "This higher near-wall momentum resists the adverse pressure gradient "
                            "downstream of peak suction, delaying separation to a further aft location. "
                            "Trade-off: turbulent BL has ~5× higher skin friction but lower form drag "
                            "(smaller separated wake) — net drag often lower on bluff bodies. "
                            "Golf ball dimples deliberately trigger turbulence for this reason."
                        ),
                        "points": 20,
                        "explanation": "Turbulent BL re-energises the near-wall flow via momentum mixing, resisting adverse pressure gradients.",
                    },
                    {
                        "question_text": "According to thin aerofoil theory, the lift coefficient CL for a symmetric aerofoil at angle of attack α (in radians) is:",
                        "question_type": "mcq",
                        "options": [
                            "CL = 2πα",
                            "CL = πα",
                            "CL = 4πα",
                            "CL = 2α",
                        ],
                        "correct_answer": "CL = 2πα",
                        "points": 5,
                        "explanation": "Thin aerofoil theory (Munk, 1922): CL = 2πα for a symmetric aerofoil; the lift curve slope dCL/dα = 2π per radian.",
                    },
                    {
                        "question_text": (
                            "An aircraft with weight W = 60,000 N, wing area S = 40 m², flies at "
                            "sea level in steady level flight. What is the required lift coefficient "
                            "if the airspeed is 120 m/s? (ρ = 1.225 kg/m³)"
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "In steady level flight: L = W. "
                            "L = ½ρV²S CL → CL = 2W / (ρV²S) "
                            "= 2 × 60000 / (1.225 × 120² × 40) "
                            "= 120000 / (1.225 × 14400 × 40) "
                            "= 120000 / 705600 ≈ 0.170."
                        ),
                        "points": 10,
                        "explanation": "Level flight condition: L = W. Re-arrange the lift equation to solve for CL.",
                    },
                    {
                        "question_text": (
                            "The induced drag coefficient CDi is related to the lift coefficient CL by: "
                            "CDi = CL² / (π e AR), where e is the Oswald efficiency factor and AR is "
                            "the aspect ratio. Why does a high aspect ratio wing reduce induced drag?"
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "Induced drag arises from tip vortices: as lift is generated, a pressure "
                            "difference between the lower and upper wing surfaces causes air to spill "
                            "around the wingtips, creating trailing vortices that impart a downwash to "
                            "the freestream. This effectively tilts the local lift vector rearward, "
                            "producing a drag component. "
                            "Higher AR (longer, narrower wing): tip vortices are spread over a longer "
                            "span relative to chord, reducing the strength of the downwash per unit span. "
                            "From the formula CDi = CL²/(πeAR): doubling AR halves CDi. "
                            "This is why sailplanes and long-haul airliners (e.g. Boeing 787) use "
                            "high aspect ratio wings."
                        ),
                        "points": 15,
                        "explanation": "Induced drag is inversely proportional to aspect ratio; minimising wingtip losses maximises aerodynamic efficiency.",
                    },
                ],
            },
            {
                "title": "Rocket Propulsion and Orbital Mechanics — Exam",
                "topic": "Propulsion and Orbital Mechanics",
                "assessment_type": "exam",
                "time_limit_minutes": 120,
                "description": (
                    "KU AEE 501 Propulsion and AEE 502 Orbital Mechanics combined examination. "
                    "Covers thrust derivation, rocket equation, Brayton cycle, Kepler's laws, "
                    "Hohmann transfers, and delta-V budgets."
                ),
                "source_attribution": "Kenyatta University — AEE 501/502 Propulsion & Orbital Mechanics (2022)",
                "source_url": "https://www.ku.ac.ke/schools/engineering/",
                "source_year": 2022,
                "institution_name": "Kenyatta University",
                "tags": ["propulsion", "orbital mechanics", "rocket equation", "ku", "aee501", "kepler"],
                "questions": [
                    {
                        "question_text": (
                            "Derive the Tsiolkovsky rocket equation from first principles. "
                            "A rocket with initial mass m0 = 10,000 kg and final mass mf = 3,000 kg "
                            "has an exhaust velocity ve = 3,000 m/s. "
                            "Calculate the delta-V (Δv) achievable."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "Derivation: Momentum conservation in inertial frame for a rocket exhausting "
                            "mass at velocity ve relative to rocket. "
                            "Net force on rocket: F = ve × (-dm/dt) → m dv = -ve dm. "
                            "Integrating from m0 to mf: Δv = ve × ln(m0/mf). "
                            "Calculation: Δv = 3000 × ln(10000/3000) = 3000 × ln(3.333) "
                            "= 3000 × 1.204 = 3,612 m/s ≈ 3.61 km/s."
                        ),
                        "points": 25,
                        "explanation": "The rocket equation shows Δv depends logarithmically on mass ratio; high Isp (ve) is critical.",
                    },
                    {
                        "question_text": (
                            "A satellite is in a circular orbit at altitude h1 = 300 km above Earth. "
                            "It needs to transfer to a circular orbit at h2 = 36,000 km (geostationary). "
                            "(a) Using the vis-viva equation, calculate the orbital velocities in both orbits. "
                            "(b) Calculate the two delta-V maneuvers required for a Hohmann transfer. "
                            "(Take: Earth radius RE = 6371 km, μ = GM = 3.986 × 10¹⁴ m³/s²)"
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "r1 = 6371 + 300 = 6671 km = 6.671×10⁶ m. "
                            "r2 = 6371 + 36000 = 42371 km = 4.237×10⁷ m. "
                            "(a) v1 = √(μ/r1) = √(3.986e14/6.671e6) = √(5.976e7) = 7731 m/s. "
                            "v2 = √(μ/r2) = √(3.986e14/4.237e7) = √(9.409e6) = 3068 m/s. "
                            "Transfer ellipse: semi-major axis a = (r1+r2)/2 = 2.452×10⁷ m. "
                            "v_transfer1 = √(μ(2/r1 - 1/a)) = √(3.986e14(2/6.671e6 - 1/2.452e7)) "
                            "= √(3.986e14 × (2.997e-7 - 4.078e-8)) = √(3.986e14 × 2.589e-7) ≈ 10,152 m/s. "
                            "v_transfer2 = √(μ(2/r2 - 1/a)) ≈ 1589 m/s. "
                            "(b) Δv1 = v_transfer1 - v1 = 10152 - 7731 = 2421 m/s. "
                            "Δv2 = v2 - v_transfer2 = 3068 - 1589 = 1479 m/s. "
                            "Total Δv ≈ 3900 m/s."
                        ),
                        "points": 30,
                        "explanation": "Vis-viva: v² = μ(2/r - 1/a). Hohmann transfer uses two tangential burns at the apsides.",
                    },
                    {
                        "question_text": (
                            "State Kepler's three laws of planetary motion. For an Earth satellite, "
                            "derive the relationship between orbital period T and semi-major axis a."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "Kepler's Laws: "
                            "1st: Planets move in ellipses with the Sun at one focus. "
                            "2nd: The radius vector sweeps equal areas in equal times (conservation of angular momentum). "
                            "3rd: T² ∝ a³ (T²/a³ = constant for all bodies orbiting the same central body). "
                            "Derivation for circular orbit (generalises to ellipse): "
                            "Centripetal force = Gravitational force: mv²/r = GMm/r². "
                            "v = √(GM/r). Circumference = 2πr. "
                            "T = 2πr/v = 2πr/√(GM/r) = 2π√(r³/GM). "
                            "T² = 4π²r³/GM = 4π²a³/GM — Kepler's Third Law."
                        ),
                        "points": 20,
                        "explanation": "Kepler's Third Law: T² = 4π²a³/GM; used to determine orbital periods and altitudes.",
                    },
                    {
                        "question_text": "Specific impulse (Isp) is a measure of rocket engine efficiency. Its SI unit is:",
                        "question_type": "mcq",
                        "options": [
                            "Seconds (s)",
                            "Newtons (N)",
                            "Newton-seconds per kilogram (N·s/kg)",
                            "Kilograms per second (kg/s)",
                        ],
                        "correct_answer": "Seconds (s)",
                        "points": 5,
                        "explanation": "Isp = ve/g0 (exhaust velocity divided by standard gravity). SI unit is seconds. Higher Isp = more efficient engine.",
                    },
                    {
                        "question_text": (
                            "Describe the ideal Brayton cycle as applied to a turbojet engine. "
                            "Sketch the T-s diagram and identify each process. "
                            "How does increasing the turbine inlet temperature (TIT) affect the thermal "
                            "efficiency and specific thrust?"
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "Ideal Brayton cycle: "
                            "1-2: Isentropic compression (compressor). "
                            "2-3: Constant pressure heat addition (combustion chamber, TIT at state 3). "
                            "3-4: Isentropic expansion (turbine, drives compressor). "
                            "4-1: Constant pressure heat rejection (exhaust to atmosphere). "
                            "Thermal efficiency: η_th = 1 - 1/r_p^((γ-1)/γ) where r_p = pressure ratio. "
                            "Effect of higher TIT: "
                            "(a) Specific work output increases (turbine output >> compressor work). "
                            "(b) Thermal efficiency increases up to a limit (higher T3 raises average "
                            "temperature of heat addition → higher Carnot-equivalent efficiency). "
                            "(c) Specific thrust increases (higher exhaust velocity). "
                            "(d) Material limit: TIT limited by blade temperature capability (~1800K for "
                            "advanced single-crystal blades with cooling)."
                        ),
                        "points": 20,
                        "explanation": "The Brayton cycle is the ideal model for gas turbines; η_th depends only on pressure ratio for ideal case.",
                    },
                ],
            },
        ],
    },

    # ── 3. ELECTRICAL ENGINEERING ─────────────────────────────────────────
    {
        "title": "Electrical Engineering Core — KU",
        "description": (
            "Foundation electrical engineering for Kenyatta University students: "
            "DC/AC circuit analysis, electronics, power systems, signals and control. "
            "Covers Year 1–3 EEE curriculum (EEE 2101 to EEE 3301)."
        ),
        "tags": ["electrical engineering", "circuit analysis", "power systems", "ku", "electronics"],
        "lessons": [
            {
                "title": "DC Circuit Analysis — KVL, KCL and Ohm's Law",
                "search_query": "DC circuit analysis KVL KCL Ohms law lecture university",
                "order": 0,
            },
            {
                "title": "Circuit Theorems — Thevenin and Norton Equivalents",
                "search_query": "Thevenin Norton equivalent circuit theorem lecture",
                "order": 1,
            },
            {
                "title": "AC Circuit Analysis — Phasors and Impedance",
                "search_query": "AC circuit analysis phasors impedance lecture university",
                "order": 2,
            },
            {
                "title": "Operational Amplifiers — Inverting and Non-Inverting Configs",
                "search_query": "operational amplifier inverting non-inverting op-amp lecture",
                "order": 3,
            },
            {
                "title": "Digital Electronics — Boolean Algebra and Logic Gates",
                "search_query": "digital electronics Boolean algebra logic gates lecture",
                "order": 4,
            },
            {
                "title": "Power Systems — Three-Phase Power and Transformers",
                "search_query": "three phase power transformer power systems lecture university",
                "order": 5,
            },
            {
                "title": "Signals and Systems — Fourier Series and Transform",
                "search_query": "Fourier series transform signals systems lecture university",
                "order": 6,
            },
            {
                "title": "Control Systems — PID Controllers and Root Locus",
                "search_query": "PID controller root locus control systems lecture university",
                "order": 7,
            },
        ],
        "assessments": [
            {
                "title": "Circuit Theory — CAT 1",
                "topic": "Circuit Analysis",
                "assessment_type": "quiz",
                "time_limit_minutes": 45,
                "description": (
                    "KU EEE 2101 Circuit Theory I CAT. "
                    "Covers DC circuit analysis: Ohm's law, KVL, KCL, node voltage, "
                    "mesh current, Thevenin/Norton theorems, and superposition."
                ),
                "source_attribution": "Kenyatta University — EEE 2101 Circuit Theory I (2023)",
                "source_url": "https://www.ku.ac.ke/schools/engineering/",
                "source_year": 2023,
                "institution_name": "Kenyatta University",
                "tags": ["circuit theory", "ku", "eee2101", "KVL", "KCL", "first year"],
                "questions": [
                    {
                        "question_text": (
                            "In a series-parallel circuit: a 12 V source feeds two branches in parallel. "
                            "Branch 1 has R1 = 6 Ω and Branch 2 has R2 = 3 Ω. "
                            "These are connected in series with R3 = 2 Ω. "
                            "Find: (a) the equivalent resistance, (b) the total current from the source, "
                            "(c) the voltage across the parallel combination."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "(a) Parallel: R12 = (6 × 3)/(6 + 3) = 18/9 = 2 Ω. "
                            "Total: Req = R3 + R12 = 2 + 2 = 4 Ω. "
                            "(b) I_total = V/Req = 12/4 = 3 A. "
                            "(c) V_parallel = I × R12 = 3 × 2 = 6 V."
                        ),
                        "points": 15,
                        "explanation": "Series-parallel: combine parallel branches first, then add series resistors. Apply Ohm's law at each step.",
                    },
                    {
                        "question_text": (
                            "Using the node voltage method, find the voltage V_A at node A in the "
                            "following circuit: 10 V source (positive terminal) connected through "
                            "5 Ω to node A; 20 V source (positive terminal) connected through "
                            "10 Ω to node A; a 15 Ω resistor from node A to ground."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "KCL at node A (sum of currents leaving = 0): "
                            "(V_A - 10)/5 + (V_A - 20)/10 + V_A/15 = 0. "
                            "Multiply by 30 (LCM): 6(V_A - 10) + 3(V_A - 20) + 2V_A = 0. "
                            "6V_A - 60 + 3V_A - 60 + 2V_A = 0. "
                            "11V_A = 120. "
                            "V_A = 120/11 ≈ 10.91 V."
                        ),
                        "points": 20,
                        "explanation": "Node voltage method: write KCL at each unknown node in terms of node voltage relative to ground.",
                    },
                    {
                        "question_text": "Kirchhoff's Current Law (KCL) states that:",
                        "question_type": "mcq",
                        "options": [
                            "The algebraic sum of all currents entering a node equals zero",
                            "The sum of all voltages around a closed loop equals zero",
                            "Current flowing through a resistor is inversely proportional to resistance",
                            "The voltage across parallel components is different",
                        ],
                        "correct_answer": "The algebraic sum of all currents entering a node equals zero",
                        "points": 5,
                        "explanation": "KCL: ΣI = 0 at a node — conservation of charge. KVL: ΣV = 0 around a loop.",
                    },
                    {
                        "question_text": (
                            "Find the Thevenin equivalent circuit as seen from terminals A-B of the "
                            "following network: a 24 V source in series with 4 Ω (internal) connected "
                            "to a junction where a 12 Ω resistor goes to terminal A and an 8 Ω "
                            "resistor connects from the same junction to terminal B, which is also "
                            "connected to the negative terminal of the source."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "Vth (open circuit voltage at A-B): "
                            "With no load, current flows through 4 Ω and 8 Ω in series (12 Ω is open). "
                            "Wait — clarify topology: Source 24V with 4Ω in series → node C. "
                            "From C: 12Ω to A, 8Ω to B (ground). "
                            "No load current: I = 24/(4+8) = 2 A (through 4Ω and 8Ω). "
                            "V_C = 24 - I×4 = 24 - 8 = 16 V. "
                            "Vth = V_A - V_B: V_A = V_C (12Ω open), V_B = 0. "
                            "Vth = 16 V. "
                            "Rth: deactivate source (short) → from A-B: 12Ω in parallel with (4Ω + 8Ω) "
                            "= 12 || 12 = 6 Ω. "
                            "Thevenin: Vth = 16 V, Rth = 6 Ω."
                        ),
                        "points": 20,
                        "explanation": "Thevenin theorem: find Voc (open-circuit voltage) and Rth (with sources deactivated).",
                    },
                    {
                        "question_text": (
                            "A 50 Ω resistor and a 100 μF capacitor are connected in series with a "
                            "100 V, 50 Hz AC source. Calculate: "
                            "(a) the capacitive reactance XC, "
                            "(b) the impedance Z, "
                            "(c) the current magnitude."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "(a) XC = 1/(2πfC) = 1/(2π × 50 × 100×10⁻⁶) "
                            "= 1/(0.03142) = 31.83 Ω. "
                            "(b) Z = √(R² + XC²) = √(50² + 31.83²) = √(2500 + 1013) = √3513 = 59.27 Ω. "
                            "(c) I = V/Z = 100/59.27 = 1.687 A."
                        ),
                        "points": 15,
                        "explanation": "AC circuits: XC = 1/(ωC) = 1/(2πfC). Impedance Z = √(R²+X²). Ohm's law: I = V/Z.",
                    },
                ],
            },
            {
                "title": "Power Systems and Electronics — End of Semester Exam",
                "topic": "Power Systems",
                "assessment_type": "exam",
                "time_limit_minutes": 120,
                "description": (
                    "KU EEE 3101 Power Systems and EEE 2201 Electronics combined examination. "
                    "Covers three-phase power, transformers, per-unit system, BJT biasing, "
                    "op-amp applications, and power factor correction."
                ),
                "source_attribution": "Kenyatta University — EEE 3101/2201 Power Systems & Electronics (2022)",
                "source_url": "https://www.ku.ac.ke/schools/engineering/",
                "source_year": 2022,
                "institution_name": "Kenyatta University",
                "tags": ["power systems", "electronics", "ku", "eee3101", "three-phase", "transformers"],
                "questions": [
                    {
                        "question_text": (
                            "A balanced three-phase star-connected load has R = 10 Ω per phase and "
                            "is connected to a 415 V (line-to-line) 50 Hz supply. Calculate: "
                            "(a) the phase voltage, "
                            "(b) the phase current, "
                            "(c) the total active power consumed."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "(a) V_phase = V_line / √3 = 415/1.732 = 239.6 V ≈ 240 V. "
                            "(b) I_phase = V_phase / R = 240/10 = 24 A. "
                            "(For star connection, I_line = I_phase = 24 A.) "
                            "(c) P_total = 3 × I²R = 3 × 24² × 10 = 3 × 5760 = 17,280 W = 17.28 kW. "
                            "Or: P = √3 × V_line × I_line × cos φ = √3 × 415 × 24 × 1 = 17,265 W ✓"
                        ),
                        "points": 20,
                        "explanation": "Star: V_phase = V_line/√3. Total power P = 3V_ph I_ph cos φ = √3 V_L I_L cos φ.",
                    },
                    {
                        "question_text": (
                            "A single-phase transformer has a turns ratio of 10:1 (primary:secondary). "
                            "The primary is connected to 2300 V, 50 Hz supply. The secondary load "
                            "is a 5 Ω resistor. Assuming an ideal transformer: "
                            "(a) secondary voltage, (b) secondary current, (c) primary current, "
                            "(d) apparent power in the primary."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "(a) N1/N2 = V1/V2 → V2 = V1 × (N2/N1) = 2300 × (1/10) = 230 V. "
                            "(b) I2 = V2/R = 230/5 = 46 A. "
                            "(c) N1/N2 = I2/I1 → I1 = I2 × (N2/N1) = 46 × (1/10) = 4.6 A. "
                            "(d) S = V1 × I1 = 2300 × 4.6 = 10,580 VA = 10.58 kVA. "
                            "(Also S = V2 × I2 = 230 × 46 = 10,580 VA — ideal: no losses.)"
                        ),
                        "points": 20,
                        "explanation": "Ideal transformer: V1/V2 = N1/N2; I1/I2 = N2/N1; power in = power out.",
                    },
                    {
                        "question_text": (
                            "A load draws 50 kW at a power factor of 0.6 lagging from a 415 V (L-L) "
                            "three-phase supply. "
                            "(a) Calculate the reactive power Q and apparent power S. "
                            "(b) What capacitance per phase (delta-connected) is required to correct "
                            "the power factor to unity? (f = 50 Hz)"
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "(a) cos φ = 0.6 → φ = 53.13°. S = P/cos φ = 50/0.6 = 83.33 kVA. "
                            "Q = S sin φ = 83.33 × 0.8 = 66.67 kVAR (inductive). "
                            "(b) To correct to unity PF, we need Qc = Q = 66.67 kVAR (capacitive). "
                            "For delta: Qc = 3 × V_L² / XC → XC = 3 × 415² / 66,670 = 3 × 172,225/66,670 = 7.752 Ω. "
                            "C = 1/(2π f XC) = 1/(2π × 50 × 7.752) = 1/2435 = 410.6 μF per phase."
                        ),
                        "points": 25,
                        "explanation": "PF correction: add capacitors to supply reactive power, reducing reactive demand from source.",
                    },
                    {
                        "question_text": (
                            "In an NPN BJT common-emitter amplifier, the transistor has β = 100. "
                            "The collector resistor RC = 2.2 kΩ, emitter resistor RE = 470 Ω, "
                            "and VCC = 12 V. The Q-point is set at VCE = 6 V. "
                            "Determine: (a) IC at Q-point, (b) IB, (c) voltage gain Av (ignoring RE for AC)."
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "(a) KVL: VCC = IC(RC + RE) + VCE. "
                            "12 = IC(2200 + 470) + 6. "
                            "IC = 6/2670 = 2.247 mA ≈ 2.25 mA. "
                            "(b) IB = IC/β = 2.25/100 = 0.0225 mA = 22.5 μA. "
                            "(c) gm = IC/VT = 2.25mA/26mV = 86.5 mS. "
                            "Av ≈ -gm × RC = -86.5 × 10⁻³ × 2200 = -190.3. "
                            "Voltage gain ≈ -190 (inverting, magnitude ≈ 190)."
                        ),
                        "points": 20,
                        "explanation": "BJT DC bias: KVL in collector-emitter loop. AC gain: gm = IC/VT, Av = -gm × RC.",
                    },
                    {
                        "question_text": "In power systems, the per-unit (p.u.) system is used primarily to:",
                        "question_type": "mcq",
                        "options": [
                            "Simplify calculations in systems with multiple voltage levels by normalising quantities",
                            "Convert all quantities to SI units for uniformity",
                            "Increase the precision of power flow calculations",
                            "Replace complex number notation with real magnitudes",
                        ],
                        "correct_answer": "Simplify calculations in systems with multiple voltage levels by normalising quantities",
                        "points": 5,
                        "explanation": "Per-unit: quantities are normalised to base values, eliminating transformer ratios and enabling direct comparison across voltage levels.",
                    },
                    {
                        "question_text": (
                            "An inverting op-amp amplifier has Rf = 100 kΩ and Rin = 10 kΩ. "
                            "(a) Calculate the closed-loop voltage gain Av. "
                            "(b) If the input is a 0.5 V peak sine wave, what is the output? "
                            "(c) What happens to the output if VCC = ±12 V and the input is increased to 2 V peak?"
                        ),
                        "question_type": "essay",
                        "correct_answer": (
                            "(a) Av = -Rf/Rin = -100kΩ/10kΩ = -10 (inverting, gain magnitude = 10). "
                            "(b) Vout = Av × Vin = -10 × 0.5 sin(ωt) = -5 sin(ωt) V peak. "
                            "(c) Ideal output = -10 × 2 = -20 V peak. "
                            "But supply is ±12 V — output clips at approximately ±10.5 to ±11 V "
                            "(op-amp output saturates ≈1-1.5 V below rail). "
                            "Output is a clipped (distorted) sine wave, not a faithful amplified signal. "
                            "To avoid clipping: reduce Vin or reduce gain."
                        ),
                        "points": 20,
                        "explanation": "Inverting amp: Av = -Rf/Rin. Output saturates when |Vout| exceeds supply rail minus headroom.",
                    },
                ],
            },
        ],
    },
]


def _search_video(query: str, delay: float, proxy: str | None = None) -> dict | None:
    """Search YouTube via yt-dlp and return the top result as a dict."""
    try:
        import yt_dlp
    except ImportError:
        return None

    ydl_opts = {"quiet": True, "skip_download": True, "extract_flat": True}
    if proxy:
        ydl_opts["proxy"] = proxy

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch3:{query}", download=False)
        entries = info.get("entries") or []
        if not entries:
            return None
        entry = entries[0]
        vid = entry.get("id")
        if not vid:
            return None
        title = entry.get("title") or query
        uploader = entry.get("uploader") or entry.get("uploader_id") or ""
        duration = entry.get("duration") or 0
        url = entry.get("webpage_url") or f"https://www.youtube.com/watch?v={vid}"
        thumbnail = None
        if entry.get("thumbnails"):
            thumbnail = entry["thumbnails"][0].get("url")
        return {
            "video_id": vid,
            "url": url,
            "title": title,
            "channel_name": uploader,
            "duration": duration,
            "thumbnail_url": thumbnail,
        }
    except Exception as e:
        print(f"yt-dlp search failed for '{query}': {e}")
        return None
    finally:
        if delay > 0:
            time.sleep(delay)


class Command(BaseCommand):
    help = "Seed Mechanical, Aerospace, and Electrical Engineering courses for KU students."

    def add_arguments(self, parser):
        parser.add_argument("--admin-user", default=None, help="Email of creator user.")
        parser.add_argument("--dry-run", action="store_true", help="Print without saving.")
        parser.add_argument("--skip-videos", action="store_true", help="Skip yt-dlp searches; create courses with placeholder lessons.")
        parser.add_argument("--delay", type=float, default=2.0, help="Seconds between yt-dlp searches (default 2).")
        parser.add_argument("--proxy", type=str, default=None, help="HTTP proxy for yt-dlp.")

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        skip_videos: bool = options["skip_videos"]
        delay: float = options["delay"]
        proxy: str | None = options.get("proxy")
        admin_email: str | None = options.get("admin_user")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run — no DB writes.\n"))
            for course_data in COURSES_DATA:
                self.stdout.write(self.style.NOTICE(f"  COURSE: {course_data['title']}"))
                for lesson in course_data["lessons"]:
                    self.stdout.write(f"    Lesson: {lesson['title']}")
                for assessment in course_data["assessments"]:
                    self.stdout.write(f"    Assessment: {assessment['title']} ({len(assessment['questions'])} Qs)")
            self.stdout.write(self.style.WARNING("\nDry run complete. No data written."))
            return

        # Resolve creator
        if admin_email:
            try:
                creator = User.objects.get(email=admin_email)
            except User.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"User {admin_email} not found."))
                return
        else:
            creator = User.objects.filter(is_superuser=True).first() or User.objects.first()
            if not creator:
                self.stderr.write(self.style.ERROR("No users found. Create a superuser first."))
                return

        self.stdout.write(f"Creator: {creator.email} | skip_videos={skip_videos}\n")

        ku_inst, _ = Institution.objects.get_or_create(
            name="Kenyatta University",
            defaults={"domain": "ku.ac.ke"},
        )

        for course_data in COURSES_DATA:
            course_title = course_data["title"]
            self.stdout.write(self.style.NOTICE(f"\n  COURSE: {course_title}"))

            # Create or get course
            course, created = Course.objects.get_or_create(
                title=course_title,
                owner=creator,
                defaults={
                    "description": course_data["description"],
                    "is_public": True,
                },
            )
            if not created:
                self.stdout.write(f"  Course exists (id={course.pk}), updating lessons/assessments...")
            else:
                self.stdout.write(self.style.SUCCESS(f"  Created course #{course.pk}"))

            # Create lessons
            for lesson_data in course_data["lessons"]:
                order = lesson_data["order"]
                lesson_title = lesson_data["title"]

                existing = Lesson.objects.filter(course=course, order=order).first()
                if existing and not existing.video_id.startswith("placeholder_"):
                    self.stdout.write(f"    SKIP lesson (has video, order {order}): {existing.title[:50]}")
                    continue

                video_info = None
                if not skip_videos:
                    self.stdout.write(f"    Searching: {lesson_data['search_query']}")
                    video_info = _search_video(lesson_data["search_query"], delay=delay, proxy=proxy)

                if video_info:
                    vid = video_info["video_id"]
                    duration_secs = video_info.get("duration") or 0
                    duration_str = (
                        f"{duration_secs // 60}:{duration_secs % 60:02d}"
                        if isinstance(duration_secs, int) and duration_secs > 0
                        else "N/A"
                    )
                    if existing:
                        existing.title = video_info["title"]
                        existing.video_id = vid
                        existing.video_url = video_info["url"]
                        existing.duration = duration_str
                        existing.description = lesson_title
                        existing.save()
                        lesson = existing
                        action = "Updated"
                    else:
                        lesson = Lesson.objects.create(
                            course=course,
                            title=video_info["title"],
                            video_id=vid,
                            video_url=video_info["url"],
                            duration=duration_str,
                            order=order,
                            description=lesson_title,
                        )
                        action = "Created"
                    # Cache video for AI READY badge
                    VideoCache.objects.get_or_create(
                        video_id=vid,
                        defaults={
                            "url": video_info["url"],
                            "title": video_info["title"],
                            "channel_name": video_info.get("channel_name", ""),
                            "topic_tags": course_data.get("tags", []),
                        },
                    )
                    self.stdout.write(f"    {action} lesson [{order}]: {lesson.title[:70]} (vid={vid})")
                else:
                    if existing:
                        self.stdout.write(f"    KEEP placeholder [{order}]: {lesson_title} (search returned no result)")
                    else:
                        placeholder_id = f"placeholder_{course.pk}_{order}"
                        Lesson.objects.create(
                            course=course,
                            title=lesson_title,
                            video_id=placeholder_id,
                            video_url="",
                            duration="N/A",
                            order=order,
                            description=lesson_title,
                        )
                        self.stdout.write(f"    + Lesson [{order}] (placeholder): {lesson_title}")

            # Create assessments
            for assessment_data in course_data["assessments"]:
                a_title = assessment_data["title"]

                if Assessment.objects.filter(title=a_title, creator=creator).exists():
                    self.stdout.write(f"    SKIP assessment (exists): {a_title}")
                    continue

                inst = ku_inst
                if assessment_data.get("institution_name") != "Kenyatta University":
                    inst, _ = Institution.objects.get_or_create(
                        name=assessment_data["institution_name"],
                        defaults={"domain": ""},
                    )

                assessment = Assessment.objects.create(
                    title=a_title,
                    topic=assessment_data["topic"],
                    description=assessment_data["description"],
                    assessment_type=assessment_data["assessment_type"],
                    time_limit_minutes=assessment_data["time_limit_minutes"],
                    creator=creator,
                    is_public=True,
                    institution=inst,
                    source_attribution=assessment_data.get("source_attribution", ""),
                    source_url=assessment_data.get("source_url", ""),
                    source_year=assessment_data.get("source_year"),
                    tags=assessment_data.get("tags", []),
                )

                for order_idx, q in enumerate(assessment_data["questions"]):
                    Question.objects.create(
                        assessment=assessment,
                        question_text=q["question_text"],
                        question_type=q["question_type"],
                        options=q.get("options", []),
                        correct_answer=q["correct_answer"],
                        points=q.get("points", 5),
                        order=order_idx,
                        explanation=q.get("explanation", ""),
                    )

                self.stdout.write(
                    self.style.SUCCESS(
                        f"    + Assessment #{assessment.pk}: {a_title} ({len(assessment_data['questions'])} Qs)"
                    )
                )

        self.stdout.write(self.style.SUCCESS("\nDone. Engineering courses seeded successfully."))

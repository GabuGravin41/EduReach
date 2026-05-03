"""
Expand thin economics courses and seed new ones with full lesson sets + assessments.

Targets:
  - Microeconomics (ACDC / Khan Academy style)
  - Advanced Microeconomics
  - Macroeconomics / Keynesian Economics
  - Production Theory & Industrial Organisation
  - Development Economics
  - International Economics & Trade

Usage:
    python manage.py seed_economics_courses
    python manage.py seed_economics_courses --admin-user admin@example.com
    python manage.py seed_economics_courses --dry-run
    python manage.py seed_economics_courses --skip-videos   # skip yt-dlp, use placeholders
    python manage.py seed_economics_courses --delay 2.0
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
# Course data
# ---------------------------------------------------------------------------

COURSES_DATA = [

    # ── 1. MICROECONOMICS ──────────────────────────────────────────────────
    {
        "title": "Microeconomics — Supply, Demand & Market Structures",
        "description": (
            "A complete introductory microeconomics course covering consumer and producer theory, "
            "market equilibrium, elasticity, perfect competition, monopoly, oligopoly, and game theory. "
            "Suitable for high school, A-Level, and first-year university students."
        ),
        "tags": ["microeconomics", "supply", "demand", "market", "elasticity", "monopoly", "economics"],
        "replace_existing_ids": [7, 11],   # IDs of 1-lesson courses to replace/expand
        "lessons": [
            {"title": "Introduction to Microeconomics — Scarcity, Choice & Opportunity Cost",
             "search_query": "introduction microeconomics scarcity choice opportunity cost lecture", "order": 0},
            {"title": "Demand — The Law of Demand & Demand Curves",
             "search_query": "law of demand demand curve consumer theory economics lecture", "order": 1},
            {"title": "Supply — The Law of Supply & Supply Curves",
             "search_query": "law of supply supply curve producer theory economics lecture", "order": 2},
            {"title": "Market Equilibrium — Price Determination",
             "search_query": "market equilibrium price determination supply demand lecture economics", "order": 3},
            {"title": "Elasticity — Price, Income & Cross Elasticity",
             "search_query": "price elasticity of demand income elasticity cross elasticity economics lecture", "order": 4},
            {"title": "Consumer Theory — Utility, Indifference Curves & Budget Constraint",
             "search_query": "indifference curves budget constraint consumer equilibrium microeconomics lecture", "order": 5},
            {"title": "Producer Theory — Production Functions & Isoquants",
             "search_query": "production function isoquant isocost producer theory microeconomics lecture", "order": 6},
            {"title": "Costs of Production — Fixed, Variable, Marginal & Average Costs",
             "search_query": "costs of production marginal cost average cost economics lecture", "order": 7},
            {"title": "Perfect Competition — Profit Maximisation in the Short & Long Run",
             "search_query": "perfect competition profit maximisation short run long run economics lecture", "order": 8},
            {"title": "Monopoly — Pricing Power & Deadweight Loss",
             "search_query": "monopoly pricing deadweight loss market power microeconomics lecture", "order": 9},
            {"title": "Oligopoly & Game Theory — Nash Equilibrium",
             "search_query": "oligopoly game theory Nash equilibrium prisoner dilemma economics lecture", "order": 10},
            {"title": "Market Failures — Externalities, Public Goods & Information Asymmetry",
             "search_query": "market failure externalities public goods information asymmetry economics lecture", "order": 11},
        ],
        "assessments": [
            {
                "title": "Microeconomics — Supply, Demand & Elasticity Quiz",
                "topic": "Microeconomics",
                "assessment_type": "quiz",
                "time_limit_minutes": 30,
                "description": "Test your understanding of demand, supply, market equilibrium, and elasticity concepts.",
                "source_attribution": "EduReach Microeconomics Series",
                "source_year": 2024,
                "institution_name": "EduReach",
                "tags": ["microeconomics", "supply", "demand", "elasticity", "quiz"],
                "questions": [
                    {
                        "question_text": "Which of the following will cause the demand curve for a normal good to shift to the right?",
                        "question_type": "mcq",
                        "options": [
                            "A decrease in consumer income",
                            "An increase in the price of the good",
                            "An increase in consumer income",
                            "An increase in the price of a complementary good",
                        ],
                        "correct_answer": "An increase in consumer income",
                        "points": 2,
                        "explanation": "For normal goods, demand increases as income rises — the entire curve shifts right.",
                    },
                    {
                        "question_text": "If the price of good X rises from KES 100 to KES 120 and quantity demanded falls from 500 to 400 units, what is the price elasticity of demand?",
                        "question_type": "short_answer",
                        "options": [],
                        "correct_answer": "-1.0",
                        "points": 4,
                        "explanation": "PED = (% change in Qd) / (% change in P) = (−100/500) / (20/100) = −0.2 / 0.2 = −1.0. Unit elastic.",
                    },
                    {
                        "question_text": "The law of supply states that, all else equal:",
                        "question_type": "mcq",
                        "options": [
                            "As price rises, quantity supplied falls",
                            "As price rises, quantity supplied rises",
                            "Supply and price are unrelated",
                            "As income rises, supply increases",
                        ],
                        "correct_answer": "As price rises, quantity supplied rises",
                        "points": 2,
                        "explanation": "Higher prices make production more profitable, incentivising greater supply.",
                    },
                    {
                        "question_text": "At market equilibrium, which of the following is true?",
                        "question_type": "mcq",
                        "options": [
                            "Quantity demanded exceeds quantity supplied",
                            "There is a surplus of goods in the market",
                            "Quantity demanded equals quantity supplied",
                            "The government sets the price",
                        ],
                        "correct_answer": "Quantity demanded equals quantity supplied",
                        "points": 2,
                        "explanation": "Equilibrium is the price at which Qd = Qs — no surplus or shortage.",
                    },
                    {
                        "question_text": "If a 10% rise in income leads to a 15% increase in quantity demanded for a good, the income elasticity of demand is:",
                        "question_type": "short_answer",
                        "options": [],
                        "correct_answer": "1.5",
                        "points": 3,
                        "explanation": "YED = % change in Qd / % change in income = 15% / 10% = 1.5. This is a luxury good (YED > 1).",
                    },
                    {
                        "question_text": "A decrease in the price of a substitute good for Product A will:",
                        "question_type": "mcq",
                        "options": [
                            "Shift the demand curve for Product A to the right",
                            "Shift the demand curve for Product A to the left",
                            "Move along the demand curve for Product A",
                            "Have no effect on Product A",
                        ],
                        "correct_answer": "Shift the demand curve for Product A to the left",
                        "points": 2,
                        "explanation": "A cheaper substitute attracts consumers away from Product A — demand for A falls (left shift).",
                    },
                    {
                        "question_text": "Explain the concept of consumer surplus and illustrate how it changes when the market price falls.",
                        "question_type": "essay",
                        "options": [],
                        "correct_answer": (
                            "Consumer surplus is the difference between what consumers are willing to pay and "
                            "what they actually pay. It is represented by the area below the demand curve and above "
                            "the market price. When price falls, the area increases — existing consumers pay less "
                            "and new consumers enter the market, both adding to consumer surplus."
                        ),
                        "points": 8,
                        "explanation": "Consumer surplus = area of the triangle above the price line and below the demand curve.",
                    },
                ],
            },
            {
                "title": "Market Structures — Perfect Competition to Monopoly",
                "topic": "Microeconomics",
                "assessment_type": "exam",
                "time_limit_minutes": 60,
                "description": "Compare perfect competition, monopolistic competition, oligopoly, and monopoly. Evaluate efficiency and welfare implications.",
                "source_attribution": "EduReach Microeconomics Series",
                "source_year": 2024,
                "institution_name": "EduReach",
                "tags": ["microeconomics", "market structures", "monopoly", "perfect competition", "oligopoly"],
                "questions": [
                    {
                        "question_text": "In perfect competition, a firm is a price taker because:",
                        "question_type": "mcq",
                        "options": [
                            "It has no competitors",
                            "Its output is too small to influence market price",
                            "The government sets the price",
                            "All firms produce differentiated products",
                        ],
                        "correct_answer": "Its output is too small to influence market price",
                        "points": 3,
                        "explanation": "Many identical firms in perfect competition means each is too small to affect price.",
                    },
                    {
                        "question_text": "A monopolist maximises profit where:",
                        "question_type": "mcq",
                        "options": [
                            "Price equals marginal cost",
                            "Marginal revenue equals marginal cost",
                            "Average revenue equals average cost",
                            "Total revenue is maximised",
                        ],
                        "correct_answer": "Marginal revenue equals marginal cost",
                        "points": 3,
                        "explanation": "All profit-maximising firms set MR = MC. For a monopolist, price > MC, creating deadweight loss.",
                    },
                    {
                        "question_text": "Deadweight loss in monopoly arises because:",
                        "question_type": "short_answer",
                        "options": [],
                        "correct_answer": "the monopolist restricts output below the socially optimal level, setting P > MC",
                        "points": 5,
                        "explanation": "Units whose value to consumers exceeds their cost of production are not produced — creating inefficiency.",
                    },
                    {
                        "question_text": "In the kinked demand curve model of oligopoly, prices tend to be sticky because:",
                        "question_type": "mcq",
                        "options": [
                            "Firms always collude on pricing",
                            "A price rise is not followed but a price cut is matched, making demand highly elastic above and inelastic below the current price",
                            "Government regulation prevents price changes",
                            "Demand is perfectly elastic throughout",
                        ],
                        "correct_answer": "A price rise is not followed but a price cut is matched, making demand highly elastic above and inelastic below the current price",
                        "points": 4,
                        "explanation": "The asymmetric response creates a kink, making a wide range of costs consistent with the same profit-maximising price.",
                    },
                    {
                        "question_text": "Using a diagram and economic analysis, compare the long-run equilibrium of a perfectly competitive firm and a monopolistically competitive firm. Which is allocatively efficient? Explain why.",
                        "question_type": "essay",
                        "options": [],
                        "correct_answer": (
                            "Perfect competition long run: P = MC = minimum AC. Allocatively (P = MC) and productively efficient (min AC). "
                            "Monopolistic competition long run: P = AC (normal profit) but P > MC — excess capacity and allocative inefficiency. "
                            "Perfect competition is allocatively efficient; monopolistic competition is not because price exceeds marginal cost."
                        ),
                        "points": 15,
                        "explanation": "Key difference: PC firms face horizontal demand; MC firms face downward-sloping demand → excess capacity theorem.",
                    },
                    {
                        "question_text": "Price discrimination allows a monopolist to capture consumer surplus. True or False?",
                        "question_type": "mcq",
                        "options": ["True", "False"],
                        "correct_answer": "True",
                        "points": 2,
                        "explanation": "By charging different consumers different prices, the monopolist converts consumer surplus into producer surplus (profit).",
                    },
                    {
                        "question_text": (
                            "A firm has the following cost data: Fixed cost = KES 500; Variable cost per unit = KES 20. "
                            "It sells in a competitive market at price = KES 30. "
                            "(a) What is the profit-maximising output? "
                            "(b) What is the total profit at this output if Q = 80 units?"
                        ),
                        "question_type": "short_answer",
                        "options": [],
                        "correct_answer": "MR = MC => 30 = 20 so any Q earns profit. At Q=80: Revenue=2400, TC=500+20*80=2100, Profit=300",
                        "points": 8,
                        "explanation": "In perfect competition P = MR = 30 = MC = 20 at all Q, so firm produces until P < MC; profit = TR − TC = 2400 − 2100 = KES 300.",
                    },
                ],
            },
        ],
    },

    # ── 2. MACROECONOMICS & KEYNESIAN ECONOMICS ────────────────────────────
    {
        "title": "Macroeconomics — GDP, Money, Fiscal & Monetary Policy",
        "description": (
            "Comprehensive macroeconomics course covering national income accounting, the Keynesian model, "
            "aggregate demand and supply, money and banking, fiscal policy, monetary policy, inflation, "
            "unemployment, and international trade. Aligned with university introductory macro curricula."
        ),
        "tags": ["macroeconomics", "gdp", "keynesian", "monetary policy", "fiscal policy", "inflation", "economics"],
        "replace_existing_ids": [6, 12],
        "lessons": [
            {"title": "Introduction to Macroeconomics — GDP & National Income",
             "search_query": "introduction macroeconomics GDP national income accounting lecture", "order": 0},
            {"title": "Measuring GDP — Expenditure, Income & Output Approaches",
             "search_query": "measuring GDP expenditure income output approach lecture economics", "order": 1},
            {"title": "Keynesian Economics — The Aggregate Expenditure Model",
             "search_query": "Keynesian economics aggregate expenditure model multiplier lecture", "order": 2},
            {"title": "Aggregate Demand & Aggregate Supply — AD-AS Model",
             "search_query": "aggregate demand aggregate supply AD AS model macroeconomics lecture", "order": 3},
            {"title": "Fiscal Policy — Government Spending, Taxes & the Multiplier",
             "search_query": "fiscal policy government spending taxes multiplier macroeconomics lecture", "order": 4},
            {"title": "Money & Banking — Money Supply & the Banking System",
             "search_query": "money supply banking system money creation macroeconomics lecture", "order": 5},
            {"title": "Monetary Policy — Interest Rates & Central Banking",
             "search_query": "monetary policy interest rates central bank macroeconomics lecture", "order": 6},
            {"title": "Inflation — Causes, Types & the Phillips Curve",
             "search_query": "inflation causes types Phillips curve macroeconomics lecture", "order": 7},
            {"title": "Unemployment — Types, Measurement & Natural Rate",
             "search_query": "unemployment types measurement natural rate macroeconomics lecture", "order": 8},
            {"title": "Economic Growth — Sources, Models & the Role of Technology",
             "search_query": "economic growth Solow model sources technology productivity lecture", "order": 9},
            {"title": "International Trade & Balance of Payments",
             "search_query": "international trade balance of payments current account macroeconomics lecture", "order": 10},
            {"title": "Exchange Rates — Determination & Policy",
             "search_query": "exchange rates determination fixed floating macroeconomics lecture", "order": 11},
        ],
        "assessments": [
            {
                "title": "Macroeconomics — GDP & National Income Accounting Quiz",
                "topic": "Macroeconomics",
                "assessment_type": "quiz",
                "time_limit_minutes": 25,
                "description": "Test your understanding of GDP measurement, national income, and the circular flow of income.",
                "source_attribution": "EduReach Macroeconomics Series",
                "source_year": 2024,
                "institution_name": "EduReach",
                "tags": ["macroeconomics", "gdp", "national income", "quiz"],
                "questions": [
                    {
                        "question_text": "GDP is best defined as:",
                        "question_type": "mcq",
                        "options": [
                            "The total income of a country's residents regardless of location",
                            "The total market value of all final goods and services produced within a country in a given period",
                            "The total value of goods exported minus goods imported",
                            "The total government expenditure in a fiscal year",
                        ],
                        "correct_answer": "The total market value of all final goods and services produced within a country in a given period",
                        "points": 2,
                        "explanation": "GDP measures domestic production — it's territorial, not nationality-based (that's GNP/GNI).",
                    },
                    {
                        "question_text": "In the expenditure approach, GDP = C + I + G + (X − M). What does (X − M) represent?",
                        "question_type": "short_answer",
                        "options": [],
                        "correct_answer": "Net exports",
                        "points": 2,
                        "explanation": "X = exports, M = imports. Net exports (X − M) adds foreign spending on domestic output and subtracts domestic spending on foreign output.",
                    },
                    {
                        "question_text": "If nominal GDP in 2023 is KES 12 trillion and the GDP deflator is 120 (base year 2020 = 100), what is real GDP?",
                        "question_type": "short_answer",
                        "options": [],
                        "correct_answer": "10 trillion",
                        "points": 4,
                        "explanation": "Real GDP = (Nominal GDP / GDP deflator) × 100 = (12 / 120) × 100 = 10 trillion KES.",
                    },
                    {
                        "question_text": "Which of the following is NOT counted in GDP?",
                        "question_type": "mcq",
                        "options": [
                            "Government spending on public schools",
                            "The purchase of a newly built house",
                            "The resale of a 5-year-old car",
                            "A firm's investment in new machinery",
                        ],
                        "correct_answer": "The resale of a 5-year-old car",
                        "points": 2,
                        "explanation": "GDP counts only new production. Resales transfer existing goods — no new value is created.",
                    },
                    {
                        "question_text": "The Keynesian multiplier is given by 1/(1−MPC). If the MPC is 0.75, what is the multiplier?",
                        "question_type": "short_answer",
                        "options": [],
                        "correct_answer": "4",
                        "points": 3,
                        "explanation": "Multiplier = 1/(1 − 0.75) = 1/0.25 = 4. A KES 1 increase in autonomous spending raises equilibrium GDP by KES 4.",
                    },
                    {
                        "question_text": "Explain the difference between demand-pull and cost-push inflation, giving one real-world example of each.",
                        "question_type": "essay",
                        "options": [],
                        "correct_answer": (
                            "Demand-pull inflation occurs when aggregate demand grows faster than aggregate supply — "
                            "'too much money chasing too few goods.' Example: post-COVID consumer spending surge. "
                            "Cost-push inflation occurs when production costs rise, shifting AS left — higher prices for less output. "
                            "Example: the 1970s oil crisis raising energy costs globally."
                        ),
                        "points": 8,
                        "explanation": "Demand-pull = AD shifts right; Cost-push = AS shifts left. Both raise the price level but have opposite effects on output.",
                    },
                ],
            },
            {
                "title": "Fiscal & Monetary Policy — Tools & Trade-offs",
                "topic": "Macroeconomics",
                "assessment_type": "exam",
                "time_limit_minutes": 60,
                "description": "Evaluate fiscal and monetary policy tools, their effectiveness, and the trade-off between inflation and unemployment.",
                "source_attribution": "EduReach Macroeconomics Series",
                "source_year": 2024,
                "institution_name": "EduReach",
                "tags": ["macroeconomics", "fiscal policy", "monetary policy", "phillips curve", "exam"],
                "questions": [
                    {
                        "question_text": "An expansionary fiscal policy involves:",
                        "question_type": "mcq",
                        "options": [
                            "Raising taxes and cutting government spending",
                            "Cutting taxes and increasing government spending",
                            "Raising interest rates",
                            "Reducing the money supply",
                        ],
                        "correct_answer": "Cutting taxes and increasing government spending",
                        "points": 3,
                        "explanation": "Expansionary fiscal policy boosts aggregate demand by increasing government spending or cutting taxes.",
                    },
                    {
                        "question_text": "Crowding out occurs when:",
                        "question_type": "mcq",
                        "options": [
                            "The government reduces its spending",
                            "Government borrowing raises interest rates, reducing private investment",
                            "The central bank prints money to fund the deficit",
                            "Exports exceed imports",
                        ],
                        "correct_answer": "Government borrowing raises interest rates, reducing private investment",
                        "points": 3,
                        "explanation": "Increased government borrowing competes with private firms for loanable funds, driving up rates and reducing investment.",
                    },
                    {
                        "question_text": "The short-run Phillips curve shows a trade-off between:",
                        "question_type": "short_answer",
                        "options": [],
                        "correct_answer": "inflation and unemployment",
                        "points": 2,
                        "explanation": "Lower unemployment is associated with higher inflation in the short run — the Phillips curve captures this inverse relationship.",
                    },
                    {
                        "question_text": "Which central bank tool directly controls the amount of money commercial banks must hold in reserve?",
                        "question_type": "mcq",
                        "options": [
                            "Open market operations",
                            "Discount rate",
                            "Reserve requirement ratio",
                            "Forward guidance",
                        ],
                        "correct_answer": "Reserve requirement ratio",
                        "points": 3,
                        "explanation": "The reserve requirement ratio specifies the minimum fraction of deposits banks must hold — directly affecting money creation.",
                    },
                    {
                        "question_text": (
                            "An economy is in recession with GDP below potential output. "
                            "Using the AD-AS diagram, explain how an increase in government spending "
                            "can restore the economy to potential output. Discuss one potential drawback of this policy."
                        ),
                        "question_type": "essay",
                        "options": [],
                        "correct_answer": (
                            "Increased government spending shifts AD to the right. In the short run this raises both real GDP and the price level. "
                            "With spare capacity the economy moves toward potential output. "
                            "Drawback: crowding out — government borrowing raises interest rates, reducing private investment; "
                            "or inflationary pressure if the economy overshoots potential output."
                        ),
                        "points": 12,
                        "explanation": "Draw AD₁ shifting to AD₂; show movement from recession equilibrium to potential output on SRAS/LRAS.",
                    },
                    {
                        "question_text": "Quantitative easing (QE) is a monetary policy tool used when:",
                        "question_type": "mcq",
                        "options": [
                            "Interest rates are already at or near zero and further conventional cuts are ineffective",
                            "The economy is growing too fast",
                            "The government wants to reduce public debt",
                            "Inflation is above target",
                        ],
                        "correct_answer": "Interest rates are already at or near zero and further conventional cuts are ineffective",
                        "points": 3,
                        "explanation": "QE (asset purchases by the central bank) is an unconventional tool deployed when the zero lower bound limits traditional rate cuts.",
                    },
                    {
                        "question_text": (
                            "Kenya's central bank raises the Central Bank Rate (CBR) from 10% to 13%. "
                            "Explain the transmission mechanism — how does this affect inflation and real output?"
                        ),
                        "question_type": "essay",
                        "options": [],
                        "correct_answer": (
                            "Higher CBR → commercial banks raise lending rates → borrowing becomes more expensive → "
                            "consumer spending and business investment fall → aggregate demand shifts left → "
                            "both inflation and real output fall in the short run. "
                            "The exchange rate may also appreciate, reducing export competitiveness and net exports, reinforcing the demand fall."
                        ),
                        "points": 10,
                        "explanation": "Monetary transmission: policy rate → market rates → investment and consumption → AD → output and prices.",
                    },
                ],
            },
        ],
    },

    # ── 3. ADVANCED MICROECONOMICS ─────────────────────────────────────────
    {
        "title": "Advanced Microeconomics — Theory & Applications",
        "description": (
            "University-level advanced microeconomics covering general equilibrium, welfare economics, "
            "game theory, mechanism design, asymmetric information, and contract theory. "
            "Intended for second and third-year economics undergraduates and postgraduate students."
        ),
        "tags": ["advanced microeconomics", "game theory", "general equilibrium", "welfare", "asymmetric information"],
        "replace_existing_ids": [9, 10],
        "lessons": [
            {"title": "Consumer Theory — Revealed Preference & Slutsky Decomposition",
             "search_query": "revealed preference Slutsky equation income substitution effect advanced microeconomics", "order": 0},
            {"title": "Producer Theory — Duality, Cost Functions & Shephard's Lemma",
             "search_query": "producer theory duality cost function Shephards lemma advanced microeconomics lecture", "order": 1},
            {"title": "General Equilibrium — Exchange Economies & Walras' Law",
             "search_query": "general equilibrium Walras law exchange economy Edgeworth box microeconomics lecture", "order": 2},
            {"title": "Welfare Economics — Pareto Efficiency & Social Welfare Functions",
             "search_query": "welfare economics Pareto efficiency social welfare function Arrow impossibility lecture", "order": 3},
            {"title": "Game Theory I — Dominant Strategies & Nash Equilibrium",
             "search_query": "game theory dominant strategy Nash equilibrium normal form lecture economics", "order": 4},
            {"title": "Game Theory II — Repeated Games, Subgame Perfect Equilibrium",
             "search_query": "repeated games subgame perfect equilibrium backward induction game theory lecture", "order": 5},
            {"title": "Asymmetric Information — Adverse Selection & Moral Hazard",
             "search_query": "asymmetric information adverse selection moral hazard economics lecture", "order": 6},
            {"title": "Signalling & Screening — Spence Model & Principal-Agent",
             "search_query": "signalling screening Spence model principal agent problem microeconomics lecture", "order": 7},
            {"title": "Auction Theory — First-Price, Second-Price & Revenue Equivalence",
             "search_query": "auction theory first price second price Vickrey revenue equivalence lecture", "order": 8},
            {"title": "Mechanism Design & Incentive Compatibility",
             "search_query": "mechanism design incentive compatibility revelation principle lecture microeconomics", "order": 9},
            {"title": "Externalities & Coase Theorem",
             "search_query": "externalities Coase theorem Pigouvian tax public goods market failure lecture", "order": 10},
            {"title": "Public Choice Theory & Voting Paradoxes",
             "search_query": "public choice theory Condorcet voting paradox median voter theorem lecture", "order": 11},
        ],
        "assessments": [
            {
                "title": "Advanced Microeconomics — Game Theory & Information",
                "topic": "Advanced Microeconomics",
                "assessment_type": "exam",
                "time_limit_minutes": 90,
                "description": "Advanced-level assessment covering game theory, asymmetric information, and contract theory.",
                "source_attribution": "EduReach Advanced Economics Series",
                "source_year": 2024,
                "institution_name": "EduReach",
                "tags": ["advanced microeconomics", "game theory", "Nash equilibrium", "asymmetric information"],
                "questions": [
                    {
                        "question_text": (
                            "Consider the following normal-form game:\n\n"
                            "|  | L | R |\n|--|--|--|\n| U | 3,2 | 1,1 |\n| D | 0,0 | 2,3 |\n\n"
                            "Find all pure-strategy Nash equilibria."
                        ),
                        "question_type": "short_answer",
                        "options": [],
                        "correct_answer": "(U, L) and (D, R)",
                        "points": 8,
                        "explanation": "(U,L): Player 1 prefers U (3>0), Player 2 prefers L (2>1) — both best responding. (D,R): Player 1 prefers D (2>1), Player 2 prefers R (3>0) — both best responding.",
                    },
                    {
                        "question_text": "Adverse selection arises in insurance markets because:",
                        "question_type": "mcq",
                        "options": [
                            "Insurance companies charge too much",
                            "High-risk individuals are more likely to purchase insurance at the average price, making the pool riskier",
                            "Low-risk individuals over-insure themselves",
                            "The government does not regulate the insurance market",
                        ],
                        "correct_answer": "High-risk individuals are more likely to purchase insurance at the average price, making the pool riskier",
                        "points": 4,
                        "explanation": "Insurers cannot distinguish risk types ex-ante; at the average price high-risk types self-select in, raising expected costs above the premium.",
                    },
                    {
                        "question_text": "The Revelation Principle states that:",
                        "question_type": "mcq",
                        "options": [
                            "Any Bayesian Nash equilibrium can be replicated by a direct incentive-compatible mechanism",
                            "Players always reveal their true types in equilibrium",
                            "Mechanism design is only possible with complete information",
                            "Social welfare functions must be continuous",
                        ],
                        "correct_answer": "Any Bayesian Nash equilibrium can be replicated by a direct incentive-compatible mechanism",
                        "points": 4,
                        "explanation": "The Revelation Principle allows restriction to truthful direct mechanisms without loss of generality.",
                    },
                    {
                        "question_text": (
                            "Explain the concept of moral hazard using an example from health insurance. "
                            "Discuss one policy mechanism that can mitigate moral hazard."
                        ),
                        "question_type": "essay",
                        "options": [],
                        "correct_answer": (
                            "Moral hazard: after purchasing health insurance individuals may engage in riskier behaviour "
                            "or over-consume medical services because they bear less of the cost. Example: insured patients "
                            "request more tests and treatments than they would if paying out-of-pocket. "
                            "Mitigation: co-payments or deductibles require the insured to bear some cost, restoring some incentive for prudent behaviour."
                        ),
                        "points": 12,
                        "explanation": "Moral hazard = hidden action after the contract is signed. Mitigation aligns incentives through partial cost-sharing.",
                    },
                    {
                        "question_text": "In a second-price (Vickrey) auction, the dominant strategy for each bidder is to:",
                        "question_type": "short_answer",
                        "options": [],
                        "correct_answer": "bid their true valuation",
                        "points": 4,
                        "explanation": "Because you pay the second-highest bid, not your own, bidding your true value is weakly dominant — no incentive to shade your bid.",
                    },
                    {
                        "question_text": (
                            "Two firms compete à la Cournot in a market with inverse demand P = 100 − Q, where Q = q₁ + q₂. "
                            "Each firm has constant marginal cost c = 10 and zero fixed costs. "
                            "Derive the Nash equilibrium quantities and market price."
                        ),
                        "question_type": "essay",
                        "options": [],
                        "correct_answer": (
                            "Firm 1 maximises: π₁ = (100 − q₁ − q₂ − 10)q₁. FOC: 90 − 2q₁ − q₂ = 0 → q₁ = (90 − q₂)/2. "
                            "By symmetry q₂ = (90 − q₁)/2. Solving: q₁* = q₂* = 30. Q* = 60. P* = 100 − 60 = 40."
                        ),
                        "points": 15,
                        "explanation": "Cournot NE: each firm's best response intersects the other's. Symmetric case gives q* = (a − c)/(3b) when demand is P = a − bQ.",
                    },
                ],
            },
        ],
    },

    # ── 4. DEVELOPMENT ECONOMICS ───────────────────────────────────────────
    {
        "title": "Development Economics — Poverty, Growth & Policy",
        "description": (
            "An applied development economics course examining the causes of poverty, inequality, and underdevelopment. "
            "Topics include growth theories, structural transformation, human capital, microfinance, foreign aid, "
            "and development policy in Africa and the Global South."
        ),
        "tags": ["development economics", "poverty", "inequality", "growth", "africa", "policy"],
        "lessons": [
            {"title": "What is Development Economics? Key Concepts & Measures",
             "search_query": "development economics introduction poverty GDP HDI lecture", "order": 0},
            {"title": "Poverty Measurement — Absolute, Relative & Multidimensional Poverty",
             "search_query": "poverty measurement absolute relative multidimensional poverty index lecture", "order": 1},
            {"title": "Inequality — Gini Coefficient, Lorenz Curve & Kuznets Curve",
             "search_query": "inequality Gini coefficient Lorenz curve Kuznets curve development economics lecture", "order": 2},
            {"title": "Classical Growth Theory — Harrod-Domar & Solow Model",
             "search_query": "Harrod Domar Solow growth model development economics lecture", "order": 3},
            {"title": "Structural Transformation — Lewis Model & Industrialisation",
             "search_query": "Lewis model structural transformation dual economy development economics lecture", "order": 4},
            {"title": "Human Capital — Education, Health & the Returns to Schooling",
             "search_query": "human capital education health returns schooling development economics lecture", "order": 5},
            {"title": "Agriculture & Rural Development in Sub-Saharan Africa",
             "search_query": "agriculture rural development Sub-Saharan Africa smallholder farmers economics lecture", "order": 6},
            {"title": "Microfinance & Financial Inclusion",
             "search_query": "microfinance financial inclusion Grameen Bank M-Pesa development economics lecture", "order": 7},
            {"title": "Foreign Aid — Effectiveness, Debates & Conditionality",
             "search_query": "foreign aid effectiveness Sachs Easterly debates conditionality development lecture", "order": 8},
            {"title": "Institutions & Governance — Why Nations Fail",
             "search_query": "institutions governance Why Nations Fail Acemoglu Robinson development economics lecture", "order": 9},
        ],
        "assessments": [
            {
                "title": "Development Economics — Poverty & Growth Concepts",
                "topic": "Development Economics",
                "assessment_type": "quiz",
                "time_limit_minutes": 35,
                "description": "Test your understanding of poverty measurement, growth theories, and development policy.",
                "source_attribution": "EduReach Economics Series",
                "source_year": 2024,
                "institution_name": "EduReach",
                "tags": ["development economics", "poverty", "growth", "Africa", "quiz"],
                "questions": [
                    {
                        "question_text": "The Human Development Index (HDI) measures development using three dimensions. Which of the following correctly lists them?",
                        "question_type": "mcq",
                        "options": [
                            "GDP per capita, literacy rate, and life expectancy",
                            "Life expectancy, education (mean & expected years of schooling), and GNI per capita",
                            "Poverty rate, employment rate, and health spending",
                            "Trade openness, governance, and population growth",
                        ],
                        "correct_answer": "Life expectancy, education (mean & expected years of schooling), and GNI per capita",
                        "points": 3,
                        "explanation": "UNDP's HDI combines health (life expectancy), education (schooling), and living standards (GNI per capita).",
                    },
                    {
                        "question_text": "In the Solow growth model, the steady state is characterised by:",
                        "question_type": "mcq",
                        "options": [
                            "Zero GDP growth",
                            "Investment exactly replacing depreciation plus population growth",
                            "Constant consumption per worker and zero savings",
                            "Declining capital stock",
                        ],
                        "correct_answer": "Investment exactly replacing depreciation plus population growth",
                        "points": 3,
                        "explanation": "At steady state: Δk = 0 → sf(k) = (δ + n)k. Investment per worker covers depreciation and capital-widening for new workers.",
                    },
                    {
                        "question_text": "M-Pesa in Kenya is cited as an example of financial inclusion because:",
                        "question_type": "mcq",
                        "options": [
                            "It provides mortgage loans to rural households",
                            "It allows previously unbanked individuals to send, receive, and save money via mobile phone",
                            "It is a government-run savings scheme",
                            "It provides foreign exchange services to businesses",
                        ],
                        "correct_answer": "It allows previously unbanked individuals to send, receive, and save money via mobile phone",
                        "points": 2,
                        "explanation": "M-Pesa dramatically expanded financial access in Kenya, particularly for low-income and rural households without bank accounts.",
                    },
                    {
                        "question_text": "The Gini coefficient ranges from 0 to 1. A Gini coefficient of 0 means:",
                        "question_type": "short_answer",
                        "options": [],
                        "correct_answer": "perfect equality",
                        "points": 2,
                        "explanation": "Gini = 0 → perfect equality (everyone has the same income). Gini = 1 → maximum inequality (one person has all income).",
                    },
                    {
                        "question_text": "Critically evaluate the effectiveness of foreign aid as a tool for promoting economic development in Sub-Saharan Africa.",
                        "question_type": "essay",
                        "options": [],
                        "correct_answer": (
                            "Proponents (Sachs): aid fills the savings gap, funds infrastructure, health, and education — enabling growth. "
                            "Critics (Easterly, Moyo): aid creates dependency, undermines local institutions, is poorly targeted, and may crowd out domestic investment. "
                            "Evidence is mixed: some targeted programmes (vaccination, bed nets) show strong returns; budget support aid shows weaker effects. "
                            "Conclusion: effectiveness depends on institutional quality, conditionality design, and type of aid."
                        ),
                        "points": 12,
                        "explanation": "Good answers reference the Sachs-Easterly debate, provide evidence from African cases, and discuss conditionality and governance.",
                    },
                ],
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Shared video-search helper (identical to seed_engineering_courses.py)
# ---------------------------------------------------------------------------

def _search_video(query: str, delay: float, proxy: str | None = None) -> dict | None:
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
            "video_id": vid, "url": url, "title": title,
            "channel_name": uploader, "duration": duration, "thumbnail_url": thumbnail,
        }
    except Exception as e:
        print(f"yt-dlp search failed for '{query}': {e}")
        return None
    finally:
        if delay > 0:
            time.sleep(delay)


# ---------------------------------------------------------------------------
# Management command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = "Expand economics courses (micro, macro, advanced, development) with full lesson sets and assessments."

    def add_arguments(self, parser):
        parser.add_argument("--admin-user", default=None, help="Email of creator user.")
        parser.add_argument("--dry-run", action="store_true", help="Print plan without saving.")
        parser.add_argument("--skip-videos", action="store_true", help="Skip yt-dlp; use placeholder video IDs.")
        parser.add_argument("--delay", type=float, default=2.0, help="Seconds between yt-dlp searches.")
        parser.add_argument("--proxy", type=str, default=None)

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        skip_videos: bool = options["skip_videos"]
        delay: float = options["delay"]
        proxy: str | None = options.get("proxy")
        admin_email: str | None = options.get("admin_user")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run — no DB writes.\n"))
            for cd in COURSES_DATA:
                self.stdout.write(self.style.NOTICE(f"  COURSE: {cd['title']} ({len(cd['lessons'])} lessons)"))
                for a in cd["assessments"]:
                    self.stdout.write(f"    Assessment: {a['title']} ({len(a['questions'])} Qs)")
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
                self.stderr.write(self.style.ERROR("No users found."))
                return

        self.stdout.write(f"Creator: {creator.email} | skip_videos={skip_videos}\n")

        edureach_inst, _ = Institution.objects.get_or_create(
            name="EduReach", defaults={"domain": "edureach.site"}
        )

        for course_data in COURSES_DATA:
            course_title = course_data["title"]
            self.stdout.write(self.style.NOTICE(f"\n  COURSE: {course_title}"))

            # If this course replaces/expands existing thin courses, delete the old ones first
            replace_ids = course_data.get("replace_existing_ids", [])
            if replace_ids:
                deleted = Course.objects.filter(id__in=replace_ids).delete()
                if deleted[0]:
                    self.stdout.write(f"  Removed {deleted[0]} old thin course(s): IDs {replace_ids}")

            # Create or get course
            course, created = Course.objects.get_or_create(
                title=course_title,
                owner=creator,
                defaults={"description": course_data["description"], "is_public": True},
            )
            if not created:
                self.stdout.write(f"  Course exists (id={course.pk}), updating...")
            else:
                self.stdout.write(self.style.SUCCESS(f"  Created course #{course.pk}"))

            # ── Lessons ──────────────────────────────────────────────────
            for lesson_data in course_data["lessons"]:
                order = lesson_data["order"]
                lesson_title = lesson_data["title"]

                existing = Lesson.objects.filter(course=course, order=order).first()
                if existing and not existing.video_id.startswith("placeholder_"):
                    self.stdout.write(f"    SKIP [{order}] (has video): {existing.title[:60]}")
                    continue

                video_info = None
                if not skip_videos:
                    self.stdout.write(f"    Searching [{order}]: {lesson_data['search_query'][:70]}")
                    video_info = _search_video(lesson_data["search_query"], delay=delay, proxy=proxy)

                if video_info:
                    vid = video_info["video_id"]
                    dur = video_info.get("duration") or 0
                    dur_str = f"{dur // 60}:{dur % 60:02d}" if isinstance(dur, int) and dur > 0 else "N/A"
                    if existing:
                        existing.title = video_info["title"]
                        existing.video_id = vid
                        existing.video_url = video_info["url"]
                        existing.duration = dur_str
                        existing.description = lesson_title
                        existing.save()
                        action = "Updated"
                    else:
                        existing = Lesson.objects.create(
                            course=course, title=video_info["title"], video_id=vid,
                            video_url=video_info["url"], duration=dur_str,
                            order=order, description=lesson_title,
                        )
                        action = "Created"
                    VideoCache.objects.get_or_create(
                        video_id=vid,
                        defaults={
                            "url": video_info["url"], "title": video_info["title"],
                            "channel_name": video_info.get("channel_name", ""),
                            "topic_tags": course_data.get("tags", []),
                        },
                    )
                    self.stdout.write(f"    {action} [{order}]: {video_info['title'][:60]} ({vid})")
                else:
                    placeholder_id = f"placeholder_{course.pk}_{order}"
                    if existing:
                        existing.video_id = placeholder_id
                        existing.save()
                    else:
                        Lesson.objects.create(
                            course=course, title=lesson_title, video_id=placeholder_id,
                            video_url="", duration="N/A", order=order, description=lesson_title,
                        )
                    self.stdout.write(f"    PLACEHOLDER [{order}]: {lesson_title[:60]}")

            # ── Assessments ───────────────────────────────────────────────
            for asmnt_data in course_data["assessments"]:
                asmnt_title = asmnt_data["title"]
                if Assessment.objects.filter(title=asmnt_title).exists():
                    self.stdout.write(f"  SKIP assessment (exists): {asmnt_title}")
                    continue

                assessment = Assessment.objects.create(
                    title=asmnt_title,
                    topic=asmnt_data["topic"],
                    description=asmnt_data.get("description", ""),
                    assessment_type=asmnt_data.get("assessment_type", "exam"),
                    time_limit_minutes=asmnt_data.get("time_limit_minutes", 60),
                    is_public=True,
                    creator=creator,
                    source_attribution=asmnt_data.get("source_attribution", ""),
                    source_url=asmnt_data.get("source_url", ""),
                    source_year=asmnt_data.get("source_year"),
                    tags=asmnt_data.get("tags", []),
                    difficulty_level=asmnt_data.get("difficulty_level", "intermediate"),
                )
                self.stdout.write(self.style.SUCCESS(f"  CREATE assessment #{assessment.pk}: {asmnt_title}"))

                for idx, q_data in enumerate(asmnt_data["questions"]):
                    q_type_map = {"mcq": "mcq", "essay": "essay", "short_answer": "short_answer", "true_false": "true_false"}
                    q_type = q_type_map.get(q_data.get("question_type", "mcq"), "mcq")
                    options = q_data.get("options", [])
                    correct = q_data.get("correct_answer", "")

                    Question.objects.create(
                        assessment=assessment,
                        question_text=q_data["question_text"],
                        question_type=q_type,
                        options=options,
                        correct_answer=correct,
                        points=q_data.get("points", 5),
                        explanation=q_data.get("explanation", ""),
                        order=idx,
                        ai_grading_enabled=(q_type in ("essay", "short_answer")),
                        model_solution=q_data.get("correct_answer", "") if q_type == "essay" else "",
                    )
                self.stdout.write(f"    {len(asmnt_data['questions'])} questions created.")

        self.stdout.write(self.style.SUCCESS("\n✓ Economics courses seeded successfully."))

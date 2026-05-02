"""
Seed real Kenyan university Economics past paper assessments.

Content based on:
  - Kenyatta University EET301 (Macroeconomics II), EET101 (Introduction to Economics)
  - University of Nairobi ECO101/201 (Microeconomics/Macroeconomics)
  - Standard Kenyan undergraduate economics curriculum

Usage:
    python manage.py seed_economics
    python manage.py seed_economics --admin-user admin@example.com
    python manage.py seed_economics --dry-run
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from assessments.models import Assessment, Question
from users.models import Institution

User = get_user_model()

PAPERS = [
    {
        "title": "Macroeconomics II — End of Semester Exam",
        "topic": "Macroeconomics",
        "assessment_type": "exam",
        "time_limit_minutes": 120,
        "description": (
            "KU EET301 Macroeconomics II final exam. Covers national income determination, "
            "IS-LM framework, monetary policy transmission, open-economy macroeconomics "
            "(Mundell-Fleming), and economic growth models (Solow). Typical 5-question structure "
            "drawn from 2018-2023 Kenyatta University Engineering Economics papers."
        ),
        "source_attribution": "Kenyatta University — Faculty of Engineering, EET301 (2022)",
        "source_url": "https://www.ku.ac.ke/schools/engineering/",
        "source_year": 2022,
        "institution_name": "Kenyatta University",
        "tags": ["macroeconomics", "ku", "university", "eet301", "engineering economics", "2022"],
        "questions": [
            {
                "question_text": (
                    "Using the Keynesian Cross model, explain the concept of the "
                    "expenditure multiplier. If the marginal propensity to consume (MPC) is 0.8 "
                    "and the government increases spending by KSh 10 billion, what is the total "
                    "change in equilibrium national income? Show your working."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Multiplier = 1/(1-MPC) = 1/(1-0.8) = 5. "
                    "Change in income = 5 × 10bn = KSh 50 billion. "
                    "The multiplier arises because each round of spending becomes income for "
                    "others who then spend a fraction (MPC) of it, creating a chain reaction."
                ),
                "points": 20,
                "explanation": (
                    "The Keynesian multiplier captures how an initial injection of spending "
                    "is amplified through successive rounds of consumption. "
                    "Formula: k = 1/(1-MPC) = 1/MPS."
                ),
            },
            {
                "question_text": (
                    "With the aid of a clearly labelled diagram, derive the IS curve. "
                    "Explain why the IS curve slopes downward and identify THREE factors "
                    "that would cause it to shift to the right."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "IS curve: derived from goods market equilibrium Y = C + I + G. "
                    "Lower interest rates → higher investment → higher output → downward slope. "
                    "Right shifts: (1) increase in government spending, "
                    "(2) increase in autonomous consumption/consumer confidence, "
                    "(3) decrease in taxes (T↓ → C↑ → Y↑)."
                ),
                "points": 20,
                "explanation": (
                    "The IS (Investment-Savings) curve shows combinations of interest rate and "
                    "output where the goods market is in equilibrium."
                ),
            },
            {
                "question_text": (
                    "Describe the monetary transmission mechanism in Kenya. "
                    "Starting from a Central Bank of Kenya (CBK) policy rate cut, trace "
                    "the chain of effects through to the final impact on aggregate demand. "
                    "Why might this transmission be weak in a developing economy like Kenya?"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "CBK rate cut → commercial banks lower lending rates → investment and "
                    "consumption credit becomes cheaper → AD increases → output and employment rise. "
                    "Weak transmission reasons in Kenya: (1) high proportion of informal sector "
                    "with no access to bank credit, (2) banks hold excess liquidity, "
                    "(3) high non-performing loan ratios make banks risk-averse, "
                    "(4) shallow capital markets limit investment financing channels."
                ),
                "points": 20,
                "explanation": (
                    "Monetary transmission in developing economies is often impaired by "
                    "financial inclusion gaps and structural features of the banking sector."
                ),
            },
            {
                "question_text": (
                    "In the context of the Mundell-Fleming model under a floating exchange rate, "
                    "analyse the effectiveness of fiscal policy versus monetary policy. "
                    "How does Kenya's managed float exchange rate regime affect this analysis?"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Under floating rates with perfect capital mobility: "
                    "Fiscal policy is INEFFECTIVE (crowding out via exchange rate appreciation). "
                    "Monetary policy is EFFECTIVE (depreciation boosts net exports). "
                    "Kenya's managed float introduces partial sterilisation of capital flows by CBK, "
                    "so outcomes lie between the pure floating and fixed rate extremes — "
                    "fiscal policy has some effect, monetary policy is partially effective."
                ),
                "points": 20,
                "explanation": (
                    "The Mundell-Fleming model is the open-economy extension of IS-LM. "
                    "Policy effectiveness depends critically on the exchange rate regime."
                ),
            },
            {
                "question_text": (
                    "Using the Solow growth model, explain the concept of the steady state. "
                    "Show graphically how an increase in the savings rate affects: "
                    "(a) capital per worker, (b) output per worker, and (c) consumption per worker "
                    "in the long run. What is the 'Golden Rule' level of capital accumulation?"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Steady state: sf(k) = (δ+n)k where s=savings rate, δ=depreciation, n=population growth. "
                    "Higher savings rate → shifts sf(k) upward → new higher steady-state k* and y*. "
                    "Consumption in SS: c* = f(k*) - (δ+n)k*. "
                    "Higher s initially raises c* but too high s reduces c* (over-saving). "
                    "Golden Rule: MPK = δ+n, maximises steady-state consumption per worker."
                ),
                "points": 20,
                "explanation": (
                    "The Solow model predicts conditional convergence — countries converge to "
                    "their own steady state determined by savings, population growth and technology."
                ),
            },
        ],
    },
    {
        "title": "Introduction to Economics — CAT 1",
        "topic": "Microeconomics",
        "assessment_type": "quiz",
        "time_limit_minutes": 45,
        "description": (
            "EET101 / ECO101 style Continuous Assessment Test. Covers fundamental microeconomics: "
            "supply and demand, elasticity, consumer theory, and market structures. "
            "Suitable for first-year university students."
        ),
        "source_attribution": "Kenyatta University — EET101 / UoN ECO101 (2023)",
        "source_url": "https://www.ku.ac.ke/schools/engineering/",
        "source_year": 2023,
        "institution_name": "Kenyatta University",
        "tags": ["microeconomics", "ku", "university", "eet101", "first year", "2023"],
        "questions": [
            {
                "question_text": "Which of the following best defines 'scarcity' in economics?",
                "question_type": "mcq",
                "options": [
                    "The condition that results from society not having enough resources to produce all the things people would like to have",
                    "A situation where goods are not available in the market",
                    "The shortage of money in the economy",
                    "A lack of natural resources in a country",
                ],
                "correct_answer": "The condition that results from society not having enough resources to produce all the things people would like to have",
                "points": 2,
                "explanation": "Scarcity is the fundamental economic problem — unlimited wants vs limited resources.",
            },
            {
                "question_text": (
                    "If the price of maize increases from KSh 50 to KSh 55 per kg and quantity demanded "
                    "falls from 1000 kg to 900 kg, what is the price elasticity of demand?"
                ),
                "question_type": "mcq",
                "options": ["-1.0", "-0.5", "-2.0", "-1.5"],
                "correct_answer": "-1.0",
                "points": 3,
                "explanation": (
                    "PED = (% change in Qd) / (% change in P) = "
                    "((900-1000)/1000) / ((55-50)/50) = (-0.1) / (0.1) = -1.0. "
                    "Unit elastic demand."
                ),
            },
            {
                "question_text": (
                    "A firm in perfect competition is a 'price taker'. "
                    "Which of the following correctly explains why?"
                ),
                "question_type": "mcq",
                "options": [
                    "There are many firms selling identical products so no single firm can influence market price",
                    "The government sets a fixed price for all firms",
                    "The firm has a dominant market share and sets the price for others",
                    "Entry barriers prevent new firms from undercutting the price",
                ],
                "correct_answer": "There are many firms selling identical products so no single firm can influence market price",
                "points": 2,
                "explanation": "In perfect competition: many buyers and sellers, homogeneous product, free entry/exit — no market power.",
            },
            {
                "question_text": (
                    "The cross-price elasticity of demand between butter and margarine is expected to be:"
                ),
                "question_type": "mcq",
                "options": [
                    "Positive, because they are substitutes",
                    "Negative, because they are complements",
                    "Zero, because they are unrelated goods",
                    "Negative, because demand for butter rises when margarine price falls",
                ],
                "correct_answer": "Positive, because they are substitutes",
                "points": 2,
                "explanation": (
                    "Substitutes have positive cross-price elasticity: when the price of margarine rises, "
                    "consumers switch to butter (demand for butter increases)."
                ),
            },
            {
                "question_text": "The law of diminishing marginal utility states that:",
                "question_type": "mcq",
                "options": [
                    "As consumption of a good increases, the additional satisfaction from each extra unit eventually declines",
                    "Total utility always decreases as consumption increases",
                    "Price and utility are always inversely related",
                    "A consumer will stop buying a good once total utility reaches its maximum",
                ],
                "correct_answer": "As consumption of a good increases, the additional satisfaction from each extra unit eventually declines",
                "points": 2,
                "explanation": (
                    "The law of diminishing MU is the foundation of the downward-sloping demand curve. "
                    "Total utility can still rise while MU declines."
                ),
            },
            {
                "question_text": (
                    "In a monopoly market, compared to a perfectly competitive market with the same costs, "
                    "the monopolist will produce:"
                ),
                "question_type": "mcq",
                "options": [
                    "A lower quantity at a higher price",
                    "A higher quantity at a lower price",
                    "The same quantity at the same price",
                    "A lower quantity at a lower price",
                ],
                "correct_answer": "A lower quantity at a higher price",
                "points": 2,
                "explanation": (
                    "A monopolist restricts output to where MR = MC (below the competitive level) "
                    "and charges a higher price due to market power, resulting in deadweight loss."
                ),
            },
            {
                "question_text": "An inferior good is one for which demand:",
                "question_type": "mcq",
                "options": [
                    "Decreases as consumer income increases",
                    "Increases as the price rises",
                    "Decreases as the price falls",
                    "Increases as consumer income increases",
                ],
                "correct_answer": "Decreases as consumer income increases",
                "points": 2,
                "explanation": (
                    "Inferior goods have a negative income elasticity of demand. "
                    "Example: low-quality staples replaced by superior goods as income rises."
                ),
            },
            {
                "question_text": (
                    "The opportunity cost of a student attending university full-time "
                    "for one year is BEST described as:"
                ),
                "question_type": "mcq",
                "options": [
                    "The value of the next-best alternative forgone (e.g. income from full-time work)",
                    "The tuition fees paid to the university",
                    "The total cost of living expenses while studying",
                    "The potential salary the student will earn after graduating",
                ],
                "correct_answer": "The value of the next-best alternative forgone (e.g. income from full-time work)",
                "points": 2,
                "explanation": (
                    "Opportunity cost is the value of the best alternative given up. "
                    "It includes both explicit and implicit costs."
                ),
            },
        ],
    },
    {
        "title": "Public Finance & Development Economics — Exam",
        "topic": "Development Economics",
        "assessment_type": "exam",
        "time_limit_minutes": 120,
        "description": (
            "Covers Kenya's public finance framework, fiscal policy, national debt management, "
            "taxation theory, and development economics concepts. Based on ECO 302 / EET 401 "
            "content at Kenyan universities. Examinee expected to apply theory to Kenyan context."
        ),
        "source_attribution": "University of Nairobi — ECO302 Public Finance (2021)",
        "source_url": "https://www.uonbi.ac.ke/academics/faculties/arts",
        "source_year": 2021,
        "institution_name": "University of Nairobi",
        "tags": ["development economics", "uon", "university", "eco302", "public finance", "kenya", "2021"],
        "questions": [
            {
                "question_text": (
                    "Distinguish between a budget deficit and the national debt. "
                    "Using Kenya as a case study, explain THREE negative macroeconomic consequences "
                    "of persistently high public debt. What debt sustainability thresholds are "
                    "recognised under IMF/World Bank guidelines?"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Budget deficit: excess of government expenditure over revenue in ONE fiscal year. "
                    "National debt: CUMULATIVE stock of all past deficits (minus surpluses). "
                    "Kenya consequences: (1) Crowding out — government borrowing raises interest rates, "
                    "reducing private investment; (2) Debt servicing burden consumes large share of "
                    "revenue (Kenya: ~50% in 2023); (3) Exchange rate pressure as external debt "
                    "repayments require foreign currency. "
                    "IMF/World Bank: debt-to-GDP < 50-55% for low-income countries; "
                    "Kenya exceeded 65% GDP by 2023, classified high-risk."
                ),
                "points": 20,
                "explanation": (
                    "Kenya's public debt rose from 42% GDP (2013) to over 65% GDP (2023), "
                    "making debt sustainability a central policy challenge."
                ),
            },
            {
                "question_text": (
                    "Explain the 'Wagner's Law' of public expenditure. "
                    "To what extent does Kenya's experience since independence support or "
                    "contradict this law? Provide statistical evidence in your answer."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Wagner's Law: as per-capita income rises, the share of public expenditure "
                    "in GDP increases (income elasticity of demand for public goods > 1). "
                    "Kenya evidence: GDP per capita rose from ~$200 (1963) to ~$2,000 (2023). "
                    "Government expenditure as % of GDP rose from ~15% to ~25-30% over same period. "
                    "However, much of Kenya's expenditure growth was driven by debt-financed "
                    "infrastructure, not necessarily rising citizen demand — mixed support for Wagner."
                ),
                "points": 20,
                "explanation": (
                    "Wagner's Law is empirically tested by regressing (log of) public expenditure "
                    "share on (log of) per-capita income — coefficient > 1 supports the law."
                ),
            },
            {
                "question_text": (
                    "Compare and contrast the Harrod-Domar and Solow-Swan models of economic growth. "
                    "What are the policy implications for a developing country like Kenya "
                    "in terms of (a) capital accumulation, (b) savings mobilisation, and "
                    "(c) the role of foreign aid and FDI?"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Harrod-Domar: growth = s/v (savings rate divided by capital-output ratio). "
                    "Implies: more savings → more growth, diminishing returns NOT assumed. "
                    "Solow: adds labour and technology; in SS, growth depends only on tech progress. "
                    "Policy for Kenya: "
                    "(a) Capital: Solow says K accumulation only raises level, not long-run growth rate — "
                    "need TFP improvements (education, technology transfer). "
                    "(b) Savings: H-D justifies aid-financed investment to fill savings gap; "
                    "Solow says effect is temporary. "
                    "(c) FDI/Aid: can jump-start K accumulation and bring technology spillovers."
                ),
                "points": 20,
                "explanation": (
                    "The Harrod-Domar model underpinned early development finance theories and "
                    "justified foreign aid as a means to fill the 'savings gap'."
                ),
            },
            {
                "question_text": (
                    "What is the 'Dutch Disease'? Analyse how a major discovery of oil or minerals "
                    "in Kenya could affect: (a) the exchange rate, (b) the manufacturing sector, "
                    "and (c) the agricultural sector. What policies can mitigate Dutch Disease?"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Dutch Disease: resource boom → real exchange rate appreciation → "
                    "non-resource tradables become less competitive → de-industrialisation. "
                    "(a) Exchange rate: oil export revenues → demand for KSh rises → KSh appreciates. "
                    "(b) Manufacturing: KSh appreciation makes Kenyan manufactured exports expensive → "
                    "output and employment falls. "
                    "(c) Agriculture: export crops (tea, coffee, horticulture) become less competitive. "
                    "Mitigation: sovereign wealth fund to sterilise revenues, "
                    "invest oil rents in non-tradable sectors (infrastructure, education), "
                    "managed exchange rate depreciation, export diversification."
                ),
                "points": 20,
                "explanation": (
                    "The term originates from Netherlands' deindustrialisation following North Sea "
                    "gas discovery in the 1960s. Relevant for Kenya's oil finds in Turkana."
                ),
            },
            {
                "question_text": (
                    "Critically assess the effectiveness of Kenya's Value Added Tax (VAT) system "
                    "as a tool for revenue mobilisation. What are the main challenges in VAT "
                    "administration in Kenya and how do they affect tax buoyancy?"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Kenya VAT rate: 16% (standard); introduced 1990, reformed under VAT Act 2013. "
                    "Strengths: broad-based, self-enforcing via invoice credit mechanism, "
                    "less distortionary than income tax. "
                    "Challenges: (1) Large informal sector — majority of transactions unregistered; "
                    "(2) VAT refund delays discourage exporters; (3) Numerous exemptions erode base; "
                    "(4) Weak enforcement capacity. "
                    "Tax buoyancy: ratio of % change in tax revenue to % change in GDP. "
                    "Kenya VAT buoyancy < 1 in many years due to exemptions and evasion."
                ),
                "points": 20,
                "explanation": (
                    "Kenya Revenue Authority (KRA) has progressively expanded the VAT base "
                    "using iTax system and electronic tax registers (ETRs) in retail."
                ),
            },
        ],
    },
    {
        "title": "Microeconomics: Market Structures & Firm Theory",
        "topic": "Microeconomics",
        "assessment_type": "exam",
        "time_limit_minutes": 90,
        "description": (
            "Covers theory of the firm, cost analysis, profit maximisation across market structures "
            "(perfect competition, monopoly, oligopoly, monopolistic competition) and game theory basics. "
            "Based on ECO 201 / EET 201 second-year microeconomics content at Kenyan universities."
        ),
        "source_attribution": "Kenyatta University — EET201 Microeconomics (2023)",
        "source_url": "https://www.ku.ac.ke/schools/engineering/",
        "source_year": 2023,
        "institution_name": "Kenyatta University",
        "tags": ["microeconomics", "ku", "university", "eet201", "firm theory", "market structures", "2023"],
        "questions": [
            {
                "question_text": (
                    "A monopolistically competitive firm faces the following situation in the short run: "
                    "Total Revenue = 500, Total Cost = 480 (of which Fixed Cost = 100). "
                    "(a) Is the firm making a profit or loss? (b) Should the firm continue operating in "
                    "the short run? (c) What happens to the number of firms in this industry in the long run?"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "(a) Profit = TR - TC = 500 - 480 = KSh 20 profit (short-run). "
                    "(b) Yes — TR > TVC (= 480 - 100 = 380), so TR > TVC, continue operating. "
                    "(c) Economic profit attracts new entrants → demand curve facing each firm "
                    "shifts left and becomes more elastic → long-run: zero economic profit (P = ATC). "
                    "This is the 'tangency solution' in monopolistic competition."
                ),
                "points": 15,
                "explanation": (
                    "In monopolistic competition, freedom of entry eliminates economic profit in the "
                    "long run, but firms still have some pricing power due to product differentiation."
                ),
            },
            {
                "question_text": (
                    "Explain the concept of 'price discrimination' in monopoly. "
                    "Distinguish between first, second, and third-degree price discrimination. "
                    "Give a real Kenyan example of each type."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Price discrimination: charging different prices to different buyers for the same good. "
                    "1st degree (perfect): each unit sold at consumer's maximum WTP. "
                    "Example: individualised pricing by informal market traders. "
                    "2nd degree (by quantity/version): e.g., Safaricom data bundles (daily/weekly/monthly). "
                    "3rd degree (by group/segment): e.g., student vs regular ticket prices at National Museums, "
                    "Safaricom Bonga Points differing by usage tier."
                ),
                "points": 15,
                "explanation": (
                    "Conditions for price discrimination: market power, ability to segment markets, "
                    "no arbitrage/resale between segments."
                ),
            },
            {
                "question_text": (
                    "In the Cournot duopoly model, two firms (Firm 1 and Firm 2) face market demand "
                    "P = 120 - Q where Q = q1 + q2. Each firm has constant marginal cost MC = 0. "
                    "(a) Derive the reaction function for Firm 1. "
                    "(b) Find the Cournot-Nash equilibrium quantities and price. "
                    "(c) Compare the total industry output and price to the competitive and monopoly outcomes."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "(a) Firm 1 maximises π1 = (120 - q1 - q2)q1. "
                    "FOC: 120 - 2q1 - q2 = 0 → q1* = (120 - q2)/2. "
                    "(b) By symmetry q1 = q2. Substitute: q1 = (120 - q1)/2 → q1 = 40. "
                    "Q = 80, P = 120 - 80 = 40. "
                    "(c) Competition: P = MC = 0, Q = 120. "
                    "Monopoly: MR = 120 - 2Q = 0 → Q = 60, P = 60. "
                    "Cournot: Q = 80 (more than monopoly, less than competition), P = 40."
                ),
                "points": 20,
                "explanation": (
                    "The Cournot equilibrium lies between monopoly and perfect competition. "
                    "With n firms: each produces 1/(n+1) of competitive output."
                ),
            },
            {
                "question_text": (
                    "With a clearly labelled diagram, explain consumer and producer surplus. "
                    "How does a government-imposed price ceiling (e.g., on fuel in Kenya) "
                    "affect consumer surplus, producer surplus, and total welfare?"
                ),
                "question_type": "essay",
                "correct_answer": (
                    "CS = area below demand curve above price. "
                    "PS = area above supply curve below price. "
                    "Price ceiling BELOW equilibrium: "
                    "Quantity falls from Q* to Q_ceiling (supply constraint). "
                    "CS change: gain from lower price, lose from reduced quantity. "
                    "Net CS change: ambiguous (may rise if ceiling not too far below equilibrium). "
                    "PS: falls (lower price and lower quantity). "
                    "Deadweight loss triangle between Q_ceiling and Q* represents loss to society. "
                    "Kenya: fuel price caps (2021-23) led to shortages and queues."
                ),
                "points": 15,
                "explanation": (
                    "Price ceilings are politically popular but create DWL and shortages; "
                    "Kenya removed fuel price caps in 2023 under IMF programme conditions."
                ),
            },
            {
                "question_text": (
                    "What is the 'prisoners' dilemma' in game theory? "
                    "How does it explain the difficulty of sustaining a cartel agreement "
                    "among oligopolistic firms? Use a payoff matrix to illustrate your answer."
                ),
                "question_type": "essay",
                "correct_answer": (
                    "Prisoners' dilemma: individually rational choices lead to collectively "
                    "worse outcomes. Each firm has dominant strategy to defect (cheat on cartel). "
                    "Payoff matrix (cartel price vs competitive price): "
                    "If both cooperate (restrict output): each earns 60. "
                    "If Firm A defects while B cooperates: A earns 80, B earns 30. "
                    "If both defect: each earns 40 (Nash equilibrium). "
                    "Cartel instability: every firm has incentive to secretly cut price and gain "
                    "market share — dominant strategy is always to cheat, so Nash eq. = both cheat. "
                    "Sustaining cooperation requires: repeated game, credible punishment, monitoring."
                ),
                "points": 15,
                "explanation": (
                    "The OPEC cartel repeatedly faces this dilemma — members often exceed "
                    "production quotas, undermining collective agreements."
                ),
            },
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed Kenyan university economics assessments with real past-paper content.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--admin-user',
            default=None,
            help='Email of the admin user to set as creator. Defaults to first superuser found.',
        )
        parser.add_argument('--dry-run', action='store_true', help='Print what would be created without saving.')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        admin_email = options.get('admin_user')

        # Resolve creator
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

            # Resolve or create institution
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

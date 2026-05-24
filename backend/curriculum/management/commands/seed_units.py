"""Seed the curriculum catalog with an initial set of units.

Idempotent: re-running updates existing units (keyed on track + name) rather
than creating duplicates. After seeding, links existing EngineeringProblem
rows to their Unit by matching unit_code / unit_name.

Usage:  python manage.py seed_units
"""
from django.core.management.base import BaseCommand

from curriculum.models import Unit


ENGINEERING_UNITS = [
    {
        'name': 'Engineering Mathematics 3',
        'code': 'ECU 300',
        'level': 'Year 3, Semester 1',
        'description': 'Numerical analysis for engineers.',
        'syllabus_summary': (
            'Numerical methods for engineering problems: roots of equations '
            '(bisection, Newton-Raphson, secant); interpolation (Lagrange, '
            "Newton's divided differences, splines); numerical differentiation "
            'and integration (trapezoidal, Simpson’s rules, Gaussian '
            'quadrature); numerical solution of ordinary differential equations '
            '(Euler, Runge-Kutta); systems of linear equations (Gauss '
            'elimination, LU decomposition, iterative methods); curve fitting '
            'and least squares; error analysis and convergence.'
        ),
    },
    {
        'name': 'Power Systems 1',
        'code': 'EEE 301',
        'level': 'Year 3, Semester 1',
        'description': 'Generation, transmission and distribution fundamentals.',
        'syllabus_summary': (
            'Fundamentals of electrical power systems: generation, transmission '
            'and distribution. Per-unit system and representation of power '
            'system components. Transmission line parameters (resistance, '
            'inductance, capacitance); short, medium and long line models. '
            'Voltage regulation and transmission efficiency. Symmetrical '
            'three-phase systems, one-line diagrams, power factor correction.'
        ),
    },
    {
        'name': 'Digital Electronics 2',
        'code': 'EEE 302',
        'level': 'Year 3, Semester 1',
        'description': 'Sequential logic, memories and programmable logic.',
        'syllabus_summary': (
            'Advanced digital systems design: sequential logic circuits, '
            'flip-flops (SR, JK, D, T); registers and counters (synchronous and '
            'asynchronous); finite state machines (Mealy and Moore), state '
            'diagrams and minimization. Semiconductor memories (RAM, ROM, '
            'EEPROM); programmable logic devices (PLA, PAL, FPGA, CPLD). '
            'Introduction to HDLs (VHDL/Verilog). ADC and DAC conversion.'
        ),
    },
    {
        'name': 'Network Analysis and Synthesis',
        'code': 'EEE 303',
        'level': 'Year 3, Semester 1',
        'description': 'Two-port networks, network functions and synthesis.',
        'syllabus_summary': (
            'Analysis and synthesis of electrical networks: network theorems, '
            'two-port parameters (z, y, h, ABCD), network functions, poles and '
            'zeros. Frequency response and Bode plots. Network topology and '
            'graph theory applied to circuits. Passive synthesis: LC, RC, RL '
            'driving-point functions, Foster and Cauer forms. Positive real '
            'functions, Hurwitz polynomials, filter design fundamentals.'
        ),
    },
    {
        'name': 'Analog Electronics 2',
        'code': 'EEE 304',
        'level': 'Year 3, Semester 2',
        'description': 'Multistage amplifiers, feedback, oscillators.',
        'syllabus_summary': (
            'Advanced analog circuit design: multistage amplifiers, frequency '
            'response of amplifiers, feedback amplifiers (topologies, stability, '
            'gain-bandwidth). Operational amplifier applications and '
            'non-idealities. Power amplifiers (Class A, B, AB, C, D), efficiency '
            'and distortion. Oscillators (RC, LC, crystal) and the Barkhausen '
            'criterion. Active filters and voltage regulators.'
        ),
    },
    {
        'name': 'Control Systems 2',
        'code': 'EEE 305',
        'level': 'Year 3, Semester 2',
        'description': 'State-space, root locus and frequency-domain design.',
        'syllabus_summary': (
            'Advanced control system analysis and design: state-space '
            'representation, controllability and observability, state feedback '
            'and pole placement. Root locus design; frequency response design '
            'with lead, lag and lead-lag compensators. Nyquist stability '
            'criterion, gain and phase margins. Digital control, z-transform '
            'and discrete-time system analysis. Introduction to optimal control.'
        ),
    },
    {
        'name': 'Transmission Lines and Waveguides',
        'code': 'EEE 306',
        'level': 'Year 3, Semester 2',
        'description': 'Wave propagation, Smith chart, waveguides.',
        'syllabus_summary': (
            'Electromagnetic wave propagation on transmission lines: '
            'distributed parameters, telegrapher’s equations, characteristic '
            'impedance, reflection coefficient, standing waves and VSWR. Smith '
            'chart and impedance matching. Waveguides: rectangular and circular, '
            'TE and TM modes, cutoff frequency, guide wavelength. Cavity '
            'resonators. Introduction to antennas and radiation.'
        ),
    },
    {
        'name': 'Electrical Machines 3',
        'code': 'EEE 307',
        'level': 'Year 3, Semester 2',
        'description': 'Synchronous machines, induction motors, special machines.',
        'syllabus_summary': (
            'Advanced electrical machines: synchronous machines (salient and '
            'cylindrical rotor), generator and motor operation, power-angle '
            'characteristics, parallel operation and synchronization. '
            'Three-phase induction motors: equivalent circuit, torque-slip '
            'characteristics, starting and speed control. Special machines: '
            'stepper motors, brushless DC motors, single-phase motors. Machine '
            'transients and introduction to machine control.'
        ),
    },

    # ── Year 2 units (where most of our existing engineering papers live) ─────
    {
        'name': 'Circuit Analysis I',
        'code': 'EEE 203',
        'level': 'Year 2, Semester 1',
        'description': 'DC circuit analysis fundamentals.',
        'syllabus_summary': (
            'DC circuit analysis: Ohm\'s law, Kirchhoff\'s voltage and current '
            'laws. Series, parallel and series-parallel resistive networks; '
            'star-delta transformations. Nodal and mesh analysis. Network '
            'theorems: superposition, Thevenin, Norton, maximum power transfer, '
            'reciprocity. Energy and power in DC circuits. Capacitors and '
            'inductors: charging, discharging and transient response in RC, RL '
            'and RLC circuits.'
        ),
    },
    {
        'name': 'Circuit Analysis II',
        'code': 'EEE 204',
        'level': 'Year 2, Semester 2',
        'description': 'AC circuit analysis and frequency response.',
        'syllabus_summary': (
            'AC circuit analysis: sinusoidal sources, phasor representation, '
            'impedance and admittance. Power in AC circuits: real, reactive and '
            'apparent power; power factor correction. Series and parallel '
            'resonance in RLC circuits; Q-factor and bandwidth. Three-phase '
            'circuits (balanced and unbalanced). Coupled circuits and mutual '
            'inductance. Two-port network parameters (Z, Y, h, ABCD) and '
            'frequency response basics.'
        ),
    },
    {
        'name': 'Electrical Machines I',
        'code': 'EEE 206',
        'level': 'Year 2, Semester 2',
        'description': 'Magnetic circuits, transformers, DC machines.',
        'syllabus_summary': (
            'Magnetic circuits, hysteresis and eddy-current losses. Single-phase '
            'and three-phase transformers: construction, EMF equation, '
            'equivalent circuit, voltage regulation, losses and efficiency, '
            'open-circuit and short-circuit tests, autotransformers. DC '
            'machines: construction, EMF equation, armature reaction, '
            'commutation. DC generators and motors: characteristics, starting '
            'and speed control of DC motors.'
        ),
    },
    {
        'name': 'Electrical Measurements',
        'code': 'EEE 208',
        'level': 'Year 2, Semester 2',
        'description': 'Instruments, bridges, transducers, error analysis.',
        'syllabus_summary': (
            'Measurement standards and units; types of errors and statistical '
            'treatment of data. Analog instruments: PMMC, moving-iron, '
            'electrodynamometer; ammeters, voltmeters, ohmmeters, wattmeters and '
            'energy meters. AC and DC bridges: Wheatstone, Maxwell, Hay, '
            'Schering, Anderson. Instrument transformers (CT and PT). '
            'Oscilloscopes, signal generators and digital multimeters. '
            'Transducers and sensors for non-electrical quantities.'
        ),
    },
    {
        'name': 'Fluid Mechanics',
        'code': 'EEE 209',
        'level': 'Year 2',
        'description': 'Service course in fluid mechanics for EEE students.',
        'syllabus_summary': (
            'Fluid properties: density, viscosity, surface tension, '
            'compressibility. Fluid statics: pressure measurement, manometers, '
            'hydrostatic forces on plane and curved surfaces, buoyancy. Fluid '
            'kinematics. Energy equation and applications: Bernoulli\'s '
            'equation, orifices, mouthpieces, weirs, notches, venturi-meter, '
            'pitot tube. Introduction to viscous flow and dimensional analysis.'
        ),
    },
    {
        'name': 'Computer Programming II',
        'code': 'EEE 202',
        'level': 'Year 2, Semester 1',
        'description': 'Procedural and structured programming for engineers.',
        'syllabus_summary': (
            'Procedural programming (typically C/C++): control structures, '
            'functions, arrays, pointers, strings. Structures and unions. File '
            'I/O. Dynamic memory allocation. Introduction to data structures: '
            'linked lists, stacks, queues. Searching and sorting algorithms. '
            'Programming applications for engineering problem-solving.'
        ),
    },
    {
        'name': 'AutoCAD',
        'code': 'EEE 210',
        'level': 'Year 2',
        'description': 'Computer-aided drafting for engineering drawings.',
        'syllabus_summary': (
            'Introduction to AutoCAD interface and command structure. 2D '
            'drafting: line, polyline, circle, arc, rectangle and modification '
            'tools (move, copy, rotate, mirror, offset, trim, extend). Layers '
            'and properties. Dimensioning and text. Blocks and external '
            'references. Plotting and printing. Introduction to 3D modelling '
            '(solids, surfaces) and isometric drawing for engineering '
            'components.'
        ),
    },
    {
        'name': 'Engineering Mathematics V',
        'code': 'ECU 200',
        'level': 'Year 2, Semester 1',
        'description': 'Vector calculus, multiple integrals, intro to ODEs.',
        'syllabus_summary': (
            'Vector calculus: scalar and vector fields, gradient, divergence, '
            'curl; line and surface integrals; Green\'s, Stokes\' and '
            'divergence theorems. Multiple integrals (double, triple) in '
            'Cartesian, polar, cylindrical and spherical coordinates. '
            'Introduction to ordinary differential equations: first-order '
            '(separable, linear, exact) and second-order linear with constant '
            'coefficients.'
        ),
    },
    {
        'name': 'Engineering Mathematics VII (ODE)',
        'code': 'ECU 202',
        'level': 'Year 2, Semester 2',
        'description': 'Ordinary differential equations, series solutions, Laplace.',
        'syllabus_summary': (
            'Higher-order ordinary differential equations: homogeneous and '
            'non-homogeneous, undetermined coefficients, variation of '
            'parameters. Series solutions and Frobenius method; Bessel and '
            'Legendre equations. Systems of linear ODEs. Laplace transforms '
            'and inverse Laplace; solving ODEs with Laplace; convolution and '
            'impulse response.'
        ),
    },
    {
        'name': 'Engineering Mathematics III (Transform Methods)',
        'code': 'ECU 203',
        'level': 'Year 2, Semester 2',
        'description': 'Laplace and Fourier transforms for engineers.',
        'syllabus_summary': (
            'Laplace transforms: definitions, standard transforms, properties, '
            'inverse transforms, partial fractions, convolution. Applications '
            'to ODEs and circuit analysis. Fourier series: trigonometric and '
            'complex forms, half-range series, convergence. Fourier transforms '
            'and their properties; applications to signals and PDEs. '
            'Introduction to Z-transforms.'
        ),
    },
    {
        'name': 'Fluid Mechanics II',
        'code': 'EMM 205',
        'level': 'Year 2, Semester 2',
        'description': 'Applied fluid mechanics: viscous flow, dimensional analysis.',
        'syllabus_summary': (
            'Continuity, momentum and energy equations for fluid flow. Viscous '
            'flow: laminar and turbulent flow in pipes; Reynolds number; '
            'Darcy-Weisbach equation; major and minor losses; pipe networks. '
            'Boundary-layer concepts. Dimensional analysis and similitude '
            '(Buckingham Pi theorem). Open-channel flow basics. Flow '
            'measurement devices. Introduction to turbomachinery: pumps and '
            'turbines.'
        ),
    },
    {
        'name': 'Biomaterials',
        'code': 'EBM 200',
        'level': 'Year 2',
        'description': 'Materials for medical and biological applications.',
        'syllabus_summary': (
            'Classes of biomaterials: metals (stainless steel, titanium '
            'alloys, cobalt-chromium), ceramics (alumina, zirconia, '
            'hydroxyapatite), polymers (PMMA, silicone, PE, PLA/PGA), and '
            'composites. Mechanical, thermal and surface properties relevant '
            'to medical use. Host response to implants, biocompatibility and '
            'tissue-material interactions. Sterilisation and degradation. '
            'Applications in orthopaedic implants, cardiovascular devices, '
            'dental materials and drug delivery.'
        ),
    },

    # ── Year 1 common units (foundation) ─────────────────────────────────────
    {
        'name': 'Physics for Engineers II',
        'code': 'ECU 103',
        'level': 'Year 1, Semester 2',
        'description': 'Waves, optics, electromagnetism and modern physics for engineers.',
        'syllabus_summary': (
            'Wave motion: transverse and longitudinal waves, superposition, '
            'standing waves, beats and resonance. Sound waves. Geometric and '
            'physical optics: reflection, refraction, lenses and mirrors, '
            'interference, diffraction, polarisation. Electricity and '
            'magnetism: Coulomb\'s law, electric fields and potentials, '
            'capacitance, current and resistance, magnetic fields and forces, '
            'Faraday\'s law, AC fundamentals. Introduction to modern physics: '
            'photoelectric effect, atomic structure, basic quantum ideas.'
        ),
    },
    {
        'name': 'Communication Skills',
        'code': 'UCU 100',
        'level': 'Year 1, Semester 1',
        'description': 'Academic and professional communication for university students.',
        'syllabus_summary': (
            'Listening, speaking, reading and writing skills for academic and '
            'professional contexts. Note-taking, summarising and paraphrasing. '
            'Library and information skills; academic referencing and avoiding '
            'plagiarism. Essay writing: structure, coherence, argument, '
            'editing. Oral presentations and public speaking. Report writing. '
            'Interpersonal and group communication; meetings and discussions. '
            'Workplace communication: CVs, cover letters, emails.'
        ),
    },
    {
        'name': 'Critical and Creative Thinking',
        'code': 'UCU 103',
        'level': 'Year 1',
        'description': 'Reasoning, argument analysis, problem-solving and creativity.',
        'syllabus_summary': (
            'Nature of thinking and the thinking process. Critical thinking: '
            'arguments, premises and conclusions; deductive and inductive '
            'reasoning; common fallacies; evaluating evidence and sources. '
            'Problem-solving methods and decision-making. Creativity and '
            'creative-thinking techniques (brainstorming, lateral thinking, '
            'mind-mapping). Application of critical and creative thinking in '
            'academic, professional and everyday contexts.'
        ),
    },

    # ── Year 3 / advanced (one paper currently) ──────────────────────────────
    {
        'name': 'Advanced Calculus and Differential Equations',
        'code': 'MATH 302',
        'level': 'Year 3',
        'description': 'Multivariable calculus and advanced ODE/PDE topics.',
        'syllabus_summary': (
            'Functions of several variables, partial derivatives, the chain '
            'rule, total differentials, maxima and minima with constraints '
            '(Lagrange multipliers). Multiple integrals and applications. '
            'Series solutions of ODEs; special functions (Bessel, Legendre). '
            'Introduction to partial differential equations: classification, '
            'separation of variables, heat, wave and Laplace equations. '
            'Boundary-value problems and Sturm-Liouville theory.'
        ),
    },
]

OLYMPIAD_UNITS = [
    {
        'name': 'Algebra',
        'code': 'OLY-ALG',
        'level': 'National / International',
        'description': 'Inequalities, polynomials, functional equations.',
        'syllabus_summary': (
            'Olympiad algebra: polynomial identities and factorization, '
            "Vieta’s formulas, inequalities (AM-GM, Cauchy-Schwarz, power "
            'mean, rearrangement, Jensen), sequences and series, complex numbers '
            'in algebra, symmetric functions and polynomial roots.'
        ),
    },
    {
        'name': 'Combinatorics',
        'code': 'OLY-COMB',
        'level': 'National / International',
        'description': 'Counting, pigeonhole, graphs, invariants.',
        'syllabus_summary': (
            'Olympiad combinatorics: counting principles, pigeonhole principle, '
            'binomial coefficients and identities, recursions and generating '
            'functions, bijections, inclusion-exclusion, graph theory basics, '
            'extremal combinatorics, combinatorial games, invariants and '
            'colorings.'
        ),
    },
    {
        'name': 'Geometry',
        'code': 'OLY-GEO',
        'level': 'National / International',
        'description': 'Euclidean geometry, transformations, inversion.',
        'syllabus_summary': (
            'Olympiad geometry: triangle centers, circle theorems, power of a '
            'point, cyclic quadrilaterals, similar triangles, trigonometric '
            'identities in geometry, transformations (reflection, rotation, '
            'homothety, inversion), projective geometry basics, coordinate and '
            'vector methods.'
        ),
    },
    {
        'name': 'Number Theory',
        'code': 'OLY-NT',
        'level': 'National / International',
        'description': 'Divisibility, modular arithmetic, Diophantine equations.',
        'syllabus_summary': (
            'Olympiad number theory: divisibility, prime factorization, GCD and '
            'LCM, modular arithmetic, Fermat’s little theorem, Euler’s '
            'theorem, Chinese remainder theorem, Diophantine equations, order '
            'and primitive roots, quadratic residues, p-adic valuation.'
        ),
    },
    {
        'name': 'Functional Equations',
        'code': 'OLY-FE',
        'level': 'National / International',
        'description': 'Substitution, Cauchy equation, solution strategies.',
        'syllabus_summary': (
            'Olympiad functional equations: substitution techniques, Cauchy’s '
            'functional equation and its variants, injectivity and surjectivity '
            'arguments, fixed points, functions over integers, reals and '
            'rationals, common forms and standard solution strategies.'
        ),
    },
]


class Command(BaseCommand):
    help = 'Seed the curriculum catalog with engineering units and olympiad topics.'

    def handle(self, *args, **options):
        created, updated = 0, 0

        for spec in ENGINEERING_UNITS:
            # Coarse topic-keyword fallback for assessments not directly attached
            # by code below. Picks the bucket most likely to match.
            n = spec['name'].lower()
            code = spec['code'].upper()
            if 'mathematics' in n or code.startswith(('ECU', 'MATH')):
                keywords = ['Engineering Mathematics']
            elif 'fluid' in n or code.startswith('EMM'):
                keywords = ['Mechanical Engineering']
            elif 'biomaterial' in n or code.startswith('EBM'):
                keywords = ['Biomedical Engineering']
            elif 'communication' in n:
                keywords = ['COMMUNICATION SKILLS']
            elif 'critical' in n:
                keywords = ['CRITICAL AND CREATIVE THINKING']
            elif 'physics' in n:
                keywords = ['Engineering Physics']
            elif 'autocad' in n:
                keywords = ['Engineering Design']
            else:
                keywords = ['Electrical Engineering']
            obj, was_created = Unit.objects.update_or_create(
                track=Unit.Track.ENGINEERING,
                name=spec['name'],
                defaults={
                    'code': spec['code'],
                    'institution': 'Kenyatta University',
                    'level': spec['level'],
                    'description': spec['description'],
                    'syllabus_summary': spec['syllabus_summary'],
                    'topic_keywords': keywords,
                    'is_official': True,
                },
            )
            created += was_created
            updated += not was_created

        for spec in OLYMPIAD_UNITS:
            # Olympiad assessments are bucketed directly by topic name; Number
            # Theory exists under two casings in the data.
            keywords = [spec['name']]
            if spec['name'] == 'Number Theory':
                keywords.append('Number theory')
            obj, was_created = Unit.objects.update_or_create(
                track=Unit.Track.OLYMPIAD,
                name=spec['name'],
                defaults={
                    'code': spec['code'],
                    'institution': 'Kenya Mathematical Olympiad',
                    'level': spec['level'],
                    'description': spec['description'],
                    'syllabus_summary': spec['syllabus_summary'],
                    'topic_keywords': keywords,
                    'is_official': True,
                },
            )
            created += was_created
            updated += not was_created

        self.stdout.write(self.style.SUCCESS(
            f'Units: {created} created, {updated} updated.'))

        attached = self._attach_papers_by_code()
        self.stdout.write(self.style.SUCCESS(
            f'Attached {attached} engineering assessment(s) to units by code.'))

    def _attach_papers_by_code(self) -> int:
        """Attach engineering Assessments to their Unit by parsing the unit
        code from the assessment title (e.g. "EEE 203 — CIRCUIT ANALYSIS I"
        → unit with code "EEE 203"). Only touches assessments without a unit."""
        import re
        from assessments.models import Assessment

        eng_units = Unit.objects.filter(track=Unit.Track.ENGINEERING).exclude(code='')
        # Build a code → unit map, key is alphanumeric (no spaces) uppercased.
        units_by_key = {
            re.sub(r'\W+', '', u.code).upper(): u for u in eng_units
        }
        code_re = re.compile(r'^([A-Z]{2,4})\s*(\d{3,4})')

        attached = 0
        for a in Assessment.objects.filter(unit__isnull=True).only('id', 'title'):
            m = code_re.match((a.title or '').strip())
            if not m:
                continue
            key = (m.group(1) + m.group(2)).upper()
            unit = units_by_key.get(key)
            if unit:
                Assessment.objects.filter(pk=a.pk).update(unit=unit)
                attached += 1
        return attached

"""Seed the curriculum catalog with an initial set of units.

Idempotent: re-running updates existing units (keyed on track + name) rather
than creating duplicates. After seeding, links existing EngineeringProblem
rows to their Unit by matching unit_code / unit_name.

Usage:  python manage.py seed_units
"""
from django.core.management.base import BaseCommand
from django.db.models import Q

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
            obj, was_created = Unit.objects.update_or_create(
                track=Unit.Track.ENGINEERING,
                name=spec['name'],
                defaults={
                    'code': spec['code'],
                    'institution': 'Kenyatta University',
                    'level': spec['level'],
                    'description': spec['description'],
                    'syllabus_summary': spec['syllabus_summary'],
                    'is_official': True,
                },
            )
            created += was_created
            updated += not was_created

        for spec in OLYMPIAD_UNITS:
            obj, was_created = Unit.objects.update_or_create(
                track=Unit.Track.OLYMPIAD,
                name=spec['name'],
                defaults={
                    'code': spec['code'],
                    'institution': 'Kenya Mathematical Olympiad',
                    'level': spec['level'],
                    'description': spec['description'],
                    'syllabus_summary': spec['syllabus_summary'],
                    'is_official': True,
                },
            )
            created += was_created
            updated += not was_created

        self.stdout.write(self.style.SUCCESS(
            f'Units: {created} created, {updated} updated.'))

        # Best-effort link of existing engineering papers to their Unit.
        linked = self._link_engineering_problems()
        self.stdout.write(self.style.SUCCESS(
            f'Linked {linked} engineering problems to units.'))

    def _link_engineering_problems(self) -> int:
        try:
            from engineering.models import EngineeringProblem
        except Exception:
            return 0

        linked = 0
        for unit in Unit.objects.filter(track=Unit.Track.ENGINEERING):
            match = Q()
            if unit.code:
                match |= Q(unit_code__iexact=unit.code)
            # Also match on the unit name appearing in the paper's unit_name.
            match |= Q(unit_name__icontains=unit.name)
            qs = EngineeringProblem.objects.filter(unit__isnull=True).filter(match)
            count = qs.update(unit=unit)
            linked += count
        return linked

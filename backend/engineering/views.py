import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import EngineeringProblem
from .serializers import EngineeringProblemSerializer

logger = logging.getLogger(__name__)

SOLUTION_PROMPT = """\
You are an expert {discipline} engineering lecturer writing model solutions for a university exam dataset.

Question: {question_text}
Unit: {unit_name} ({unit_code})
Marks: {marks}
Type: {question_type}

Write a complete, detailed, step-by-step model solution.

RULES:
- Show ALL working — do not skip steps
- Use LaTeX for all math: inline $...$ and display $$...$$
- For circuit problems: state the method (KVL, KCL, mesh, nodal, Thevenin, etc.) before applying it
- Final answers should be clearly labelled and include units
- Keep explanations concise but complete — this is for a student studying independently
- Do not restate the question

Solution:"""

GRADE_PROMPT = """\
You are an expert engineering lecturer grading a student's answer.

Question: {question_text}
Unit: {unit_name} ({unit_code})
Marks available: {marks}

Model solution:
{model_solution}

Student's answer:
{student_answer}

Grade the student's answer and respond in JSON with exactly two fields:
{{"score": <integer 0-100 representing percentage of marks earned>, "feedback": "<2-3 sentences: what was correct, what was missing or wrong, and a key tip>"}}

Respond with only the JSON object. No preamble."""


def _infer_discipline(unit_code: str, unit_name: str) -> str:
    text = f"{unit_code} {unit_name}".lower()
    if any(w in text for w in ["elect", "circuit", "power", "signal", "digital", "analog", "eee", "ecu"]):
        return "Electrical & Electronics"
    if any(w in text for w in ["mech", "therm", "fluid", "stress", "dynamics", "emm"]):
        return "Mechanical"
    if any(w in text for w in ["civil", "struct", "concrete", "soil", "hydraul"]):
        return "Civil"
    if any(w in text for w in ["chem", "process", "react"]):
        return "Chemical"
    return "Engineering"


def _call_openrouter(prompt: str, max_tokens: int = 2048) -> str:
    try:
        from ai_service.views import call_ai
        return call_ai(prompt, max_tokens=max_tokens, prefer_openrouter=True) or ""
    except Exception as e:
        logger.error(f"OpenRouter call failed: {e}")
        return ""


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    getattr(request.user, 'tier', '') == 'admin')


class EngineeringProblemViewSet(viewsets.ModelViewSet):
    serializer_class = EngineeringProblemSerializer
    permission_classes = [permissions.AllowAny]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.action in ('partial_update', 'update', 'destroy'):
            return [IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = EngineeringProblem.objects.all()

        unit = self.request.query_params.get('unit_code')
        if unit:
            qs = qs.filter(unit_code__iexact=unit)

        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)

        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            qs = qs.filter(difficulty=difficulty)

        question_type = self.request.query_params.get('question_type')
        if question_type:
            qs = qs.filter(question_type=question_type)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(question_text__icontains=search) |
                Q(unit_name__icontains=search) |
                Q(unit_code__icontains=search)
            )

        return qs

    @action(detail=False, methods=['get'], url_path='units')
    def units(self, request):
        units = (
            EngineeringProblem.objects
            .values('unit_code', 'unit_name')
            .distinct()
            .order_by('unit_code')
        )
        return Response(list(units))

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        total = EngineeringProblem.objects.count()
        with_solutions = EngineeringProblem.objects.exclude(model_solution='').count()
        with_diagrams = EngineeringProblem.objects.filter(has_diagram=True).count()
        return Response({
            'total': total,
            'with_solutions': with_solutions,
            'with_diagrams': with_diagrams,
        })

    @action(detail=True, methods=['post'], url_path='grade',
            permission_classes=[permissions.AllowAny])
    def grade(self, request, pk=None):
        """
        Grade a student's answer to an engineering problem.
        If no model_solution exists yet, generates one first and caches it.
        Returns: { score (0-100), feedback, model_solution, solution_generated (bool) }
        """
        problem = self.get_object()
        student_answer = (request.data.get('answer') or '').strip()

        if not student_answer:
            return Response({'error': 'No answer provided.'}, status=status.HTTP_400_BAD_REQUEST)

        solution_generated = False

        # Generate solution on demand if not yet available
        if not problem.model_solution:
            discipline = _infer_discipline(problem.unit_code, problem.unit_name)
            sol_prompt = SOLUTION_PROMPT.format(
                discipline=discipline,
                question_text=problem.question_text,
                unit_name=problem.unit_name,
                unit_code=problem.unit_code,
                marks=problem.marks,
                question_type=problem.question_type,
            )
            solution_text = _call_openrouter(sol_prompt, max_tokens=3000)
            if solution_text:
                problem.model_solution = solution_text
                problem.solution_status = EngineeringProblem.SolutionStatus.GENERATED
                problem.save(update_fields=['model_solution', 'solution_status'])
                solution_generated = True
                logger.info(f"Generated solution for EngineeringProblem {problem.pk}")
            else:
                # Can't grade without a solution
                return Response(
                    {'error': 'Could not generate a model solution right now. Please try again.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        # Grade the answer
        grade_prompt = GRADE_PROMPT.format(
            question_text=problem.question_text,
            unit_name=problem.unit_name,
            unit_code=problem.unit_code,
            marks=problem.marks,
            model_solution=problem.model_solution,
            student_answer=student_answer,
        )
        raw = _call_openrouter(grade_prompt, max_tokens=512)

        score = 0
        feedback = raw or 'Could not parse grading response.'
        try:
            import json as _json
            parsed = _json.loads(raw)
            score = int(parsed.get('score', 0))
            feedback = parsed.get('feedback', raw)
        except Exception:
            import re
            m = re.search(r'"score"\s*:\s*(\d+)', raw)
            if m:
                score = int(m.group(1))
            m2 = re.search(r'"feedback"\s*:\s*"([\s\S]*?)"(?:\s*[,}])', raw)
            if m2:
                feedback = m2.group(1).replace('\\n', '\n').replace('\\"', '"')

        score = max(0, min(100, score))

        return Response({
            'score': score,
            'feedback': feedback,
            'model_solution': problem.model_solution,
            'solution_generated': solution_generated,
        })

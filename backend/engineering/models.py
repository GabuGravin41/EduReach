from django.db import models


class EngineeringProblem(models.Model):
    class Difficulty(models.TextChoices):
        EASY = 'easy', 'Easy'
        MEDIUM = 'medium', 'Medium'
        HARD = 'hard', 'Hard'

    class SolutionStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        GENERATED = 'generated', 'AI Generated'
        VERIFIED = 'verified', 'Verified'

    # Source metadata
    source_file = models.CharField(max_length=255)
    unit_code = models.CharField(max_length=20, db_index=True)
    unit_name = models.CharField(max_length=255)
    # Curriculum link — optional FK; unit_code remains the legacy fallback match.
    unit = models.ForeignKey(
        'curriculum.Unit', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='engineering_problems',
    )
    institution = models.CharField(max_length=255, blank=True)
    year = models.PositiveSmallIntegerField(null=True, blank=True, db_index=True)
    semester = models.PositiveSmallIntegerField(null=True, blank=True)
    paper_type = models.CharField(max_length=100, blank=True)

    # Question content
    question_number = models.CharField(max_length=20)
    question_text = models.TextField()
    marks = models.CharField(max_length=20, blank=True)
    question_type = models.CharField(max_length=50, blank=True)
    difficulty = models.CharField(
        max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM, db_index=True
    )
    tags = models.JSONField(default=list, blank=True)

    # Diagram
    has_diagram = models.BooleanField(default=False)
    diagram_image = models.ImageField(
        upload_to='engineering/diagrams/', null=True, blank=True
    )
    diagram_description = models.TextField(blank=True)

    # Solution
    model_solution = models.TextField(blank=True)
    solution_status = models.CharField(
        max_length=10, choices=SolutionStatus.choices, default=SolutionStatus.PENDING
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('source_file', 'question_number')]
        ordering = ['unit_code', 'year', 'question_number']

    def __str__(self):
        return f"{self.unit_code} {self.question_number} ({self.source_file})"

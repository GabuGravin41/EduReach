"""
Stream the first 51 problems from ShadenA/MathNet (HuggingFace) and seed them
into the local database as 17 Olympiad exam papers (3 problems each, 4 hours).

Usage:
    python manage.py seed_mathnet_olympiad
    python manage.py seed_mathnet_olympiad --admin-user admin@edureach.co.ke
    python manage.py seed_mathnet_olympiad --dry-run
"""

import io
import os
import re
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.conf import settings


class Command(BaseCommand):
    help = "Seed 51 MathNet Olympiad problems as 17 × 3-problem exams (4 hours each)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--admin-user",
            default=None,
            help="Email of the creator user. Defaults to the first superuser.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and log without writing to the database.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=51,
            help="Number of problems to load (default 51 → 17 papers).",
        )

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model
        from assessments.models import Assessment, Question, QuestionImage

        User = get_user_model()

        # ── Resolve admin user ──────────────────────────────────────────────
        admin_email = options["admin_user"]
        if admin_email:
            try:
                creator = User.objects.get(email=admin_email)
            except User.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"User '{admin_email}' not found."))
                return
        else:
            creator = User.objects.filter(is_superuser=True).order_by("id").first()
            if not creator:
                self.stderr.write(self.style.ERROR("No superuser found. Pass --admin-user."))
                return

        self.stdout.write(f"Creator: {creator.email}")

        dry = options["dry_run"]
        limit = options["limit"]
        problems_per_paper = 3
        time_limit = 240  # 4 hours

        # ── Stream dataset ──────────────────────────────────────────────────
        self.stdout.write("Streaming MathNet dataset (first %d records)..." % limit)
        from datasets import load_dataset

        ds = load_dataset("ShadenA/MathNet", "all", streaming=True, trust_remote_code=True)
        rows = []
        for i, row in enumerate(ds["train"]):
            if i >= limit:
                break
            rows.append(row)
        self.stdout.write(f"  Loaded {len(rows)} records.")

        if dry:
            for i, r in enumerate(rows):
                imgs = r.get("images") or []
                self.stdout.write(
                    f"  [{i:02d}] {r['id']} | {r.get('country','')} | "
                    f"imgs={len(imgs)} | {r.get('problem_type','')}"
                )
            return

        # ── Group into papers of 3 ──────────────────────────────────────────
        papers = [rows[i : i + problems_per_paper] for i in range(0, len(rows), problems_per_paper)]

        created_assessments = 0
        created_questions = 0
        created_images = 0

        for paper_idx, paper_rows in enumerate(papers, start=1):
            # Build a readable title from the competitions in this paper
            competitions = list(dict.fromkeys(
                r.get("competition", "") or "" for r in paper_rows if r.get("competition")
            ))
            countries = list(dict.fromkeys(
                r.get("country", "") or "" for r in paper_rows if r.get("country")
            ))

            paper_title = f"Olympiad Contest {paper_idx:02d}"
            description = (
                f"International Mathematics Olympiad — Contest {paper_idx}. "
                f"Problems sourced from: {', '.join(competitions[:2]) if competitions else 'various competitions'}. "
                "Write complete proofs or solutions. 4 hours. 3 problems."
            )

            # Collect all topics across the three problems
            all_topics: list[str] = []
            for r in paper_rows:
                for t in (r.get("topics_flat") or []):
                    top_level = t.split(">")[0].strip() if t else ""
                    if top_level and top_level not in all_topics:
                        all_topics.append(top_level)

            tags = list(dict.fromkeys(["olympiad", "math", "proof"] + all_topics))

            # Skip if already seeded
            if Assessment.objects.filter(creator=creator, title=paper_title).exists():
                self.stdout.write(f"  Paper {paper_idx:02d}: already exists, skipping.")
                continue

            assessment = Assessment.objects.create(
                title=paper_title,
                topic="Mathematics",
                description=description,
                creator=creator,
                time_limit_minutes=time_limit,
                image_upload_grace_minutes=30,
                assessment_type=Assessment.AssessmentType.EXAM,
                is_public=True,
                allow_students_see_results=False,
                source_attribution="MathNet Dataset (ShadenA/MathNet, HuggingFace)",
                source_url="https://huggingface.co/datasets/ShadenA/MathNet",
                tags=tags,
                competition_country=", ".join(countries[:3]),
                competition_name=", ".join(competitions[:2]),
                competition_language=_first_language(paper_rows),
            )
            created_assessments += 1

            for q_idx, row in enumerate(paper_rows, start=1):
                problem_md = row.get("problem_markdown") or ""
                solutions = row.get("solutions_markdown") or []
                if isinstance(solutions, str):
                    solutions = [solutions]
                solution_md = solutions[0] if solutions else ""

                final_answer = row.get("final_answer") or ""
                problem_type = row.get("problem_type") or "proof only"

                # Correct answer: use final_answer if present, else "See solution."
                correct_answer = final_answer if final_answer else "See solution."

                # For essay questions we store the solution in explanation
                question = Question.objects.create(
                    assessment=assessment,
                    question_text=problem_md,
                    question_type=Question.QuestionType.ESSAY,
                    correct_answer=correct_answer,
                    explanation=solution_md,
                    points=7,
                    order=q_idx,
                    source_url=assessment.source_url,
                )
                created_questions += 1

                # ── Save and link images ────────────────────────────────────
                pil_images = row.get("images") or []
                if pil_images:
                    # Collect all unique image filenames referenced across problem + solution
                    all_md = problem_md + "\n" + solution_md
                    referenced = _extract_image_refs(all_md)

                    # Map referenced filenames → PIL images by their appearance order
                    # If markdown has no refs but images exist, create generic names
                    if not referenced:
                        referenced = [f"attached_image_{j+1}.png" for j in range(len(pil_images))]

                    for ref_name, pil_img in zip(referenced, pil_images):
                        png_bytes = _pil_to_png_bytes(pil_img)
                        safe_name = f"mathnet_{row['id']}_{ref_name}"
                        qi = QuestionImage(question=question, filename=ref_name)
                        qi.image.save(safe_name, ContentFile(png_bytes), save=True)
                        created_images += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"  Paper {paper_idx:02d}: '{paper_title}' — "
                    f"{len(paper_rows)} questions, "
                    f"{sum(len(r.get('images') or []) for r in paper_rows)} images"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Created {created_assessments} papers, "
                f"{created_questions} questions, {created_images} images."
            )
        )


# ── Helpers ─────────────────────────────────────────────────────────────────

def _extract_image_refs(markdown: str) -> list[str]:
    """Return ordered unique list of image filenames from ![](filename) syntax."""
    found = re.findall(r"!\[.*?\]\(([^)]+)\)", markdown)
    seen = []
    for f in found:
        if f not in seen:
            seen.append(f)
    return seen


def _pil_to_png_bytes(pil_image) -> bytes:
    """Convert a PIL Image to PNG bytes."""
    buf = io.BytesIO()
    pil_image.save(buf, format="PNG")
    return buf.getvalue()


def _first_language(rows: list) -> str:
    for r in rows:
        lang = r.get("language")
        if lang:
            return lang.split(";")[0].strip()
    return "English"

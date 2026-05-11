#!/usr/bin/env python3
"""
EduReach Solution Generator
============================
Second-pass script: reads the CSV from extract_engineering_exams.py and
fills in the model_solution column for every row that doesn't have one yet.

Usage:
    python generate_solutions.py \
        --csv  ./dataset/engineering_questions.csv \
        --api-key YOUR_GEMINI_KEY

    # Limit to specific unit codes for testing
    python generate_solutions.py \
        --csv ./dataset/engineering_questions.csv \
        --api-key KEY \
        --unit ECU301

    # Resume after interruption (skips rows that already have a solution)
    python generate_solutions.py --csv ./dataset/... --api-key KEY  # already idempotent
"""

import os
import sys
import csv
import time
import argparse
import tempfile
from pathlib import Path

def check_deps():
    try:
        import openai
    except ImportError:
        print("Run: pip install openai")
        sys.exit(1)

check_deps()
from openai import OpenAI

RATE_LIMIT_DELAY = 5.0   # seconds between calls
MAX_RETRIES = 3
RETRY_BASE_DELAY = 10

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


OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = "google/gemini-2.0-flash-exp:free"

def call_ai(client: OpenAI, prompt: str, retries: int = MAX_RETRIES) -> str:
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4096,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            err = str(e).lower()
            if "401" in err or "403" in err or "unauthorized" in err:
                print(f"      [AUTH ERROR] {e}")
                return ""
            elif "429" in err or "rate" in err or "quota" in err:
                wait = RETRY_BASE_DELAY * (2 ** attempt)
                print(f"      [RATE LIMIT] Waiting {wait}s...")
                time.sleep(wait)
            elif attempt < retries - 1:
                wait = RETRY_BASE_DELAY * (attempt + 1)
                print(f"      [ERROR] {e} — retry in {wait}s")
                time.sleep(wait)
            else:
                print(f"      [FAILED] {e}")
                return ""
    return ""


def infer_discipline(unit_code: str, unit_name: str) -> str:
    text = f"{unit_code} {unit_name}".lower()
    if any(w in text for w in ["elect", "circuit", "power", "signal", "digital", "analog"]):
        return "Electrical & Electronics"
    if any(w in text for w in ["mech", "therm", "fluid", "stress", "dynamics"]):
        return "Mechanical"
    if any(w in text for w in ["civil", "struct", "concrete", "soil", "hydraul"]):
        return "Civil"
    if any(w in text for w in ["chem", "process", "react", "thermo"]):
        return "Chemical"
    return "Engineering"


def main():
    parser = argparse.ArgumentParser(description="EduReach Solution Generator")
    parser.add_argument("--csv",     required=True, help="Path to engineering_questions.csv")
    parser.add_argument("--api-key", required=True, help="Google Gemini API key")
    parser.add_argument("--unit",    default="",    help="Only process rows with this unit_code")
    parser.add_argument("--limit",   type=int, default=0, help="Max solutions to generate (0=all)")
    args = parser.parse_args()

    client = OpenAI(api_key=args.api_key, base_url=OPENROUTER_BASE_URL)

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"[ERROR] File not found: {csv_path}")
        sys.exit(1)

    # Read all rows
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    total = len(rows)
    needs_solution = [
        (i, r) for i, r in enumerate(rows)
        if not r.get("model_solution", "").strip()
        and (not args.unit or r.get("unit_code", "").strip().upper() == args.unit.upper())
    ]

    print(f"\n{'='*60}")
    print(f" EduReach Solution Generator")
    print(f"{'='*60}")
    print(f" Total rows      : {total}")
    print(f" Need solutions  : {len(needs_solution)}")
    if args.unit:
        print(f" Unit filter     : {args.unit}")
    if args.limit:
        needs_solution = needs_solution[: args.limit]
        print(f" Limit           : {args.limit}")
    print(f"{'='*60}\n")

    generated = 0
    failed = 0

    for count, (idx, row) in enumerate(needs_solution, 1):
        q_num  = row.get("question_number", "?")
        unit   = row.get("unit_code", "")
        source = row.get("source_file", "")
        marks  = row.get("marks", "")

        print(f"[{count}/{len(needs_solution)}] {source} | {unit} {q_num} ({marks} marks)")

        discipline = infer_discipline(row.get("unit_code", ""), row.get("unit_name", ""))
        prompt = SOLUTION_PROMPT.format(
            discipline=discipline,
            question_text=row.get("question_text", ""),
            unit_name=row.get("unit_name", ""),
            unit_code=row.get("unit_code", ""),
            marks=marks,
            question_type=row.get("question_type", ""),
        )

        solution = call_ai(client, prompt)
        if solution:
            rows[idx]["model_solution"] = solution
            rows[idx]["status"] = "solution_generated"
            generated += 1
            print(f"   ✓ Solution written ({len(solution)} chars)")
        else:
            failed += 1
            print(f"   ✗ Failed")

        # Save after every row (safe to interrupt)
        tmp_path = csv_path.with_suffix(".tmp")
        with open(tmp_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        tmp_path.replace(csv_path)

        time.sleep(RATE_LIMIT_DELAY)

    print(f"\n{'='*60}")
    print(f" Generated : {generated}")
    print(f" Failed    : {failed}")
    print(f" CSV saved : {csv_path}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()

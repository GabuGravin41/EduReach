#!/usr/bin/env python3
"""
reextract_failed.py — Re-extraction utility for EduReach Engineering Dataset
=============================================================================
Identifies papers that were processed but produced ZERO questions, removes
them from the extraction log, then re-runs the extractor on only those files.

Usage:
    # Step 1: See which files failed (dry run)
    python reextract_failed.py \
        --input  "../engineering papers" \
        --csv    ../dataset/engineering_questions.csv \
        --log    ../dataset/extraction_log.json \
        --dry-run

    # Step 2: Remove failed files from log and re-extract them
    python reextract_failed.py \
        --input  "../engineering papers" \
        --csv    ../dataset/engineering_questions.csv \
        --log    ../dataset/extraction_log.json \
        --output ../dataset \
        --env-file ../backend/.env

    # Limit to N files for a test run first
    python reextract_failed.py ... --limit 5
"""

import os
import sys
import csv
import json
import re
import time
import uuid
import zipfile
import argparse
import io
from pathlib import Path
from collections import Counter
from typing import List, Dict, Optional, Tuple, Any


def check_deps():
    missing = []
    for pkg, name in [("openai", "openai"), ("PyMuPDF", "fitz"), ("Pillow", "PIL")]:
        try:
            __import__(name)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"[ERROR] Missing: pip install {' '.join(missing)}")
        sys.exit(1)

check_deps()

from openai import OpenAI
import fitz
from PIL import Image
import base64

# ── Config ────────────────────────────────────────────────────────────────────

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL       = "google/gemini-2.0-flash-001"
PDF_DPI             = 200
JPEG_QUALITY        = 85
MAX_PAGES_PER_CALL  = 4      # slightly smaller batches for more focused extraction
RATE_LIMIT_DELAY    = 4.0
MAX_RETRIES         = 3
RETRY_BASE_DELAY    = 15

CSV_COLUMNS = [
    "question_id","source_file","unit_code","unit_name","institution",
    "year","semester","paper_type","question_number","question_text",
    "marks","question_type","difficulty","has_diagram","diagram_file",
    "diagram_description","tags","model_solution","status",
]

# ── Prompts ───────────────────────────────────────────────────────────────────

METADATA_PROMPT = """\
Look at this exam paper page and extract the header/cover metadata.
Return ONLY valid JSON — no markdown, no code fences, no explanation.

{
  "institution": "name of university/institution or null",
  "unit_code": "e.g. ECU301, EEE201, EMM302 — the course/unit code or null",
  "unit_name": "full course name or null",
  "paper_type": "one of: End of Semester, CAT, Supplementary, Mock, Assignment, Other",
  "year": "4-digit year as string or null",
  "semester": "1, 2, or null"
}
"""

EXTRACTION_PROMPT = """\
You are digitizing a university engineering exam paper into a structured dataset.

Extract EVERY question and sub-question from the provided page images.

RULES:
1. Include ALL questions — Q1, Q1(a), Q1(b)(i), Q2, Q3 etc. Do NOT skip any.
2. Render ALL mathematical expressions in LaTeX: inline $...$ and display $$...$$
3. Include all given values (resistances, voltages, dimensions, temperatures, etc.) exactly.
4. If the question references a circuit diagram, graph, table, or figure:
   - has_diagram = true
   - diagram_bbox = [ymin, xmin, ymax, xmax] on a 0-1000 scale relative to the page image
   - diagram_page = 0-based index of which page image contains the diagram
   - diagram_description = short description of what the diagram shows
5. Marks: look for numbers in brackets [X] or parentheses (X marks) or a marks column.
6. question_type: calculation | derivation | explanation | design | proof | sketch | mcq | other
7. difficulty: easy (1-3 marks, recall), medium (4-8 marks, application), hard (9+ marks, design/analysis)
8. Tags: 2-5 specific engineering topics, e.g. ["KVL", "Thevenin theorem", "AC circuits"]
9. Do NOT extract cover page text, instructions, or section headers.
10. If no identifiable exam questions are visible, return an empty array [].

THIS IS CRITICAL: Return ONLY a valid JSON array. No markdown, no prose, no code fences.

Example structure (return an ARRAY, not an object):
[
  {
    "question_number": "Q1(a)",
    "question_text": "Full text with $LaTeX$ math.",
    "marks": 5,
    "question_type": "calculation",
    "difficulty": "medium",
    "has_diagram": false,
    "diagram_description": null,
    "diagram_page": null,
    "diagram_bbox": null,
    "tags": ["KVL", "series circuit"]
  }
]
"""

# ── Helpers ───────────────────────────────────────────────────────────────────

def pdf_to_images(pdf_path: Path) -> List[Image.Image]:
    doc = fitz.open(str(pdf_path))
    images = []
    mat = fitz.Matrix(PDF_DPI / 72, PDF_DPI / 72)
    for page in doc:
        pix = page.get_pixmap(matrix=mat, alpha=False)
        images.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    doc.close()
    return images


def pil_to_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY)
    return base64.b64encode(buf.getvalue()).decode()


def crop_diagram(page_img: Image.Image, bbox: List[float], out_path: Path) -> bool:
    try:
        w, h = page_img.size
        ymin, xmin, ymax, xmax = bbox
        left, upper = int(xmin/1000*w), int(ymin/1000*h)
        right, lower = int(xmax/1000*w), int(ymax/1000*h)
        left, right = max(0, left), min(w, right)
        upper, lower = max(0, upper), min(h, lower)
        if right - left < 10 or lower - upper < 10:
            return False
        out_path.parent.mkdir(parents=True, exist_ok=True)
        page_img.crop((left, upper, right, lower)).save(str(out_path), "JPEG", quality=JPEG_QUALITY)
        return True
    except Exception as e:
        print(f"      [WARN] crop failed: {e}")
        return False


def ai_call(client: OpenAI, images: List[Image.Image], prompt: str, model: str) -> Optional[str]:
    content = [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{pil_to_b64(img)}"}}
        for img in images
    ]
    content.append({"type": "text", "text": prompt})

    for attempt in range(MAX_RETRIES):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": content}],
                max_tokens=1200,
            )
            return resp.choices[0].message.content
        except Exception as e:
            err = str(e).lower()
            if "401" in err or "403" in err or "unauthorized" in err:
                print(f"      [AUTH] {e}")
                return None
            wait = RETRY_BASE_DELAY * (2 ** attempt)
            if "429" in err or "rate" in err or "quota" in err:
                print(f"      [RATE LIMIT] waiting {wait}s...")
            elif attempt < MAX_RETRIES - 1:
                print(f"      [ERROR] {e} — retry in {wait}s")
            else:
                print(f"      [FAILED] {e}")
                return None
            time.sleep(wait)
    return None


def parse_json(text: str) -> Any:
    if not text:
        return None
    # Strip markdown fences
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Find array or object
    for pat in [r"(\[[\s\S]*?\])\s*$", r"(\[[\s\S]*\])", r"(\{[\s\S]*\})"]:
        m = re.search(pat, text)
        if m:
            try:
                return json.loads(m.group(1))
            except Exception:
                continue
    print(f"      [WARN] JSON parse failed on: {text[:200]}")
    return None


def get_metadata(client: OpenAI, page: Image.Image, model: str) -> Dict:
    raw = ai_call(client, [page], METADATA_PROMPT, model)
    time.sleep(RATE_LIMIT_DELAY)
    if not raw:
        return {}
    parsed = parse_json(raw)
    return parsed if isinstance(parsed, dict) else {}


def extract_questions(client: OpenAI, pages: List[Image.Image], page_offset: int, model: str) -> List[Dict]:
    raw = ai_call(client, pages, EXTRACTION_PROMPT, model)
    time.sleep(RATE_LIMIT_DELAY)
    if not raw:
        return []
    parsed = parse_json(raw)
    if not isinstance(parsed, list):
        # If dict was returned instead of list, try to find questions key
        if isinstance(parsed, dict):
            for key in ("questions", "items", "data"):
                if isinstance(parsed.get(key), list):
                    parsed = parsed[key]
                    break
            else:
                return []
        else:
            return []
    for q in parsed:
        if q.get("diagram_page") is not None:
            q["diagram_page"] = int(q["diagram_page"]) + page_offset
    return parsed


def process_paper(client: OpenAI, pages: List[Image.Image], source_name: str,
                  diagrams_dir: Path, model: str) -> List[Dict]:
    print(f"   Pages: {len(pages)}")

    meta = get_metadata(client, pages[0], model)
    print(f"   Meta: {meta.get('unit_code','?')} | {meta.get('unit_name','?')} | {meta.get('year','?')}")

    all_questions: List[Dict] = []
    batch_start = 0
    while batch_start < len(pages):
        batch = pages[batch_start: batch_start + MAX_PAGES_PER_CALL]
        print(f"   Pages {batch_start+1}–{batch_start+len(batch)}...", end=" ", flush=True)
        qs = extract_questions(client, batch, batch_start, model)
        print(f"{len(qs)} questions")
        all_questions.extend(qs)
        batch_start += MAX_PAGES_PER_CALL

    # Retry once if we got 0 and there are pages we haven't tried splitting differently
    if not all_questions and len(pages) > 1:
        print("   → 0 questions — retrying with page-by-page extraction...")
        for i, page in enumerate(pages):
            qs = extract_questions(client, [page], i, model)
            print(f"   Page {i+1}: {len(qs)} questions")
            all_questions.extend(qs)

    # Deduplicate by question_number
    seen: Dict[str, Dict] = {}
    for q in all_questions:
        key = str(q.get("question_number", "")).strip().lower()
        if key:
            seen[key] = q
    deduped = list(seen.values())
    print(f"   Total unique: {len(deduped)}")

    rows = []
    for q in deduped:
        qid = str(uuid.uuid4())[:8]
        diagram_file = ""
        if q.get("has_diagram") and q.get("diagram_bbox") and q.get("diagram_page") is not None:
            idx = int(q["diagram_page"])
            if 0 <= idx < len(pages):
                safe = re.sub(r"[^\w\-]", "_", source_name)
                qn   = re.sub(r"[^\w\-]", "_", str(q.get("question_number", qid)))
                dpath = diagrams_dir / f"{safe}_{qn}_{qid}.jpg"
                if crop_diagram(pages[idx], q["diagram_bbox"], dpath):
                    diagram_file = str(dpath)

        tags = q.get("tags", [])
        if isinstance(tags, list):
            tags = ", ".join(tags)

        rows.append({
            "question_id":         qid,
            "source_file":         source_name,
            "unit_code":           meta.get("unit_code") or "",
            "unit_name":           meta.get("unit_name") or "",
            "institution":         meta.get("institution") or "",
            "year":                meta.get("year") or "",
            "semester":            meta.get("semester") or "",
            "paper_type":          meta.get("paper_type") or "",
            "question_number":     q.get("question_number") or "",
            "question_text":       q.get("question_text") or "",
            "marks":               q.get("marks") or "",
            "question_type":       q.get("question_type") or "",
            "difficulty":          q.get("difficulty") or "",
            "has_diagram":         "true" if q.get("has_diagram") else "false",
            "diagram_file":        diagram_file,
            "diagram_description": q.get("diagram_description") or "",
            "tags":                tags,
            "model_solution":      "",
            "status":              "extracted",
        })
    return rows


def file_to_pages(file_path: Path, tmp_dir: Path):
    """Yield (source_name, [pages]) for each paper in the file."""
    ext = file_path.suffix.lower()
    if ext == ".zip":
        extract_to = tmp_dir / file_path.stem
        extract_to.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(file_path) as zf:
            zf.extractall(extract_to)
        for inner in sorted(extract_to.rglob("*")):
            if inner.is_file() and inner.suffix.lower() in (".pdf", ".png", ".jpg", ".jpeg"):
                yield from file_to_pages(inner, tmp_dir)
    elif ext == ".pdf":
        pages = pdf_to_images(file_path)
        if pages:
            yield file_path.name, pages
    elif ext in (".png", ".jpg", ".jpeg"):
        img = Image.open(file_path)
        if img.mode not in ("RGB",):
            img = img.convert("RGB")
        yield file_path.name, [img]


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Re-extract zero-yield engineering papers")
    parser.add_argument("--input",    required=True, help="Engineering papers folder")
    parser.add_argument("--csv",      required=True, help="Existing engineering_questions.csv")
    parser.add_argument("--log",      required=True, help="extraction_log.json")
    parser.add_argument("--output",   default="",    help="Output folder (default: same as --csv parent)")
    parser.add_argument("--env-file", default="",    help=".env file with OPENROUTER_API_KEY")
    parser.add_argument("--api-key",  default="",    help="OpenRouter API key")
    parser.add_argument("--dry-run",  action="store_true", help="List failed files without re-extracting")
    parser.add_argument("--limit",    type=int, default=0, help="Process at most N papers (0=all)")
    args = parser.parse_args()

    # ── Load API key and model ────────────────────────────────────────────────
    api_key = args.api_key
    model   = DEFAULT_MODEL
    if args.env_file:
        env_path = Path(args.env_file)
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if not api_key and k in ("OPENROUTER_API_KEY", "GEMINI_API_KEY") and v:
                    api_key = v
                if k == "OPENROUTER_MODEL" and v:
                    model = v
    if not api_key:
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key and not args.dry_run:
        print("[ERROR] No API key. Use --api-key or --env-file.")
        sys.exit(1)

    # ── Load what's already been extracted ───────────────────────────────────
    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"[ERROR] CSV not found: {csv_path}")
        sys.exit(1)

    with open(csv_path, newline="", encoding="utf-8") as f:
        existing_rows = list(csv.DictReader(f))
    extracted_sources = Counter(r["source_file"] for r in existing_rows)

    # ── Load log ──────────────────────────────────────────────────────────────
    log_path = Path(args.log)
    with open(log_path) as f:
        log = json.load(f)
    processed_log = set(log.get("processed", []))

    # ── Find input files ──────────────────────────────────────────────────────
    input_dir = Path(args.input)
    all_files = sorted(input_dir.glob("*"))
    supported_files = [
        f for f in all_files
        if f.is_file() and f.suffix.lower() in (".pdf", ".png", ".jpg", ".jpeg", ".zip")
    ]

    # ── Identify zero-yield files ─────────────────────────────────────────────
    # A file needs re-extraction if:
    #  1. It appears in the log as processed, AND
    #  2. No rows in the CSV have its basename as source_file
    # Also include files not in the log at all (completely missed).

    needs_reextract = []
    completely_missed = []

    for f in supported_files:
        rel = f"engineering papers/{f.name}"
        in_log = rel in processed_log
        has_questions = extracted_sources.get(f.name, 0) > 0

        if in_log and not has_questions:
            needs_reextract.append(f)
        elif not in_log:
            completely_missed.append(f)

    print(f"\n{'='*60}")
    print(f" Re-extraction Report")
    print(f"{'='*60}")
    print(f" Total input files   : {len(supported_files)}")
    print(f" Already extracted   : {len(extracted_sources)} unique source files")
    print(f" In log, zero yield  : {len(needs_reextract)}")
    print(f" Not in log at all   : {len(completely_missed)}")
    print(f"{'='*60}")

    to_process = needs_reextract + completely_missed

    if completely_missed:
        print("\nFiles completely missed (not in log):")
        for f in completely_missed:
            print(f"  {f.name}")

    print(f"\nFiles to re-extract ({len(to_process)} total):")
    for f in needs_reextract[:10]:
        print(f"  {f.name}")
    if len(needs_reextract) > 10:
        print(f"  ... and {len(needs_reextract)-10} more")

    if args.dry_run:
        print("\n[DRY RUN] No changes made.")
        return

    if not to_process:
        print("\nNothing to re-extract. All files have questions.")
        return

    if args.limit:
        to_process = to_process[:args.limit]
        print(f"\nLimiting to {args.limit} files.")

    # ── Remove zero-yield files from log so --resume picks them up ───────────
    # We'll process them ourselves here, then add them back to the log.
    log["processed"] = [p for p in log.get("processed", []) if Path(p).name not in {f.name for f in to_process}]

    # ── Set up output paths ───────────────────────────────────────────────────
    output_dir = Path(args.output) if args.output else csv_path.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    diagrams_dir = output_dir / "diagrams"
    diagrams_dir.mkdir(exist_ok=True)

    # ── Deduplication key from existing CSV ───────────────────────────────────
    existing_keys = set()
    for r in existing_rows:
        existing_keys.add((r["source_file"], r["question_number"]))

    client = OpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)
    print(f"\n Model: {model}")
    print(f" Processing {len(to_process)} files...\n")

    import tempfile
    new_rows = []
    total_new = 0
    total_failed = 0

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        for file_num, file_path in enumerate(to_process, 1):
            print(f"[{file_num}/{len(to_process)}] {file_path.name}")
            file_new = 0

            try:
                for source_name, pages in file_to_pages(file_path, tmp_path):
                    rows = process_paper(client, pages, source_name, diagrams_dir, model)

                    for row in rows:
                        key = (row["source_file"], row["question_number"])
                        if key not in existing_keys:
                            new_rows.append(row)
                            existing_keys.add(key)
                            file_new += 1

                log["processed"].append(f"engineering papers/{file_path.name}")

            except Exception as e:
                print(f"   [ERROR] {e}")
                total_failed += 1

            total_new += file_new
            print(f"   → {file_new} new questions added (running total: {total_new})\n")

            # Save after every file
            all_rows = existing_rows + new_rows
            tmp_csv = csv_path.with_suffix(".tmp")
            with open(tmp_csv, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
                writer.writeheader()
                writer.writerows(all_rows)
            tmp_csv.replace(csv_path)

            log["total_questions"] = len(all_rows)
            with open(log_path, "w") as f:
                json.dump(log, f, indent=2)

    print(f"\n{'='*60}")
    print(f" New questions added : {total_new}")
    print(f" Files failed        : {total_failed}")
    print(f" Total in CSV        : {len(existing_rows) + total_new}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()

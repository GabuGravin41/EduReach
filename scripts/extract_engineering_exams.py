#!/usr/bin/env python3
"""
EduReach Engineering Dataset Extractor
========================================
Batch-extracts exam questions from PDFs, images (PNG/JPEG/JPG), and ZIP archives
using Gemini 2.0 Flash via OpenRouter (free tier available).

Usage:
    python extract_engineering_exams.py --input ./papers --output ./dataset --api-key YOUR_OPENROUTER_KEY

    # Read key from backend .env automatically:
    python extract_engineering_exams.py --input ./papers --output ./dataset --env-file ../backend/.env

    # Resume an interrupted run:
    python extract_engineering_exams.py --input ./papers --output ./dataset --env-file ../backend/.env --resume

Output:
    dataset/
      engineering_questions.csv    <- main dataset (one row per question)
      diagrams/                    <- cropped diagram/figure images
      extraction_log.json          <- progress tracking (enables resume)
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
import traceback
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any
import io

# ── Dependency check ─────────────────────────────────────────────────────────

def check_deps():
    missing = []
    for pkg, import_name in [
        ("openai", "openai"),
        ("PyMuPDF", "fitz"),
        ("Pillow", "PIL"),
    ]:
        try:
            __import__(import_name)
        except ImportError:
            missing.append(pkg)
    if missing:
        print("\n[ERROR] Missing dependencies. Install with:")
        print(f"    pip install {' '.join(missing)}\n")
        sys.exit(1)

check_deps()

from openai import OpenAI
import fitz  # PyMuPDF
from PIL import Image
import base64

# ── Constants ────────────────────────────────────────────────────────────────

SUPPORTED_EXTS = {".pdf", ".png", ".jpg", ".jpeg"}
PDF_DPI = 200           # render resolution — high enough for clarity, not too slow
JPEG_QUALITY = 85
MAX_PAGES_PER_CALL = 5  # pages per API call (OpenRouter handles up to ~10 images)
RATE_LIMIT_DELAY = 3.0  # seconds between calls
MAX_RETRIES = 3
RETRY_BASE_DELAY = 15   # seconds (doubles on each retry)
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = "google/gemini-2.0-flash-001"  # set via OPENROUTER_MODEL in .env to override

CSV_COLUMNS = [
    "question_id",
    "source_file",
    "unit_code",
    "unit_name",
    "institution",
    "year",
    "semester",
    "paper_type",
    "question_number",
    "question_text",
    "marks",
    "question_type",
    "difficulty",
    "has_diagram",
    "diagram_file",
    "diagram_description",
    "tags",
    "model_solution",   # blank at extraction time — filled by generate_solutions.py
    "status",
]

# ── Gemini Prompts ────────────────────────────────────────────────────────────

METADATA_PROMPT = """\
Look at this exam paper page and extract the header/cover metadata.
Return ONLY valid JSON — no markdown, no code fences, no explanation.

{
  "institution": "name of university/institution or null",
  "unit_code": "e.g. ECU301, EEE201 — the course/unit code or null",
  "unit_name": "e.g. Electrical Circuits, Electronics I or null",
  "paper_type": "one of: End of Semester, CAT, Supplementary, Mock, Assignment, Other",
  "year": "4-digit year as string or null",
  "semester": "1, 2, or null",
  "instructions": "brief summary of any special exam instructions or null"
}
"""

EXTRACTION_PROMPT = """\
You are an expert engineering exam digitizer building a high-quality academic dataset.

Analyze ALL the provided exam paper page images and extract EVERY question and sub-question.

STRICT RULES:
1. Extract every question: Q1, Q1(a), Q1(b), Q2, Q2(i), Q2(ii), etc. Do not skip any.
2. Render ALL math using LaTeX — inline as $...$, display equations as $$...$$
3. If a question references or contains a circuit diagram, graph, waveform, table, or figure:
   - Set has_diagram = true
   - In diagram_bbox provide [ymin, xmin, ymax, xmax] on a 0-1000 scale relative to the page
   - diagram_page = 0-based index of which image (page) the diagram appears on
   - diagram_description = what the diagram shows (e.g. "Series RLC circuit with voltage source")
4. Infer difficulty: easy (recall/definition, 1-3 marks), medium (application, 4-8 marks), hard (design/analysis, 9+ marks or complex derivation).
5. Tags should be specific engineering topics, e.g. ["KVL", "mesh analysis", "Thevenin theorem"].
6. If a question continues across multiple pages, combine it into one entry.
7. Marks are usually shown as [X marks], (X marks), or in a marks column — extract as a number.
8. Do NOT include instructions, section headers, or cover page text as questions.
9. If a question gives data values (resistances, voltages, frequencies, etc.) include them exactly.

Return ONLY a valid JSON array. If no questions are on these pages return [].

[
  {
    "question_number": "Q1(a)",
    "question_text": "Full question text with $LaTeX$ math. Reference figures as [Figure 1].",
    "marks": 5,
    "question_type": "calculation",
    "difficulty": "medium",
    "has_diagram": false,
    "diagram_description": null,
    "diagram_page": null,
    "diagram_bbox": null,
    "tags": ["KVL", "mesh analysis"]
  }
]

question_type must be one of:
  calculation | derivation | explanation | design | proof | sketch | true_false | mcq | other
"""

# ── PDF / Image helpers ───────────────────────────────────────────────────────

def pdf_to_pil_images(pdf_path: Path) -> List[Image.Image]:
    """Render every page of a PDF to a PIL Image at PDF_DPI resolution."""
    doc = fitz.open(str(pdf_path))
    images = []
    mat = fitz.Matrix(PDF_DPI / 72, PDF_DPI / 72)
    for page in doc:
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        images.append(img)
    doc.close()
    return images


def load_image_file(img_path: Path) -> Image.Image:
    """Load a PNG/JPEG file as a PIL Image, converting to RGB if needed."""
    img = Image.open(img_path)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    return img


def pil_to_b64(img: Image.Image) -> str:
    """Convert a PIL Image to a base64-encoded JPEG string for the OpenAI vision format."""
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def crop_diagram(
    page_img: Image.Image,
    bbox: List[float],
    out_path: Path,
) -> bool:
    """
    Crop a diagram from a page image using a normalised bbox [ymin, xmin, ymax, xmax] (0-1000).
    Saves as JPEG to out_path. Returns True on success.
    """
    try:
        w, h = page_img.size
        ymin, xmin, ymax, xmax = bbox
        left   = int(xmin / 1000 * w)
        upper  = int(ymin / 1000 * h)
        right  = int(xmax / 1000 * w)
        lower  = int(ymax / 1000 * h)
        # Clamp to image bounds and ensure minimum 10px dimensions
        left, right = max(0, left), min(w, right)
        upper, lower = max(0, upper), min(h, lower)
        if right - left < 10 or lower - upper < 10:
            return False
        cropped = page_img.crop((left, upper, right, lower))
        out_path.parent.mkdir(parents=True, exist_ok=True)
        cropped.save(str(out_path), "JPEG", quality=JPEG_QUALITY)
        return True
    except Exception as e:
        print(f"      [WARN] Diagram crop failed: {e}")
        return False


# ── Gemini API ────────────────────────────────────────────────────────────────

def ai_call(client: OpenAI, images: List[Image.Image], prompt: str, retries: int = MAX_RETRIES) -> Optional[str]:
    """
    Send a multimodal request to Gemini via OpenRouter.
    Images are sent as base64 data URLs in the OpenAI vision format.
    Returns the text response or None on failure.
    """
    # Build content: one image block per page, then the text prompt
    content: List[Dict] = []
    for img in images:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{pil_to_b64(img)}"},
        })
    content.append({"type": "text", "text": prompt})

    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": content}],
                max_tokens=4096,
            )
            return response.choices[0].message.content
        except Exception as e:
            err = str(e).lower()
            if "401" in err or "403" in err or "invalid" in err or "unauthorized" in err:
                print(f"      [AUTH ERROR] {e}")
                print(f"      Check your OpenRouter API key at openrouter.ai/keys")
                return None
            elif "429" in err or "rate" in err or "quota" in err or "limit" in err:
                wait = RETRY_BASE_DELAY * (2 ** attempt)
                print(f"      [RATE LIMIT] Waiting {wait}s before retry {attempt + 1}/{retries}...")
                time.sleep(wait)
            elif attempt < retries - 1:
                wait = RETRY_BASE_DELAY * (attempt + 1)
                print(f"      [ERROR] {e} — retrying in {wait}s...")
                time.sleep(wait)
            else:
                print(f"      [FAILED] after {retries} attempts: {e}")
                return None
    return None


def parse_json_response(text: str) -> Any:
    """Extract and parse JSON from a Gemini response (strips markdown fences if present)."""
    if not text:
        return None
    # Strip markdown code fences
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find the JSON array/object within the text
        for pattern in [r"(\[[\s\S]*\])", r"(\{[\s\S]*\})"]:
            m = re.search(pattern, text)
            if m:
                try:
                    return json.loads(m.group(1))
                except json.JSONDecodeError:
                    continue
    print(f"      [WARN] Could not parse JSON from response:\n{text[:300]}...")
    return None


# ── Paper metadata extraction ─────────────────────────────────────────────────

def get_paper_metadata(client: OpenAI, first_page_img: Image.Image) -> Dict:
    """Extract metadata (unit code, year, institution, etc.) from the first page."""
    raw = ai_call(client, [first_page_img], METADATA_PROMPT)
    time.sleep(RATE_LIMIT_DELAY)
    if not raw:
        return {}
    parsed = parse_json_response(raw)
    if isinstance(parsed, dict):
        return parsed
    return {}


# ── Question extraction ───────────────────────────────────────────────────────

def extract_questions_from_pages(
    client: OpenAI,
    pages: List[Image.Image],
    page_offset: int = 0,
) -> List[Dict]:
    """
    Send up to MAX_PAGES_PER_CALL pages to Gemini via OpenRouter and return extracted questions.
    page_offset is added to diagram_page indices so they refer to the correct original page.
    """
    raw = ai_call(client, pages, EXTRACTION_PROMPT)
    time.sleep(RATE_LIMIT_DELAY)
    if not raw:
        return []
    questions = parse_json_response(raw)
    if not isinstance(questions, list):
        return []
    # Adjust diagram_page to absolute page index
    for q in questions:
        if q.get("diagram_page") is not None:
            q["diagram_page"] = int(q["diagram_page"]) + page_offset
    return questions


# ── Per-paper processing ──────────────────────────────────────────────────────

def process_paper(
    client: OpenAI,
    pages: List[Image.Image],
    source_name: str,
    diagrams_dir: Path,
) -> List[Dict]:
    """
    Process a single paper (list of page images) and return a list of CSV row dicts.
    """
    print(f"   Pages: {len(pages)}")

    # Step 1: Metadata from first page
    print("   Extracting metadata...")
    meta = get_paper_metadata(client, pages[0])
    print(f"   Metadata: {meta.get('unit_code', '?')} | {meta.get('unit_name', '?')} | {meta.get('year', '?')}")

    # Step 2: Extract questions in page batches
    all_questions: List[Dict] = []
    batch_start = 0
    while batch_start < len(pages):
        batch = pages[batch_start: batch_start + MAX_PAGES_PER_CALL]
        print(f"   Extracting questions from pages {batch_start + 1}–{batch_start + len(batch)}...")
        questions = extract_questions_from_pages(client, batch, page_offset=batch_start)
        print(f"   → {len(questions)} questions extracted")
        all_questions.extend(questions)
        batch_start += MAX_PAGES_PER_CALL

    # Step 3: Deduplicate by question_number (keep later entry which may have more info)
    seen: Dict[str, Dict] = {}
    for q in all_questions:
        key = str(q.get("question_number", "")).strip().lower()
        if key:
            seen[key] = q
    deduped = list(seen.values())
    print(f"   Total unique questions: {len(deduped)}")

    # Step 4: Build CSV rows and crop diagrams
    rows = []
    for q in deduped:
        qid = str(uuid.uuid4())[:8]
        diagram_file = ""

        if q.get("has_diagram") and q.get("diagram_bbox") and q.get("diagram_page") is not None:
            page_idx = int(q["diagram_page"])
            if 0 <= page_idx < len(pages):
                safe_name = re.sub(r"[^\w\-]", "_", source_name)
                safe_qnum = re.sub(r"[^\w\-]", "_", str(q.get("question_number", qid)))
                diagram_filename = f"{safe_name}_{safe_qnum}_{qid}.jpg"
                diagram_path = diagrams_dir / diagram_filename
                if crop_diagram(pages[page_idx], q["diagram_bbox"], diagram_path):
                    diagram_file = str(diagram_path)

        tags = q.get("tags", [])
        if isinstance(tags, list):
            tags = ", ".join(tags)

        rows.append({
            "question_id":       qid,
            "source_file":       source_name,
            "unit_code":         meta.get("unit_code") or "",
            "unit_name":         meta.get("unit_name") or "",
            "institution":       meta.get("institution") or "",
            "year":              meta.get("year") or "",
            "semester":          meta.get("semester") or "",
            "paper_type":        meta.get("paper_type") or "",
            "question_number":   q.get("question_number") or "",
            "question_text":     q.get("question_text") or "",
            "marks":             q.get("marks") or "",
            "question_type":     q.get("question_type") or "",
            "difficulty":        q.get("difficulty") or "",
            "has_diagram":       "true" if q.get("has_diagram") else "false",
            "diagram_file":      diagram_file,
            "diagram_description": q.get("diagram_description") or "",
            "tags":              tags,
            "model_solution":    "",   # filled later by generate_solutions.py
            "status":            "extracted",
        })

    return rows


# ── File dispatcher ───────────────────────────────────────────────────────────

def collect_files(input_path: Path) -> List[Path]:
    """Recursively collect all supported files from a path (file or directory)."""
    if input_path.is_file():
        return [input_path] if input_path.suffix.lower() in SUPPORTED_EXTS | {".zip"} else []
    files = []
    for p in sorted(input_path.rglob("*")):
        if p.is_file() and p.suffix.lower() in (SUPPORTED_EXTS | {".zip"}):
            files.append(p)
    return files


def file_to_pages(file_path: Path, tmp_dir: Path) -> List[Tuple[str, List[Image.Image]]]:
    """
    Convert a file to a list of (source_name, [pages]) tuples.
    ZIP files are extracted and each contained file is processed separately.
    Returns a list because a ZIP can contain multiple papers.
    """
    ext = file_path.suffix.lower()

    if ext == ".zip":
        results = []
        extract_to = tmp_dir / file_path.stem
        extract_to.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(file_path) as zf:
            zf.extractall(extract_to)
        for p in sorted(extract_to.rglob("*")):
            if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS:
                sub_results = file_to_pages(p, tmp_dir)
                results.extend(sub_results)
        return results

    elif ext == ".pdf":
        pages = pdf_to_pil_images(file_path)
        return [(file_path.name, pages)]

    elif ext in {".png", ".jpg", ".jpeg"}:
        img = load_image_file(file_path)
        return [(file_path.name, [img])]

    return []


# ── Progress / logging ────────────────────────────────────────────────────────

def load_log(log_path: Path) -> Dict:
    if log_path.exists():
        with open(log_path) as f:
            return json.load(f)
    return {"processed": [], "failed": [], "total_questions": 0}


def save_log(log_path: Path, log: Dict):
    with open(log_path, "w") as f:
        json.dump(log, f, indent=2)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="EduReach Engineering Exam Question Extractor"
    )
    parser.add_argument("--input",    required=True,  help="Input folder or file (PDF/PNG/JPG/ZIP)")
    parser.add_argument("--output",   required=True,  help="Output folder (will be created)")
    parser.add_argument("--api-key",  default="",     help="Google Gemini API key (or set via GEMINI_API_KEY env var)")
    parser.add_argument("--env-file", default="",     help="Path to .env file to load GEMINI_API_KEY from")
    parser.add_argument("--resume",   action="store_true", help="Skip already-processed files")
    parser.add_argument("--limit",    type=int, default=0, help="Max papers to process (0 = all)")
    args = parser.parse_args()

    # Resolve API key: flag > .env file > environment variable
    api_key = args.api_key
    global MODEL
    if args.env_file:
        env_path = Path(args.env_file)
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if line.startswith("#") or "=" not in line:
                    continue
                key_name, _, val = line.partition("=")
                val = val.strip().strip('"').strip("'")
                if not val:
                    continue
                if key_name.strip() in ("OPENROUTER_API_KEY", "GEMINI_API_KEY") and not api_key:
                    api_key = val
                    print(f" Key source : {key_name.strip()} from {args.env_file}")
                elif key_name.strip() == "OPENROUTER_MODEL":
                    MODEL = val
                    print(f" Model override: {MODEL}")
    if not api_key:
        api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("[ERROR] No API key provided. Use --api-key, --env-file, or set GEMINI_API_KEY env var.")
        sys.exit(1)
    args.api_key = api_key

    # ── Setup ─────────────────────────────────────────────────────────────────
    client = OpenAI(
        api_key=args.api_key,
        base_url=OPENROUTER_BASE_URL,
    )
    print(f" Model: {MODEL}")

    input_path  = Path(args.input)
    output_path = Path(args.output)
    diagrams_dir = output_path / "diagrams"
    csv_path    = output_path / "engineering_questions.csv"
    log_path    = output_path / "extraction_log.json"

    output_path.mkdir(parents=True, exist_ok=True)
    diagrams_dir.mkdir(parents=True, exist_ok=True)

    # ── Collect files ─────────────────────────────────────────────────────────
    all_files = collect_files(input_path)
    print(f"\n{'='*60}")
    print(f" EduReach Engineering Dataset Extractor")
    print(f"{'='*60}")
    print(f" Input:  {input_path}")
    print(f" Output: {output_path}")
    print(f" Files found: {len(all_files)}")

    log = load_log(log_path)
    processed_set = set(log["processed"])

    if args.resume:
        all_files = [f for f in all_files if str(f) not in processed_set]
        print(f" Resuming: {len(all_files)} files remaining")

    if args.limit:
        all_files = all_files[: args.limit]
        print(f" Limit: processing {len(all_files)} files")

    print(f"{'='*60}\n")

    # ── CSV setup ─────────────────────────────────────────────────────────────
    csv_exists = csv_path.exists() and args.resume
    csv_file = open(csv_path, "a" if csv_exists else "w", newline="", encoding="utf-8")
    writer = csv.DictWriter(csv_file, fieldnames=CSV_COLUMNS)
    if not csv_exists:
        writer.writeheader()

    # ── Process ───────────────────────────────────────────────────────────────
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)

        for i, file_path in enumerate(all_files, 1):
            print(f"[{i}/{len(all_files)}] {file_path.name}")
            try:
                papers = file_to_pages(file_path, tmp_dir)
                if not papers:
                    print("   [SKIP] No processable pages found")
                    log["processed"].append(str(file_path))
                    save_log(log_path, log)
                    continue

                for source_name, pages in papers:
                    if not pages:
                        continue
                    print(f"   Paper: {source_name}")
                    rows = process_paper(client, pages, source_name, diagrams_dir)
                    for row in rows:
                        writer.writerow(row)
                    csv_file.flush()
                    log["total_questions"] += len(rows)
                    print(f"   ✓ {len(rows)} questions written to CSV\n")

                log["processed"].append(str(file_path))
                save_log(log_path, log)

            except KeyboardInterrupt:
                print("\n\n[INTERRUPTED] Progress saved. Run with --resume to continue.")
                csv_file.close()
                save_log(log_path, log)
                sys.exit(0)
            except Exception as e:
                print(f"   [ERROR] {e}")
                traceback.print_exc()
                log["failed"].append({"file": str(file_path), "error": str(e)})
                save_log(log_path, log)

    csv_file.close()

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f" DONE")
    print(f" Papers processed : {len(log['processed'])}")
    print(f" Papers failed    : {len(log['failed'])}")
    print(f" Total questions  : {log['total_questions']}")
    print(f" CSV              : {csv_path}")
    print(f" Diagrams         : {diagrams_dir}")
    print(f"{'='*60}\n")

    if log["failed"]:
        print("Failed files:")
        for f in log["failed"]:
            print(f"  {f['file']} — {f['error']}")


if __name__ == "__main__":
    main()

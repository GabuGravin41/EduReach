# Engineering Exam Extractor

Batch-extracts questions from engineering past papers (PDF, PNG, JPG, ZIP) using Google Gemini 1.5 Flash.

## Setup

```bash
cd scripts/
pip install -r requirements.txt
```

Get a free Gemini API key at: https://aistudio.google.com/app/apikey

Free tier limits: **1,500 requests/day, 15 requests/minute** — enough for ~150 papers/day at no cost.

## Usage

```bash
# Basic — process a folder of papers
python extract_engineering_exams.py \
  --input  ./papers \
  --output ./dataset \
  --api-key YOUR_GEMINI_API_KEY

# Resume an interrupted run (skips already-done files)
python extract_engineering_exams.py \
  --input  ./papers \
  --output ./dataset \
  --api-key YOUR_GEMINI_API_KEY \
  --resume

# Test on a small batch first
python extract_engineering_exams.py \
  --input  ./papers \
  --output ./dataset \
  --api-key YOUR_GEMINI_API_KEY \
  --limit 5
```

## Input formats supported

| Format | Notes |
|--------|-------|
| `.pdf` | Multi-page, rendered at 200 DPI |
| `.png` | Single image treated as one page |
| `.jpg` / `.jpeg` | Single image treated as one page |
| `.zip` | Extracted recursively; each file inside is processed |

## Output

```
dataset/
  engineering_questions.csv   ← main dataset
  diagrams/                   ← cropped diagram images (JPEG)
  extraction_log.json         ← tracks progress (enables --resume)
```

### CSV columns

| Column | Description |
|--------|-------------|
| `question_id` | Unique ID (8-char UUID fragment) |
| `source_file` | Original filename |
| `unit_code` | e.g. ECU301 |
| `unit_name` | e.g. Electrical Circuits |
| `institution` | e.g. Kenyatta University |
| `year` | 4-digit year |
| `semester` | 1 or 2 |
| `paper_type` | End of Semester / CAT / Supplementary / etc. |
| `question_number` | e.g. Q1(a) |
| `question_text` | Full question with LaTeX math ($...$, $$...$$) |
| `marks` | Marks allocated |
| `question_type` | calculation / derivation / explanation / design / proof / sketch / mcq |
| `difficulty` | easy / medium / hard |
| `has_diagram` | true / false |
| `diagram_file` | Path to cropped diagram image (if any) |
| `diagram_description` | What the diagram shows |
| `tags` | Comma-separated topics, e.g. "KVL, mesh analysis" |
| `model_solution` | Full step-by-step worked solution with LaTeX |
| `status` | extracted / needs_review |

## Cost estimate

- Gemini 1.5 Flash: **free** up to 1,500 requests/day
- A 10-page paper = ~3 API calls (metadata + 2 batches of 5 pages)
- **~500 papers = free** if spread over 3–4 days
- Beyond free tier: ~$0.075 per 1M tokens (very cheap — a full paper costs fractions of a cent)

## Tips

- Run `--limit 3` first to check output quality before bulk processing
- The script auto-saves progress after each file — safe to Ctrl+C and resume
- Papers with handwritten answers won't extract well — skip those
- If a paper has no unit code on page 1, edit the CSV manually for those rows

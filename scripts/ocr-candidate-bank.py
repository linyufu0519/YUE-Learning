"""Render a candidate PDF and save RapidOCR evidence as UTF-8 JSON.

Install with:
    python -m pip install pymupdf rapidocr_onnxruntime
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pymupdf
from rapidocr_onnxruntime import RapidOCR


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: python scripts/ocr-candidate-bank.py <source.pdf> <output-directory>", file=sys.stderr)
        return 2

    source = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    document = pymupdf.open(source)
    engine = RapidOCR()
    pages = []

    for page_index, page in enumerate(document):
        image_path = output / f"page-{page_index + 1:02}.png"
        page.get_pixmap(matrix=pymupdf.Matrix(3, 3), alpha=False).save(image_path)
        result, _ = engine(str(image_path))
        lines = [
            {
                "text": text,
                "confidence": round(float(confidence), 4),
                "box": box,
            }
            for box, text, confidence in (result or [])
        ]
        pages.append({"page": page_index + 1, "lines": lines})

    manifest = {
        "sourceFileName": source.name,
        "method": "page-image-rapidocr",
        "renderScale": 3,
        "pageCount": len(pages),
        "pages": pages,
    }
    (output / "ocr-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({"pageCount": len(pages)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

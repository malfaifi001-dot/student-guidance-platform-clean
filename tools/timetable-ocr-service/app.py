from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from statistics import fmean
from typing import Any

import pypdfium2 as pdfium
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps

# PaddlePaddle's oneDNN path can fail on some Windows CPU builds while
# converting OCR model attributes. Keep the local service on the stable CPU
# path unless a developer explicitly opts in.
os.environ.setdefault("FLAGS_use_onednn", "0")

try:
    from paddleocr import PaddleOCR
except Exception as exc:  # pragma: no cover - reported through /health and /ocr
    PaddleOCR = None  # type: ignore[assignment]
    PADDLE_IMPORT_ERROR = str(exc)
else:
    PADDLE_IMPORT_ERROR = None


SERVICE_NAME = "teachix-timetable-ocr"
MAX_UPLOAD_BYTES = int(os.getenv("TIMETABLE_OCR_MAX_BYTES", str(25 * 1024 * 1024)))
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}

app = FastAPI(title=SERVICE_NAME)
_ocr_engine: Any = None


def _extension(filename: str) -> str:
    return Path(filename or "").suffix.lower()


def _validate_upload(file: UploadFile, content: bytes) -> None:
    extension = _extension(file.filename or "")
    content_type = (file.content_type or "").lower()
    if extension not in ALLOWED_EXTENSIONS or content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported timetable file type.")
    if len(content) == 0 or len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Timetable file size is invalid.")


def _engine() -> Any:
    global _ocr_engine
    if _ocr_engine is not None:
        return _ocr_engine
    if PaddleOCR is None:
        raise HTTPException(
            status_code=503,
            detail=f"PaddleOCR is unavailable: {PADDLE_IMPORT_ERROR}",
        )

    # Arabic is intentional. These options avoid expensive document transforms
    # and leave timetable grid geometry as close to the source as possible.
    try:
        _ocr_engine = PaddleOCR(
            lang="ar",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            enable_mkldnn=False,
        )
    except TypeError:
        # Compatibility with older PaddleOCR releases.
        _ocr_engine = PaddleOCR(lang="ar", use_angle_cls=True)
    return _ocr_engine


def _json_value(value: Any) -> Any:
    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    return value


def _blocks_from_result(result: Any, page_number: int) -> list[dict[str, Any]]:
    payload = getattr(result, "json", None)
    if callable(payload):
        payload = payload()
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            payload = None
    if isinstance(payload, dict):
        payload = payload.get("res", payload)
        texts = payload.get("rec_texts", [])
        scores = payload.get("rec_scores", [])
        boxes = payload.get("rec_polys", payload.get("dt_polys", []))
        return [
            {
                "text": str(text),
                "confidence": float(scores[index]) if index < len(scores) else None,
                "box": _json_value(boxes[index]) if index < len(boxes) else None,
                "page": page_number,
            }
            for index, text in enumerate(texts)
            if str(text).strip()
        ]

    # Older PaddleOCR returns [[[[box], (text, score)], ...]].
    blocks: list[dict[str, Any]] = []
    for line in result or []:
        for item in line or []:
            if not isinstance(item, (list, tuple)) or len(item) < 2:
                continue
            box, text_score = item[0], item[1]
            if not isinstance(text_score, (list, tuple)) or not text_score:
                continue
            blocks.append(
                {
                    "text": str(text_score[0]),
                    "confidence": float(text_score[1]) if len(text_score) > 1 else None,
                    "box": _json_value(box),
                    "page": page_number,
                }
            )
    return blocks


def _run_page(path: str, page_number: int) -> list[dict[str, Any]]:
    engine = _engine()
    try:
        results = engine.predict(path)
    except AttributeError:
        results = engine.ocr(path, cls=True)
    if not isinstance(results, (list, tuple)):
        results = [results]
    blocks: list[dict[str, Any]] = []
    for result in results:
        blocks.extend(_blocks_from_result(result, page_number))
    return blocks


def _prepare_image(source: Path, destination: Path) -> None:
    with Image.open(source) as image:
        prepared = ImageOps.exif_transpose(image).convert("RGB")
        # Keep small timetable text readable without allowing extreme uploads
        # to consume unbounded memory.
        prepared.thumbnail((2800, 2800), Image.Resampling.LANCZOS)
        prepared.save(destination, format="PNG", optimize=True)


def _prepare_pages(source: Path, extension: str, temp_dir: Path) -> list[Path]:
    if extension != ".pdf":
        output = temp_dir / "page-1.png"
        _prepare_image(source, output)
        return [output]

    pages: list[Path] = []
    document = pdfium.PdfDocument(str(source))
    try:
        for index in range(len(document)):
            page = document[index]
            bitmap = page.render(scale=2.0)
            output = temp_dir / f"page-{index + 1}.png"
            bitmap.to_pil().convert("RGB").save(output, format="PNG", optimize=True)
            pages.append(output)
            page.close()
    finally:
        document.close()
    return pages


def _extract(content: bytes, filename: str) -> dict[str, Any]:
    extension = _extension(filename)
    with tempfile.TemporaryDirectory(prefix="teachix-timetable-ocr-") as directory:
        temp_dir = Path(directory)
        source = temp_dir / f"source{extension}"
        source.write_bytes(content)
        page_paths = _prepare_pages(source, extension, temp_dir)
        pages = []
        for index, page_path in enumerate(page_paths, start=1):
            blocks = _run_page(str(page_path), index)
            pages.append(
                {
                    "page": index,
                    "text": "\n".join(block["text"] for block in blocks),
                    "blocks": blocks,
                }
            )

    blocks = [block for page in pages for block in page["blocks"]]
    scores = [block["confidence"] for block in blocks if block.get("confidence") is not None]
    return {
        "text": "\n".join(page["text"] for page in pages),
        # Keep tables null so the Teachix normalizer can use OCR text while the
        # geometry remains available in pages/blocks for the next phase.
        "tables": None,
        "confidence": fmean(scores) if scores else None,
        "pages": pages,
        "blocks": blocks,
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": SERVICE_NAME,
        "paddleocr_available": PaddleOCR is not None,
    }


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)) -> dict[str, Any]:
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    _validate_upload(file, content)
    try:
        return _extract(content, file.filename or "timetable-upload")
    except HTTPException:
        raise
    except Exception as exc:
        # Development-safe message; do not leak a Python traceback to Teachix.
        raise HTTPException(status_code=422, detail=f"OCR processing failed: {exc}") from None

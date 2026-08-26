# Teachix Timetable OCR Service

This is a separate local HTTP service for timetable image and scanned-PDF OCR. It is not part of the Next.js runtime.

## PowerShell setup

From the repository root:

```powershell
Set-Location .\tools\timetable-ocr-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PaddlePaddle does not yet publish a compatible wheel for the installed Python version, create the virtual environment with a supported Python 3.11 executable instead:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Start

```powershell
python -m uvicorn app:app --host 127.0.0.1 --port 8001
```

The first OCR request may download PaddleOCR models into the local Python cache. Do not commit that cache.

## Health check

In a second PowerShell window:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health
```

## Test an Arabic image

```powershell
$image = "C:\path\to\arabic-timetable.png"
Invoke-RestMethod -Uri http://127.0.0.1:8001/ocr -Method Post -Form @{ file = Get-Item $image }
```

The response contains UTF-8 `text`, average `confidence`, and `pages`/`blocks` with page numbers and OCR geometry. The service does not assign timetable meaning to OCR output.

## Connect Teachix

Add this line manually to the local `.env` file (do not commit it):

```text
TIMETABLE_OCR_URL=http://127.0.0.1:8001
```

Restart the Next.js development server after changing `.env`:

```powershell
Set-Location ..\..
npm run dev
```

The existing Teachix adapter appends `/ocr` when needed and posts the selected image/PDF to this endpoint. Excel files continue to use the local Node `xlsx` parser.

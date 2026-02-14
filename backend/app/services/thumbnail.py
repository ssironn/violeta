import os
from pathlib import Path
from pdf2image import convert_from_path

UPLOAD_DIR = Path("uploads/publications")

def ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def save_pdf(publication_id: str, pdf_bytes: bytes) -> str:
    ensure_upload_dir()
    pdf_path = UPLOAD_DIR / f"{publication_id}.pdf"
    pdf_path.write_bytes(pdf_bytes)
    return str(pdf_path)

def generate_thumbnail(publication_id: str) -> str:
    ensure_upload_dir()
    pdf_path = UPLOAD_DIR / f"{publication_id}.pdf"
    thumb_path = UPLOAD_DIR / f"{publication_id}_thumb.png"
    images = convert_from_path(str(pdf_path), first_page=1, last_page=1, size=(400, None))
    if images:
        images[0].save(str(thumb_path), "PNG")
    return str(thumb_path)

def delete_publication_files(publication_id: str):
    pdf_path = UPLOAD_DIR / f"{publication_id}.pdf"
    thumb_path = UPLOAD_DIR / f"{publication_id}_thumb.png"
    for p in [pdf_path, thumb_path]:
        if p.exists():
            p.unlink()

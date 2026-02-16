import asyncio
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import JSONResponse, Response

router = APIRouter(prefix="/api", tags=["compile"])


@router.post("/compile")
async def compile_latex(request: Request):
    form = await request.form()
    tmp_dir = tempfile.mkdtemp(prefix="violeta_")
    try:
        file = form["file"]
        tex_path = Path(tmp_dir) / "document.tex"
        tex_path.write_bytes(await file.read())

        for asset in form.getlist("assets"):
            name = Path(asset.filename).name
            if not name:
                continue
            asset_path = Path(tmp_dir) / name
            asset_path.write_bytes(await asset.read())

        proc = await asyncio.create_subprocess_exec(
            "tectonic", "document.tex",
            cwd=tmp_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        log = (stdout + stderr).decode(errors="replace")

        pdf_path = Path(tmp_dir) / "document.pdf"

        if proc.returncode != 0 or not pdf_path.exists():
            error = _extract_error(log)
            return JSONResponse(
                status_code=422,
                content={"error": error, "log": log},
            )

        pdf_bytes = pdf_path.read_bytes()
        return Response(content=pdf_bytes, media_type="application/pdf")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _extract_error(log: str) -> str:
    lines = log.split("\n")
    error_lines = [l for l in lines if l.startswith("error:") or l.startswith("!")]
    if error_lines:
        return "\n".join(error_lines[:5])
    return "Compilação falhou"

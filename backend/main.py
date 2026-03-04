"""
Solar Panel Analysis API — FastAPI + Ladybug Tools
"""
from __future__ import annotations
import os
import uuid
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from simulation.epw_utils import epw_summary
from simulation.geometry import parse_obj, build_box_building
from simulation.solar_analysis import run_simulation

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/tmp/solar_uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Solar Panel Analysis API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── session store (in-memory; replace with Redis/DB for production) ──────────
_sessions: dict[str, dict] = {}


# ─── health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ─── EPW upload ───────────────────────────────────────────────────────────────

@app.post("/api/epw/upload")
async def upload_epw(file: UploadFile = File(...)):
    """Upload an EPW weather file and return location + radiation summary."""
    if not file.filename.endswith(".epw"):
        raise HTTPException(400, "Only .epw files are accepted")

    session_id = str(uuid.uuid4())
    epw_path = UPLOAD_DIR / f"{session_id}.epw"
    epw_path.write_bytes(await file.read())

    try:
        summary = epw_summary(str(epw_path))
    except Exception as exc:
        epw_path.unlink(missing_ok=True)
        raise HTTPException(422, f"Failed to parse EPW: {exc}") from exc

    _sessions[session_id] = {"epw_path": str(epw_path)}
    return {"session_id": session_id, **summary}


# ─── OBJ model upload ─────────────────────────────────────────────────────────

@app.post("/api/model/upload-obj")
async def upload_obj(session_id: str, file: UploadFile = File(...)):
    """Upload an OBJ 3-D model and attach it to an EPW session."""
    _require_session(session_id)

    content = (await file.read()).decode("utf-8", errors="ignore")
    try:
        faces = parse_obj(content)
    except Exception as exc:
        raise HTTPException(422, f"Failed to parse OBJ: {exc}") from exc

    if not faces:
        raise HTTPException(422, "No geometry found in OBJ file")

    _sessions[session_id]["faces"] = faces
    return {"face_count": len(faces), "faces": faces}


# ─── parametric building ──────────────────────────────────────────────────────

class BuildingParams(BaseModel):
    session_id: str
    width: float = Field(10.0, gt=0, description="East-West dimension (m)")
    depth: float = Field(8.0, gt=0, description="North-South dimension (m)")
    height: float = Field(3.0, gt=0, description="Wall height (m)")
    roof_slope_deg: float = Field(0.0, ge=0, le=60, description="Roof tilt (degrees)")


@app.post("/api/model/parametric")
def parametric_building(params: BuildingParams):
    """Generate a simple box building and attach it to an EPW session."""
    _require_session(params.session_id)

    faces = build_box_building(
        width=params.width,
        depth=params.depth,
        height=params.height,
        roof_slope_deg=params.roof_slope_deg,
    )
    _sessions[params.session_id]["faces"] = faces
    return {"face_count": len(faces), "faces": faces}


# ─── simulation ───────────────────────────────────────────────────────────────

class SimulationRequest(BaseModel):
    session_id: str


@app.post("/api/simulate")
def simulate(req: SimulationRequest):
    """
    Run the annual solar radiation simulation.
    Requires a session with both an EPW file and a geometry model.
    """
    session = _require_session(req.session_id)

    if "epw_path" not in session:
        raise HTTPException(400, "No EPW file attached to this session")
    if "faces" not in session:
        raise HTTPException(400, "No geometry attached — upload an OBJ or use /api/model/parametric first")

    try:
        results = run_simulation(session["epw_path"], session["faces"])
    except Exception as exc:
        raise HTTPException(500, f"Simulation error: {exc}") from exc

    best = results[0] if results else None
    return {
        "session_id": req.session_id,
        "face_count": len(results),
        "best_surface": best,
        "results": results,
    }


# ─── utilities ────────────────────────────────────────────────────────────────

def _require_session(session_id: str) -> dict:
    session = _sessions.get(session_id)
    if session is None:
        raise HTTPException(404, f"Session '{session_id}' not found — upload an EPW file first")
    return session

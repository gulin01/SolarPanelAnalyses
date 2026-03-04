"""
Solar Panel Analysis API — FastAPI + pvlib (clear-sky) + Ladybug geometry
"""
from __future__ import annotations
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from simulation.geometry import parse_obj_grouped
from simulation.solar_analysis import run_simulation

UPLOAD_DIR = Path("/tmp/solar_uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Solar Panel Analysis API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store {session_id → {"faces": [...]}}
_sessions: dict[str, dict] = {}


# ── health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


# ── OBJ upload ────────────────────────────────────────────────────────────────

@app.post("/api/model/upload")
async def upload_model(file: UploadFile = File(...)):
    """
    Upload an OBJ 3D model.
    Returns session_id + list of face groups (id, name, triangles, normal, area, centroid).
    Each group is a selectable surface in the UI.
    """
    content = (await file.read()).decode("utf-8", errors="ignore")
    try:
        faces = parse_obj_grouped(content)
    except Exception as exc:
        raise HTTPException(422, f"Failed to parse OBJ: {exc}") from exc

    if not faces:
        raise HTTPException(422, "No geometry found — ensure the OBJ file has faces (f lines)")

    session_id = str(uuid.uuid4())
    _sessions[session_id] = {"faces": faces}

    return {
        "session_id": session_id,
        "surface_count": len(faces),
        "faces": faces,
    }


# ── simulation ────────────────────────────────────────────────────────────────

class SimulationRequest(BaseModel):
    session_id: str
    lat: float = Field(..., ge=-90, le=90, description="Latitude (decimal degrees)")
    lon: float = Field(..., ge=-180, le=180, description="Longitude (decimal degrees)")
    elevation: float = Field(0.0, ge=0, description="Site elevation (metres)")
    analysis_type: str = Field("annual", pattern="^(annual|daily)$")
    date: Optional[str] = Field(None, description="ISO date YYYY-MM-DD (required for daily)")
    selected_face_ids: Optional[List[str]] = Field(
        None,
        description="IDs of faces to simulate. Null or empty = simulate all faces.",
    )


@app.post("/api/simulate")
def simulate(req: SimulationRequest):
    """
    Run solar radiation simulation.
    - Uses pvlib Ineichen clear-sky model for DNI/DHI/GHI.
    - Uses Hay-Davies model for Plane-Of-Array (POA) irradiance.
    - Returns faces ranked by solar potential with heatmap-ready data.
    """
    session = _sessions.get(req.session_id)
    if session is None:
        raise HTTPException(404, f"Session '{req.session_id}' not found — upload a model first")

    all_faces = session["faces"]

    # Filter to selected faces (or use all)
    if req.selected_face_ids:
        faces = [f for f in all_faces if f["id"] in req.selected_face_ids]
        if not faces:
            raise HTTPException(400, "None of the selected face IDs match the uploaded model")
    else:
        faces = all_faces

    if req.analysis_type == "daily" and not req.date:
        raise HTTPException(400, "date (YYYY-MM-DD) is required for daily analysis")

    try:
        result = run_simulation(
            lat=req.lat,
            lon=req.lon,
            faces=faces,
            analysis_type=req.analysis_type,
            date_str=req.date,
            elevation=req.elevation,
        )
    except Exception as exc:
        raise HTTPException(500, f"Simulation error: {exc}") from exc

    return result

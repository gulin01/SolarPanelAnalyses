"""
Core solar radiation simulation using Ladybug Tools.

Algorithm (simplified isotropic sky model):
  For each hour of the year:
    1. Compute sun position from EPW location via Sunpath.
    2. Skip if sun is below horizon (altitude ≤ 0).
    3. For each building face:
       a. Direct component:  DNI × max(0, face_normal · sun_to_sky)
       b. Diffuse component: DHI × (1 + cos θ_tilt) / 2
          where θ_tilt is the angle of the face normal from vertical.
    4. Accumulate hourly contributions → annual irradiation (Wh/m²).
"""
from __future__ import annotations
import math
from typing import List, Dict, Any

from ladybug.epw import EPW
from ladybug.sunpath import Sunpath
from ladybug_geometry.geometry3d.pointvector import Vector3D


# ─── public entry point ────────────────────────────────────────────────────────

def run_simulation(epw_path: str, faces: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Simulate annual solar irradiation on building faces.

    Parameters
    ----------
    epw_path : path to the EPW weather file
    faces    : list of face dicts produced by geometry.py
                Each dict must contain:
                  "id"       : str
                  "normal"   : [nx, ny, nz]
                  "area"     : float (m²)
                  "centroid" : [cx, cy, cz]
                  "vertices" : [[x,y,z], ...]

    Returns
    -------
    List of result dicts, one per face, sorted by annual_irradiation descending.
    Each result:
      id, area, centroid, normal, vertices,
      annual_irradiation_wh_m2, annual_irradiation_kwh_m2,
      suitability_score (0–100), recommendation, monthly_kwh_m2
    """
    epw = EPW(epw_path)
    loc = epw.location

    sunpath = Sunpath(
        latitude=loc.latitude,
        longitude=loc.longitude,
        time_zone=loc.time_zone,
    )

    dni_values = epw.direct_normal_radiation.values   # Wh/m² per hour
    dhi_values = epw.diffuse_horizontal_radiation.values

    # Pre-build face normals as Vector3D
    normals = [Vector3D(*f["normal"]) for f in faces]

    # Accumulate [annual, monthly[12]] per face
    annual = [0.0] * len(faces)
    monthly = [[0.0] * 12 for _ in range(len(faces))]

    VERTICAL = Vector3D(0, 0, 1)

    for hoy in range(8760):
        dni = dni_values[hoy]
        dhi = dhi_values[hoy]
        if dni == 0 and dhi == 0:
            continue

        sun = sunpath.calculate_sun_from_hoy(hoy)
        if sun.altitude <= 0:
            continue

        # sun_vector in Ladybug points FROM sky TOWARD ground (Z < 0 when sun is up).
        # Negate it to get the direction FROM surface TOWARD the sun.
        sv = sun.sun_vector
        sun_to_sky = Vector3D(-sv.x, -sv.y, -sv.z)

        month_idx = _hoy_to_month(hoy)

        for i, normal in enumerate(normals):
            # ── direct component ──────────────────────────────────────────
            cos_inc = _dot(normal, sun_to_sky)
            direct = dni * max(0.0, cos_inc)

            # ── diffuse component (isotropic sky model) ───────────────────
            cos_tilt = _dot(normal, VERTICAL)          # 1 = horizontal, 0 = vertical
            view_factor = (1.0 + max(0.0, cos_tilt)) / 2.0
            diffuse = dhi * view_factor

            radiation = direct + diffuse
            annual[i] += radiation
            monthly[i][month_idx] += radiation

    # Build result list
    results = []
    max_irr = max(annual) if annual else 1.0

    for i, face in enumerate(faces):
        irr_wh = annual[i]
        irr_kwh = irr_wh / 1000.0
        score = round((irr_wh / max_irr) * 100, 1) if max_irr > 0 else 0.0
        monthly_kwh = [round(v / 1000.0, 2) for v in monthly[i]]

        results.append({
            "id": face["id"],
            "area": round(face["area"], 3),
            "centroid": face["centroid"],
            "normal": face["normal"],
            "vertices": face["vertices"],
            "annual_irradiation_wh_m2": round(irr_wh, 1),
            "annual_irradiation_kwh_m2": round(irr_kwh, 2),
            "suitability_score": score,
            "recommendation": _recommendation(score),
            "monthly_kwh_m2": monthly_kwh,
        })

    results.sort(key=lambda r: r["annual_irradiation_kwh_m2"], reverse=True)
    return results


# ─── helpers ───────────────────────────────────────────────────────────────────

def _dot(a: Vector3D, b: Vector3D) -> float:
    return a.x * b.x + a.y * b.y + a.z * b.z


def _hoy_to_month(hoy: int) -> int:
    """Return 0-based month index for a given hour of year."""
    days_per_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    day = hoy // 24
    cumulative = 0
    for m, days in enumerate(days_per_month):
        cumulative += days
        if day < cumulative:
            return m
    return 11


def _recommendation(score: float) -> str:
    if score >= 80:
        return "Excellent — highly recommended for solar panels"
    if score >= 60:
        return "Good — suitable for solar panels"
    if score >= 40:
        return "Moderate — consider if south-facing areas are unavailable"
    return "Poor — not recommended for solar panels"

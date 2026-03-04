"""
Solar radiation simulation using pvlib (clear-sky Ineichen model).

Workflow per face:
  1. Derive surface_tilt and surface_azimuth from the face's outward normal.
  2. Call pvlib.irradiance.get_total_irradiance() (Hay-Davies model) for
     every hour in the time range.
  3. Accumulate Plane-Of-Array (POA) irradiance → kWh/m².

Coordinate system: X = East, Y = North, Z = Up
pvlib azimuth convention: North = 0°, East = 90°, South = 180°, West = 270°

Face normal → pvlib surface parameters:
  surface_tilt    = arccos(nz)              [0° = horizontal, 90° = vertical]
  surface_azimuth = (atan2(nx, ny) + 360) % 360
"""
from __future__ import annotations
import math
from typing import List, Dict, Any, Optional

import pvlib
import pandas as pd
from timezonefinder import TimezoneFinder

_tf = TimezoneFinder()
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ─── public entry points ───────────────────────────────────────────────────────

def run_simulation(
    lat: float,
    lon: float,
    faces: List[Dict[str, Any]],
    analysis_type: str = "annual",   # "annual" | "daily"
    date_str: Optional[str] = None,  # "YYYY-MM-DD" (required for daily)
    elevation: float = 0.0,
) -> Dict[str, Any]:
    """
    Run solar radiation simulation and return ranked results.

    Parameters
    ----------
    lat / lon    : location decimal degrees
    faces        : list of face dicts (id, name, normal, area, centroid)
    analysis_type: "annual" or "daily"
    date_str     : ISO date string for daily mode
    elevation    : site elevation in metres

    Returns
    -------
    Dict with keys: type, timezone, faces (sorted by radiation, desc)
    Plus: year (annual) or date/sunrise_hour/sunset_hour (daily)
    """
    tz = _tf.timezone_at(lat=lat, lng=lon) or "UTC"
    location = pvlib.location.Location(lat, lon, tz=tz, altitude=elevation)

    if analysis_type == "annual":
        times = pd.date_range("2024-01-01", periods=8760, freq="1h", tz=tz)
    else:
        if not date_str:
            raise ValueError("date_str is required for daily analysis")
        times = pd.date_range(date_str, periods=24, freq="1h", tz=tz)

    solar_pos = location.get_solarposition(times)
    clearsky = location.get_clearsky(times)
    dni_extra = pvlib.irradiance.get_extra_radiation(times)  # needed by Hay-Davies

    results: List[Dict[str, Any]] = []
    for face in faces:
        tilt, azimuth = _surface_params(face["normal"])

        base = {
            "id": face["id"],
            "name": face["name"],
            "area": face["area"],
            "surface_tilt_deg": round(tilt, 1),
            "surface_azimuth_deg": round(azimuth, 1),
        }

        # Surfaces whose outward normal points below horizontal (tilt > 90°) cannot
        # be used for solar panels — zero their radiation instead of running pvlib,
        # which would otherwise compute misleading ground-reflection values.
        if tilt > 90.0:
            if analysis_type == "annual":
                base.update({
                    "annual_kwh_m2": 0.0,
                    "monthly_kwh_m2": [0.0] * 12,
                    "_downward": True,
                })
            else:
                base.update({
                    "daily_kwh_m2": 0.0,
                    "hourly_wh_m2": [0.0] * 24,
                    "peak_hour": 0,
                    "peak_wh_m2": 0.0,
                    "_downward": True,
                })
            results.append(base)
            continue

        poa = pvlib.irradiance.get_total_irradiance(
            surface_tilt=tilt,
            surface_azimuth=azimuth,
            solar_zenith=solar_pos["apparent_zenith"],
            solar_azimuth=solar_pos["azimuth"],
            dni=clearsky["dni"],
            ghi=clearsky["ghi"],
            dhi=clearsky["dhi"],
            model="haydavies",
            dni_extra=dni_extra,
        )
        poa_wh = poa["poa_global"].fillna(0.0).clip(lower=0.0)

        if analysis_type == "annual":
            monthly_kwh = _monthly_kwh(poa_wh)
            annual_kwh = round(poa_wh.sum() / 1000.0, 2)
            base.update({
                "annual_kwh_m2": annual_kwh,
                "monthly_kwh_m2": monthly_kwh,
            })
        else:
            hourly = [round(v, 2) for v in poa_wh.tolist()]
            daily_kwh = round(poa_wh.sum() / 1000.0, 3)
            peak_idx = int(poa_wh.values.argmax())
            base.update({
                "daily_kwh_m2": daily_kwh,
                "hourly_wh_m2": hourly,
                "peak_hour": peak_idx,
                "peak_wh_m2": round(float(poa_wh.iloc[peak_idx]), 1),
            })

        results.append(base)

    # Sort by primary metric (desc)
    key = "annual_kwh_m2" if analysis_type == "annual" else "daily_kwh_m2"
    results.sort(key=lambda r: r[key], reverse=True)

    # Add suitability scores relative to the best (non-zero) face
    best = results[0][key] if results else 1.0
    for r in results:
        score = round((r[key] / best) * 100, 1) if best > 0 else 0.0
        r["suitability_score"] = score
        if r.pop("_downward", False):
            r["recommendation"] = "Not suitable — downward-facing surface"
        else:
            r["recommendation"] = _recommendation(score)

    extra: Dict[str, Any] = {"type": analysis_type, "timezone": tz}
    if analysis_type == "annual":
        extra["year"] = 2024
    else:
        daylight = solar_pos["apparent_zenith"] < 90
        hours = [i for i, v in enumerate(daylight) if v]
        extra["date"] = date_str
        extra["sunrise_hour"] = hours[0] if hours else 6
        extra["sunset_hour"] = hours[-1] if hours else 19
        # Top-level hourly lookup {face_id: [24 W/m²]} — used by frontend time slider
        extra["hourly"] = {r["id"]: r["hourly_wh_m2"] for r in results}

    return {**extra, "faces": results}


# ─── helpers ───────────────────────────────────────────────────────────────────

def _surface_params(normal: List[float]):
    """Convert face outward normal to pvlib surface_tilt and surface_azimuth."""
    nx, ny, nz = normal
    tilt = math.degrees(math.acos(max(-1.0, min(1.0, nz))))
    azimuth = (math.degrees(math.atan2(nx, ny)) + 360.0) % 360.0
    return tilt, azimuth


def _monthly_kwh(poa_wh: "pd.Series") -> List[float]:
    """Sum hourly POA irradiance into 12 monthly kWh/m² values (2024)."""
    days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]  # 2024 is leap year
    monthly: List[float] = []
    h = 0
    for d in days:
        hours = d * 24
        monthly.append(round(poa_wh.iloc[h:h + hours].sum() / 1000.0, 2))
        h += hours
    return monthly


def _recommendation(score: float) -> str:
    if score >= 80:
        return "Excellent — highly recommended for solar panels"
    if score >= 60:
        return "Good — suitable for solar panels"
    if score >= 40:
        return "Moderate — consider if better surfaces are unavailable"
    return "Poor — not recommended"

"""Helpers to extract useful info from a Ladybug EPW file."""
from __future__ import annotations
from typing import Dict, Any
from ladybug.epw import EPW


def epw_summary(epw_path: str) -> Dict[str, Any]:
    """Return location info and monthly averages from an EPW file."""
    epw = EPW(epw_path)
    loc = epw.location

    # Monthly average global horizontal radiation (Wh/m²)
    ghi_monthly = [
        round(sum(epw.global_horizontal_radiation.values[m * 730:(m + 1) * 730]) / 730, 1)
        for m in range(12)
    ]
    dni_monthly = [
        round(sum(epw.direct_normal_radiation.values[m * 730:(m + 1) * 730]) / 730, 1)
        for m in range(12)
    ]

    return {
        "city": loc.city,
        "country": loc.country,
        "latitude": loc.latitude,
        "longitude": loc.longitude,
        "time_zone": loc.time_zone,
        "elevation": loc.elevation,
        "annual_ghi_kwh_m2": round(sum(epw.global_horizontal_radiation.values) / 1000, 1),
        "monthly_avg_ghi": ghi_monthly,
        "monthly_avg_dni": dni_monthly,
    }

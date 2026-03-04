"""
OBJ geometry parser — groups faces by object ('o') or group ('g') name.

Coordinate convention (Ladybug / Honeybee / simulation engine):
  X = East,  Y = North,  Z = Up

Each 'surface' returned is one selectable unit in the UI.
"""
from __future__ import annotations
import math
from typing import List, Dict, Any, Tuple


def parse_obj_grouped(content: str) -> List[Dict[str, Any]]:
    """
    Parse an OBJ file and group triangulated faces by object/group name.

    Returns a list of surface dicts:
      id         : str  — unique name (first 'o'/'g' token, or index)
      name       : str  — display label
      triangles  : list of [[x,y,z],[x,y,z],[x,y,z]]  (pre-triangulated)
      normal     : [nx, ny, nz]  — area-weighted average outward normal
      area       : float  (m²)
      centroid   : [cx, cy, cz]
    """
    vertices: List[List[float]] = []
    current_group = "surface_0"
    groups: Dict[str, List[List[List[float]]]] = {}   # name → list of triangles
    group_order: List[str] = []

    for raw in content.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        tok = parts[0]

        if tok == "v" and len(parts) >= 4:
            vertices.append([float(parts[1]), float(parts[2]), float(parts[3])])

        elif tok in ("o", "g") and len(parts) >= 2:
            current_group = parts[1]
            if current_group not in groups:
                groups[current_group] = []
                group_order.append(current_group)

        elif tok == "f" and len(parts) >= 4:
            # Parse vertex indices (handles v, v/vt, v/vt/vn, v//vn)
            idxs = [int(p.split("/")[0]) for p in parts[1:]]
            pts = [vertices[i - 1] if i > 0 else vertices[i] for i in idxs]
            if len(pts) < 3:
                continue
            # Fan-triangulate polygon
            if current_group not in groups:
                groups[current_group] = []
                group_order.append(current_group)
            for i in range(1, len(pts) - 1):
                groups[current_group].append([pts[0], pts[i], pts[i + 1]])

    if not groups:
        return []

    result: List[Dict[str, Any]] = []
    for idx, name in enumerate(group_order):
        triangles = groups[name]
        if not triangles:
            continue

        total_area = 0.0
        weighted_nx = weighted_ny = weighted_nz = 0.0
        sum_cx = sum_cy = sum_cz = 0.0

        for tri in triangles:
            a, b, c = [_vec(*p) for p in tri]
            ab = _sub(b, a)
            ac = _sub(c, a)
            cross = _cross(ab, ac)
            area = _len(cross) / 2.0
            if area < 1e-10:
                continue
            nx, ny, nz = _normalize(cross)
            total_area += area
            weighted_nx += nx * area
            weighted_ny += ny * area
            weighted_nz += nz * area
            cx = (a[0] + b[0] + c[0]) / 3
            cy = (a[1] + b[1] + c[1]) / 3
            cz = (a[2] + b[2] + c[2]) / 3
            sum_cx += cx * area
            sum_cy += cy * area
            sum_cz += cz * area

        if total_area < 1e-10:
            continue

        avg_normal = _normalize([weighted_nx, weighted_ny, weighted_nz])
        centroid = [sum_cx / total_area, sum_cy / total_area, sum_cz / total_area]

        result.append({
            "id": name,
            "name": name,
            "triangles": triangles,
            "normal": avg_normal,
            "area": round(total_area, 4),
            "centroid": [round(v, 4) for v in centroid],
        })

    return result


# ── tiny vector helpers (no numpy dependency) ──────────────────────────────────

def _vec(x: float, y: float, z: float) -> Tuple[float, float, float]:
    return (x, y, z)

def _sub(a, b) -> Tuple[float, float, float]:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])

def _cross(a, b) -> Tuple[float, float, float]:
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )

def _len(v) -> float:
    return math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)

def _normalize(v) -> List[float]:
    mag = _len(v)
    if mag < 1e-10:
        return [0.0, 0.0, 1.0]
    return [v[0] / mag, v[1] / mag, v[2] / mag]

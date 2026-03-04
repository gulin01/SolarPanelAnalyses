"""
Geometry utilities: OBJ parsing and parametric building generation.

Coordinate convention (Ladybug/Honeybee):
  X = East, Y = North, Z = Up
"""
import math
from typing import List, Dict, Any

from ladybug_geometry.geometry3d.pointvector import Point3D, Vector3D
from ladybug_geometry.geometry3d.face import Face3D


def parse_obj(content: str) -> List[Dict[str, Any]]:
    """
    Parse an OBJ file string into a list of face dicts.
    Each dict: { id, vertices [[x,y,z],...], normal [nx,ny,nz], area, centroid [cx,cy,cz] }
    """
    vertices: List[Point3D] = []
    faces: List[Dict[str, Any]] = []
    face_idx = 0

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        parts = line.split()
        token = parts[0]

        if token == "v":
            x, y, z = float(parts[1]), float(parts[2]), float(parts[3])
            vertices.append(Point3D(x, y, z))

        elif token == "f":
            # Each entry may be  v  or  v/vt  or  v/vt/vn  or  v//vn
            indices = [int(p.split("/")[0]) for p in parts[1:]]
            # OBJ indices are 1-based; negative means relative to end
            resolved = []
            for idx in indices:
                resolved.append(vertices[idx - 1] if idx > 0 else vertices[idx])

            if len(resolved) < 3:
                continue

            # Triangulate quads / polygons with fan method
            for i in range(1, len(resolved) - 1):
                tri = [resolved[0], resolved[i], resolved[i + 1]]
                face = Face3D(tri)
                n = face.normal
                c = face.center
                faces.append({
                    "id": f"face_{face_idx}",
                    "vertices": [[p.x, p.y, p.z] for p in tri],
                    "normal": [n.x, n.y, n.z],
                    "area": face.area,
                    "centroid": [c.x, c.y, c.z],
                })
                face_idx += 1

    return faces


def build_box_building(
    width: float,
    depth: float,
    height: float,
    roof_slope_deg: float = 0.0,
) -> List[Dict[str, Any]]:
    """
    Generate a simple box building with an optional mono-pitched roof.

    Parameters
    ----------
    width  : East-West dimension (m)
    depth  : North-South dimension (m)
    height : Wall height (m)
    roof_slope_deg : Roof tilt from horizontal (0 = flat roof)

    Returns list of face dicts compatible with the simulation engine.
    """
    w, d, h = width, depth, height
    slope_rise = math.tan(math.radians(roof_slope_deg)) * d / 2

    # Eight corners of the box (bottom 4, top 4)
    # Bottom: SW, SE, NE, NW
    sw_b = Point3D(0, 0, 0)
    se_b = Point3D(w, 0, 0)
    ne_b = Point3D(w, d, 0)
    nw_b = Point3D(0, d, 0)
    # Top (wall level)
    sw_t = Point3D(0, 0, h)
    se_t = Point3D(w, 0, h)
    ne_t = Point3D(w, d, h)
    nw_t = Point3D(0, d, h)

    # Roof ridge (centre line, slightly higher if pitched)
    ridge_height = h + slope_rise
    sw_r = Point3D(0, d / 2, ridge_height)
    se_r = Point3D(w, d / 2, ridge_height)

    raw_faces: List[tuple] = []

    if roof_slope_deg == 0:
        # Flat roof
        raw_faces.append(("roof", [sw_t, se_t, ne_t, nw_t]))
    else:
        # South-facing slope (toward -Y → good for solar)
        raw_faces.append(("roof_south", [sw_t, se_t, se_r, sw_r]))
        # North-facing slope
        raw_faces.append(("roof_north", [sw_r, se_r, ne_t, nw_t]))

    # Walls
    raw_faces.append(("wall_south", [sw_b, se_b, se_t, sw_t]))  # facing -Y (South)
    raw_faces.append(("wall_north", [ne_b, nw_b, nw_t, ne_t]))  # facing +Y (North)
    raw_faces.append(("wall_east",  [se_b, ne_b, ne_t, se_t]))  # facing +X (East)
    raw_faces.append(("wall_west",  [nw_b, sw_b, sw_t, nw_t]))  # facing -X (West)

    result = []
    for face_id, pts in raw_faces:
        face = Face3D(pts)
        n = face.normal
        c = face.center
        result.append({
            "id": face_id,
            "vertices": [[p.x, p.y, p.z] for p in pts],
            "normal": [n.x, n.y, n.z],
            "area": face.area,
            "centroid": [c.x, c.y, c.z],
        })

    return result

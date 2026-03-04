const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  /**
   * Upload OBJ file → returns { session_id, surface_count, faces }
   * Each face: { id, name, triangles, normal, area, centroid }
   */
  uploadObj(file) {
    const form = new FormData();
    form.append('file', file);
    return request('/api/model/upload', { method: 'POST', body: form });
  },

  /**
   * Run radiation simulation.
   * params: {
   *   session_id, lat, lon, elevation,
   *   analysis_type: 'annual'|'daily',
   *   date?: 'YYYY-MM-DD',
   *   selected_face_ids?: string[]   ([] = all faces)
   * }
   * Returns: { type, timezone, faces, [hourly, date, sunrise_hour, sunset_hour] }
   */
  simulate(params) {
    return request('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },
};

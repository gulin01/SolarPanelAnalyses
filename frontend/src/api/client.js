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
  /** Upload EPW file → returns { session_id, city, country, latitude, ... } */
  uploadEpw(file) {
    const form = new FormData();
    form.append('file', file);
    return request('/api/epw/upload', { method: 'POST', body: form });
  },

  /** Upload OBJ model for a session → returns { face_count, faces } */
  uploadObj(sessionId, file) {
    const form = new FormData();
    form.append('file', file);
    return request(`/api/model/upload-obj?session_id=${sessionId}`, { method: 'POST', body: form });
  },

  /** Generate parametric box building → returns { face_count, faces } */
  parametricBuilding(params) {
    return request('/api/model/parametric', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  /** Run simulation → returns { results, best_surface, ... } */
  simulate(sessionId) {
    return request('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
  },
};

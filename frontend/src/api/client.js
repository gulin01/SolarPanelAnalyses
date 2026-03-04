const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getPanels: () => request('/api/panels'),
  getPanel: (id) => request(`/api/panels/${id}`),
  createPanel: (data) => request('/api/panels', { method: 'POST', body: JSON.stringify(data) }),
  updatePanel: (id, data) => request(`/api/panels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePanel: (id) => request(`/api/panels/${id}`, { method: 'DELETE' }),

  getSummary: () => request('/api/analytics/summary'),
  getEnergyOutput: () => request('/api/analytics/energy-output'),
  getEfficiency: () => request('/api/analytics/efficiency'),
};

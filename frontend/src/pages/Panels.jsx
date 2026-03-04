import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Panels() {
  const [panels, setPanels] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', capacity_kw: '' });

  const load = () => api.getPanels().then(setPanels).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.createPanel({ ...form, capacity_kw: Number(form.capacity_kw) });
    setForm({ name: '', location: '', capacity_kw: '' });
    load();
  };

  const handleDelete = async (id) => {
    await api.deletePanel(id);
    load();
  };

  if (error) return <p className="error">Failed to load panels: {error}</p>;

  return (
    <section>
      <h2>Panels</h2>

      <form className="panel-form" onSubmit={handleSubmit}>
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          required
        />
        <input
          placeholder="Capacity (kW)"
          type="number"
          step="0.1"
          value={form.capacity_kw}
          onChange={(e) => setForm({ ...form, capacity_kw: e.target.value })}
          required
        />
        <button type="submit">Add Panel</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Location</th><th>Capacity (kW)</th><th>Installed</th><th></th>
          </tr>
        </thead>
        <tbody>
          {panels.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.location}</td>
              <td>{p.capacity_kw}</td>
              <td>{p.installed_at}</td>
              <td><button onClick={() => handleDelete(p.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSummary().then(setSummary).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">Failed to load summary: {error}</p>;
  if (!summary) return <p>Loading…</p>;

  return (
    <section>
      <h2>Dashboard</h2>
      <div className="stat-grid">
        <div className="stat-card">
          <h3>Total Energy</h3>
          <p>{summary.total_energy_kwh} kWh</p>
        </div>
        <div className="stat-card">
          <h3>Avg Efficiency</h3>
          <p>{(summary.average_efficiency * 100).toFixed(1)}%</p>
        </div>
      </div>
    </section>
  );
}

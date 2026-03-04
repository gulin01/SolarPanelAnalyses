import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Analytics() {
  const [energy, setEnergy] = useState([]);
  const [efficiency, setEfficiency] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getEnergyOutput(), api.getEfficiency()])
      .then(([e, ef]) => { setEnergy(e); setEfficiency(ef); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">Failed to load analytics: {error}</p>;

  return (
    <section>
      <h2>Analytics</h2>

      <h3>Energy Output (kWh)</h3>
      <table>
        <thead><tr><th>Date</th><th>Energy (kWh)</th></tr></thead>
        <tbody>
          {energy.map((row) => (
            <tr key={row.date}><td>{row.date}</td><td>{row.energy_kwh}</td></tr>
          ))}
        </tbody>
      </table>

      <h3>Efficiency Readings</h3>
      <table>
        <thead><tr><th>Panel ID</th><th>Date</th><th>Efficiency</th></tr></thead>
        <tbody>
          {efficiency.map((row, i) => (
            <tr key={i}>
              <td>{row.panel_id}</td>
              <td>{row.date}</td>
              <td>{(row.efficiency * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

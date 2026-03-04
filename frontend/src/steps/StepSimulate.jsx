import React, { useState } from 'react';
import { api } from '../api/client';

export default function StepSimulate({ sessionId, session, faces, onDone }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.simulate(sessionId);
      onDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Run Solar Radiation Simulation</h2>
      <p className="hint">
        The simulation calculates annual solar irradiation (Wh/m²) on each building surface using
        Ladybug's isotropic sky model — accounting for direct normal irradiance (DNI) and
        diffuse horizontal irradiance (DHI) for every daylight hour of the year.
      </p>

      <div className="summary-box">
        <SummaryItem icon="📍" label="Location" value={`${session?.city}, ${session?.country}`} />
        <SummaryItem icon="🌐" label="Lat / Lon" value={`${session?.latitude}° / ${session?.longitude}°`} />
        <SummaryItem icon="🏠" label="Surfaces" value={`${faces?.length ?? 0} faces`} />
        <SummaryItem icon="⚡" label="Annual GHI" value={`${session?.annual_ghi_kwh_m2} kWh/m²`} />
      </div>

      {error && <p className="error">{error}</p>}

      <button className="btn-primary run-btn" onClick={run} disabled={loading}>
        {loading
          ? '⏳ Simulating 8 760 hours…'
          : '▶ Run Simulation'}
      </button>
    </div>
  );
}

function SummaryItem({ icon, label, value }) {
  return (
    <div className="summary-item">
      <span className="summary-icon">{icon}</span>
      <div>
        <div className="summary-label">{label}</div>
        <div className="summary-value">{value}</div>
      </div>
    </div>
  );
}

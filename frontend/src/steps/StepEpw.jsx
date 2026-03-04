import React, { useState } from 'react';
import { api } from '../api/client';

export default function StepEpw({ onDone }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const data = await api.uploadEpw(file);
      setInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Upload Weather File (EPW)</h2>
      <p className="hint">
        An EPW (EnergyPlus Weather) file provides hourly solar radiation data for your location.
        Download from <a href="https://www.ladybug.tools/epwmap/" target="_blank" rel="noreferrer">ladybug.tools/epwmap</a>.
      </p>

      <label className="file-drop">
        <input type="file" accept=".epw" onChange={handleFile} />
        <span>{loading ? 'Parsing EPW…' : 'Click or drag your .epw file here'}</span>
      </label>

      {error && <p className="error">{error}</p>}

      {info && (
        <div className="info-grid">
          <InfoRow label="Location" value={`${info.city}, ${info.country}`} />
          <InfoRow label="Latitude"  value={`${info.latitude}°`} />
          <InfoRow label="Longitude" value={`${info.longitude}°`} />
          <InfoRow label="Elevation" value={`${info.elevation} m`} />
          <InfoRow label="Annual GHI" value={`${info.annual_ghi_kwh_m2} kWh/m²`} />
          <div className="full-row">
            <strong>Monthly avg. GHI (Wh/m²)</strong>
            <MonthBar values={info.monthly_avg_ghi} />
          </div>
        </div>
      )}

      {info && (
        <button className="btn-primary" onClick={() => onDone(info)}>
          Next: Define 3D Model →
        </button>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function MonthBar({ values }) {
  const max = Math.max(...values);
  return (
    <div className="month-bar-chart">
      {values.map((v, i) => (
        <div key={i} className="month-col">
          <div className="bar-fill" style={{ height: `${(v / max) * 80}px` }} />
          <span className="month-label">{MONTHS[i]}</span>
        </div>
      ))}
    </div>
  );
}

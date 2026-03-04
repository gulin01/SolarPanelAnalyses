/**
 * Results — heatmap 3D model + ranked table + time slider (daily mode).
 *
 * Props
 *   faces    : original face objects from OBJ upload (need triangles for rendering)
 *   results  : simulation response { type, timezone, faces, [hourly, date, sunrise_hour, sunset_hour] }
 *   onReset  : () => void
 */
import React, { useMemo, useState } from 'react';
import ModelViewer from '../components/ModelViewer';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── colour helpers ──────────────────────────────────────────────────────────
function scoreToCSS(score) {
  const t = score / 100;
  const r = Math.round(Math.min(255, t * 2 * 255));
  const g = Math.round(Math.min(255, (1 - Math.abs(t - 0.5) * 2) * 255));
  const b = Math.round(Math.max(0, (1 - t * 2) * 255));
  return `rgb(${r},${g},${b})`;
}

// ── component ───────────────────────────────────────────────────────────────
export default function Results({ faces, results, onReset }) {
  const [currentHour, setCurrentHour] = useState(
    results.type === 'daily' ? (results.sunrise_hour ?? 12) : 0,
  );

  const isDaily = results.type === 'daily';
  const simFaces = results.faces;  // simulation result faces (sorted by radiation)

  // ── heatmap values for the 3D viewer ──────────────────────────────────────
  const heatmapValues = useMemo(() => {
    if (isDaily && results.hourly) {
      // Per-hour W/m²
      return Object.fromEntries(
        Object.entries(results.hourly).map(([id, arr]) => [id, arr[currentHour] ?? 0]),
      );
    }
    // Annual kWh/m²
    return Object.fromEntries(simFaces.map((f) => [f.id, f.annual_kwh_m2 ?? 0]));
  }, [simFaces, isDaily, results.hourly, currentHour]);

  const heatVals = Object.values(heatmapValues);
  const minVal = Math.min(...heatVals);
  const maxVal = Math.max(...heatVals, 1);

  const best = simFaces[0];

  return (
    <main className="app-main">
      {/* Header */}
      <div className="results-header">
        <div>
          <h2>Simulation Results</h2>
          <p className="hint">
            {isDaily
              ? `${results.date} · ${results.timezone}`
              : `Annual clear-sky · ${results.timezone}`}
            &nbsp;— {simFaces.length} surface{simFaces.length !== 1 ? 's' : ''} analysed
          </p>
        </div>
        <button className="btn-secondary" onClick={onReset}>↩ Start Over</button>
      </div>

      {/* Best surface banner */}
      {best && (
        <div className="best-card">
          <div className="best-badge">Best Surface</div>
          <h3>{best.name}</h3>
          <p>{best.recommendation}</p>
          <div className="best-stats">
            <Stat label={isDaily ? 'Daily irradiation' : 'Annual irradiation'}
                  value={isDaily ? `${best.daily_kwh_m2} kWh/m²` : `${best.annual_kwh_m2} kWh/m²`} />
            <Stat label="Area"           value={`${best.area} m²`} />
            <Stat label="Tilt / Azimuth" value={`${best.surface_tilt_deg}° / ${best.surface_azimuth_deg}°`} />
            <Stat label="Score"          value={`${best.suitability_score} / 100`} />
          </div>
        </div>
      )}

      {/* 3D Heatmap viewer */}
      <div className="heatmap-viewer-wrap">
        <ModelViewer
          faces={faces}
          mode="heatmap"
          heatmapValues={heatmapValues}
          height="460px"
        />
        {/* Colour scale legend */}
        <div className="scale-legend">
          <div className="scale-gradient" />
          <div className="scale-ticks">
            <span>{maxVal.toFixed(isDaily ? 0 : 0)}</span>
            <span>{((maxVal + minVal) / 2).toFixed(0)}</span>
            <span>{minVal.toFixed(0)}</span>
          </div>
          <div className="scale-unit">{isDaily ? 'W/m²' : 'kWh/m²'}</div>
        </div>
      </div>

      {/* Time slider — daily mode only */}
      {isDaily && results.hourly && (
        <div className="time-slider-card">
          <div className="time-slider-header">
            <h3>Hour: {String(currentHour).padStart(2, '0')}:00</h3>
            <span className="time-irr">
              {Object.values(heatmapValues).reduce((s, v) => s + v, 0).toFixed(0)} W/m² total across surfaces
            </span>
          </div>
          <input
            type="range"
            min={0} max={23}
            value={currentHour}
            onChange={(e) => setCurrentHour(Number(e.target.value))}
            className="time-slider"
          />
          <div className="hour-axis">
            {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((h) => (
              <span key={h}
                style={{ left: `${(h / 23) * 100}%` }}
                className={h === currentHour ? 'active-hour' : ''}>
                {h}h
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ranked table */}
      <h3 style={{ margin: '1.5rem 0 .5rem' }}>Surfaces Ranked by Solar Potential</h3>
      <div className="results-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Surface</th>
              <th>Score</th>
              <th>{isDaily ? 'Daily (kWh/m²)' : 'Annual (kWh/m²)'}</th>
              <th>Area (m²)</th>
              <th>Tilt / Azimuth</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {simFaces.map((f, i) => (
              <tr key={f.id}>
                <td>{i + 1}</td>
                <td><strong>{f.name}</strong></td>
                <td>
                  <div className="score-bar-wrap">
                    <div className="score-bar"
                      style={{ width: `${f.suitability_score}%`, background: scoreToCSS(f.suitability_score) }} />
                    <span>{f.suitability_score}</span>
                  </div>
                </td>
                <td>{isDaily ? f.daily_kwh_m2 : f.annual_kwh_m2}</td>
                <td>{f.area}</td>
                <td>{f.surface_tilt_deg}° / {f.surface_azimuth_deg}°</td>
                <td className="recommendation">{f.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly breakdown — annual mode only */}
      {!isDaily && (
        <>
          <h3 style={{ margin: '1.5rem 0 .5rem' }}>Monthly Irradiation (kWh/m²)</h3>
          <div className="monthly-grid">
            {simFaces.slice(0, 4).map((f) => (
              <MonthlyChart key={f.id} face={f} score={f.suitability_score} />
            ))}
          </div>
        </>
      )}

      {/* Hourly profile — daily mode */}
      {isDaily && (
        <>
          <h3 style={{ margin: '1.5rem 0 .5rem' }}>Hourly Profile (W/m²)</h3>
          <div className="monthly-grid">
            {simFaces.slice(0, 4).map((f) => (
              <HourlyChart key={f.id} face={f} currentHour={currentHour} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="best-stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function MonthlyChart({ face, score }) {
  const vals = face.monthly_kwh_m2 ?? [];
  const max = Math.max(...vals, 1);
  return (
    <div className="monthly-card">
      <h4>{face.name}</h4>
      <div className="month-bar-chart">
        {vals.map((v, i) => (
          <div key={i} className="month-col">
            <div className="bar-fill"
              style={{ height: `${(v / max) * 64}px`, background: scoreToCSS(score) }} />
            <span className="month-label">{MONTHS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HourlyChart({ face, currentHour }) {
  const vals = face.hourly_wh_m2 ?? Array(24).fill(0);
  const max = Math.max(...vals, 1);
  return (
    <div className="monthly-card">
      <h4>{face.name} <small>({face.daily_kwh_m2} kWh/m²/day)</small></h4>
      <div className="month-bar-chart">
        {vals.map((v, i) => (
          <div key={i} className="month-col">
            <div className="bar-fill"
              style={{
                height: `${(v / max) * 64}px`,
                background: i === currentHour ? '#f59e0b' : '#3b82f6',
              }} />
            <span className="month-label">{i % 6 === 0 ? `${i}h` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

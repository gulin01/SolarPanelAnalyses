import React, { useState } from 'react';
import { api } from '../api/client';

const DEFAULTS = { width: 10, depth: 8, height: 3, roof_slope_deg: 30 };

export default function StepModel({ sessionId, onDone }) {
  const [mode, setMode] = useState('parametric'); // 'parametric' | 'obj'
  const [params, setParams] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleParametric = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.parametricBuilding({ session_id: sessionId, ...params });
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleObj = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const data = await api.uploadObj(sessionId, file);
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) =>
    setParams((p) => ({ ...p, [key]: parseFloat(e.target.value) || 0 }));

  return (
    <div className="card">
      <h2>Define 3D Building Model</h2>

      <div className="tab-bar">
        <button className={mode === 'parametric' ? 'tab active' : 'tab'} onClick={() => setMode('parametric')}>
          Parametric Builder
        </button>
        <button className={mode === 'obj' ? 'tab active' : 'tab'} onClick={() => setMode('obj')}>
          Upload OBJ File
        </button>
      </div>

      {mode === 'parametric' && (
        <div>
          <p className="hint">Define a simple box building. Coordinates: X = East, Y = North, Z = Up.</p>
          <div className="param-grid">
            <ParamInput label="Width (E-W) m" value={params.width} onChange={set('width')} />
            <ParamInput label="Depth (N-S) m" value={params.depth} onChange={set('depth')} />
            <ParamInput label="Wall Height m" value={params.height} onChange={set('height')} />
            <ParamInput label="Roof Slope °" value={params.roof_slope_deg} onChange={set('roof_slope_deg')} min={0} max={60} />
          </div>
          <button className="btn-secondary" onClick={handleParametric} disabled={loading}>
            {loading ? 'Generating…' : 'Generate Building'}
          </button>
        </div>
      )}

      {mode === 'obj' && (
        <div>
          <p className="hint">Upload an OBJ file of your building. Use Ladybug/Rhino/Blender to export.</p>
          <label className="file-drop">
            <input type="file" accept=".obj" onChange={handleObj} />
            <span>{loading ? 'Parsing OBJ…' : 'Click or drag your .obj file here'}</span>
          </label>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {preview && (
        <div className="preview-box">
          <h3>Model loaded — {preview.face_count} surfaces detected</h3>
          <table>
            <thead>
              <tr><th>Surface</th><th>Normal (X,Y,Z)</th><th>Area (m²)</th></tr>
            </thead>
            <tbody>
              {preview.faces.map((f) => (
                <tr key={f.id}>
                  <td>{f.id}</td>
                  <td>{f.normal.map((n) => n.toFixed(2)).join(', ')}</td>
                  <td>{f.area.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn-primary" onClick={() => onDone(preview.faces)}>
            Next: Run Simulation →
          </button>
        </div>
      )}
    </div>
  );
}

function ParamInput({ label, value, onChange, min, max }) {
  return (
    <label className="param-input">
      <span>{label}</span>
      <input type="number" value={value} onChange={onChange}
        step="0.5" min={min ?? 0.5} max={max ?? 200} />
    </label>
  );
}

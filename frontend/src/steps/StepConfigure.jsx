/**
 * StepConfigure — Leaflet map location picker + analysis type selector.
 *
 * Props
 *   sessionId        : string
 *   faces            : face[] (for summary count)
 *   selectedFaceIds  : string[] ([] = all)
 *   onDone(results)  : called with simulation response
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { api } from '../api/client';

// Fix Leaflet's broken default icon in bundler environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TODAY = new Date().toISOString().slice(0, 10);

export default function StepConfigure({ sessionId, faces, selectedFaceIds, onDone }) {
  const mapRef       = useRef(null);
  const leafletRef   = useRef(null);   // Leaflet map instance
  const markerRef    = useRef(null);

  const [location, setLocation]         = useState(null);   // { lat, lon }
  const [analysisType, setAnalysisType] = useState('annual');
  const [date, setDate]                 = useState(TODAY.slice(0, 7) + '-21');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  // Initialise Leaflet map once
  useEffect(() => {
    if (leafletRef.current) return;  // StrictMode guard

    const map = L.map(mapRef.current).setView([48.0, 10.0], 3);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    map.on('click', ({ latlng }) => {
      const { lat, lng } = latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }
      setLocation({ lat: parseFloat(lat.toFixed(5)), lon: parseFloat(lng.toFixed(5)) });
    });

    leafletRef.current = map;
    return () => {
      map.remove();
      leafletRef.current = null;
      markerRef.current  = null;
    };
  }, []);

  const handleRun = async () => {
    if (!location) return;
    setError(null);
    setLoading(true);
    try {
      const data = await api.simulate({
        session_id: sessionId,
        lat: location.lat,
        lon: location.lon,
        elevation: 0,
        analysis_type: analysisType,
        date: analysisType === 'daily' ? date : undefined,
        selected_face_ids: selectedFaceIds,
      });
      onDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const simCount = selectedFaceIds.length === 0 ? faces.length : selectedFaceIds.length;

  return (
    <div className="card">
      <h2>Set Location &amp; Run Simulation</h2>

      <div className="configure-grid">
        {/* Map */}
        <div>
          <p className="hint">Click anywhere on the map to set your building's location.</p>
          <div ref={mapRef} className="leaflet-map" />
          {location && (
            <p className="location-info">
              📍 {location.lat}°, {location.lon}°
            </p>
          )}
        </div>

        {/* Options */}
        <div className="options-col">
          <h3>Analysis Type</h3>
          <div className="toggle-group">
            <button
              className={`toggle-btn ${analysisType === 'annual' ? 'active' : ''}`}
              onClick={() => setAnalysisType('annual')}
            >
              Annual (8 760 h)
            </button>
            <button
              className={`toggle-btn ${analysisType === 'daily' ? 'active' : ''}`}
              onClick={() => setAnalysisType('daily')}
            >
              Specific Date (24 h)
            </button>
          </div>

          {analysisType === 'daily' && (
            <div style={{ marginTop: '1rem' }}>
              <label className="param-input">
                <span>Date</span>
                <input
                  type="date"
                  value={date}
                  min="2023-01-01"
                  max="2023-12-31"
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <p className="hint" style={{ marginTop: '.4rem' }}>
                Clear-sky model uses 2023 weather patterns.
              </p>
            </div>
          )}

          <div className="sim-summary">
            <div className="sim-row">
              <span>Surfaces to simulate</span>
              <strong>{simCount}</strong>
            </div>
            <div className="sim-row">
              <span>Model</span>
              <strong>pvlib Ineichen clear-sky + Hay-Davies</strong>
            </div>
            <div className="sim-row">
              <span>Hours computed</span>
              <strong>{analysisType === 'annual' ? '8 760' : '24'}</strong>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <button
            className="btn-primary run-btn"
            onClick={handleRun}
            disabled={loading || !location || (analysisType === 'daily' && !date)}
          >
            {loading ? '⏳ Simulating…' : '▶ Run Simulation'}
          </button>

          {!location && (
            <p className="hint" style={{ marginTop: '.5rem', color: '#f59e0b' }}>
              Click the map first to set a location.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

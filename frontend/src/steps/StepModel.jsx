/**
 * StepModel — OBJ upload, interactive 3D face selection.
 *
 * Props
 *   onDone({ sessionId, faces, selectedFaceIds }) → advance wizard
 */
import React, { useState, useCallback } from 'react';
import { api } from '../api/client';
import ModelViewer from '../components/ModelViewer';

export default function StepModel({ onDone }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [faces, setFaces] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());   // empty = all

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const data = await api.uploadObj(file);
      setSessionId(data.session_id);
      setFaces(data.faces);
      setSelectedIds(new Set());   // reset selection → all
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Drag-and-drop support
  const [dragging, setDragging] = useState(false);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile({ target: { files: [file] } });
  }, []);

  const toggleFace = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll  = () => setSelectedIds(new Set());
  const deselectAll = () => setSelectedIds(new Set(faces.map(f => f.id)));

  // "selected" in the UI means "will be simulated"
  // selectedIds.size === 0 → ALL selected
  const isSelected = (id) => selectedIds.size === 0 || !selectedIds.has(id);

  const handleNext = () => {
    onDone({
      sessionId,
      faces,
      // Pass empty array when all selected (backend interprets [] as all)
      selectedFaceIds: selectedIds.size === 0 ? [] : [...selectedIds],
    });
  };

  return (
    <div className="card">
      <h2>Upload 3D Model</h2>
      <p className="hint">
        Upload an OBJ file of your building or surface. Each named object (<code>o</code>) in the file
        becomes a selectable surface. Coordinate system: <strong>X = East, Y = North, Z = Up</strong>.
      </p>

      {/* Drop zone */}
      <label
        className={`file-drop ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input type="file" accept=".obj" onChange={handleFile} />
        <span>
          {loading ? '⏳ Parsing OBJ…'
            : dragging ? '📂 Drop to upload'
            : '📁 Click or drag your .obj file here'}
        </span>
      </label>

      {error && <p className="error">{error}</p>}

      {faces.length > 0 && (
        <>
          <div className="viewer-face-layout">
            {/* 3D Viewer */}
            <div className="viewer-pane">
              <ModelViewer
                faces={faces}
                selectedIds={selectedIds}
                onFaceClick={toggleFace}
                mode="selection"
                height="380px"
              />
            </div>

            {/* Face list panel */}
            <div className="face-list-pane">
              <div className="face-list-header">
                <span>{faces.length} surfaces</span>
                <div className="face-list-actions">
                  <button className="link-btn" onClick={selectAll}>All</button>
                  <button className="link-btn" onClick={deselectAll}>None</button>
                </div>
              </div>
              <div className="face-list">
                {faces.map((f) => {
                  const sel = isSelected(f.id);
                  return (
                    <div
                      key={f.id}
                      className={`face-row ${sel ? 'selected' : ''}`}
                      onClick={() => toggleFace(f.id)}
                    >
                      <input type="checkbox" checked={sel} onChange={() => {}} />
                      <span className="face-name">{f.name}</span>
                      <span className="face-area">{f.area.toFixed(1)} m²</span>
                    </div>
                  );
                })}
              </div>
              <p className="selection-hint">
                {selectedIds.size === 0
                  ? `All ${faces.length} surfaces will be simulated`
                  : `${faces.length - selectedIds.size} of ${faces.length} selected`}
              </p>
            </div>
          </div>

          <button className="btn-primary" onClick={handleNext}>
            Next: Set Location & Run →
          </button>
        </>
      )}
    </div>
  );
}

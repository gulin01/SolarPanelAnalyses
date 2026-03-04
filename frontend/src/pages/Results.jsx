import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Map a 0–100 score to a heatmap colour (blue → green → red). */
function scoreToHex(score) {
  const t = score / 100;
  const r = Math.round(Math.min(255, t * 2 * 255));
  const g = Math.round(Math.min(255, (1 - Math.abs(t - 0.5) * 2) * 255));
  const b = Math.round(Math.max(0, (1 - t * 2) * 255));
  return `rgb(${r},${g},${b})`;
}

export default function Results({ results, session, onReset }) {
  const { results: faces = [], best_surface } = results;

  return (
    <main className="app-main">
      <div className="results-header">
        <div>
          <h2>Simulation Results</h2>
          <p className="hint">{session?.city}, {session?.country} — {faces.length} surfaces analysed</p>
        </div>
        <button className="btn-secondary" onClick={onReset}>↩ Start Over</button>
      </div>

      {best_surface && (
        <div className="best-card">
          <div className="best-badge">Best Surface</div>
          <h3>{best_surface.id}</h3>
          <p>{best_surface.recommendation}</p>
          <div className="best-stats">
            <Stat label="Annual irradiation" value={`${best_surface.annual_irradiation_kwh_m2} kWh/m²`} />
            <Stat label="Area" value={`${best_surface.area} m²`} />
            <Stat label="Suitability score" value={`${best_surface.suitability_score} / 100`} />
          </div>
        </div>
      )}

      <ThreeViewer faces={faces} />

      <h3 style={{ margin: '1.5rem 0 .5rem' }}>All Surfaces — Ranked by Solar Potential</h3>
      <div className="results-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Surface</th>
              <th>Score</th>
              <th>Irradiation (kWh/m²)</th>
              <th>Area (m²)</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {faces.map((f, i) => (
              <tr key={f.id}>
                <td>{i + 1}</td>
                <td><strong>{f.id}</strong></td>
                <td>
                  <div className="score-bar-wrap">
                    <div className="score-bar" style={{
                      width: `${f.suitability_score}%`,
                      background: scoreToHex(f.suitability_score),
                    }} />
                    <span>{f.suitability_score}</span>
                  </div>
                </td>
                <td>{f.annual_irradiation_kwh_m2}</td>
                <td>{f.area}</td>
                <td className="recommendation">{f.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ margin: '1.5rem 0 .5rem' }}>Monthly Irradiation (kWh/m²) by Surface</h3>
      <div className="monthly-grid">
        {faces.slice(0, 4).map((f) => (
          <MonthlyChart key={f.id} face={f} />
        ))}
      </div>
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

function MonthlyChart({ face }) {
  const max = Math.max(...face.monthly_kwh_m2, 1);
  return (
    <div className="monthly-card">
      <h4>{face.id}</h4>
      <div className="month-bar-chart">
        {face.monthly_kwh_m2.map((v, i) => (
          <div key={i} className="month-col">
            <div className="bar-fill" style={{
              height: `${(v / max) * 60}px`,
              background: scoreToHex(face.suitability_score),
            }} />
            <span className="month-label">{MONTHS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Three.js 3D viewer — colours faces by suitability score. */
function ThreeViewer({ faces }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!faces.length) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = 380;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);

    // Centre and scale model
    const allPts = faces.flatMap((f) => f.vertices);
    const xs = allPts.map((p) => p[0]);
    const ys = allPts.map((p) => p[1]);
    const zs = allPts.map((p) => p[2]);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const cz = (Math.max(...zs) + Math.min(...zs)) / 2;
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs));
    camera.position.set(cx + span * 1.2, cy - span * 1.5, cz + span * 1.2);
    camera.lookAt(cx, cy, cz);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 1, 2);
    scene.add(dir);

    // Build geometry per face
    const scoreMap = Object.fromEntries(faces.map((f) => [f.id, f.suitability_score]));

    faces.forEach((face) => {
      const verts = face.vertices;
      const geom = new THREE.BufferGeometry();
      // Fan-triangulate polygon
      const positions = [];
      for (let i = 1; i < verts.length - 1; i++) {
        positions.push(...verts[0], ...verts[i], ...verts[i + 1]);
      }
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.computeVertexNormals();

      const score = scoreMap[face.id] ?? 0;
      const t = score / 100;
      const color = new THREE.Color(
        Math.min(1, t * 2),
        Math.min(1, (1 - Math.abs(t - 0.5) * 2)),
        Math.max(0, 1 - t * 2),
      );
      const mat = new THREE.MeshPhongMaterial({ color, side: THREE.DoubleSide, opacity: 0.9, transparent: true });
      scene.add(new THREE.Mesh(geom, mat));

      // Wireframe
      const wmat = new THREE.LineBasicMaterial({ color: 0x333333, opacity: 0.3, transparent: true });
      scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom), wmat));
    });

    // Simple rotation animation
    let animId;
    const pivot = new THREE.Vector3(cx, cy, cz);
    let angle = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      angle += 0.005;
      const r = span * 1.8;
      camera.position.set(cx + r * Math.sin(angle), cy - span * 0.8, cz + r * Math.cos(angle));
      camera.lookAt(pivot);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [faces]);

  return (
    <div className="three-viewer" ref={mountRef}>
      <div className="viewer-legend">
        <span style={{ color: 'rgb(0,200,255)' }}>◼ Low</span>
        <span style={{ color: 'rgb(100,255,100)' }}>◼ Medium</span>
        <span style={{ color: 'rgb(255,80,0)' }}>◼ High</span>
      </div>
    </div>
  );
}

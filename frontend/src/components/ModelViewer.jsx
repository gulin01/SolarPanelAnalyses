/**
 * ModelViewer — reusable Three.js 3D viewer.
 *
 * Modes
 * ─────
 *   "selection"  : click faces to toggle selection (highlighted orange)
 *   "heatmap"    : faces coloured by simulation result (blue→green→red)
 *
 * Props
 * ─────
 *   faces          : array of face objects from backend (id, name, triangles, normal, area)
 *   selectedIds    : Set<string>   (controlled from parent)
 *   onFaceClick    : (faceId: string) => void
 *   mode           : "selection" | "heatmap"
 *   heatmapValues  : { [faceId]: number }  — for heatmap mode
 *   height         : CSS string, default "420px"
 */
import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ── colour helpers ────────────────────────────────────────────────────────────

/** Map t ∈ [0,1] → Three.js Color (blue → cyan → green → yellow → red). */
function heatColor(t) {
  const stops = [
    [0.00, 0x0033cc],
    [0.25, 0x00aaff],
    [0.50, 0x00dd55],
    [0.75, 0xffdd00],
    [1.00, 0xff2200],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      const r0 = (c0 >> 16) & 0xff, g0 = (c0 >> 8) & 0xff, b0 = c0 & 0xff;
      const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
      const r = Math.round(r0 + f * (r1 - r0));
      const g = Math.round(g0 + f * (g1 - g0));
      const b = Math.round(b0 + f * (b1 - b0));
      return new THREE.Color(r / 255, g / 255, b / 255);
    }
  }
  return new THREE.Color(1, 0.13, 0);
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ModelViewer({
  faces = [],
  selectedIds = new Set(),
  onFaceClick,
  mode = 'selection',
  heatmapValues = {},
  height = '420px',
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({});   // renderer, scene, camera, controls, meshes, animId

  // ── build / destroy Three.js scene ─────────────────────────────────────────
  useEffect(() => {
    if (!faces.length) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = parseInt(height);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W, H);
    renderer.setClearColor(0x0f172a, 1);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 10000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(1, 1, 2);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xaaccff, 0x334455, 0.4));

    // Build meshes
    const meshes = [];
    const allPts = [];

    faces.forEach((face) => {
      const positions = [];
      for (const tri of face.triangles) {
        for (const v of tri) {
          // Backend uses Z-up (X=East, Y=North, Z=Up); Three.js uses Y-up.
          // Convert: Three.X = data.X,  Three.Y = data.Z,  Three.Z = -data.Y
          const tx = v[0], ty = v[2], tz = -v[1];
          positions.push(tx, ty, tz);
          allPts.push([tx, ty, tz]);
        }
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.computeVertexNormals();

      const mat = new THREE.MeshPhongMaterial({
        color: 0x4a90d9,
        side: THREE.DoubleSide,
        shininess: 30,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData.faceId = face.id;

      // Wireframe edges
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom),
        new THREE.LineBasicMaterial({ color: 0x1e293b, opacity: 0.5, transparent: true }),
      );
      mesh.add(edges);

      scene.add(mesh);
      meshes.push(mesh);
    });

    // Centre + fit camera
    if (allPts.length) {
      const xs = allPts.map(p => p[0]);
      const ys = allPts.map(p => p[1]);
      const zs = allPts.map(p => p[2]);
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
      const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      const cz = (Math.max(...zs) + Math.min(...zs)) / 2;
      const span = Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
        Math.max(...zs) - Math.min(...zs),
        1,
      );
      const dist = span * 2.2;
      camera.position.set(cx + dist * 0.6, cy + dist * 0.8, cz + dist * 0.8);
      camera.lookAt(cx, cy, cz);
      controls.target.set(cx, cy, cz);
    }

    // Render loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Click detection (distinguish from drag)
    let mouseDownXY = null;
    const onDown = (e) => { mouseDownXY = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (!mouseDownXY) return;
      const dx = Math.abs(e.clientX - mouseDownXY.x);
      const dy = Math.abs(e.clientY - mouseDownXY.y);
      if (dx < 4 && dy < 4) handleClick(e);
      mouseDownXY = null;
    };
    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('mouseup', onUp);

    function handleClick(e) {
      if (!onFaceClick) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        onFaceClick(hits[0].object.userData.faceId);
      }
    }

    stateRef.current = { renderer, scene, camera, controls, meshes, animId };

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('mousedown', onDown);
      renderer.domElement.removeEventListener('mouseup', onUp);
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [faces, height]);   // re-mount only when faces/height change

  // ── update face colours when selection or heatmap changes ──────────────────
  useEffect(() => {
    const { meshes } = stateRef.current;
    if (!meshes) return;

    if (mode === 'heatmap' && Object.keys(heatmapValues).length > 0) {
      const vals = Object.values(heatmapValues).filter(v => v != null);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const range = maxV - minV || 1;
      meshes.forEach((mesh) => {
        const v = heatmapValues[mesh.userData.faceId];
        const t = v != null ? (v - minV) / range : 0;
        mesh.material.color.copy(heatColor(t));
        mesh.material.opacity = 1;
        mesh.material.transparent = false;
      });
    } else {
      meshes.forEach((mesh) => {
        const selected = selectedIds.has(mesh.userData.faceId);
        mesh.material.color.set(selected ? 0xf59e0b : 0x4a90d9);
        mesh.material.opacity = selected ? 1 : 0.85;
        mesh.material.transparent = !selected;
      });
    }
  }, [mode, selectedIds, heatmapValues]);

  return (
    <div ref={mountRef} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', cursor: 'grab' }} />
  );
}

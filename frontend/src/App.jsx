import React, { useState } from 'react';
import StepModel     from './steps/StepModel';
import StepConfigure from './steps/StepConfigure';
import Results       from './pages/Results';
import './styles/App.css';

const STEPS = ['1. Upload Model', '2. Location & Simulate', '3. Results'];

export default function App() {
  const [step,            setStep]            = useState(0);
  const [sessionId,       setSessionId]       = useState(null);
  const [faces,           setFaces]           = useState([]);     // original geometry (needed by Results)
  const [selectedFaceIds, setSelectedFaceIds] = useState([]);     // [] = all
  const [results,         setResults]         = useState(null);

  const reset = () => {
    setStep(0); setSessionId(null); setFaces([]); setSelectedFaceIds([]); setResults(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">☀</span>
            <span>Solar Panel Analyser</span>
          </div>
          <p className="subtitle">Powered by pvlib · Ladybug geometry · Three.js · Leaflet</p>
        </div>
      </header>

      {results ? (
        <Results faces={faces} results={results} onReset={reset} />
      ) : (
        <main className="app-main">
          <div className="stepper">
            {STEPS.map((label, i) => (
              <div key={i} className={`step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                <div className="step-circle">{i < step ? '✓' : i + 1}</div>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="step-content">
            {step === 0 && (
              <StepModel
                onDone={({ sessionId: sid, faces: f, selectedFaceIds: sel }) => {
                  setSessionId(sid);
                  setFaces(f);
                  setSelectedFaceIds(sel);
                  setStep(1);
                }}
              />
            )}
            {step === 1 && (
              <StepConfigure
                sessionId={sessionId}
                faces={faces}
                selectedFaceIds={selectedFaceIds}
                onDone={(data) => { setResults(data); setStep(2); }}
              />
            )}
          </div>
        </main>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import StepEpw from './steps/StepEpw';
import StepModel from './steps/StepModel';
import StepSimulate from './steps/StepSimulate';
import Results from './pages/Results';
import './styles/App.css';

const STEPS = ['1. Weather Data', '2. 3D Model', '3. Simulate'];

export default function App() {
  const [step, setStep] = useState(0);
  const [session, setSession] = useState(null);   // { id, city, country, latitude, ... }
  const [faces, setFaces] = useState(null);        // list of face dicts
  const [results, setResults] = useState(null);    // simulation results

  const goNext = () => setStep((s) => s + 1);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">☀</span>
            <span>Solar Panel Analyser</span>
          </div>
          <p className="subtitle">Powered by Ladybug Tools</p>
        </div>
      </header>

      {results ? (
        <Results results={results} session={session} onReset={() => {
          setStep(0); setSession(null); setFaces(null); setResults(null);
        }} />
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
              <StepEpw onDone={(s) => { setSession(s); goNext(); }} />
            )}
            {step === 1 && (
              <StepModel sessionId={session?.session_id} onDone={(f) => { setFaces(f); goNext(); }} />
            )}
            {step === 2 && (
              <StepSimulate sessionId={session?.session_id} session={session} faces={faces}
                onDone={(r) => setResults(r)} />
            )}
          </div>
        </main>
      )}
    </div>
  );
}

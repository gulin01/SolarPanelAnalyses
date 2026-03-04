import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Panels from './pages/Panels';
import Analytics from './pages/Analytics';
import './styles/App.css';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Solar Panel Analyses</h1>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/panels">Panels</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/panels" element={<Panels />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  );
}

# SolarPanelAnalyses

A monorepo for analysing solar panel performance data, containing a React frontend and a Node.js/Express backend.

## Structure

```
SolarPanelAnalyses/
├── frontend/   # React + Vite SPA
└── backend/    # Node.js + Express REST API
```

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9 (workspaces support)

### Install all dependencies
```bash
npm install
```

### Run both services in development
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Individual services
```bash
# Backend only
npm run dev --workspace=backend

# Frontend only
npm run dev --workspace=frontend
```

## Environment Variables

Copy each `.env.example` to `.env` inside `frontend/` and `backend/` and fill in the values.

# SolarPanelAnalyses

A monorepo for simulating solar radiation on 3D building models and identifying the optimal surfaces for solar panel installation, powered by **[Ladybug Tools](https://www.ladybug.tools/)**.

## How it works

```
User uploads EPW file  →  User defines 3D model  →  Ladybug simulation  →  Ranked results + 3D heatmap
```

1. **EPW file** — hourly solar radiation data (Direct Normal Irradiance + Diffuse Horizontal Irradiance) for your location.  Download from [ladybug.tools/epwmap](https://www.ladybug.tools/epwmap/).
2. **3D model** — define a parametric box building (width / depth / height / roof slope) or upload an OBJ file.
3. **Simulation** — Ladybug's `Sunpath` computes the sun position for all 8 760 hours of the year; each face accumulates incident radiation using the isotropic sky model.
4. **Results** — surfaces are ranked by annual irradiation (kWh/m²) with a suitability score and a Three.js heatmap viewer.

## Structure

```
SolarPanelAnalyses/
├── backend/                     # Python 3.11 + FastAPI
│   ├── main.py                  # FastAPI app — EPW upload, geometry, simulation endpoints
│   ├── requirements.txt
│   └── simulation/
│       ├── solar_analysis.py    # Core Ladybug radiation simulation (DNI + DHI, isotropic sky)
│       ├── geometry.py          # OBJ parser + parametric building generator
│       └── epw_utils.py         # EPW location & monthly radiation summaries
│
└── frontend/                    # React 18 + Vite
    └── src/
        ├── steps/               # 3-step wizard (EPW → Model → Simulate)
        ├── pages/Results.jsx    # Three.js 3D heatmap + ranked surface table
        └── api/client.js        # Typed fetch wrapper for backend API
```

## Getting Started

### Prerequisites
- Python >= 3.11
- Node.js >= 18

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

### Environment variables
Copy `.env.example` → `.env` in both `frontend/` and `backend/`.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/epw/upload` | Upload EPW file → returns session_id + location info |
| `POST` | `/api/model/parametric` | Generate box building geometry |
| `POST` | `/api/model/upload-obj` | Upload OBJ file geometry |
| `POST` | `/api/simulate` | Run full-year Ladybug simulation |
| `GET`  | `/health` | Health check |

Interactive Swagger UI: **http://localhost:8000/docs**

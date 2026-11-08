# Gitna (Gitna.ph)

Philippine Fair-Midpoint and Road Route Calculator.

Gitna determines the fairest meetup location between multiple travelers along the actual Philippine road and expressway network, avoiding naive geographic midpoints and straight-line calculations.

---

## Features

- **True Road Geometry:** Powered by live OSRM routing and polylines (`LineString` GeoJSON) along real expressways and arterial corridors (NLEX, Skyway Stage 3, EDSA, CAVITEX, SLEX).
- **Direct Highway Midpoint Slicing:** Walks road polylines to extract the exact 50% cumulative distance coordinate directly on the highway.
- **Minimax Fairness Scoring:** Optimizes for arrival equality and minimal total commute time across all travelers.
- **Real-Time Visual Highway Tracing:** Streams calculation frames at 60 FPS over WebSockets to Deck.gl and MapLibre GL hardware-accelerated layers.
- **Nearby Venue Discovery:** Identifies cafes, parks, and malls within 800 meters of the winning road node via Overpass API.

---

## Architecture

| Component | Technology | Role |
|---|---|---|
| **Backend** | Rust, Axum, Tokio | High-concurrency routing engine and WebSocket streaming server |
| **Routing** | OSRM Table & Route APIs | Real-world driving durations, distances, and highway geometries |
| **Venues** | Overpass API (OSM) | POI queries within an 800m radius of convergence hubs |
| **Frontend** | React 18, TypeScript, Vite | Single-page client with interactive parameter controls |
| **Map Rendering** | Deck.gl, MapLibre GL | WebGL PathLayer and ScatterplotLayer visualizations |
| **Base Map** | CartoDB Dark Matter | Clean, high-contrast dark vector basemap |
| **Design System** | Tailwind CSS | Concentric border radii, dark zinc palette, electric lime accents |

---

## Repository Structure

```
SaanMeet/
├── backend/                       # Rust routing & streaming engine
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                # Axum HTTP & WebSocket (/ws/calculate) routes
│       ├── osrm.rs                # OSRM Table, Route API, and highway slicing
│       ├── algorithm.rs           # Minimax commute cost and streaming pipeline
│       ├── poi.rs                 # Overpass POI service with Metro Manila fallback
│       └── models.rs              # Protocol and data structures
│
└── frontend/                      # React + TypeScript client
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.ts
    └── src/
        ├── App.tsx                # Main canvas and layer orchestration
        ├── presets.ts             # Curated Philippine commute scenarios
        ├── types.ts               # Protocol and state interfaces
        ├── hooks/
        │   └── useWebSocket.ts    # WebSocket client state machine
        └── components/
            ├── MapCanvas.tsx      # Deck.gl & MapLibre map viewport
            ├── ControlDock.tsx    # Traveler configuration dock
            ├── TelemetryBanner.tsx# Real-time calculation HUD
            ├── VerdictDrawer.tsx  # Drive receipt and podium breakdown
            └── VenueExplorer.tsx  # Nearby POI list with walking estimates
```

---

## Mathematical Formulation

For $N$ travelers evaluated against a candidate convergence hub $c$:

- **Total Travel Time:**
  $$T_{\text{total}}(c) = \sum_{i=1}^N T_{\text{road}}(u_i, c)$$

- **Travel Time Disparity:**
  $$\Delta_{\text{road}}(c) = \max_i T_{\text{road}}(u_i, c) - \min_i T_{\text{road}}(u_i, c)$$

- **Commute Cost Function:**
  $$\text{Cost}(c) = (\alpha \times T_{\text{total}}) + (\beta \times N \times \Delta_{\text{road}})$$

- **Fairness Index (0 to 100%):**
  $$\text{Fairness}(c) = \max\left(0, 100 - \left(\frac{\Delta_{\text{road}}(c)}{\max_i T_{\text{road}}(u_i, c)} \times 100\right)\right)$$

The weights $\alpha$ (efficiency) and $\beta$ (fairness) are dynamically adjustable via client sliders.

---

## Getting Started

### Prerequisites

- **Rust** (1.75+ with Cargo)
- **Node.js** (v18+ or v20+) and `npm`

### 1. Start the Backend

```bash
cd backend
cargo run
```

The Axum server listens on `http://localhost:4000` with WebSocket access at `ws://localhost:4000/ws/calculate`.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server starts on `http://localhost:5173`.

### 3. Production Build

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
cargo build --release
```

---

## License

MIT License.

# Gitna (Gitna.ph)

Philippine Fair-Midpoint and Road Route Calculator.

Gitna determines the fairest meetup location between multiple travelers along the actual Philippine road and expressway network, avoiding naive geographic midpoints and straight-line calculations.

---

## Features

- **Strictly 2D Overhead Plane:** Map canvas and Deck.gl layers locked to a flat 2D projection (`pitch: 0, bearing: 0`) with tilt and rotation disabled.
- **True Road Geometry:** Powered by live OSRM routing and polylines (`LineString` GeoJSON) along real expressways and arterial corridors (NLEX, Skyway Stage 3, EDSA, CAVITEX, SLEX).
- **Direct Highway Midpoint Slicing:** Walks road polylines to extract the exact 50% cumulative distance coordinate directly on the highway as a search anchor.
- **Real Radius Place Finder (2,000m to 5,000m):** Queries real places around the road anchor using Google Places API (New) or OpenStreetMap Nominatim and Overpass. Zero synthetic or fake venues.
- **Venue Snapping & Dynamic Re-Routing:** Automatically snaps the recommended meetup spot to a real venue, routing road polylines directly to its coordinates. Clicking any alternative hub or venue card triggers instant on-the-fly re-routing via `POST /api/route-to-point`.
- **Luzon Map Lock & Town Center Autofill:** Map bounds locked to Luzon (`minZoom: 6.8`) with an inverse mask polygon and instant autocomplete for 100+ Luzon town and city centers.
- **Minimax Fairness Scoring:** Optimizes for arrival equality and minimal total commute time across all travelers.
- **Real-Time Visual Highway Tracing:** Streams calculation frames over WebSockets to Deck.gl and MapLibre GL hardware-accelerated layers.

---

## Architecture

| Component | Technology | Role |
|---|---|---|
| **Backend** | Rust, Axum, Tokio | High-concurrency routing engine and WebSocket streaming server |
| **Routing** | OSRM Table & Route APIs | Real-world driving durations, distances, and highway geometries |
| **Places Engine** | Google Places API + OSM / Nominatim | Multi-engine real place discovery within a 2,000m-5,000m radius |
| **Frontend** | React 18, TypeScript, Vite | Single-page client with interactive parameter controls |
| **Map Rendering** | Deck.gl, MapLibre GL | Strict 2D WebGL PathLayer and ScatterplotLayer visualizations |
| **Base Map** | CartoDB Dark Matter | Clean, high-contrast dark vector basemap with Luzon mask |
| **Design System** | Tailwind CSS | Concentric border radii, dark zinc palette, electric lime accents |

---

## Repository Structure

```
SaanMeet/
├── backend/                       # Rust routing & streaming engine
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                # Axum HTTP, WebSocket (/ws/calculate), and route-to-point API
│       ├── osrm.rs                # OSRM Table, Route API, and highway slicing
│       ├── algorithm.rs           # Minimax commute cost and streaming pipeline
│       ├── places.rs              # Dual-engine real place lookup (Google Places + OSM)
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
            ├── MapCanvas.tsx      # Strict 2D Deck.gl & MapLibre map viewport
            ├── ControlDock.tsx    # Traveler configuration dock
            ├── TelemetryBanner.tsx# Real-time calculation HUD
            ├── VerdictDrawer.tsx  # Drive receipt and podium breakdown
            ├── VenueExplorer.tsx  # Real venue directory with Google Maps links
            └── LandingPage.tsx    # Clean introductory portal with API key setup
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

# 3D Frame Viewer

Browser-based 3D visualizer for NASTRAN BDF and STRUDL structural models.

## Quick Start

```bash
cd frame-viewer
npm install
npm run dev
```

Open http://localhost:5173

## Features

- NASTRAN BDF parsing (GRID, CBAR, CBEAM, PBAR, MAT1)
- STRUDL parsing (JOINT COORDINATES, MEMBER INCIDENCES)
- Three.js 3D visualization — points (grids) and lines (elements)
- Mouse drag to rotate, wheel to zoom
- Touch: 1-finger rotate, 2-finger pinch zoom
- Fully in-browser — no server required

## Build for Production

```bash
npm run build
npm run preview
```

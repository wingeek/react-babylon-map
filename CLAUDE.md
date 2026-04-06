# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`react-babylon-map` is a React library that renders Babylon.js 3D content inside MapLibre GL JS and Mapbox GL JS maps. It shares the map's WebGL context so Babylon scenes render in-place on the map.

## Commands

```bash
pnpm build              # builds both MapLibre + Mapbox variants (ES + CJS)
pnpm build:maplibre     # MapLibre only
pnpm build:mapbox       # Mapbox only
pnpm ts:check           # TypeScript type checking
pnpm lint               # ESLint with --fix
pnpm test               # vitest
```

There is no dev server. The library is consumed via path aliases in `tsconfig.json` (`react-babylon-map` → `src/mapbox.index.ts`, `react-babylon-map/maplibre` → `src/maplibre.index.ts`). Stories use Ladle (`stories/`).

## Architecture

### Dual map provider entry points

Two separate entry points re-export the shared API and provider-specific `Canvas`:
- `src/maplibre.index.ts` — imports from `maplibre-gl`, uses `MercatorCoordinate.fromLngLat`
- `src/mapbox.index.ts` — imports from `mapbox-gl`, same pattern

Both re-export everything from `src/api/`.

### Two rendering modes

`<Canvas overlay>` prop selects the rendering mode:

1. **In-layer mode** (default, `overlay` omitted/falsy) — shares the map's WebGL context via a MapLibre/Mapbox `custom` layer with `renderingMode: '3d'`. Babylon Engine is created from the map canvas's existing GL context. Children render in a separate React root (`useRoot` creates a `createRoot` on a detached div, rendering children with `BabylonMapContext.Provider`). The map's `render()` callback drives Babylon rendering via `useRender`.

2. **Overlay mode** (`overlay` prop) — creates a separate `<canvas>` element overlaid on the map. A `custom` Layer with a no-op `render` triggers repaints, while `InitCanvasFC` + `CanvasPortal` + `SyncCameraFC` manage the overlay canvas, its own Babylon engine, and camera sync. This avoids shared GL context issues but layers are not interleaved with map layers.

### Camera sync (`sync-camera.ts`)

The core mechanism: MapLibre/Mapbox provide a column-major view-projection matrix on each render call. `syncCamera()` composes the origin's world matrix with the map's camera matrix, then freezes the result as Babylon's projection matrix. This bypasses Babylon's own camera math entirely.

### Sub-scene pattern for `<Coordinates>` and `<NearCoordinates>`

Both create a Babylon `Scene` (not just a TransformNode) with `autoClear = false` and transparent clear color. Each has its own `FreeCamera` synced to its geographic position. They render via `mainScene.onBeforeRenderObservable` — the main scene's render loop triggers sub-scene renders. Children get a new `BabylonMapContext` pointing at the sub-scene.

- `Coordinates` — uses `coordsToMatrix` for the full mercator world matrix, same as the main canvas origin
- `NearCoordinates` — converts the target coord to a local `[x, y, z]` offset via `coordsToVector3`, positions the sub-scene camera there, and freezes the main scene's projection matrix

### Coordinate system

`coordsToMatrix` converts geo coords to a Babylon world matrix using MercatorCoordinate. A π/2 X-axis rotation accounts for the axis difference: Babylon +Y up vs MapLibre +Z up. The `meterInMercatorCoordinateUnits()` scale factor ensures 1 Babylon unit = 1 meter.

### Shared context (`use-babylon-map.ts`)

`BabylonMap` is the central context object holding `map`, `viewProjMx` (flat column-major array), `fromLngLat`, `engine`, `scene`, and `coords`. It's mutable — `viewProjMx` and `coords` are updated in-place on each render.

### Generic map types (`generic-map.ts`)

Provider-agnostic interfaces for `MapInstance`, `MercatorCoordinate`, `FromLngLat`, `LayerProps`. Both MapLibre and Mapbox `Map` objects satisfy `MapInstance`.

### GL state cache wiping

`engine.wipeCaches(true)` is called before every `scene.render()` in both modes. This is critical when sharing a GL context — MapLibre's state changes would otherwise conflict with Babylon's cached GL state.

## Build output

Build produces four targets in `dist/`:
- `dist/es/` and `dist/cjs/` for Mapbox (default)
- `dist/maplibre/es/` and `dist/maplibre/cjs/` for MapLibre

`LIB_MODE` env (1=ES, 2=CJS) and `MAP_MODE` env (0=MapLibre, 1=Mapbox) control the build via `vite.config.ts`.

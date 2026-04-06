---
name: react-babylon-map migration status
description: Project status — migrating react-three-map to react-babylon-map with Babylon.js
type: project
---

## Migration from react-three-map to react-babylon-map

### Completed
- Core `src/` directory fully migrated
- Entry points: `src/mapbox.index.ts`, `src/maplibre.index.ts`
- API exports `useBabylonMap` and `BabylonMapContext` from `src/api/index.ts`
- Build: all 4 targets (MapLibre ES/CJS + Mapbox ES/CJS) build successfully
- Both rendering modes verified: canvas-in-layer (shared GL) and canvas-overlay (separate canvas)
- Camera jitter fixed with `useHighPrecisionMatrix: true`
- GL state conflict fixed with `engine.wipeCaches(true)` + `scene.render(false)`
- `Coordinates` component uses sub-scene approach (with own camera + light + wipeCaches)
- `NearCoordinates` also uses sub-scene approach
- Stories migrated: canvas/mapbox, canvas/maplibre, render-on-demand, comparison/with-map, multi-coordinates/default, billboard/default, html-on-top/default, extrude-coordinates, pivot-controls/default, sunlight/default, postprocessing/default
- Animation via `scene.onBeforeRenderObservable` + `performance.now()` delta (not `getDeltaTime()`)
- Babylon upgraded to 9.1.0 — all 4 build targets pass, no API breakage
- AdaptiveDpr utility component created
- Billboard: DynamicTexture + inverted camera rotation for face-camera effect
- HtmlOverlay: Vector3.Project to screen coordinates + positioned DOM element
- ExtrudeShape: MeshBuilder.CreateRibbon for walls + fan triangulation for cap
- PivotControls: Babylon GizmoManager with position gizmo (XZ only)
- Sunlight: suncalc + luxon + tz-lookup for sun position, map style switching day/night
- PostProcessing: Babylon DefaultRenderingPipeline with SSAO + FXAA

### Key architectural decisions
- **No react-babylonjs or Reactylon** — neither supports creating Engine from external GL context; imperative API used instead
- **Sub-scenes for Coordinates** — mirrors R3F's createPortal; each geo coordinate gets its own Scene+Camera+Light
- **TransformNode approach rejected** — decompose produces Mercator-scale (~1e-7) making children invisible

- **Buildings 3D** — completed. Individual meshes via `CreateRibbon` (walls) + fan triangulation (caps). HSV color animation via `scene.onBeforeRenderObservable`. Bloom via `DefaultRenderingPipeline`. Uses `suspend-react` for Overpass API data. Verified visually against Three.js version.
- ~~IFC~~ — skipped, depends on `web-ifc-three` (Three.js only, no Babylon equivalent)
- **IFC** — completed. Uses `@ifc-lite/geometry` (engine-agnostic WASM parser) + `batchWithVertexColors()` bridge. Z-up → Y-up rotation via `parent.rotation.x = -Math.PI / 2`. Vite needs `optimizeDeps.exclude: ['@ifc-lite/geometry', '@ifc-lite/wasm']` + `assetsInclude: ['**/*.wasm']` + COOP/COEP headers.

### All stories migrated
canvas, render-on-demand, comparison, multi-coordinates, billboard, html-on-top, extrude-coordinates, pivot-controls, sunlight, postprocessing, buildings-3d, **ifc**

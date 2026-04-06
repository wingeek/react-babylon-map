---
name: Canvas overlay mode vs canvas-in-layer mode
description: Key differences between the two rendering modes and their specific requirements
type: feedback
---

## Canvas-in-layer (overlay={false})
- Shares MapLibre's GL context — Babylon Engine created from `gl` context
- `scene.autoClear = false` — must NOT clear, MapLibre owns the framebuffer
- `scene.detachControl()` — MapLibre handles pointer events
- `engine.wipeCaches(true)` before each `scene.render(false)` — reset GL state caches
- Render inside MapLibre's custom layer `render` callback
- Children rendered via `react-dom createRoot` in separate React tree

## Canvas overlay (overlay={true})
- Separate `<canvas>` element overlaid on the map via portal
- `scene.autoClear` stays default (true) — must clear its own canvas each frame, otherwise ghosting/accumulation
- `scene.clearColor = new Color4(0,0,0,0)` — transparent to show map underneath
- `engine.wipeCaches(true)` + `scene.render(false)` inside `onRender` callback
- `onRender` callback set via `setOnRender` state → wired to MapLibre Layer's `render` prop

## Both modes require
- `useHighPrecisionMatrix: true` in Engine options — prevents jitter at Mercator scale
- `syncCamera` with `origin.multiplyToRef(cameraMx, wvpMx)` + `freezeProjectionMatrix(wvpMx)`
- Uniform positive scaling + `Quaternion.FromEulerAngles(Math.PI/2, 0, 0)` for coord system
- `StandardMaterial` meshes need a light source (e.g. `HemisphericLight`) or they render black

**Why:** Each mode has opposite autoClear requirements. Overlay must clear (separate canvas), in-layer must not (shared framebuffer). Missing `useHighPrecisionMatrix` causes camera jitter at high zoom levels due to floating-point precision loss with Mercator coordinates.

---
name: Babylon.js shared GL context with MapLibre
description: Key patterns for Babylon.js canvas-in-layer mode sharing MapLibre's GL context
type: feedback
---

When integrating Babylon.js with MapLibre's shared GL context (canvas-in-layer mode), follow the official demo pattern exactly:

- **`engine.wipeCaches(true)`** before each `scene.render()` — Babylon's built-in method, don't try manual dirty-flag manipulation
- **`scene.render(false)`** — pass false to skip camera update
- **`scene.detachControl()`** — let MapLibre handle pointer events
- **`scene.autoClear = false`** — don't clear MapLibre's framebuffer
- **Engine options**: `useHighPrecisionMatrix: true` to prevent jitter at mercator scale
- **Matrix math**: `Matrix.FromArrayToRef(mapCamMx, 0, tmp)` reads column-major directly (no transpose). Multiplication: `origin.multiplyToRef(cameraMx, wvpMx)`
- **World matrix**: uniform positive scaling + `Quaternion.FromEulerAngles(Math.PI/2, 0, 0)` for coord system rotation

**Why:** Manual GL state reset via `reset()` + dirty flags passes null/0 values as GL enums (INVALID_ENUM). The matrix transpose was unnecessary since Babylon's `FromArray` already reads column-major. These caused 65+ WebGL errors per frame.
**How to apply:** Always check for official integration demos/examples first before improvising state management for shared GL contexts.

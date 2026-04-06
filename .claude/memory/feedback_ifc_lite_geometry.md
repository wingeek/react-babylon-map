---
name: IFC glass rendering limitation
description: @ifc-lite/geometry outputs solid wall panels without window cutouts — glass hidden behind opaque geometry. Known limitation vs web-ifc.
type: feedback
---

## @ifc-lite/geometry: solid walls hide glass

**Rule:** `@ifc-lite/geometry` outputs wall panels as solid geometry WITHOUT window cutouts. Transparent glass panes are occluded by opaque brown walls. This is a fundamental parser limitation — `web-ifc` (used by `web-ifc-three`) performs boolean subtraction for window openings and renders glass correctly.

**Why:** `@ifc-lite/geometry` is a lighter, engine-agnostic WASM parser that skips the boolean CSG operations. For the test model, right-side windows have 3020-vertex solid brown walls (dims 0.06×2.30×1.00) covering 24-vertex transparent blue glass panes. Left-side windows work because their walls are separate geometry with no overlap.

**How to apply:** Bounding-box-based mesh skipping is fragile — it catches floors/ceilings/walls that merely span the glass area. Size-similarity checks help but are model-dependent. Consider:
- Reporting to `@ifc-lite/geometry` maintainers as feature request
- Accepting as known limitation for models with embedded windows
- Future: custom CSG clipping or switching to `web-ifc` for models that need cutouts

## Diagnostic data (test model)

| Mesh | expressId | Verts | Color | Dims (IFC) |
|------|-----------|-------|-------|-------------|
| Wall panel | 6518-6787 | 3020 | brown opaque | 0.06×2.30×1.00 |
| Frame | 6518-6787 | 72 | brown opaque | 0.04×2.27×0.97 |
| Glass | (window ids) | 24 | blue α=0.25 | ~0.04×2.27×0.97 |
| Extra panels | 22492 | 48-492 | brown opaque | various |
| Floor slab | 22551/22620 | 24 | gray opaque | 7.40×0.30×16.90 |

The 3020-vert walls and 48-492-vert panels both occlude glass. Bounding-box skip with size-similarity check catches 3020v walls but misses other panels.

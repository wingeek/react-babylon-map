---
name: IFC geometry parser differences
description: @ifc-lite/geometry vs web-ifc — key differences in geometry output affecting glass/window rendering
type: feedback
---

## @ifc-lite/geometry vs web-ifc for IFC parsing

**Rule:** When rendering IFC models with `@ifc-lite/geometry`, wall geometry may NOT have window cutouts. The parser outputs solid wall panels even where windows exist. In contrast, `web-ifc` (used by `web-ifc-three`) performs boolean subtraction to create proper openings.

**Why:** `@ifc-lite/geometry` is a lighter, engine-agnostic parser that skips the boolean CSG operations that `web-ifc` performs. This means glass panes (transparent, ~24 verts) can be hidden behind solid wall panels (~3020 verts, opaque brown).

**How to apply:** For IFC models with windows, be aware that glass may be occluded by opaque walls. Possible mitigations:
- Bounding-box-based skip of opaque meshes covering glass (fragile, model-dependent)
- Accept as known limitation
- The official `ifc2bb.ts` `batchWithVertexColors` approach (vertex colors + white diffuse material) improves color differentiation but doesn't fix occlusion

## Y↔Z swap and winding order

**Rule:** When converting IFC Z-up to Babylon Y-up, the Y↔Z vertex swap (`positions[i+1] = Z, positions[i+2] = Y`) is a **reflection** (determinant = -1), not a rotation. This inverts triangle winding order.

**Why:** A reflection changes the handedness of the coordinate system, making CCW faces CW and vice versa. This causes back-face culling to remove the wrong faces.

**How to apply:** After Y↔Z swap, reverse winding by swapping index pairs: `(a,b,c) → (a,c,b)` for each triangle. The parent rotation `rotation.x = -Math.PI / 2` cancels the map origin matrix rotation, so the net transform is just the swap. Alternative: use only rotation (no swap) but this requires `rotation.x = Math.PI` and `rotation.y = Math.PI` to match orientation.

## Official ifc2bb.ts approach

**Rule:** The official example (`stories/ifc2bb.ts` + `ifc.main.ts`) uses `batchWithVertexColors`:
- ALL opaque meshes → 1 mesh with per-vertex RGB colors, `diffuseColor = Color3(1,1,1)` (white), `specularColor = Color3(0,0,0)`
- Transparent grouped by alpha value, each group → separate mesh
- `mesh.hasVertexAlpha = false` — alpha from material only
- Simple material: just `material.alpha` and `material.backFaceCulling = false` for transparent
- No Y↔Z swap, no skip logic, no depth write/zOffset/transparencyMode

**How to apply:** When adapting for map context, add Y↔Z swap + winding reversal in the merge function. Keep material settings identical to official.

---
name: Coordinates sub-scene approach
description: How Coordinates/NearCoordinates work in react-babylon-map using sub-scenes, NOT TransformNode
type: feedback
---

## Coordinates must use sub-scenes, NOT TransformNode

The TransformNode approach (decompose origin matrix → apply position/scale/rotation to a node → parent meshes to it) does NOT work because:
- The decomposed scale is the Mercator unit scale (~1e-7), making child meshes invisible
- The camera's `freezeProjectionMatrix` already encodes the origin position — adding a TransformNode offset double-positions everything

The correct approach mirrors react-three-map's `createPortal` pattern:
1. Create a **separate Babylon Scene** with `autoClear = false` and transparent `clearColor`
2. Create a **FreeCamera** in the sub-scene with `syncCamera(cam, origin, viewProjMx)` — this projects objects at the correct geo position
3. Add a **HemisphericLight** to the sub-scene so StandardMaterial isn't black
4. Render via `mainScene.onBeforeRenderObservable` → `engine.wipeCaches(true)` → `subScene.render(false)`
5. Provide sub-scene via `BabylonMapContext` so children create meshes in it

**Why:** Each geo coordinate needs its own camera with a projection matrix that places content at that position on the map. A shared camera can only project for one origin. Sub-scenes give each coordinate its own camera while sharing the GL context.
**How to apply:** Any component that needs to render at a different geo position must use the sub-scene pattern with its own camera + light + wipeCaches.

## HtmlOverlay (3D → screen projection) must use manual WVP multiply

When projecting 3D world positions to screen coords for HTML overlays, do NOT use `Vector3.Project` — it internally applies `view * projection` which double-applies the view transform with frozen projection matrices. Instead, manually multiply `position * WVP`, do perspective divide, and map NDC to screen.

**Why:** `freezeProjectionMatrix` stores the full WVP (world*view*proj) in the projection slot. `Vector3.Project` computes `projection * view * world * pos`, giving `WVP * V * I * pos` = double view. Manual multiplication avoids this.
**How to apply:** For any screen-space HTML overlay, use `cam.getProjectionMatrix()` (the frozen WVP), multiply manually by column-major `m[]`, perspective divide by w4, then `(ndcX+1)/2*w` and `(1-ndcY)/2*h`.

## React portal + useEffect timing: add state deps

When a component conditionally renders a portal (waits for DOM ref via `useState`), any `useEffect` that depends on the portal's ref must include the portal container state in its dependency array. Otherwise the effect runs once with `ref.current === null` and never re-runs.

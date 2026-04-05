import { FreeCamera, Matrix } from '@babylonjs/core';

const tmpCameraMx = Matrix.Identity();
const tmpWvpMx = Matrix.Identity();

/** Synchronise a Babylon camera with the map's view-projection matrix.
 *  @param camera   The Babylon camera to update.
 *  @param origin   Babylon world matrix for the Canvas origin.
 *  @param mapCamMx Flat array from MapLibre's view-projection (column-major).
 */
export function syncCamera(
  camera: FreeCamera,
  origin: Matrix,
  mapCamMx: number[],
): void {

  // Matrix.FromArray reads column-major data (same layout as MapLibre provides)
  Matrix.FromArrayToRef(mapCamMx, 0, tmpCameraMx);

  // world-view-projection = origin * camera (same as demo: worldMatrix.multiply(cameraMatrix))
  origin.multiplyToRef(tmpCameraMx, tmpWvpMx);

  // Freeze the projection to the composed matrix so Babylon's own
  // projection math is bypassed.
  camera.freezeProjectionMatrix(tmpWvpMx);

  camera.minZ = 0;
  camera.maxZ = 1e6;
}

import { FreeCamera, Matrix, Scene } from '@babylonjs/core';
import { MapInstance } from '../generic-map';
import { syncCamera } from '../sync-camera';
import { useFunction } from '../use-function';
import { BabylonMap } from '../use-babylon-map';

export function useRender({
  map, origin, scene, camera, frameloop, babylonMap,
}: {
  map: MapInstance;
  origin: Matrix;
  scene: Scene;
  camera: FreeCamera;
  frameloop?: 'always' | 'demand';
  babylonMap: BabylonMap;
}) {
  const render = useFunction((
    _gl: WebGL2RenderingContext,
    projViewMx: number[] | { defaultProjectionData: { mainMatrix: Record<string, number> } },
  ) => {
    const pVMx = 'defaultProjectionData' in projViewMx
      ? Object.values(projViewMx.defaultProjectionData.mainMatrix)
      : projViewMx;

    // Update shared context
    babylonMap.viewProjMx = pVMx as number[];

    // Sync camera
    syncCamera(camera, origin, pVMx as number[]);

    // Wipe Babylon's internal GL state caches so the next render
    // re-applies everything from scratch. This is critical when
    // sharing a GL context with MapLibre.
    scene.getEngine().wipeCaches(true);

    // Render the Babylon scene into the shared GL context.
    scene.render(false);

    if (!frameloop || frameloop === 'always') map.triggerRepaint();
  });

  return render;
}

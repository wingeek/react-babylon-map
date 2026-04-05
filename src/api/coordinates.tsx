import { Color4, FreeCamera, HemisphericLight, Scene, Vector3 } from '@babylonjs/core';
import { memo, useEffect, useRef, useState } from 'react';
import { syncCamera } from '../core/sync-camera';
import { useCoordsToMatrix } from '../core/use-coords-to-matrix';
import { useBabylonMap, BabylonMapContext } from '../core/use-babylon-map';
import type { BabylonMap } from '../core/use-babylon-map';

export interface CoordinatesProps {
  longitude: number;
  latitude: number;
  altitude?: number;
  children?: React.ReactNode;
}

/**
 * Place 3D content at specific geographic coordinates inside a `<Canvas>`.
 * Creates a sub-scene with its own camera synced to the given geo position,
 * mirroring react-three-map's createPortal approach.
 */
export const Coordinates = memo<CoordinatesProps>(({
  latitude, longitude, altitude = 0, children,
}) => {
  const babylonMap = useBabylonMap();
  const origin = useCoordsToMatrix({
    latitude, longitude, altitude, fromLngLat: babylonMap.fromLngLat,
  });

  // Create a sub-scene for this coordinate portal
  const [subScene] = useState(() => {
    if (!babylonMap.engine) return null;
    const sub = new Scene(babylonMap.engine);
    sub.autoClear = false;
    sub.clearColor = new Color4(0, 0, 0, 0);
    return sub;
  });

  const cameraRef = useRef<FreeCamera | null>(null);

  // Create camera + default light in sub-scene
  useEffect(() => {
    if (!subScene) return;
    const cam = new FreeCamera('coordsCam', Vector3.Zero(), subScene);
    cam.inputs.clear();
    cam.minZ = 0;
    cameraRef.current = cam;

    // Add a default light so StandardMaterial isn't black
    const light = new HemisphericLight('coordsLight', new Vector3(0, 1, 0), subScene);
    light.intensity = 1;

    return () => { cam.dispose(); light.dispose(); };
  }, [subScene]);

  // Render the sub-scene each frame, synced to its geographic position
  useEffect(() => {
    if (!subScene || !babylonMap.scene) return;
    const mainScene = babylonMap.scene;

    const observer = mainScene.onBeforeRenderObservable.add(() => {
      if (!cameraRef.current) return;
      syncCamera(cameraRef.current, origin, babylonMap.viewProjMx);
      babylonMap.engine?.wipeCaches(true);
      subScene.render(false);
    });

    return () => {
      mainScene.onBeforeRenderObservable.remove(observer);
    };
  }, [subScene, babylonMap.scene, origin, babylonMap]);

  // Provide child context pointing at the sub-scene
  const childMap: BabylonMap = {
    ...babylonMap,
    scene: subScene || undefined,
  };

  return (
    <BabylonMapContext.Provider value={childMap}>
      {children}
    </BabylonMapContext.Provider>
  );
});
Coordinates.displayName = 'Coordinates';

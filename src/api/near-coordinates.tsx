import { Color4, FreeCamera, HemisphericLight, Scene, Vector3 } from '@babylonjs/core';
import { memo, useEffect, useRef, useState } from 'react';
import { useBabylonMap, BabylonMapContext } from '../core/use-babylon-map';
import type { BabylonMap } from '../core/use-babylon-map';
import { useCoords } from '../core/use-coords';
import { coordsToVector3 } from './coords-to-vector-3';

export interface NearCoordinatesProps {
  longitude: number;
  latitude: number;
  altitude?: number;
  children?: React.ReactNode;
}

/**
 * Place 3D content at a nearby coordinate (relative to the Canvas origin).
 * Uses the sub-scene approach like Coordinates but computes a relative offset
 * for the camera's world matrix.
 */
export const NearCoordinates = memo<NearCoordinatesProps>(({ children, ...coords }) => {
  const { latitude, longitude, altitude } = useCoords();
  const babylonMap = useBabylonMap();

  const pos = coordsToVector3(coords, { latitude, longitude, altitude });

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
    const cam = new FreeCamera('nearCoordsCam', new Vector3(pos[0], pos[1], pos[2]), subScene);
    cam.inputs.clear();
    cam.minZ = 0;
    cameraRef.current = cam;

    const light = new HemisphericLight('nearCoordsLight', new Vector3(0, 1, 0), subScene);
    light.intensity = 1;

    return () => { cam.dispose(); light.dispose(); };
  }, [subScene]);

  // Update camera position when offset changes
  useEffect(() => {
    if (!cameraRef.current) return;
    cameraRef.current.position.set(pos[0], pos[1], pos[2]);
  }, [pos]);

  // Render the sub-scene each frame
  useEffect(() => {
    if (!subScene || !babylonMap.scene) return;
    const mainScene = babylonMap.scene;

    const observer = mainScene.onBeforeRenderObservable.add(() => {
      if (!cameraRef.current) return;
      // Use the same projection as the main scene but offset by local position
      cameraRef.current.freezeProjectionMatrix(babylonMap.scene!.activeCamera!.getProjectionMatrix());
      babylonMap.engine?.wipeCaches(true);
      subScene.render(false);
    });

    return () => {
      mainScene.onBeforeRenderObservable.remove(observer);
    };
  }, [subScene, babylonMap.scene, babylonMap]);

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
NearCoordinates.displayName = 'NearCoordinates';

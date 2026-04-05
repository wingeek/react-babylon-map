import { Color4, Engine, FreeCamera, Scene, Vector3 } from '@babylonjs/core';
import { createRoot, Root } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { CanvasProps } from '../../api/canvas-props';
import { BabylonMap, BabylonMapContext, createBabylonMap } from '../use-babylon-map';
import { FromLngLat, MapInstance } from '../generic-map';
import { useFunction } from '../use-function';

interface RootState {
  engine: Engine;
  scene: Scene;
  camera: FreeCamera;
  reactRoot: Root;
  container: HTMLDivElement;
  babylonMap: BabylonMap;
}

export function useRoot(
  fromLngLat: FromLngLat,
  map: MapInstance,
  { longitude, latitude, altitude, frameloop, ...props }: CanvasProps,
) {
  const [{ engine, scene, camera, reactRoot, babylonMap }] = useState<RootState>(() => {
    const canvas = map.getCanvas();
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext;

    // Create Babylon Engine from MapLibre's GL context (same pattern as demo.html)
    const engine = new Engine(
      gl as WebGL2RenderingContext,
      true,
      { useHighPrecisionMatrix: true },
      true,
    );

    const scene = new Scene(engine);
    scene.autoClear = false;
    scene.clearColor = new Color4(0, 0, 0, 0);
    scene.detachControl(); // let MapLibre handle pointer events

    const camera = new FreeCamera('cam', Vector3.Zero(), scene);
    camera.inputs.clear();
    camera.minZ = 0;

    const babylonMap = createBabylonMap({ map, fromLngLat, engine, scene });

    // Separate React root for children
    const container = document.createElement('div');
    const reactRoot = createRoot(container);

    return { engine, scene, camera, reactRoot, container, babylonMap };
  });

  const onResize = useFunction(() => {
    engine.resize();
  });

  const onRemove = useFunction(() => {
    reactRoot.unmount();
    scene.dispose();
    engine.dispose();
  });

  // Update coords on babylonMap
  babylonMap.coords = { longitude, latitude, altitude };

  // Resize listener
  useEffect(() => {
    map.on('resize', onResize);
    return () => { map.off('resize', onResize); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Render children into the separate React root
  useEffect(() => {
    reactRoot.render(
      <BabylonMapContext.Provider value={babylonMap}>
        {props.children}
      </BabylonMapContext.Provider>,
    );
  }, [props.children]); // eslint-disable-line react-hooks/exhaustive-deps

  return { onRemove, engine, scene, camera, babylonMap };
}

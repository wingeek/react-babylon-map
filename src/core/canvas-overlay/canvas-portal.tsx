import { Color4, Engine, FreeCamera, Scene, Vector3 } from '@babylonjs/core';
import { memo, useEffect, useRef, useState } from 'react';
import { CanvasProps } from '../../api/canvas-props';
import { BabylonMap, BabylonMapContext, createBabylonMap } from '../use-babylon-map';
import { FromLngLat, MapInstance } from '../generic-map';
import { useFunction } from '../use-function';
import { SyncCameraFC } from './sync-camera-fc';

interface CanvasPortalProps extends CanvasProps {
  setOnRender: (callback: () => (mx: number[]) => void) => void;
  map: MapInstance;
  fromLngLat: FromLngLat;
}

const canvasStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
};

export const CanvasPortal = memo<CanvasPortalProps>(({
  children, latitude, longitude, altitude,
  setOnRender, map, fromLngLat,
}) => {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapCanvas = map.getCanvas();

  const [babylonMap, setBabylonMap] = useState<BabylonMap | null>(null);
  const [ready, setReady] = useState(false);

  // Create Engine + Scene on mount
  useEffect(() => {
    const canvas = canvasRef.current!;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, useHighPrecisionMatrix: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);

    const camera = new FreeCamera('cam', Vector3.Zero(), scene);
    camera.inputs.clear();
    camera.minZ = 0;

    setBabylonMap(createBabylonMap({ map, fromLngLat, engine, scene }));

    return () => {
      scene.dispose();
      engine.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize handling
  useEffect(() => {
    if (!babylonMap?.engine) return;
    const engine = babylonMap.engine;

    const onResize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = mapCanvas.clientWidth * window.devicePixelRatio;
      c.height = mapCanvas.clientHeight * window.devicePixelRatio;
      c.style.width = `${mapCanvas.clientWidth}px`;
      c.style.height = `${mapCanvas.clientHeight}px`;
      engine.resize();
    };

    onResize();
    map.on('resize', onResize);
    return () => { map.off('resize', onResize); };
  }, [babylonMap, map, mapCanvas]);

  const onReady = useFunction(() => {
    setReady(true);
  });

  return (
    <>
      <canvas ref={canvasRef} style={canvasStyle} />
      {babylonMap && (
        <BabylonMapContext.Provider value={babylonMap}>
          <SyncCameraFC
            latitude={latitude}
            longitude={longitude}
            altitude={altitude}
            setOnRender={setOnRender}
            onReady={onReady}
            map={map}
            canvasRef={canvasRef}
          />
          {ready && children}
        </BabylonMapContext.Provider>
      )}
    </>
  );
});
CanvasPortal.displayName = 'CanvasPortal';

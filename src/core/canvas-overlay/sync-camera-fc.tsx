import { FreeCamera } from '@babylonjs/core';
import { memo, RefObject, useEffect, useRef, useMemo } from 'react';
import { Coords } from '../../api/coords';
import { MapInstance } from '../generic-map';
import { syncCamera } from '../sync-camera';
import { useCoordsToMatrix } from '../use-coords-to-matrix';
import { useFunction } from '../use-function';
import { useBabylonMap } from '../use-babylon-map';

interface SyncCameraFCProps extends Coords {
  setOnRender?: (callback: () => (mx: number[]) => void) => void;
  onReady?: () => void;
  map: MapInstance;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

/** React component to sync the Babylon camera with the map provider on each render. */
export const SyncCameraFC = memo<SyncCameraFCProps>(({
  latitude, longitude, altitude = 0, setOnRender, onReady, map, canvasRef,
}) => {

  const mapCanvas = map.getCanvas();
  const babylonMap = useBabylonMap();
  const scene = babylonMap.scene!;
  const engine = babylonMap.engine!;

  const origin = useCoordsToMatrix({ latitude, longitude, altitude, fromLngLat: babylonMap.fromLngLat });

  const ready = useRef(false);

  const triggerRepaint = useMemo(() => map.triggerRepaint, [map]);
  const mapPaintRequests = useRef(0);
  const triggerRepaintOff = useFunction(() => {
    mapPaintRequests.current++;
  });

  // Render callback — called by MapLibre on each paint frame
  const onRender = useFunction((viewProjMx: number[] | { defaultProjectionData: { mainMatrix: Record<string, number> } }) => {
    map.triggerRepaint = triggerRepaintOff;

    // Resize if needed
    if (canvasRef.current && engine) {
      if (canvasRef.current.width !== mapCanvas.width || canvasRef.current.height !== mapCanvas.height) {
        canvasRef.current.width = mapCanvas.clientWidth * window.devicePixelRatio;
        canvasRef.current.height = mapCanvas.clientHeight * window.devicePixelRatio;
        canvasRef.current.style.width = `${mapCanvas.clientWidth}px`;
        canvasRef.current.style.height = `${mapCanvas.clientHeight}px`;
        engine.resize();
      }
    }

    const pVMx = 'defaultProjectionData' in viewProjMx
      ? Object.values(viewProjMx.defaultProjectionData.mainMatrix)
      : viewProjMx;
    babylonMap.viewProjMx = pVMx as number[];

    // Sync camera
    syncCamera(scene.activeCamera as FreeCamera, origin, babylonMap.viewProjMx);

    // Wipe caches and render one frame
    engine.wipeCaches(true);
    scene.render(false);

    if (!ready.current && onReady) {
      ready.current = true;
      onReady();
    }

    // Restore triggerRepaint for demand-based rendering
    map.triggerRepaint = triggerRepaint;
    if (mapPaintRequests.current > 0) {
      mapPaintRequests.current = 0;
      map.triggerRepaint();
    }
  });

  useEffect(() => {
    setOnRender && setOnRender(() => onRender);
  }, [setOnRender, onRender]);

  return null;
});
SyncCameraFC.displayName = 'SyncCameraFC';

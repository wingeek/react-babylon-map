import { Color4, Engine, Scene } from '@babylonjs/core';
import React, { useEffect, useRef, useState } from 'react';

export interface MapEngineProps {
  /** External WebGL rendering context (canvas-in-layer mode). */
  externalContext?: WebGLRenderingContext;
  /** Render mode: manual = external code triggers scene.render(), auto = engine runRenderLoop. */
  renderMode?: 'auto' | 'manual';
  children: React.ReactNode;
}

/**
 * Wrapper that creates a Babylon Engine (optionally from an external GL context)
 * and a Scene, then provides them to children.
 *
 * In *overlay* mode a new <canvas> is created.
 * In *canvas-in-layer* mode the external MapLibre GL context is reused.
 */
export const MapEngine: React.FC<MapEngineProps> = ({
  externalContext,
  renderMode = 'manual',
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);

  useEffect(() => {
    let eng: Engine;

    if (externalContext) {
      eng = new Engine(
        externalContext as WebGL2RenderingContext,
        false, // antialias
        { preserveDrawingBuffer: true, stencil: true },
        false, // adaptToDeviceRatio
      );
    } else {
      eng = new Engine(canvasRef.current!, true);
    }

    const scn = new Scene(eng);
    scn.useRightHandedSystem = true;
    scn.autoClear = false;
    scn.clearColor = new Color4(0, 0, 0, 0);

    if (renderMode === 'auto') {
      eng.runRenderLoop(() => scn.render());
    }

    setEngine(eng);
    setScene(scn);

    return () => {
      scn.dispose();
      eng.dispose();
    };
  }, [externalContext, renderMode]);

  if (!engine || !scene) {
    return externalContext ? null : <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />;
  }

  return (
    <>
      {!externalContext && <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />}
      {children}
    </>
  );
};

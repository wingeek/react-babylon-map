import { createContext, useContext } from 'react';
import { Engine, Scene } from '@babylonjs/core';
import { FromLngLat, MapInstance } from './generic-map';

/** Context object shared between both rendering modes. */
export interface BabylonMap<T extends MapInstance = MapInstance> {
  /** Map provider instance */
  map: T;
  /** Column-major view-projection matrix from the map provider */
  viewProjMx: number[];
  /** Mercator coordinate factory */
  fromLngLat: FromLngLat;
  /** Babylon Engine (may be null during init) */
  engine?: Engine;
  /** Babylon Scene (may be null during init) */
  scene?: Scene;
  /** Current origin coordinates (set by Canvas) */
  coords?: { longitude: number; latitude: number; altitude?: number };
}

// ── React context ──────────────────────────────────────────────────────

export const BabylonMapContext = createContext<BabylonMap | null>(null);

/** Access the current BabylonMap context (map, scene, engine, viewProjMx). */
export function useBabylonMap<T extends MapInstance = MapInstance>(): BabylonMap<T> {
  const ctx = useContext(BabylonMapContext);
  if (!ctx) throw new Error('useBabylonMap must be used inside a <Canvas>');
  return ctx as BabylonMap<T>;
}

/** Initialise / update the BabylonMap context value. */
export function createBabylonMap<T extends MapInstance>(opts: {
  map: T;
  fromLngLat: FromLngLat;
  engine?: Engine;
  scene?: Scene;
}): BabylonMap<T> {
  return {
    map: opts.map,
    viewProjMx: new Array(16).fill(0) as number[],
    fromLngLat: opts.fromLngLat,
    engine: opts.engine,
    scene: opts.scene,
  };
}

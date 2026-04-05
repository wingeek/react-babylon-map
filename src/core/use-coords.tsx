import { useContext, useMemo } from 'react';
import { Coords } from '../api/coords';
import { BabylonMapContext, BabylonMap } from './use-babylon-map';

/** Read the current coordinates from context. */
export function useCoords(): Coords {
  const ctx = useContext(BabylonMapContext);
  if (!ctx) throw new Error('useCoords must be used inside a <Canvas>');
  return (ctx as any).coords as Coords; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Update the coordinates stored on the context. */
export function useSetCoords({ longitude, latitude, altitude }: Coords) {
  // Coordinates are now stored directly on the BabylonMap context object
  // so downstream hooks can read them.
  useMemo(() => {
    const ctx = (BabylonMapContext as any)._currentValue as BabylonMap | null; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (ctx) {
      (ctx as any).coords = { longitude, latitude, altitude }; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  }, [longitude, latitude, altitude]);
}

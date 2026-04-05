import { MapInstance } from '../core/generic-map';
import { useBabylonMap } from '../core/use-babylon-map';

/** Access the underlying map instance from inside a `<Canvas>`. */
export const useMap = <T extends MapInstance = MapInstance>(): T => {
  const ctx = useBabylonMap();
  return ctx.map as T;
};

import { Matrix, Quaternion, Vector3 } from '@babylonjs/core';
import { FromLngLat } from './generic-map';
import { Coords } from '../api/coords';

/** Calculate Babylon.js Matrix from coordinates.
 *  Returns a Babylon Matrix (world transform at the given geo coord).
 *  Matches the pattern from MapLibre + Babylon.js integration demo. */
export function coordsToMatrix({
  longitude, latitude, altitude, fromLngLat
}: Coords & { fromLngLat: FromLngLat }): Matrix {
  const center = fromLngLat([longitude, latitude], altitude);
  const scaleUnit = center.meterInMercatorCoordinateUnits();

  const position = new Vector3(center.x, center.y, center.z || 0);
  const scaling = new Vector3(scaleUnit, scaleUnit, scaleUnit);
  // Babylon default: +x east, +y up, +z north
  // MapLibre default: +x east, -y north, +z up
  const rotation = Quaternion.FromEulerAngles(Math.PI / 2, 0, 0);

  return Matrix.Compose(scaling, rotation, position);
}

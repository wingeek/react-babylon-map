import { earthRadius } from '../core/earth-radius';
import { Coords } from './coords';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function vector3ToCoords(position: [number, number, number], origin: Coords): Coords {
  const [x, y, z] = position;
  const latitude = origin.latitude + (-z / earthRadius) * RAD2DEG;
  const longitude = origin.longitude + (x / earthRadius) * RAD2DEG / Math.cos(origin.latitude * DEG2RAD);
  const altitude = (origin.altitude || 0) + y;
  return { latitude, longitude, altitude };
}

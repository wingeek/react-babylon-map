import { earthRadius } from '../core/earth-radius';
import { Coords } from './coords';

const DEG2RAD = Math.PI / 180;

const mercatorScaleLookup: { [key: number]: number } = {};

function getMercatorScale(lat: number): number {
  const index = Math.round(lat * 1000);
  if (mercatorScaleLookup[index] === undefined) {
    mercatorScaleLookup[index] = 1 / Math.cos(lat * DEG2RAD);
  }
  return mercatorScaleLookup[index];
}

export function averageMercatorScale(originLat: number, pointLat: number, steps = 10): number {
  let totalScale = 0;
  const latStep = (pointLat - originLat) / steps;
  for (let i = 0; i <= steps; i++) {
    const lat = originLat + latStep * i;
    totalScale += getMercatorScale(lat);
  }
  return totalScale / (steps + 1);
}

export function coordsToVector3(point: Coords, origin: Coords): [number, number, number] {
  const latitudeDiff = (point.latitude - origin.latitude) * DEG2RAD;
  const longitudeDiff = (point.longitude - origin.longitude) * DEG2RAD;
  const altitudeDiff = (point.altitude || 0) - (origin.altitude || 0);

  const x = longitudeDiff * earthRadius * Math.cos(origin.latitude * DEG2RAD);
  const y = altitudeDiff;

  const steps = Math.ceil(Math.abs(point.latitude - origin.latitude)) * 100 + 1;
  const avgScale = averageMercatorScale(origin.latitude, point.latitude, steps);

  const z = ((-latitudeDiff * earthRadius) / getMercatorScale(origin.latitude)) * avgScale;
  return [x, y, z];
}

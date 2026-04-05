import { useMemo } from 'react';
import { Matrix } from '@babylonjs/core';
import { coordsToMatrix } from './coords-to-matrix';

type Props = Parameters<typeof coordsToMatrix>[0];

/** Calculate a Babylon Matrix from coordinates (memoised). */
export function useCoordsToMatrix({ latitude, longitude, altitude, fromLngLat }: Props): Matrix {
  return useMemo(
    () => coordsToMatrix({ latitude, longitude, altitude, fromLngLat }),
    [latitude, longitude, altitude, fromLngLat],
  );
}

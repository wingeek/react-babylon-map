import { Matrix } from '@babylonjs/core';

/** Column-major (MapLibre) → transposed flat array (Babylon row-major layout) */
export function transposeMatrix(m: number[]): number[] {
  return [
    m[0],  m[4],  m[8],  m[12],
    m[1],  m[5],  m[9],  m[13],
    m[2],  m[6],  m[10], m[14],
    m[3],  m[7],  m[11], m[15],
  ];
}

/** MapLibre column-major matrix → Babylon.js Matrix */
export function columnMajorToBabylonMatrix(m: number[]): Matrix {
  return Matrix.FromArray(transposeMatrix(m));
}

/** Extract a flat column-major array from a Babylon Matrix (for MapLibre interop) */
export function babylonMatrixToColumnMajor(m: Matrix): number[] {
  const a = m.toArray();
  return transposeMatrix(Array.from(a));
}

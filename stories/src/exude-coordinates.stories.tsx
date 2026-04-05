import { FC, memo, useEffect, useMemo } from "react";
import {
  Mesh, MeshBuilder, StandardMaterial, Vector3, Color3,
  HemisphericLight, VertexData, VertexBuffer,
} from '@babylonjs/core';
import { useBabylonMap, coordsToVector3 } from 'react-babylon-map';
import { StoryMap } from "./story-map";
import { Chaillot } from "./extrude/chaillot";

const origin = {
  longitude: 2.289449241104535,
  latitude: 48.861422672242895,
};

function Lights() {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;
    const light = new HemisphericLight("hemiLight", new Vector3(1, 4.5, 3), scene);
    light.intensity = Math.PI;
    light.groundColor = Color3.FromHexString("#60666C");
    return () => { light.dispose(); };
  }, [scene]);
  return null;
}

/**
 * Extrude a polygon footprint into a 3D building shape.
 * Creates side walls + top cap using MeshBuilder.CreateRibbon.
 */
const ExtrudeShape: FC<{
  points: [number, number][];
  originCoords: typeof origin;
  height?: number;
  color?: string;
}> = memo(({ points, originCoords, height = 30, color = '#e0e4cc' }) => {
  const { scene } = useBabylonMap();

  const positions3D = useMemo(
    () => points.map(p => coordsToVector3({ longitude: p[0], latitude: p[1] }, originCoords)),
    [points, originCoords]
  );

  useEffect(() => {
    if (!scene || positions3D.length < 3) return;

    const n = positions3D.length;
    const walls: Vector3[][] = [];

    // Build ribbon paths: bottom edge + top edge for each wall segment
    const bottom: Vector3[] = [];
    const top: Vector3[] = [];
    for (let i = 0; i < n; i++) {
      bottom.push(new Vector3(positions3D[i][0], 0, positions3D[i][2]));
      top.push(new Vector3(positions3D[i][0], height, positions3D[i][2]));
    }
    // Close the loop
    bottom.push(bottom[0].clone());
    top.push(top[0].clone());

    const ribbon = MeshBuilder.CreateRibbon('buildingWall', {
      pathArray: [bottom, top],
      closePath: true,
      closeArray: false,
    }, scene);

    // Top cap (polygon triangulated as a fan)
    const topCap: Vector3[] = [];
    for (let i = 0; i < n; i++) {
      topCap.push(new Vector3(positions3D[i][0], height, positions3D[i][2]));
    }
    const cap = MeshBuilder.CreateDisc('buildingCap', {
      radius: 1,
      tessellation: n,
    }, scene);
    // Replace disc geometry with our polygon
    const capPositions: number[] = [];
    const capIndices: number[] = [];
    // Fan triangulation
    for (let i = 0; i < n; i++) {
      capPositions.push(positions3D[i][0], height, positions3D[i][2]);
    }
    // Center of polygon
    let cx = 0, cz = 0;
    for (const p of positions3D) { cx += p[0]; cz += p[2]; }
    cx /= n; cz /= n;
    capPositions.push(cx, height, cz);
    const centerIdx = n;
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      capIndices.push(centerIdx, i, next);
    }

    const capVD = new VertexData();
    capVD.positions = capPositions;
    capVD.indices = capIndices;
    // Compute normals
    const normals = new Float32Array(capPositions.length);
    VertexData.ComputeNormals(capPositions, capIndices, normals);
    capVD.normals = normals;
    capVD.applyToMesh(cap);
    cap.geometry?.setVerticesBuffer(new VertexBuffer(cap.getEngine(), normals, 'normal', false));

    const mat = new StandardMaterial('buildingMat', scene);
    mat.diffuseColor = Color3.FromHexString(color);
    mat.specularColor = new Color3(0.5, 0.5, 0.5);
    mat.specularPower = 64;
    ribbon.material = mat;
    cap.material = mat;

    return () => {
      ribbon.dispose();
      cap.dispose();
      mat.dispose();
    };
  }, [scene, positions3D, height, color]);

  return null;
});
ExtrudeShape.displayName = 'ExtrudeShape';

export default { title: 'Extrude Coordinates' };

export function ExtrudeCoordinates() {
  return (
    <StoryMap
      zoom={16.5}
      longitude={origin.longitude}
      latitude={origin.latitude}
      bearing={-48}
      pitch={59}
    >
      <Lights />
      {Chaillot.map((points, i) => (
        <ExtrudeShape key={i} points={points} originCoords={origin} />
      ))}
    </StoryMap>
  );
}

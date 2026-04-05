import { Mesh, Scene, VertexData } from "@babylonjs/core";
import type { MeshData } from "@ifc-lite/geometry";

/**
 * Convert a single IFC MeshData to a Babylon.js Mesh.
 * Swaps Y↔Z to convert IFC Z-up to Babylon Y-up (matching web-ifc-three behavior).
 */
export function meshDataToBabylon(data: MeshData, scene: Scene): Mesh {
  const positions = new Float32Array(data.positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i]     = data.positions[i];
    positions[i + 1] = data.positions[i + 2]; // IFC Z → Babylon Y
    positions[i + 2] = data.positions[i + 1]; // IFC Y → Babylon Z
  }

  const normals = new Float32Array(data.normals.length);
  for (let i = 0; i < normals.length; i += 3) {
    normals[i]     = data.normals[i];
    normals[i + 1] = data.normals[i + 2];
    normals[i + 2] = data.normals[i + 1];
  }

  const mesh = new Mesh(`ifc-${data.expressId}`, scene);
  const vd = new VertexData();
  vd.positions = positions;
  vd.normals = normals;
  vd.indices = data.indices;
  vd.applyToMesh(mesh);
  return mesh;
}

/**
 * Merge all IFC meshes into a single Babylon.js Mesh for one draw call.
 */
export function batchWithVertexColors(allMeshes: MeshData[], scene: Scene): Mesh {
  let totalVerts = 0;
  let totalIdx = 0;
  for (const m of allMeshes) {
    totalVerts += m.positions.length / 3;
    totalIdx += m.indices.length;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const indices = new Uint32Array(totalIdx);
  const colors = new Float32Array(totalVerts * 4);

  let vOff = 0;
  let iOff = 0;
  let cOff = 0;

  for (const m of allMeshes) {
    const vc = m.positions.length / 3;

    positions.set(m.positions, vOff * 3);
    normals.set(m.normals, vOff * 3);

    for (let i = 0; i < vc; i++) {
      colors[cOff++] = m.color[0];
      colors[cOff++] = m.color[1];
      colors[cOff++] = m.color[2];
      colors[cOff++] = m.color[3];
    }

    for (let j = 0; j < m.indices.length; j++) {
      indices[iOff++] = m.indices[j] + vOff;
    }

    vOff += vc;
  }

  const mesh = new Mesh("ifc-batch", scene);
  const vd = new VertexData();
  vd.positions = positions;
  vd.normals = normals;
  vd.indices = indices;
  vd.colors = colors;
  vd.applyToMesh(mesh);

  return mesh;
}

/**
 * Load an IFC file via @ifc-lite/geometry and return parsed MeshData array.
 */
export async function loadIFC(url: string): Promise<MeshData[]> {
  const response = await fetch(url);
  const buffer = new Uint8Array(await response.arrayBuffer());

  const { GeometryProcessor } = await import("@ifc-lite/geometry");
  const processor = new GeometryProcessor();
  await processor.init();
  const result = await processor.process(buffer);
  processor.dispose();

  return result.meshes;
}

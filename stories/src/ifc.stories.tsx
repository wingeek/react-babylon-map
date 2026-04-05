import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mesh, StandardMaterial, Vector3, Color3,
  HemisphericLight, DirectionalLight, PointLight, ShadowGenerator, TransformNode,
  VertexData, type Scene,
} from "@babylonjs/core";
import { button, folder, useControls } from "leva";
import { useBabylonMap } from "react-babylon-map";
import { suspend } from "suspend-react";
import { StoryMap } from "./story-map";
import { loadIFC } from "./ifc/ifc-to-babylon";
import type { MeshData } from "@ifc-lite/geometry";
import modelUrl from "./ifc/model.ifc?url";

export default { title: "IFC" };

export function Default() {
  const [path, setPath] = useState(modelUrl);

  const loadIfcClick = useCallback(async () => {
    try {
      setPath(await getLocalFileUrl());
    } catch (error) {
      console.warn(error);
    }
  }, []);

  useControls({
    "load IFC file": button(() => loadIfcClick()),
  });

  const { latitude, longitude, position, rotation, scale } = useControls({
    coords: folder({
      latitude: { value: 51.508775, pad: 6 },
      longitude: { value: -0.1261, pad: 6 },
    }),
    position: { value: { x: 0, y: 0.32, z: 0 }, step: 1, pad: 2 },
    rotation: { value: 0, step: 1 },
    scale: 1,
  });

  return (
    <StoryMap
      latitude={latitude}
      longitude={longitude}
      zoom={20}
      pitch={75}
      bearing={-45}
    >
      <Lights />
      <IfcModel
        path={path}
        position={position}
        rotation={rotation}
        scale={scale}
      />
    </StoryMap>
  );
}

function Lights() {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;

    const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.5 * Math.PI;

    const dir = new DirectionalLight(
      "dir",
      new Vector3(-2.5, -50, -5).normalize(),
      scene
    );
    dir.intensity = 1.5 * Math.PI;
    dir.position = new Vector3(2.5, 50, 5);

    const shadowGen = new ShadowGenerator(1024, dir);
    shadowGen.useBlurExponentialShadowMap = true;
    shadowGen.blurKernel = 32;

    const p1 = new PointLight("point1", new Vector3(-10, 0, -20), scene);
    p1.intensity = Math.PI;
    const p2 = new PointLight("point2", new Vector3(0, -10, 0), scene);
    p2.intensity = Math.PI;

    return () => {
      shadowGen.dispose();
      hemi.dispose();
      dir.dispose();
      p1.dispose();
      p2.dispose();
    };
  }, [scene]);
  return null;
}

function IfcModel({
  path,
  position,
  rotation,
  scale,
}: {
  path: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  scale: number;
}) {
  const { scene } = useBabylonMap();
  const parentRef = useRef<TransformNode | null>(null);

  const meshDataArray = suspend(() => loadIFC(path), [path]);

  useEffect(() => {
    if (!scene || meshDataArray.length === 0) return;

    const parent = new TransformNode("ifcParent", scene);
    parent.rotation.x = -Math.PI / 2;
    parent.position.set(position.x, position.y, position.z);
    parent.scaling.setAll(scale);
    parentRef.current = parent;

    const createdMeshes: Mesh[] = [];
    const createdMats: StandardMaterial[] = [];

    // Separate opaque / transparent (matching official ifc2bb.ts)
    const valid = meshDataArray.filter(m => m.positions.length > 0);
    const opaque = valid.filter(m => m.color[3] >= 1);
    const transparent = valid.filter(m => m.color[3] < 1);

    if (opaque.length > 0) {
      const mesh = buildBatchMesh(opaque, scene, false);
      mesh.parent = parent;
      createdMeshes.push(mesh);
      createdMats.push(mesh.material as StandardMaterial);
    }

    if (transparent.length > 0) {
      const alphaGroups = new Map<number, MeshData[]>();
      for (const m of transparent) {
        const a = Math.round(m.color[3] * 100) / 100;
        let bucket = alphaGroups.get(a);
        if (!bucket) { bucket = []; alphaGroups.set(a, bucket); }
        bucket.push(m);
      }
      for (const [, group] of alphaGroups) {
        const mesh = buildBatchMesh(group, scene, true);
        mesh.parent = parent;
        createdMeshes.push(mesh);
        createdMats.push(mesh.material as StandardMaterial);
      }
    }

    const dir = scene.lights.find(l => l.name === "dir");
    if (dir) {
      const sg = dir.getShadowGenerator();
      if (sg) createdMeshes.forEach(m => sg.addShadowCaster(m));
    }

    return () => {
      createdMeshes.forEach(m => m.dispose());
      createdMats.forEach(m => m.dispose());
      parent.dispose();
      parentRef.current = null;
    };
  }, [scene, meshDataArray]);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;
    parent.position.set(position.x, position.y, position.z);
    parent.rotation.y = (rotation * Math.PI) / 180;
    parent.scaling.setAll(scale);
  }, [position, rotation, scale]);

  return null;
}

/**
 * Merge MeshData into one Babylon Mesh with per-vertex RGB colors.
 * Y↔Z swap converts IFC Z-up → Babylon Y-up.
 * Winding reversal compensates for the swap's reflection.
 * Matches official ifc2bb.ts for color handling.
 */
function buildBatchMesh(
  meshes: MeshData[],
  scene: Scene,
  transparent: boolean,
): Mesh {
  let totalVerts = 0;
  let totalIdx = 0;
  for (const m of meshes) {
    totalVerts += m.positions.length / 3;
    totalIdx += m.indices.length;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 4);
  const indices = new Uint32Array(totalIdx);

  let vOff = 0;
  let iOff = 0;

  for (const m of meshes) {
    const vc = m.positions.length / 3;

    // Y↔Z swap: IFC Z-up → Babylon Y-up
    for (let i = 0; i < m.positions.length; i += 3) {
      positions[vOff * 3 + i]     = m.positions[i];
      positions[vOff * 3 + i + 1] = m.positions[i + 2];
      positions[vOff * 3 + i + 2] = m.positions[i + 1];
    }
    for (let i = 0; i < m.normals.length; i += 3) {
      normals[vOff * 3 + i]     = m.normals[i];
      normals[vOff * 3 + i + 1] = m.normals[i + 2];
      normals[vOff * 3 + i + 2] = m.normals[i + 1];
    }

    // Vertex colors: RGB from mesh color, A=1
    const [r, g, b] = m.color;
    for (let v = 0; v < vc; v++) {
      colors[(vOff + v) * 4 + 0] = r;
      colors[(vOff + v) * 4 + 1] = g;
      colors[(vOff + v) * 4 + 2] = b;
      colors[(vOff + v) * 4 + 3] = 1;
    }

    // Indices with winding reversal to compensate for Y↔Z reflection
    for (let i = 0; i < m.indices.length; i += 3) {
      indices[iOff + i]     = m.indices[i] + vOff;
      indices[iOff + i + 1] = m.indices[i + 2] + vOff;
      indices[iOff + i + 2] = m.indices[i + 1] + vOff;
    }

    vOff += vc;
    iOff += m.indices.length;
  }

  const mesh = new Mesh("batched", scene);
  const vd = new VertexData();
  vd.positions = positions;
  vd.normals = normals;
  vd.colors = colors;
  vd.indices = indices;
  vd.applyToMesh(mesh);

  const material = new StandardMaterial("batched-mat", scene);
  material.diffuseColor = new Color3(1, 1, 1);
  material.specularColor = new Color3(0, 0, 0);

  if (transparent) {
    material.alpha = meshes[0].color[3];
    material.backFaceCulling = false;
  }

  mesh.material = material;
  mesh.hasVertexAlpha = false;

  return mesh;
}

async function getLocalFileUrl(): Promise<string> {
  return new Promise((resolve) => {
    const onChange = (e: Event) => {
      if (!(e.target instanceof HTMLInputElement) || !e.target.files) return;
      const file = e.target.files[0];
      if (!file) return;
      resolve(URL.createObjectURL(file));
    };
    const input = document.createElement("input");
    input.type = "file";
    input.addEventListener("change", onChange);
    input.accept = ".ifc";
    input.click();
  });
}

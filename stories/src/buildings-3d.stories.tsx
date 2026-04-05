import { FC, memo, useEffect, useMemo, useRef } from "react";
import {
  Mesh, MeshBuilder, StandardMaterial, Vector3, Color3, VertexData, Scene,
  HemisphericLight, DirectionalLight, DefaultRenderingPipeline,
} from "@babylonjs/core";
import { levaStore, useControls } from "leva";
import { useBabylonMap, coordsToVector3, Coords } from "react-babylon-map";
import { StoryMap } from "./story-map";
import { AdaptiveDpr } from "./adaptive-dpr";
import { getBuildingsData, OverpassElement } from "./free-3d-buildings/get-buildings-data";
import { suspend } from "suspend-react";

const coords: Coords = { latitude: 51.5074, longitude: -0.1278 };

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Light accent colors (HSL ranges for animated buildings)
const night = new Color3(0, 0, 0.08);
const day = new Color3(1, 0.5, 0.1);

const _c0 = new Color3();
const _c1 = new Color3();

function lerpHSL(c0: Color3, c1: Color3, t: number): Color3 {
  const hsv0 = c0.toHSVToRef(_c0);
  const hsv1 = c1.toHSVToRef(_c1);
  const h = hsv0.r + (hsv1.r - hsv0.r) * t;
  const s = hsv0.g + (hsv1.g - hsv0.g) * t;
  const v = hsv0.b + (hsv1.b - hsv0.b) * t;
  return Color3.FromHSV(h, s, v);
}

interface BuildingAnimData {
  c0: Color3;
  c1: Color3;
  animOffset: number;
  animSpeed: number;
  emissiveIntensity: number;
}

function createBuildingMesh(
  poly: { lat: number; lon: number }[],
  origin: Coords,
  base: number,
  height: number,
  scene: Scene,
  index: number,
): { ribbon: Mesh; cap: Mesh } | null {
  if (poly.length < 3) return null;

  const n = poly.length;
  const positions = poly.map(p =>
    coordsToVector3({ longitude: p.lon, latitude: p.lat }, origin)
  );

  // Side walls via ribbon
  const bottom: Vector3[] = [];
  const top: Vector3[] = [];
  for (let i = 0; i < n; i++) {
    bottom.push(new Vector3(positions[i][0], base, positions[i][2]));
    top.push(new Vector3(positions[i][0], height, positions[i][2]));
  }
  bottom.push(bottom[0].clone());
  top.push(top[0].clone());

  const ribbon = MeshBuilder.CreateRibbon(`building${index}`, {
    pathArray: [bottom, top],
    closePath: true,
    closeArray: false,
  }, scene);

  // Top cap with fan triangulation
  const capPositions: number[] = [];
  const capIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    capPositions.push(positions[i][0], height, positions[i][2]);
  }
  // Center vertex
  let cx = 0, cz = 0;
  for (const p of positions) { cx += p[0]; cz += p[2]; }
  cx /= n; cz /= n;
  capPositions.push(cx, height, cz);
  const centerIdx = n;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    capIndices.push(centerIdx, i, next);
  }

  const cap = MeshBuilder.CreateDisc(`buildingCap${index}`, { radius: 1, tessellation: n }, scene);
  const capVD = new VertexData();
  capVD.positions = capPositions;
  capVD.indices = capIndices;
  const normals = new Float32Array(capPositions.length);
  VertexData.ComputeNormals(capPositions, capIndices, normals);
  capVD.normals = normals;
  capVD.applyToMesh(cap);

  return { ribbon, cap };
}

const Buildings: FC<{
  buildingsCenter: Coords;
  origin: Coords;
}> = memo(({ buildingsCenter, origin }) => {
  const { scene } = useBabylonMap();

  const buildings = suspend(
    () => {
      const start = { ...buildingsCenter };
      start.latitude -= 0.01;
      start.longitude -= 0.01;
      const end = { ...buildingsCenter };
      end.latitude += 0.01;
      end.longitude += 0.01;
      return getBuildingsData({ start, end });
    },
    [buildingsCenter]
  );

  const lastTime = useRef(performance.now());

  // Prepare animation data for each building
  const animData = useMemo<BuildingAnimData[]>(() => {
    return buildings.map(() => ({
      c0: lerpHSL(night, day, rand(0, 1)).clone(),
      c1: lerpHSL(day, night, rand(0, 1)).clone(),
      animOffset: rand(0, 2 * Math.PI),
      animSpeed: rand(1, 2),
      emissiveIntensity: rand(0, 1) < 0.05 ? 3.5 : 0,
    }));
  }, [buildings]);

  // Create meshes and materials
  const meshData = useRef<{ meshes: Mesh[]; mats: StandardMaterial[] }>({ meshes: [], mats: [] });

  useEffect(() => {
    if (!scene) return;

    // Clean up previous
    meshData.current.meshes.forEach(m => m.dispose());
    meshData.current.mats.forEach(m => m.dispose());

    if (buildings.length === 0) return;

    const meshes: Mesh[] = [];
    const mats: StandardMaterial[] = [];

    for (let i = 0; i < buildings.length; i++) {
      const element = buildings[i];
      const poly = element.geometry;
      if (!poly || poly.length < 3) continue;

      let height = parseFloat(element.tags?.height || "0");
      if (!height) height = parseFloat(element.tags?.["building:levels"] || "1") * 3;
      const base = parseFloat(element.tags?.min_height || "0");

      const result = createBuildingMesh(poly, origin, base, height, scene, i);
      if (!result) continue;

      const mat = new StandardMaterial(`bMat${i}`, scene);
      mat.diffuseColor = lerpHSL(night, day, rand(0, 1)).clone();
      mat.specularPower = 64;
      mat.emissiveColor = Color3.Black();
      mat.alpha = 0.9;

      result.ribbon.material = mat;
      result.cap.material = mat;

      meshes.push(result.ribbon, result.cap);
      mats.push(mat);
    }

    meshData.current = { meshes, mats };

    return () => {
      meshes.forEach(m => m.dispose());
      mats.forEach(m => m.dispose());
    };
  }, [scene, buildings, origin]);

  // Animate colors
  useEffect(() => {
    if (!scene) return;

    const observer = scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      const delta = (now - lastTime.current) / 1000;
      lastTime.current = now;

      const mats = meshData.current.mats;
      if (!mats.length) return;

      for (let i = 0; i < animData.length && i < mats.length; i++) {
        const d = animData[i];
        d.animOffset += delta * d.animSpeed;
        const sinValue = Math.abs(Math.sin(d.animOffset));
        const color = lerpHSL(d.c0, d.c1, sinValue);
        const mat = mats[i];
        mat.diffuseColor.copyFrom(color);
        if (d.emissiveIntensity > 0) {
          const emissive = color.scale(d.emissiveIntensity);
          mat.emissiveColor = emissive;
        } else {
          mat.emissiveColor = Color3.Black();
        }
      }
    });

    return () => { scene.onBeforeRenderObservable.remove(observer); };
  }, [scene, animData]);

  return null;
});
Buildings.displayName = "Buildings";

function Lights() {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;
    const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
    hemi.intensity = Math.PI;
    const dir = new DirectionalLight("dir", new Vector3(-2.5, -50, -5).normalize(), scene);
    dir.intensity = Math.PI;
    return () => { hemi.dispose(); dir.dispose(); };
  }, [scene]);
  return null;
}

function Bloom({ enabled, intensity, threshold, levels }: {
  enabled: boolean; intensity: number; threshold: number; levels: number;
}) {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene || !enabled) return;
    const pipeline = new DefaultRenderingPipeline(
      "bloomPipeline", true, scene,
      scene.activeCamera ? [scene.activeCamera!] : undefined
    );
    pipeline.bloomEnabled = true;
    pipeline.bloomWeight = intensity;
    pipeline.bloomThreshold = threshold;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = levels > 0 ? levels / 5 : 0.5;
    return () => { pipeline.dispose(); };
  }, [scene, enabled, intensity, threshold, levels]);
  return null;
}

export default { title: "Buildings 3D" };

export function Default() {
  const { bloom, levels, intensity, threshold, smoothing } = useControls("bloom", {
    bloom: { value: true },
    levels: { value: 3, min: 0, max: 10, step: 0.01 },
    intensity: { value: 1.62, min: 0, max: 2, step: 0.01 },
    threshold: { value: 0.1, min: 0, max: 2, step: 0.01, label: "threshold" },
    smoothing: { value: 2, min: 0, max: 5, step: 0.01, label: "smoothing" },
  });

  // Default to overlay mode
  useEffect(() => {
    const overlay = levaStore.get("overlay");
    levaStore.setValueAtPath("overlay", true, true);
    return () => {
      if (overlay) return;
      levaStore.setValueAtPath("overlay", overlay, true);
    };
  }, []);

  return (
    <StoryMap longitude={coords.longitude} latitude={coords.latitude} zoom={18} pitch={60}>
      <Lights />
      <AdaptiveDpr />
      <Bloom enabled={bloom} intensity={intensity} threshold={threshold} levels={levels} />
      <Buildings buildingsCenter={coords} origin={coords} />
    </StoryMap>
  );
}

import { FC, memo, useEffect, useMemo, useRef } from "react";
import {
  MeshBuilder, StandardMaterial, Vector3, Color3, Matrix,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  VertexData, VertexBuffer, DynamicTexture,
} from '@babylonjs/core';
import { useBabylonMap } from 'react-babylon-map';
import { useControls } from 'leva';
import { StoryMap } from "./story-map";
import { getPosition } from 'suncalc';
import tzLookup from 'tz-lookup';
import { DateTime } from 'luxon';

const RADIUS = 150;

function getSunPosition({ date, latitude, longitude, radius = RADIUS }: {
  date: Date; latitude: number; longitude: number; radius?: number;
}): [number, number, number] {
  const sun = getPosition(date, latitude, longitude);
  const x = radius * Math.cos(sun.altitude) * -Math.sin(sun.azimuth);
  const z = radius * Math.cos(sun.altitude) * Math.cos(sun.azimuth);
  const y = radius * Math.sin(sun.altitude);
  return [x, y, z];
}

function useSun({ latitude, longitude }: { longitude: number; latitude: number }) {
  const { month, hour } = useControls({
    month: { value: new Date().getMonth() + 1, min: 1, max: 12, step: 0.1 },
    hour: { value: new Date().getHours(), min: 0, max: 23, step: 0.1 },
  });

  const date = useMemo(() => {
    const timeZone = tzLookup(latitude, longitude);
    return DateTime.now().setZone(timeZone).set({
      month: Math.floor(month),
      day: Math.floor((month % 1) * 27) + 1,
      hour: Math.floor(hour),
      minute: (hour % 1) * 60,
      second: 0,
      millisecond: 0,
    }).toJSDate();
  }, [latitude, longitude, month, hour]);

  const { position, sunPath } = useMemo(() => {
    const position = getSunPosition({ date, latitude, longitude });
    const tempDate = new Date(date);
    const sunPath: [number, number, number][] = [];
    for (let h = 0; h <= 24; h++) {
      tempDate.setHours(h);
      sunPath.push(getSunPosition({ date: tempDate, latitude, longitude }));
    }
    return { position, sunPath };
  }, [date, latitude, longitude]);

  return { position, sunPath };
}

/** Sun path line with per-vertex colors (night=blue, day=orange) */
const SunPathLine: FC<{ path: [number, number, number][] }> = memo(({ path }) => {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene || path.length < 2) return;

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const night = Color3.FromHexString('#00008B');
    const day = Color3.FromHexString('#FFA500');
    const tmp = new Color3();

    for (let i = 0; i < path.length; i++) {
      positions.push(path[i][0], path[i][1], path[i][2]);
      indices.push(i, i + 1);

      const y = path[i][1];
      const nightStart = -RADIUS * 0.5;
      const dayStart = RADIUS * 0.5;
      let c: Color3;
      if (y <= nightStart) c = night;
      else if (y >= dayStart) c = day;
      else {
        const d = (y - nightStart) / (dayStart - nightStart);
        c = tmp.copyFrom(night).lerp(day, d);
      }
      colors.push(c.r, c.g, c.b);
    }
    // Remove last index (no segment after last point)
    indices.pop();

    const mesh = new MeshBuilder.CreateLines('sunPath', {
      points: path.map(p => new Vector3(p[0], p[1], p[2])),
      updatable: false,
    }, scene);
    const mat = new StandardMaterial('sunPathMat', scene);
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    mesh.material = mat;

    return () => { mesh.dispose(); mat.dispose(); };
  }, [scene, path]);
  return null;
});
SunPathLine.displayName = 'SunPathLine';

/** Floor plane that receives shadows */
const Floor: FC = () => {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;
    const floor = MeshBuilder.CreateGround('floor', { width: 1000, height: 1000 }, scene);
    const mat = new StandardMaterial('floorMat', scene);
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.alpha = 0.5;
    floor.material = mat;
    floor.receiveShadows = true;
    return () => { floor.dispose(); mat.dispose(); };
  }, [scene]);
  return null;
};

/** Sphere mesh */
const MySphere: FC<{ position: [number, number, number]; color: string; castShadow?: boolean }> = memo(({ position, color, castShadow }) => {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;
    const sphere = MeshBuilder.CreateSphere('sunSphere', { diameter: 32 }, scene);
    sphere.position.set(position[0], position[1], position[2]);
    sphere.rotation.y = 45 * Math.PI / 180;
    const mat = new StandardMaterial('sphereMat', scene);
    mat.diffuseColor = Color3.FromHexString(color);
    mat.emissiveColor = Color3.FromHexString(color).scale(0.3);
    sphere.material = mat;
    if (castShadow) sphere.receiveShadows = true;
    return () => { sphere.dispose(); mat.dispose(); };
  }, [scene, position, color, castShadow]);
  return null;
});
MySphere.displayName = 'MySphere';

/** Sun with directional light + shadow */
const Sun: FC<{ latitude: number; longitude: number }> = ({ latitude, longitude }) => {
  const { scene, map } = useBabylonMap();
  const { position, sunPath } = useSun({ latitude, longitude });
  const isDay = position[1] >= 0;

  // Switch map style based on sun position
  useEffect(() => {
    if (!map) return;
    const style = isDay
      ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
    map.setStyle(style);
  }, [map, isDay]);

  // Directional light + shadow
  useEffect(() => {
    if (!scene) return;
    const dir = new DirectionalLight('sunLight',
      new Vector3(-position[0], -position[1], -position[2]).normalize(), scene);
    dir.position = new Vector3(position[0], position[1], position[2]);
    dir.intensity = isDay ? 1.5 * Math.PI : 0;

    const shadowGen = new ShadowGenerator(1024, dir);
    shadowGen.useBlurExponentialShadowMap = true;
    shadowGen.blurKernel = 32;

    // Add shadow casters as they're created
    scene.meshes.forEach(m => {
      if (m.name === 'sunSphere') shadowGen.addShadowCaster(m);
    });

    return () => {
      shadowGen.dispose();
      dir.dispose();
    };
  }, [scene, position, isDay]);

  // Hemisphere light for night
  useEffect(() => {
    if (!scene || isDay) return;
    const hemi = new HemisphericLight('nightHemi',
      new Vector3(position[0], position[1], position[2]), scene);
    hemi.intensity = Math.PI;
    hemi.groundColor = Color3.FromHexString('#005f6b');
    hemi.diffuse = Color3.FromHexString('#343838');
    return () => { hemi.dispose(); };
  }, [scene, position, isDay]);

  return (
    <>
      <SunPathLine path={sunPath} />
      {isDay && (
        <MySphere position={position} color="#FFA500" />
      )}
    </>
  );
};

export default { title: 'Sunlight' };

export function Default() {
  const { longitude, latitude } = useControls({
    longitude: { value: 0, min: -179, max: 180, pad: 6 },
    latitude: { value: 51, min: -80, max: 80, pad: 6 },
  });

  return (
    <StoryMap longitude={longitude} latitude={latitude} zoom={6} pitch={60}>
      <Sun longitude={longitude} latitude={latitude} />
      <Floor />
      <MySphere position={[0, 10, 0]} color="#E28357" castShadow />
    </StoryMap>
  );
}

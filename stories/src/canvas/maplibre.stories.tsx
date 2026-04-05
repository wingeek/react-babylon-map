import { FC, memo, useEffect, useRef, useState } from "react";
import { HemisphericLight, MeshBuilder, StandardMaterial, Vector3, Color3 } from '@babylonjs/core';
import { Canvas } from 'react-babylon-map/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import Map from 'react-map-gl/maplibre';
import { Leva } from "leva";

import { useBabylonMap } from "react-babylon-map/maplibre";

function Lights() {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;
    const light = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    light.intensity = 1;
    const dirLight = new HemisphericLight("dirLight", new Vector3(1, 4.5, 3), scene);
    dirLight.intensity = Math.PI;
    dirLight.diffuse = Color3.FromHexString("#60666C");
    return () => { light.dispose(); dirLight.dispose(); };
  }, [scene]);
  return null;
}

Lights.displayName = 'Lights';

const BabylonBox: FC<{ scale?: number; position?: [number, number, number]; hovered?: boolean }> =
  memo(({ scale = 500, position, hovered }) => {
    const { scene } = useBabylonMap();
    const boxRef = useRef<any>(null);
    const matRef = useRef<any>(null);

    useEffect(() => {
      if (!scene) return;
      const box = MeshBuilder.CreateBox("box", { size: scale }, scene);
      box.position.set(
        position?.[0] || 0,
        position?.[1] || 0,
        position?.[2] || 0,
      );
      boxRef.current = box;

      const mat = new StandardMaterial("boxMat", scene);
      mat.diffuseColor = Color3.FromHexString("#ffa500");
      matRef.current = mat;
      box.material = mat;

      return () => { box.dispose(); mat.dispose(); };
    }, [scene, scale, position]);

    // Rotation
    useEffect(() => {
    if (!scene || !boxRef.current) return;
    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
    boxRef.current.rotation.x += dt;
    boxRef.current.rotation.z -= dt;
    });
    return () => scene.onBeforeRenderObservable.remove(observer);
  }, [scene]);

  // Hover color
  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.diffuseColor = hovered
      ? Color3.FromHexString("#ff69b4")
      : Color3.FromHexString("#ffa500");
  }, [hovered]);

    return null;
  });
BabylonBox.displayName = 'BabylonBox';

export default { title: 'Canvas' };

export function Maplibre() {
  return (<>
    <Leva theme={{ sizes: { rootWidth: '340px', controlWidth: '150px' } }} />
    <div style={{ height: '100vh' }}>
      <Map
        canvasContextAttributes={{ antialias: true }}
        initialViewState={{ latitude: 51, longitude: 0, zoom: 13, pitch: 60 }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        <Canvas latitude={51} longitude={0}>
          <Lights />
          <BabylonBox scale={500} position={[-600, 250, 0]} />
          <BabylonBox scale={500} position={[600, 250, 0]} />
        </Canvas>
      </Map>
    </div>
  </>
  )
}

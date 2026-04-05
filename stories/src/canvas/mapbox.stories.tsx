import { FC, memo, useEffect, useRef, useState } from "react";
import { MeshBuilder, StandardMaterial, Vector3, Color3, HemisphericLight } from '@babylonjs/core';
import { Canvas } from 'react-babylon-map';
import MapboxGl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';
import Map from 'react-map-gl/mapbox';
import { useControls } from "leva";
import { useBabylonMap } from 'react-babylon-map';

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

const BabylonBox: FC<{ scale?: number; position?: [number, number, number] }> =
  memo(({ scale = 500, position }) => {
    const { scene } = useBabylonMap();
    const boxRef = useRef<any>(null);
    const matRef = useRef<any>(null);
    const [hovered, setHovered] = useState(false);
    const [clicked, setClicked] = useState(false);

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

    useEffect(() => {
      if (!scene || !boxRef.current) return;
    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      boxRef.current.rotation.x += dt;
      boxRef.current.rotation.z -= dt;
    });
    return () => scene.onBeforeRenderObservable.remove(observer);
  }, [scene]);

    useEffect(() => {
      if (!matRef.current) return;
      matRef.current.diffuseColor = hovered
        ? Color3.FromHexString("#ff69b4")
        : Color3.FromHexString("#ffa500");
    }, [hovered]);

    useEffect(() => {
      if (!boxRef.current) return;
      boxRef.current.scaling.setAll(clicked ? 1.5 : 1);
    }, [clicked]);

    return null;
  });
BabylonBox.displayName = 'BabylonBox';

export default { title: 'Canvas' };

export function Mapbox() {
  const { mapboxToken } = useControls({
    mapboxToken: {
      value: import.meta.env.VITE_MAPBOX_TOKEN || '',
      label: 'mapbox token',
    }
  })

  MapboxGl.accessToken = mapboxToken;

  return (
    <div style={{ height: '100vh' }}>
      {!mapboxToken && <Center>Add a mapbox token to load this component</Center>}
      {!!mapboxToken && (
        <Map
          antialias
          initialViewState={{ latitude: 51, longitude: 0, zoom: 13, pitch: 60 }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={mapboxToken}
        >
          <Canvas latitude={51} longitude={0}>
            <Lights />
            <BabylonBox scale={500} position={[-600, 250, 0]} />
            <BabylonBox scale={500} position={[600, 250, 0]} />
          </Canvas>
        </Map>
      )}
    </div>
  );
}

const Center: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center',
  }}>{children}</div>
);

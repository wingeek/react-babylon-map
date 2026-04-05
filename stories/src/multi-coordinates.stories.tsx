import { FC, memo, useEffect, useRef, useState } from "react";
import { MeshBuilder, StandardMaterial, Vector3, Color3, HemisphericLight } from '@babylonjs/core';
import { Coordinates, NearCoordinates, useBabylonMap } from 'react-babylon-map';
import { levaStore, useControls } from 'leva';
import { StoryMap } from "./story-map";

enum CoordinatesType {
  NearCoordinates = 'NearCoordinates',
  Coordinates = 'Coordinates',
}

function Lights() {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;
    const light = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    light.intensity = 1;
    return () => { light.dispose(); };
  }, [scene]);
  return null;
}

const MyBox: FC<{ color: string; scale: number; position?: [number, number, number] }> = memo(({ color, scale, position }) => {
  const { scene } = useBabylonMap();
  const [hovered, setHovered] = useState(false);
  const boxRef = useRef<any>(null);
  const matRef = useRef<any>(null);

  const s = scale * (hovered ? 1.5 : 1);
  const height = 7;

  useEffect(() => {
    if (!scene) return;
    const box = MeshBuilder.CreateBox("myBox", { width: 1, height, depth: 1 }, scene);
    box.position.y = s * height * 0.5;
    box.scaling.setAll(s, s, s);
    if (position) {
      box.position.x += position[0];
      box.position.y += position[1];
      box.position.z += position[2];
    }
    boxRef.current = box;
    const mat = new StandardMaterial(`boxMat-${color}`, scene);
    mat.diffuseColor = color === 'blue'
      ? Color3.FromHexString("#0000FF")
      : color === 'green'
        ? Color3.FromHexString("#008000")
        : Color3.FromHexString("#800080");
    matRef.current = mat;
    box.material = mat;
    box.metadata = {
      onPointerOver: () => setHovered(true),
      onPointerOut: () => setHovered(false),
    };
    return () => { box.dispose(); mat.dispose(); };
  }, [scene, color, s, position]);

  return null;
});
MyBox.displayName = 'MyBox';

const CoordsControl: FC<{ longitude: number; latitude: number; children: React.ReactNode }> = (props) => {
  const { coords } = useControls({
    coords: { value: CoordinatesType.Coordinates, options: CoordinatesType }
  });
  return (
    <>
      {coords === CoordinatesType.Coordinates && <Coordinates {...props}>{props.children}</Coordinates>}
      {coords === CoordinatesType.NearCoordinates && <NearCoordinates {...props}>{props.children}</NearCoordinates>}
    </>
  );
};

export default { title: 'Multi Coordinates' };

export function Default() {
  const { blue, green, purple, scale } = useControls({
    scale: 1,
    blue: {
      value: [-0.1261, 51.508775],
      pad: 6,
      step: 0.000001,
    },
    green: {
      value: [-0.1261, 51.508775],
      pad: 6,
      step: 0.000001,
    },
    purple: {
      value: [-0.1261, 51.508756],
      pad: 6,
      step: 0.000001,
    },
  });

  useEffect(() => { levaStore.setValueAtPath('overlay', false, true); }, []);

  return (
    <StoryMap
      longitude={blue[0]}
      latitude={blue[1]}
      zoom={20}
      pitch={60}
    >
      <Lights />
      <MyBox scale={scale} color="blue" position={[2, 0, 0]} />
      <CoordsControl longitude={green[0]} latitude={green[1]}>
        <MyBox scale={scale} color="green" position={[-2, 0, 0]} />
      </CoordsControl>
      <CoordsControl longitude={purple[0]} latitude={purple[1]}>
        <MyBox scale={scale} color="purple" />
      </CoordsControl>
    </StoryMap>
  );
}

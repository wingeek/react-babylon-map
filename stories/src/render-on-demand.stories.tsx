import { FC, memo, useEffect, useRef, useState } from "react";
import { MeshBuilder, StandardMaterial, Vector3, Color3, HemisphericLight } from '@babylonjs/core';
import { useBabylonMap } from 'react-babylon-map';
import { levaStore, useControls } from 'leva';
import { StoryMap } from "./story-map";

export function Default() {
  const [toggle, setToggle] = useState(false);
  useEffect(() => { levaStore.setValueAtPath('overlay', true, true); }, []);

  return (
    <StoryMap
      latitude={51.508}
      longitude={-0.1281}
      zoom={18}
      pitch={60}
    >
      <SceneContent toggle={toggle} />
    </StoryMap>
  );
}

function SceneContent({ toggle }: { toggle: boolean }) {
  const { scene } = useBabylonMap();
  const boxRef = useRef<any>(null);
  const matRef = useRef<any>(null);
  const groundRef = useRef<any>(null);
  const groundMatRef = useRef<any>(null);

  const rootRef = useRef<any>(null);

  const rootMatRef = useRef<any>(null);

  const boxMatRef = useRef<any>(null);

  const boxMatMat = useRef<any>(null);

  useEffect(() => {
    if (!scene) return;
    const light = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    light.intensity = 1;
    const root = MeshBuilder.CreateBox("root", { size: 35 }, scene);
    root.position.y = 17.5;
    root.rotation.y = 13 * Math.PI / 180;
    rootRef.current = root;
    const rMat = new StandardMaterial("rootMat", scene);
    rMat.diffuseColor = Color3.FromHexString("#cccccc");
    rMat.alpha = 0.5;
    rootMatRef.current = rMat;
    root.material = rMat;
    root.metadata = {
      onPointerOver: () => setToggle(true),
      onPointerOut: () => setToggle(false),
    };
    // Ground plane
    const ground = MeshBuilder.CreateGround("ground", { width: 70, height: 70 }, scene);
    groundRef.current = ground;
    const gMat = new StandardMaterial("groundMat", scene);
    gMat.diffuseColor = Color3.FromHexString("#cccccc");
    ground.material = gMat;
    return () => {
      light.dispose();
      root.dispose(); rMat.dispose(); ground.dispose(); gMat.dispose();
    };
  }, [scene]);

  useEffect(() => {
    if (!rootMatRef.current) return;
    rootMatRef.current.diffuseColor = toggle
      ? Color3.FromHexString("#ffff00")
      : Color3.FromHexString("#cccccc");
  }, [toggle]);

  return null;
}
SceneContent.displayName = 'SceneContent';

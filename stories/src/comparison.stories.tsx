import { FC, memo, useEffect, useRef, useState } from "react";
import {
  MeshBuilder, StandardMaterial, Vector3, Color3, Color4,
  HemisphericLight, DirectionalLight, PointLight, ShadowGenerator,
  GroundMesh,
} from '@babylonjs/core';
import { useControls } from "leva";
import { StoryMap } from "./story-map";
import { useBabylonMap } from 'react-babylon-map';

// ── Lights ──────────────────────────────────────────────────────

function Lights({ showCamHelper }: { showCamHelper?: boolean }) {
  const { scene } = useBabylonMap();

  useEffect(() => {
    if (!scene) return;

    // Ambient
    const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.5;

    // Directional (sun) with shadows
    const dir = new DirectionalLight("dir", new Vector3(-2.5, -50, -5).normalize(), scene);
    dir.position = new Vector3(2.5, 50, 5);
    dir.intensity = 1.5;

    const shadowGen = new ShadowGenerator(1024, dir);
    shadowGen.useBlurExponentialShadowMap = true;
    shadowGen.blurKernel = 32;

    // Point lights
    const p1 = new PointLight("p1", new Vector3(50, 5, 10), scene);
    p1.intensity = 1;
    const p2 = new PointLight("p2", new Vector3(-50, 5, 10), scene);
    p2.intensity = 1;
    const p3 = new PointLight("p3", new Vector3(0, 5, 0), scene);
    p3.intensity = 1;

    // Store shadow generator on scene metadata so boxes can add themselves
    (scene as any)._shadowGenerator = shadowGen;

    return () => {
      shadowGen.dispose();
      hemi.dispose(); dir.dispose();
      p1.dispose(); p2.dispose(); p3.dispose();
    };
  }, [scene]);

  return null;
}
Lights.displayName = 'Lights';

// ── Floor ───────────────────────────────────────────────────────

function Floor() {
  const { scene } = useBabylonMap();

  useEffect(() => {
    if (!scene) return;
    const ground = MeshBuilder.CreateGround("floor", { width: 200, height: 200 }, scene);
    const mat = new StandardMaterial("floorMat", scene);
    mat.diffuseColor = new Color3(0.3, 0.3, 0.3);
    mat.alpha = 0.5;
    ground.material = mat;
    ground.receiveShadows = true;

    return () => { ground.dispose(); mat.dispose(); };
  }, [scene]);

  return null;
}
Floor.displayName = 'Floor';

// ── Animated Box ────────────────────────────────────────────────

function MyBox({ position, animate }: { position: [number, number, number]; animate?: boolean }) {
  const { scene } = useBabylonMap();
  const [hovered, setHovered] = useState(false);
  const boxRef = useRef<any>(null);
  const matRef = useRef<any>(null);

  useEffect(() => {
    if (!scene) return;

    const box = MeshBuilder.CreateBox("box", { width: 16, height: 16, depth: 16 }, scene);
    box.position = new Vector3(position[0], position[1], position[2]);
    boxRef.current = box;

    const mat = new StandardMaterial("boxMat", scene);
    mat.diffuseColor = Color3.FromHexString("#ffa500");
    mat.specularColor = new Color3(0.3, 0.3, 0.3);
    matRef.current = mat;
    box.material = mat;

    // Add to shadow caster list
    const shadowGen = (scene as any)._shadowGenerator as ShadowGenerator | undefined;
    if (shadowGen) shadowGen.addShadowCaster(box);

    box.metadata = {
      onPointerOver: () => setHovered(true),
      onPointerOut: () => setHovered(false),
    };

    return () => {
      box.dispose(); mat.dispose();
    };
  }, [scene]);

  // Rotation animation
  useEffect(() => {
    if (!scene) return;
    if (!animate) return;

    let lastTime = performance.now();
    const observer = scene.onBeforeRenderObservable.add(() => {
      if (!boxRef.current) return;
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      boxRef.current.rotation.y += dt;
    });
    return () => scene.onBeforeRenderObservable.remove(observer);
  }, [scene, animate]);

  // Hover color
  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.diffuseColor = hovered
      ? Color3.FromHexString("#ff0000")
      : Color3.FromHexString("#ffa500");
  }, [hovered]);

  return null;
}
MyBox.displayName = 'MyBox';

// ── Stories ─────────────────────────────────────────────────────

export default { title: 'Comparison' };

export function WithMap() {
  const { showCamHelper } = useControls({ showCamHelper: { value: false, label: 'show camera helper' } });
  const { animate } = useControls({ animate: true });

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <StoryMap
        latitude={51.5073218}
        longitude={-0.1276473}
        zoom={18}
        pitch={60}
      >
        <Lights showCamHelper={showCamHelper} />
        <Floor />
        <MyBox animate={animate} position={[-8 * 3, 8 * 1.5, 0]} />
        <MyBox animate={animate} position={[8 * 3, 8 * 1.5, 0]} />
      </StoryMap>
    </div>
  );
}

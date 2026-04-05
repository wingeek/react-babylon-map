import { FC, memo, useEffect, useRef, useState } from "react";
import {
  MeshBuilder, StandardMaterial, Vector3, Color3,
  HemisphericLight, DefaultRenderingPipeline,
} from '@babylonjs/core';
import { levaStore, useControls } from 'leva';
import { useBabylonMap } from 'react-babylon-map';
import { StoryMap } from "./story-map";

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

/** Box with hover color change */
const HoverBox: FC<{ scale: number }> = memo(({ scale }) => {
  const { scene } = useBabylonMap();
  const [hovered, setHovered] = useState(false);
  const matRef = useRef<StandardMaterial | null>(null);

  useEffect(() => {
    if (!scene) return;
    const s = scale;
    const box = MeshBuilder.CreateBox('hoverBox', { width: s, height: s, depth: s }, scene);
    box.position.y = s * 0.5;

    const mat = new StandardMaterial('hoverBoxMat', scene);
    mat.diffuseColor = Color3.FromHexString('#CCCCCC');
    mat.alpha = 0.5;
    matRef.current = mat;
    box.material = mat;

    box.metadata = {
      onPointerOver: () => setHovered(true),
      onPointerOut: () => setHovered(false),
    };

    return () => { box.dispose(); mat.dispose(); };
  }, [scene, scale]);

  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.diffuseColor = Color3.FromHexString(hovered ? '#FFFF00' : '#CCCCCC');
  }, [hovered]);

  return null;
});
HoverBox.displayName = 'HoverBox';

/** Ground plane */
const Ground: FC = memo(() => {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;
    const ground = MeshBuilder.CreateGround('ground', { width: 2, height: 2 }, scene);
    const mat = new StandardMaterial('groundMat', scene);
    mat.diffuseColor = Color3.FromHexString('#CCCCCC');
    ground.material = mat;
    return () => { ground.dispose(); mat.dispose(); };
  }, [scene]);
  return null;
});
Ground.displayName = 'Ground';

/** Attach Babylon's built-in post-processing pipeline */
const PostProcessing: FC<{ ao: boolean; ssaoEnabled: boolean }> = memo(({ ao, ssaoEnabled }) => {
  const { scene, engine } = useBabylonMap();
  useEffect(() => {
    if (!scene || !engine) return;

    const pipeline = new DefaultRenderingPipeline('defaultPipeline', true, scene, [scene.activeCamera!]);

    // SSAO (equivalent to N8AO in react-three-postprocessing)
    pipeline.ssaoEnabled = ao && ssaoEnabled;
    if (pipeline.ssao) {
      pipeline.ssao.totalStrength = 1.5;
      pipeline.ssao.radius = 0.5;
    }

    // Bloom
    pipeline.bloomEnabled = false;

    // FXAA
    pipeline.fxaaEnabled = true;

    return () => { pipeline.dispose(); };
  }, [scene, engine, ao, ssaoEnabled]);

  return null;
});
PostProcessing.displayName = 'PostProcessing';

export default { title: 'Postprocessing' };

export function Default() {
  const { ao, scale } = useControls({
    ao: { value: true, label: 'Ambient Occlusion' },
    scale: { value: 35 },
  });

  // Default to overlay mode
  useEffect(() => {
    levaStore.setValueAtPath('overlay', true, true);
  }, []);

  return (
    <StoryMap
      latitude={51.508}
      longitude={-0.1281}
      zoom={18}
      pitch={60}
    >
      <Lights />
      <PostProcessing ao={ao} ssaoEnabled={true} />
      <HoverBox scale={scale} />
      <Ground />
    </StoryMap>
  );
}

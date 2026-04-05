import { FC, memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from 'react-dom';
import {
  MeshBuilder, StandardMaterial, Vector3, Color3, Matrix,
  HemisphericLight,
} from '@babylonjs/core';
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

/**
 * Projects a 3D world position to screen coordinates and renders
 * HTML content at that position via a React portal.
 * Equivalent to drei's <Html>.
 */
const HtmlOverlay: FC<{
  position: [number, number, number];
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = memo(({ position, children, style }) => {
  const { scene, engine } = useBabylonMap();
  const divRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // Find the map container (parent of canvas) to portal into
  useEffect(() => {
    if (!engine) return;
    const canvas = engine.getRenderingCanvas();
    if (!canvas) return;
    // Walk up to find the positioned container div
    const parent = canvas.parentElement?.parentElement;
    if (parent) setContainer(parent);
  }, [engine]);

  // Update position each frame
  useEffect(() => {
    if (!scene || !engine || !divRef.current) return;
    const canvas = engine.getRenderingCanvas();
    if (!canvas) return;

    const observer = scene.onAfterRenderObservable.add(() => {
      if (!divRef.current || !scene.activeCamera) return;
      const cam = scene.activeCamera;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // The frozen projection matrix IS the full WVP (world * view * proj).
      // Transform position through it to get NDC, then map to screen.
      const wvp = cam.getProjectionMatrix();
      const pos = new Vector3(position[0], position[1], position[2]);

      // Manual: multiply by WVP, perspective divide, map to screen
      const x = wvp.m[0] * pos.x + wvp.m[4] * pos.y + wvp.m[8]  * pos.z + wvp.m[12];
      const y = wvp.m[1] * pos.x + wvp.m[5] * pos.y + wvp.m[9]  * pos.z + wvp.m[13];
      const z = wvp.m[2] * pos.x + wvp.m[6] * pos.y + wvp.m[10] * pos.z + wvp.m[14];
      const w4 = wvp.m[3] * pos.x + wvp.m[7] * pos.y + wvp.m[11] * pos.z + wvp.m[15];

      if (w4 === 0) return;
      const ndcX = x / w4;
      const ndcY = y / w4;
      const ndcZ = z / w4;

      // NDC [-1,1] -> screen [0,w], [0,h]
      const screenX = (ndcX + 1) / 2 * w;
      const screenY = (1 - ndcY) / 2 * h; // flip Y

      divRef.current.style.left = `${screenX}px`;
      divRef.current.style.top = `${screenY}px`;
      divRef.current.style.display = ndcZ > 1 || ndcZ < -1 ? 'none' : 'block';
    });

    return () => { scene.onAfterRenderObservable.remove(observer); };
  }, [scene, engine, position, container]);

  if (!container) return null;

  return createPortal(
    <div
      ref={divRef}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        transform: 'translate(-50%, -100%)',
        whiteSpace: 'nowrap',
        zIndex: 10,
        ...style,
      }}
    >
      {children}
    </div>,
    container
  );
});
HtmlOverlay.displayName = 'HtmlOverlay';

/** Interactive box that changes color on hover */
const MyBox: FC<{ position: [number, number, number]; rotation: number }> = memo(({ position, rotation }) => {
  const { scene } = useBabylonMap();
  const [hovered, setHovered] = useState(false);
  const matRef = useRef<StandardMaterial | null>(null);

  useEffect(() => {
    if (!scene) return;
    const box = MeshBuilder.CreateBox('box', { width: 500, height: 500, depth: 500 }, scene);
    box.position.set(position[0], position[1], position[2]);
    box.rotation.y = rotation;

    const mat = new StandardMaterial('boxMat', scene);
    mat.diffuseColor = Color3.FromHexString("#FFA500"); // orange
    mat.emissiveColor = Color3.FromHexString("#FFA500").scale(0.2);
    matRef.current = mat;
    box.material = mat;

    box.metadata = {
      onPointerOver: () => setHovered(true),
      onPointerOut: () => setHovered(false),
    };

    return () => { box.dispose(); mat.dispose(); };
  }, [scene, position, rotation]);

  // Update color on hover
  useEffect(() => {
    if (!matRef.current) return;
    const hex = hovered ? '#800080' : '#FFA500'; // purple : orange
    matRef.current.diffuseColor = Color3.FromHexString(hex);
    matRef.current.emissiveColor = Color3.FromHexString(hex).scale(0.2);
  }, [hovered]);

  return null;
});
MyBox.displayName = 'MyBox';

export default { title: 'HTML on Top' };

export function Default() {
  return (
    <StoryMap latitude={51} longitude={0} zoom={13} pitch={60}>
      <Lights />
      <MyBox position={[0, 250, 0]} rotation={45 * Math.PI / 180} />
      <HtmlOverlay position={[0, 500, 0]} style={{ textAlign: 'center', fontSize: '2em', width: '10em', lineHeight: '1.5em' }}>
        <i>Some</i> <b>HTML</b><br />content!
      </HtmlOverlay>
    </StoryMap>
  );
}

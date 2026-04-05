import { FC, memo, useEffect } from "react";
import {
  MeshBuilder, StandardMaterial, DynamicTexture,
  HemisphericLight, Vector3, Color3, Scene,
} from '@babylonjs/core';
import { useBabylonMap } from 'react-babylon-map';
import { StoryMap } from "./story-map";

function Lights() {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;
    const light = new HemisphericLight("hemiLight", new Vector3(1, 4.5, 3), scene);
    light.intensity = Math.PI;
    light.groundColor = Color3.FromHexString("#60666C");
    return () => { light.dispose(); };
  }, [scene]);
  return null;
}

/** Cylinder mesh — mirrors drei's <Cylinder> */
const Cylinder: FC<{ args: [number, number, number]; position: [number, number, number]; color: string }> = memo(({ args, position, color }) => {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;
    const [radiusTop, radiusBottom, height] = args;
    const mesh = MeshBuilder.CreateCylinder('cylinder', {
      diameterTop: radiusTop * 2,
      diameterBottom: radiusBottom * 2,
      height,
    }, scene);
    mesh.position.set(position[0], position[1], position[2]);
    const mat = new StandardMaterial('cylMat', scene);
    mat.diffuseColor = Color3.FromHexString(color);
    mat.emissiveColor = Color3.FromHexString(color).scale(0.3);
    mesh.material = mat;
    return () => { mesh.dispose(); mat.dispose(); };
  }, [scene, args, position, color]);
  return null;
});
Cylinder.displayName = 'Cylinder';

/** Creates a plane with dynamic texture text — equivalent to drei's <Text> */
function createTextPlane(text: string, fontSize: number, color: string, scene: Scene) {
  // In drei, fontSize is in world units. We render text large in texture and scale plane to match.
  const textureWidth = 512;
  const textureHeight = 256;
  const tex = new DynamicTexture('textTex', { width: textureWidth, height: textureHeight }, scene, true);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, textureWidth, textureHeight);
  // Fill text large relative to texture, then size plane to world units
  ctx.font = `bold 200px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, textureWidth / 2, textureHeight / 2);
  tex.update();

  // Plane size in world units: fontSize maps to world height
  const planeWidth = fontSize * (textureWidth / textureHeight);
  const planeHeight = fontSize;
  const plane = MeshBuilder.CreatePlane('textPlane', { width: planeWidth, height: planeHeight }, scene);
  const mat = new StandardMaterial('textMat', scene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.emissiveColor = Color3.White();
  mat.opacityTexture = tex;
  mat.backFaceCulling = false;
  mat.useAlphaFromDiffuseTexture = true;
  plane.material = mat;
  return { plane, mat, tex };
}

/** Text plane that always faces the camera (billboard effect) */
const BillboardText: FC<{ text: string; fontSize: number; color: string; position: [number, number, number] }> = memo(({ text, fontSize, color, position }) => {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;
    const { plane, mat, tex } = createTextPlane(text, fontSize, color, scene);
    plane.position.set(position[0], position[1], position[2]);

    // Billboard: face camera each frame by copying inverse camera rotation
    const observer = scene.onBeforeRenderObservable.add(() => {
      const cam = scene.activeCamera;
      if (!cam) return;
      // Invert camera rotation so the plane faces toward the viewer
      plane.rotationQuaternion = cam.absoluteRotation.clone().invert();
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
      plane.dispose();
      tex.dispose();
      mat.dispose();
    };
  }, [scene, text, fontSize, color, position]);
  return null;
});
BillboardText.displayName = 'BillboardText';

export default { title: 'Billboard' };

export function Default() {
  return (
    <StoryMap latitude={51} longitude={0} zoom={18} pitch={60}>
      <Lights />
      <Cylinder args={[10, 1, 40]} position={[0, 20, 0]} color="#FFFF00" />
      <BillboardText text="Hi!" fontSize={17} color="#2592a8" position={[0, 50, 0]} />
    </StoryMap>
  );
}

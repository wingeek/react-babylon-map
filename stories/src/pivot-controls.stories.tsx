import { FC, memo, useEffect, useMemo, useRef, useState } from "react";
import {
  MeshBuilder, StandardMaterial, Vector3, Color3, AbstractMesh,
  HemisphericLight, GizmoManager,
} from '@babylonjs/core';
import { useBabylonMap, vector3ToCoords } from 'react-babylon-map';
import { useControls } from 'leva';
import { StoryMap } from "./story-map";
import { Marker as MaplibreMarker } from 'react-map-gl/maplibre';
import { Marker as MapboxMarker } from 'react-map-gl/mapbox';

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

/** Sphere mesh */
const MySphere: FC<{ position: [number, number, number] }> = memo(({ position }) => {
  const { scene } = useBabylonMap();
  useEffect(() => {
    if (!scene) return;
    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 100 }, scene);
    sphere.position.set(position[0], position[1], position[2]);
    const mat = new StandardMaterial('sphereMat', scene);
    mat.diffuseColor = Color3.FromHexString("#FFA500");
    mat.emissiveColor = Color3.FromHexString("#FFA500").scale(0.2);
    sphere.material = mat;
    return () => { sphere.dispose(); mat.dispose(); };
  }, [scene, position]);
  return null;
});
MySphere.displayName = 'MySphere';

/** Drag gizmo using Babylon's built-in GizmoManager */
const DragGizmo: FC<{
  position: [number, number, number];
  onDrag: (newPosition: [number, number, number]) => void;
}> = memo(({ position, onDrag }) => {
  const { scene, map } = useBabylonMap();
  const anchorRef = useRef<AbstractMesh | null>(null);

  useEffect(() => {
    if (!scene || !map) return;

    // Create an invisible anchor mesh at the position
    const anchor = MeshBuilder.CreateBox('dragAnchor', { size: 0.01 }, scene);
    anchor.position.set(position[0], position[1], position[2]);
    anchor.visibility = 0;
    anchorRef.current = anchor;

    // Setup gizmo manager — only translation on X and Z axes
    const gizmoManager = new GizmoManager(scene);
    gizmoManager.positionGizmoEnabled = true;
    gizmoManager.rotationGizmoEnabled = false;
    gizmoManager.scaleGizmoEnabled = false;
    gizmoManager.boundingBoxGizmoEnabled = false;

    // Disable Y-axis drag (keep on ground plane)
    if (gizmoManager.gizmos.positionGizmo) {
      gizmoManager.gizmos.positionGizmo.yGizmo.dispose();
    }

    // Attach to our anchor
    gizmoManager.attachToMesh(anchor);

    // Disable map panning during drag
    let wasDragPanEnabled = true;
    let wasDragRotateEnabled = true;

    gizmoManager.onAttachedToMeshObservable.add(() => {
      wasDragPanEnabled = map.dragPan.isEnabled();
      wasDragRotateEnabled = map.dragRotate.isEnabled();
    });

    // Track position changes
    const observer = scene.onBeforeRenderObservable.add(() => {
      if (!anchorRef.current) return;
      const pos = anchorRef.current.position;
      onDrag([pos.x, pos.y, pos.z]);
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
      gizmoManager.dispose();
      anchor.dispose();
    };
  }, [scene, map, onDrag]);

  // Update anchor position when prop changes
  useEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.position.set(position[0], position[1], position[2]);
    }
  }, [position]);

  return null;
});
DragGizmo.displayName = 'DragGizmo';

export default { title: 'Pivot Controls' };

export function Default() {
  const origin = useControls({
    latitude: { value: 51, min: -90, max: 90 },
    longitude: { value: 0, min: -180, max: 180 },
  });

  const [position, setPosition] = useState<[number, number, number]>([0, 25, 0]);
  const geoPos = useMemo(() => vector3ToCoords(position, origin), [position, origin]);

  // Reset on origin change
  useEffect(() => setPosition([0, 25, 0]), [origin.latitude, origin.longitude]);

  return (
    <StoryMap
      longitude={origin.longitude}
      latitude={origin.latitude}
      zoom={13}
      pitch={60}
      maplibreChildren={
        <MaplibreMarker longitude={geoPos.longitude} latitude={geoPos.latitude}>
          <div style={{ fontSize: 18 }}>
            lat: {geoPos.latitude.toFixed(6)}<br />
            lon: {geoPos.longitude.toFixed(6)}
          </div>
        </MaplibreMarker>
      }
      mapboxChildren={
        <MapboxMarker longitude={geoPos.longitude} latitude={geoPos.latitude}>
          <div style={{ fontSize: 18 }}>
            lat: {geoPos.latitude.toFixed(6)}<br />
            lon: {geoPos.longitude.toFixed(6)}
          </div>
        </MapboxMarker>
      }
    >
      <Lights />
      <MySphere position={position} />
      <DragGizmo position={position} onDrag={setPosition} />
    </StoryMap>
  );
}

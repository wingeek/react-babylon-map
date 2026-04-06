# react-babylon-map

Render Babylon.js 3D content inside MapLibre GL JS and Mapbox GL JS maps.

## Install

```bash
pnpm add react-babylon-map
```

Peer dependencies (install what you need):

```bash
pnpm add @babylonjs/core react react-map-gl
# plus one of:
pnpm add maplibre-gl   # for MapLibre
pnpm add mapbox-gl     # for Mapbox
```

## Usage

### MapLibre

```tsx
import { Canvas, Coordinates } from 'react-babylon-map/maplibre';
import { Map } from 'react-map-gl/maplibre';
import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';

function Building() {
  return (
    <Coordinates longitude={-73.9857} latitude={40.7484} altitude={0}>
      <MyBabylonScene />
    </Coordinates>
  );
}

export default function App() {
  return (
    <Map mapStyle="https://demotiles.maplibre.org/style.json">
      <Canvas longitude={-73.9857} latitude={40.7484}>
        <Building />
      </Canvas>
    </Map>
  );
}
```

### Mapbox

```tsx
import { Canvas, Coordinates } from 'react-babylon-map/mapbox';
import { Map } from 'react-map-gl/mapbox';
```

## API

### `<Canvas>`

The root component that creates the Babylon.js engine and scene, sharing the map's WebGL context.

| Prop | Type | Description |
|------|------|-------------|
| `longitude` | `number` | Origin longitude |
| `latitude` | `number` | Origin latitude |
| `altitude` | `number` | Origin altitude (default `0`) |
| `overlay` | `boolean` | Render on a separate `<canvas>` on top of the map instead of in-layer |
| `id` | `string` | Custom layer id |
| `beforeId` | `string` | Insert layer before this id |
| `frameloop` | `'always' \| 'demand'` | Render mode |

### `<Coordinates>`

Place 3D content at a specific geographic coordinate. Creates a sub-scene with its own camera synced to the given position.

| Prop | Type | Description |
|------|------|-------------|
| `longitude` | `number` | Target longitude |
| `latitude` | `number` | Target latitude |
| `altitude` | `number` | Target altitude (default `0`) |

### `<NearCoordinates>`

Place 3D content at a nearby coordinate relative to the `<Canvas>` origin. More efficient than `<Coordinates>` for short offsets.

Same props as `<Coordinates>`.

### Hooks & Utilities

- **`useMap()`** — access the underlying MapLibre/Mapbox `Map` instance
- **`useBabylonMap()`** — access the internal `BabylonMap` context (engine, scene, view matrix)
- **`coordsToVector3(point, origin)`** — convert geographic coords to a local `[x, y, z]` position
- **`vector3ToCoords(position, origin)`** — convert a local position back to geographic coords

## Build

```bash
pnpm build            # builds both MapLibre and Mapbox variants (ES + CJS)
pnpm build:maplibre   # MapLibre only
pnpm build:mapbox     # Mapbox only
pnpm ts:check         # type check
pnpm test             # run tests
```

## Acknowledgments

This project is a port of [react-three-map](https://github.com/RodrigoHamuy/react-three-map), replacing the underlying rendering library with Babylon.js.

## License

MIT

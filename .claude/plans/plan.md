---
title: react-babylon-map
---

任务目标：基于 react-three-map 代码迁移基于react-babylon的react-babylon-map, 不改变底层对maplibregl， react-map-gl的依赖


# react-babylon-map: 基于 react-babylonjs 替换 Three.js 的迁移工程规划

> 使用 react-babylonjs 替换 react-three-map 中的 Three.js/R3F，创建 `react-babylon-map`。

## 1. 项目概述

### 1.1 当前架构

`react-three-map` 将 **React Three Fiber (R3F)** 与 **MapLibre GL JS / Mapbox GL JS** 桥接，在地图上渲染声明式 3D 内容。核心设计：

- **双渲染模式**: `overlay={true}`（覆盖画布）和 `overlay={false}`（共享 WebGL 上下文的自定义图层）
- **相机同步**: MapLibre 的 view-projection 矩阵每帧驱动 Three.js 相机
- **Provider 抽象**: 泛型接口隐藏 Mapbox/MapLibre 差异
- **双构建目标**: 同一代码库输出 MapLibre 和 Mapbox 版本

### 1.2 react-babylonjs 能力评估

react-babylonjs 是基于 `react-reconciler` 的自定义 React 渲染器，将 JSX 映射到 Babylon.js 对象。

**可用能力：**

| 能力 | API | 说明 |
|------|-----|------|
| 声明式场景图 | `<Engine>`, `<Scene>`, `<box>`, `<freeCamera>` 等 | 自动生成 JSX 组件映射 |
| 帧级拦截 | `useBeforeRender(cb)`, `useAfterRender(cb)` | 订阅 `scene.onBeforeRenderObservable` |
| 场景/引擎访问 | `useScene()`, `useEngine()`, `useCanvas()` | 从 React context 获取实例 |
| 场景回调 | `<Scene onCreated={...} onSceneMount={...}>` | 场景初始化和挂载回调 |
| 指针拾取 | `<Scene onMeshPicked={...} onScenePointerDown={...}>` | 基于 Babylon 内置 picking |
| 相机创建 | `useCamera(fn, autoAttach?)` | 可通过 `autoAttach=false` 禁止输入绑定 |
| 多场景 | 多个 `<Scene>` 嵌套在 `<Engine>` 下 | 共享引擎，独立场景 |
| Portal | `createPortal(children, target)` | 渲染子树到不同 Babylon 容器 |

**需扩展的能力：**

| 限制 | 影响 | 解决方案 |
|------|------|----------|
| `<Engine>` 总创建自己的 `<canvas>` | 无法直接使用 MapLibre 的画布/GL 上下文 | 扩展 Engine 组件，增加 `externalContext` prop |
| 渲染循环不可外部控制 | 无 `frameloop: 'never'` 等价物 | 调用 `engine.stopRenderLoop()` + 手动 `scene.render()` |
| 相机 JSX 自动 `attachControl()` | 与 MapLibre 输入处理冲突 | `onCreated` 中立即 `detachControl()` 或用 `useCamera(fn, false)` |
| 无手动帧推进 API | 无 `advance()` 等价物 | 通过 `useEngine()` 获取引擎后手动管理渲染 |

### 1.3 Three.js 集成点分析

| 类别 | 当前 Three.js 用法 | 涉及文件 |
|------|-------------------|----------|
| 数学原语 | `Matrix4`, `Vector3`, `Quaternion`, `Euler` | `sync-camera.ts`, `coords-to-matrix.ts`, `events.ts` |
| 相机 | `PerspectiveCamera`, `projectionMatrix` | `sync-camera.ts`, `sync-camera-fc.tsx`, `coordinates.tsx` |
| 场景 | `Scene`, `Object3D`, `createPortal` | `coordinates.tsx`, `canvas-portal.tsx` |
| R3F 集成 | `Canvas`, `useFrame`, `useThree`, `createRoot`, `_roots`, `extend`, `advance` | 所有核心文件 |
| WebGL 上下文 | `gl: { context, autoClear }`, `gl.resetState()` | `use-root.tsx`, `use-render.ts` |
| 事件/射线 | 自定义事件系统 + `Raycaster` | `events.ts` |

## 2. 技术方案

### 2.1 架构决策：扩展 react-babylonjs

**决策**: 以 react-babylonjs 为基础，扩展其 Engine 组件以支持外部 WebGL 上下文和渲染控制。

**具体策略**:

1. **Fork react-babylonjs 的 Engine 组件**，创建 `MapEngine` 组件，支持：
   - `externalContext?: WebGLRenderingContext` -- 接受 MapLibre 的 GL 上下文
   - `renderMode?: 'auto' | 'manual'` -- 手动模式下不启动渲染循环
2. **保留 react-babylonjs 的 reconciler 和 JSX 组件系统**，用于场景图管理
3. **使用 react-babylonjs 的 hooks**（`useBeforeRender`, `useScene`, `useEngine`）进行相机同步和帧级控制
4. **使用 Babylon.js 原生 API** 仅处理 MapLibre 特有的矩阵转换和相机覆盖

**架构对比**:

```
当前 react-three-map:
  R3F createRoot(canvas) → configure({ gl: { context }, frameloop: 'never' })
  → useFrame() 同步相机
  → advance() 手动渲染

新 react-babylon-map:
  react-babylonjs <MapEngine externalContext={gl} renderMode="manual">
  → useBeforeRender() 同步相机
  → scene.render() 手动渲染
```

### 2.2 react-babylonjs 扩展方案

#### MapEngine 组件

基于 react-babylonjs 的 `<Engine>` 组件 fork 并扩展：

```tsx
// src/core/map-engine.tsx
import { Engine } from '@babylonjs/core';
import { EngineCanvasContext } from 'react-babylonjs';

interface MapEngineProps {
  /** MapLibre 的 WebGL 上下文，用于共享渲染 */
  externalContext?: WebGLRenderingContext;
  /** 渲染模式：auto=自动循环，manual=外部控制 */
  renderMode?: 'auto' | 'manual';
  children: React.ReactNode;
}

export const MapEngine: React.FC<MapEngineProps> = ({
  externalContext, renderMode = 'manual', children
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine>();

  useEffect(() => {
    if (externalContext) {
      // 使用 MapLibre 的 GL 上下文创建 Babylon Engine
      engineRef.current = new Engine(
        externalContext as WebGL2RenderingContext,
        false,  // antialias
        { preserveDrawingBuffer: true, stencil: true },
        false   // adaptToDeviceRatio
      );
    } else {
      // overlay 模式：使用独立 canvas
      engineRef.current = new Engine(canvasRef.current!, true);
    }

    if (renderMode === 'manual') {
      // 不启动自动渲染循环
      // 外部（MapLibre render callback）负责调用 scene.render()
    } else {
      engineRef.current.runRenderLoop(() => {
        engineRef.current!.scenes.forEach(s => s.render());
      });
    }

    return () => { engineRef.current?.dispose(); };
  }, []);

  return (
    <EngineCanvasContext.Provider value={engineRef.current}>
      {externalContext ? null : <canvas ref={canvasRef} style={{position:'absolute', top:0, left:0}} />}
      {children}
    </EngineCanvasContext.Provider>
  );
};
```

#### 渲染控制 Hook

```tsx
// src/core/use-manual-render.ts
import { useEngine, useScene } from 'react-babylonjs';

/** 手动渲染一帧，供 MapLibre 自定义图层的 render() 调用 */
export function useManualRender() {
  const engine = useEngine();
  const scene = useScene();

  return useCallback(() => {
    if (!scene || !engine) return;
    // 重置 GL 状态，避免与 MapLibre 冲突
    engine.resetCustomCache?.();
    scene.render();
  }, [engine, scene]);
}
```

### 2.3 相机同步方案

利用 react-babylonjs 的 `useBeforeRender` hook 和 Babylon.js 相机 API：

```tsx
// src/core/sync-camera-babylon.ts
import { FreeCamera, Matrix, Vector3, Matrix } from '@babylonjs/core';

/** 将 MapLibre 的 view-projection 矩阵应用到 Babylon 相机 */
export function syncCamera(
  camera: FreeCamera,
  origin: Matrix,      // row-major Babylon matrix
  mapViewProjMx: number[]  // column-major from MapLibre
) {
  // 转置：MapLibre 列主序 → Babylon 行主序
  const projView = columnMajorToBabylonMatrix(mapViewProjMx)
    .multiply(origin);
  const projViewInv = projView.clone().invert();

  // 从逆矩阵提取相机位置
  const position = Vector3.TransformCoordinates(
    Vector3.Zero(), projViewInv
  );

  // 提取前方向
  const forward = Vector3.TransformCoordinates(
    new Vector3(0, 0, 1), projViewInv
  );

  // 提取上方向
  const up = Vector3.TransformCoordinates(
    new Vector3(0, 1, 0), projViewInv
  ).subtract(position).normalize();

  camera.position.copyFrom(position);
  camera.setTarget(forward);
  camera.upVector.copyFrom(up);

  // 冻结投影矩阵，使用地图的投影
  camera.freezeProjectionMatrix(projView);
}
```

```tsx
// src/core/sync-camera-fc.tsx
import { useBeforeRender, useScene } from 'react-babylonjs';
import { FreeCamera } from '@babylonjs/core';

/** 在每帧前同步 Babylon 相机与 MapLibre 视图 */
export const SyncCameraFC: React.FC<SyncCameraFCProps> = ({
  latitude, longitude, altitude, mapViewProjMx
}) => {
  const scene = useScene();
  const origin = useCoordsToMatrix({ latitude, longitude, altitude });

  useBeforeRender(() => {
    if (!scene?.activeCamera) return;
    syncCamera(
      scene.activeCamera as FreeCamera,
      origin,
      mapViewProjMx
    );
  });

  return null;
};
```

### 2.4 矩阵转换工具

MapLibre 提供列主序矩阵（OpenGL/WebGL 约定），Babylon.js 内部存储行主序。

```typescript
// src/core/matrix-utils.ts
import { Matrix } from '@babylonjs/core';

/** 列主序 → 行主序转置 */
export function transposeMatrix(m: number[]): number[] {
  return [
    m[0],  m[4],  m[8],  m[12],
    m[1],  m[5],  m[9],  m[13],
    m[2],  m[6],  m[10], m[14],
    m[3],  m[7],  m[11], m[15],
  ];
}

/** MapLibre 列主序矩阵 → Babylon.js Matrix（行主序） */
export function columnMajorToBabylonMatrix(m: number[]): Matrix {
  return Matrix.FromArray(transposeMatrix(m));
}
```

### 2.5 两种渲染模式的实现

#### Canvas-in-Layer 模式 (`overlay={false}`)

共享 MapLibre 的 WebGL 上下文，通过自定义图层渲染：

```tsx
// src/core/canvas-in-layer/use-canvas-in-layer.tsx
export function useCanvasInLayer(props: CanvasProps, fromLngLat: FromLngLat, map: MapInstance) {
  const { latitude, longitude, altitude, frameloop } = props;
  const origin = useCoordsToMatrix({ latitude, longitude, altitude, fromLngLat });

  // MapLibre 自定义图层接口
  const layerProps = {
    id: props.id,
    beforeId: props.beforeId,
    type: 'custom',
    renderingMode: '3d',
    onAdd: (map: MapInstance, gl: WebGLRenderingContext) => {
      // 创建 Babylon Engine（使用 MapLibre 的 GL 上下文）
      engine = new Engine(gl as WebGL2RenderingContext, false, {
        preserveDrawingBuffer: true, stencil: true
      }, false);
      scene = new Scene(engine);
      scene.useRightHandedSystem = true;
      scene.autoClear = false;
      scene.clearColor = new Color4(0, 0, 0, 0);

      camera = new FreeCamera("cam", Vector3.Zero(), scene);
      // 禁止相机输入控制——地图拥有输入
      camera.inputs.clear();
    },
    render: (gl: WebGLRenderingContext, matrix: number[]) => {
      syncCamera(camera, origin, matrix);
      scene.render();
      if (frameloop !== 'demand') map.triggerRepaint();
    },
    onRemove: () => {
      scene.dispose();
      engine.dispose();
    }
  };

  return layerProps;
}
```

#### Canvas-Overlay 模式 (`overlay={true}`)

独立 canvas 覆盖在地图上方：

```tsx
// src/core/canvas-overlay/canvas-portal.tsx
import { MapEngine } from '../map-engine';
import { Scene as BabylonScene } from 'react-babylonjs';

export const CanvasPortal: React.FC<CanvasPortalProps> = ({
  latitude, longitude, altitude, children
}) => {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <MapEngine renderMode="manual">
        <BabylonScene
          onCreated={(scene) => {
            scene.useRightHandedSystem = true;
            scene.autoClear = false;
            scene.clearColor = new Color4(0, 0, 0, 0);
          }}
        >
          <freeCamera
            name="cam"
            position={Vector3.Zero()}
            onCreated={(cam) => {
              cam.inputs.clear();  // 禁用输入
            }}
          />
          <SyncCameraFC latitude={latitude} longitude={longitude} altitude={altitude} />
          {children}
        </BabylonScene>
      </MapEngine>
    </div>
  );
};
```

## 3. 文件迁移映射

### 3.1 核心文件

| 源文件 | 操作 | react-babylonjs 替代方案 |
|--------|------|------------------------|
| `src/core/generic-map.ts` | **保留** | 无 Three.js 依赖 |
| `src/core/earth-radius.ts` | **保留** | 纯常量 |
| `src/core/use-function.ts` | **保留** | 纯 React 工具 |
| `src/core/coords-to-matrix.ts` | **重写** | `BABYLON.Matrix.Compose()` 替代 `Matrix4.compose()` |
| `src/core/sync-camera.ts` | **重写** | `FreeCamera` + `freezeProjectionMatrix()` 替代 `PerspectiveCamera` |
| `src/core/events.ts` | **重写** | `scene.onPointerObservable` + `scene.pick()` 替代 `Raycaster` |
| `src/core/use-r3m.ts` | **重写** | 使用 `useScene()`/`useEngine()` 替代 `useThree()`；保留 R3M 状态管理逻辑 |
| `src/core/use-coords.tsx` | **重写** | 使用 `useScene()` 获取场景上下文 |
| `src/core/use-coords-to-matrix.ts` | **重写** | 适配 Babylon 矩阵类型 |
| `src/core/canvas-overlay/render.tsx` | **适配** | Render 类型签名变更 |

### 3.2 新增文件

| 文件 | 用途 |
|------|------|
| `src/core/map-engine.tsx` | 扩展 react-babylonjs Engine，支持外部 GL 上下文和手动渲染模式 |
| `src/core/matrix-utils.ts` | 列主序↔行主序矩阵转换 |
| `src/core/use-manual-render.ts` | 手动帧渲染 hook |

### 3.3 Canvas-in-Layer 文件

| 源文件 | 操作 | react-babylonjs 替代方案 |
|--------|------|------------------------|
| `use-root.tsx` | **重写** | `new Engine(externalGL)` 替代 `createRoot(canvas).configure({gl:{context}})` |
| `use-render.ts` | **重写** | `scene.render()` + `engine.resetCustomCache()` 替代 `advance()` + `gl.resetState()` |
| `use-canvas-in-layer.tsx` | **重写** | 自定义图层内创建 Babylon Engine/Scene |

### 3.4 Canvas-Overlay 文件

| 源文件 | 操作 | react-babylonjs 替代方案 |
|--------|------|------------------------|
| `canvas-portal.tsx` | **重写** | `<MapEngine>` + `<Scene>` 替代 R3F `<Canvas>` |
| `sync-camera-fc.tsx` | **重写** | `useBeforeRender()` 替代 `useFrame()` |
| `init-r3m.tsx` | **重写** | 使用 `useScene()`/`useEngine()` 初始化上下文 |
| `init-canvas-fc.tsx` | **重写** | 适配 MapEngine |

### 3.5 API 文件

| 源文件 | 操作 | 说明 |
|--------|------|------|
| `canvas-props.ts` | **重写** | 替换 `RenderProps` 为 Babylon 相关 props |
| `coords.tsx` | **保留** | 纯接口定义 |
| `coordinates.tsx` | **重写** | 使用 react-babylonjs `createPortal` + Babylon Scene/Camera |
| `near-coordinates.tsx` | **重写** | 适配 Babylon 场景坐标 |
| `coords-to-vector-3.ts` | **重写** | 替换 `three.MathUtils` |
| `vector-3-to-coords.ts` | **重写** | 同上 |
| `use-map.ts` | **保留** | 纯 react-map-gl 封装 |

### 3.6 入口文件

| 源文件 | 操作 | 说明 |
|--------|------|------|
| `src/maplibre/canvas.tsx` | **重写** | 移除 `extend(THREE)`，使用 react-babylonjs 组件 |
| `src/mapbox/canvas.tsx` | **重写** | 同上 |
| `src/maplibre.index.ts` | **更新导出** |  |
| `src/mapbox.index.ts` | **更新导出** |  |

## 4. 分阶段计划

### Phase 1: 基础设施

**目标**: 搭建 Babylon.js + react-babylonjs 基础，矩阵工具，相机同步。

1. **依赖替换**
   - 安装 `react-babylonjs`, `@babylonjs/core`, `@babylonjs/materials`
   - 移除 `three`, `@react-three/fiber`, `@react-three/drei` 等
   - 更新 `vite.config.ts`、`tsconfig.json`、`package.json`

2. **矩阵工具**
   - `src/core/matrix-utils.ts` -- 列主序↔行主序转换

3. **坐标数学重写**
   - `src/core/coords-to-matrix.ts` -- `BABYLON.Matrix.Compose()`
   - `src/api/coords-to-vector-3.ts` -- 移除 `three.MathUtils`
   - `src/api/vector-3-to-coords.ts` -- 同上

4. **相机同步**
   - `src/core/sync-camera.ts` -- Babylon `FreeCamera` + `freezeProjectionMatrix()`

5. **MapEngine 组件**
   - `src/core/map-engine.tsx` -- 扩展 Engine 支持外部上下文

### Phase 2: Canvas-in-Layer 模式

**目标**: `overlay={false}` 模式工作——共享 WebGL 上下文。

1. **Babylon Engine 创建**
   - `src/core/canvas-in-layer/use-root.tsx` -- 从 MapLibre GL 上下文创建 Engine/Scene

2. **渲染循环**
   - `src/core/canvas-in-layer/use-render.ts` -- `scene.render()` 从 MapLibre `render()` 回调触发

3. **自定义图层**
   - `src/core/canvas-in-layer/use-canvas-in-layer.tsx` -- 返回 MapLibre `LayerProps`

4. **Provider 入口**
   - `src/maplibre/canvas.tsx` -- 使用 react-babylonjs 的 Canvas 组件

### Phase 3: Canvas-Overlay 模式

**目标**: `overlay={true}` 模式工作——独立 canvas。

1. **Overlay 画布包装器**
   - `src/core/canvas-overlay/canvas-portal.tsx` -- `<MapEngine>` + react-babylonjs `<Scene>`

2. **Overlay 相机同步**
   - `src/core/canvas-overlay/sync-camera-fc.tsx` -- 使用 `useBeforeRender()` 替代 `useFrame()`

3. **Overlay 初始化**
   - `src/core/canvas-overlay/init-canvas-fc.tsx`
   - `src/core/canvas-overlay/init-r3m.tsx`

### Phase 4: 事件与交互

**目标**: 点击/悬停事件正常工作。

1. **事件系统**
   - `src/core/events.ts` -- 使用 react-babylonjs `onMeshPicked` + `scene.onPointerObservable`
   - 指针坐标映射：地图 canvas → Babylon 场景

2. **Coordinates 组件**
   - `src/api/coordinates.tsx` -- 使用 react-babylonjs `createPortal`
   - `src/api/near-coordinates.tsx`

### Phase 5: 完善与测试

1. **更新示例**
   - 移植 `example-maplibre/` 到 Babylon.js mesh 组件
   - 移植 `example-mapbox/`
   - 移植 `stories/` Ladle stories

2. **测试**
   - `src/test/coords-to-matrix.test.ts` -- 适配 Babylon 矩阵输出
   - 相机同步单元测试
   - 矩阵转换测试

3. **文档**
   - 更新 README
   - API 文档
   - react-three-map 迁移指南

## 5. 依赖变更

### 移除

```json
{
  "three": "^0.159.0",
  "@types/three": "^0.159.0",
  "@react-three/fiber": "^8.15.12",
  "@react-three/drei": "^9.97.6",
  "@react-three/postprocessing": "^2.15.11",
  "three-stdlib": "^2.28.7",
  "web-ifc-three": "^0.0.125"
}
```

### 新增

```json
{
  "react-babylonjs": "^3.1.0",
  "@babylonjs/core": "^7.0.0",
  "@babylonjs/materials": "^7.0.0",
  "@babylonjs/loaders": "^7.0.0"
}
```

### Peer 依赖变更

```json
// 移除
"@react-three/fiber": ">=8.13",
"three": ">=0.133",

// 新增
"react-babylonjs": ">=3.0.0",
"@babylonjs/core": ">=7.0.0"
```

### 保持不变

```json
{
  "maplibre-gl": ">=4.0.0",
  "mapbox-gl": ">=3.5.0",
  "react": ">=18.0",
  "react-map-gl": ">=8.0.0"
}
```

## 6. 坐标系映射

### Three.js → Babylon.js

```
Three.js (右手坐标系):          Babylon.js (右手坐标系模式):
  Y ↑                             Y ↑
  |   Z (朝向观察者)              |   Z (前进方向，进入屏幕)
  |  /                            |  /
  | /                             | /
  +------→ X                      +------→ X

设置 scene.useRightHandedSystem = true 后，
Babylon.js 坐标轴与 Three.js 一致。
```

### 矩阵布局转换

```
MapLibre (列主序):          →    Babylon.js (行主序):
[m0, m1, m2, m3,                 [m0, m4, m8,  m12,
 m4, m5, m6, m7,          →      m1, m5, m9,  m13,
 m8, m9, m10,m11,                m2, m6, m10, m14,
 m12,m13,m14,m15]                m3, m7, m11, m15]
```

### coordsToMatrix 翻译

```typescript
// Three.js 版本（当前）:
quat.setFromEuler(euler.set(-Math.PI * .5, 0, 0));
m4.compose(pos, quat, scale).toArray();  // 列主序

// Babylon.js 版本:
const rotation = Quaternion.FromEulerAngles(-Math.PI * .5, 0, 0);
const composed = Matrix.Compose(
  new Vector3(scaleUnit, -scaleUnit, scaleUnit),
  rotation,
  new Vector3(center.x, center.y, center.z || 0)
);
// 结果已是行主序 Babylon 矩阵
```

## 7. API 兼容性策略

### 公共 API

库名变更为 `react-babylon-map`，Breaking Change 预期之中。组件结构保持相似：

```tsx
// 之前 (react-three-map + Three.js):
import { Canvas } from 'react-three-map/maplibre';
<Map longitude={-122.4} latitude={37.8}>
  <Canvas>
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[100, 100, 100]} />
      <meshStandardMaterial color="red" />
    </mesh>
  </Canvas>
</Map>

// 之后 (react-babylon-map + react-babylonjs):
import { Canvas } from 'react-babylon-map/maplibre';
<Map longitude={-122.4} latitude={37.8}>
  <Canvas>
    <box name="myBox" position={new Vector3(0, 0, 0)} size={100}>
      <standardMaterial diffuseColor={Color3.Red()} />
    </box>
  </Canvas>
</Map>
```

### Hook API

```typescript
// 之前:
import { useR3M, Coordinates } from 'react-three-map/maplibre';
// useR3M 返回 { map, viewProjMx, fromLngLat }

// 之后:
import { useBabylonMap, Coordinates } from 'react-babylon-map/maplibre';
// useBabylonMap 内部使用 useScene() + useEngine()
// 返回 { map, viewProjMx, fromLngLat, engine, scene }
```

### 保持不变的组件

- `Canvas` -- 相同 props（`longitude`, `latitude`, `altitude`, `overlay`, `frameloop`, `id`, `beforeId`）
- `Coordinates` -- 相同 props（`longitude`, `latitude`, `altitude`, `children`）
- `useMap` -- 相同接口

### 变更的组件

- `<Canvas>` 内部子组件使用 react-babylonjs JSX（`<box>`, `<freeCamera>` 等）
- `coordsToVector3` / `vector3ToCoords` -- 函数签名不变，内部实现变更

## 8. 风险评估

| 风险 | 缓解措施 |
|------|----------|
| Babylon Engine 无法正确共享 GL 状态 | Phase 2 优先原型验证；降级为仅 overlay 模式 |
| 相机同步抖动/偏移 | 逐像素对比测试 Three.js 版本输出 |
| react-babylonjs 的 reconciler 与自定义渲染循环冲突 | `engine.stopRenderLoop()` 已被 `RenderOnDemand` 组件验证可行 |
| 矩阵转置错误 | 穷举单元测试，与已知 Three.js 输出对比 |
| 坐标系不匹配 | `scene.useRightHandedSystem = true` + 视觉验证 |
| react-babylonjs 版本升级导致的 break | fork Engine 组件，与上游保持松耦合 |
| Babylon 相机 `attachControl` 冲突 | `onCreated` 中 `cam.inputs.clear()` 禁用输入 |

## 9. react-babylonjs API 速查

### 常用 Hooks

```typescript
import { useBeforeRender, useAfterRender, useScene, useEngine } from 'react-babylonjs';

// 帧回调
useBeforeRender((scene, eventState) => { /* 每帧前执行 */ });
useAfterRender((scene, eventState) => { /* 每帧后执行 */ });

// 获取实例
const scene = useScene();    // => Scene | null
const engine = useEngine();  // => Engine | null
```

### 常用 JSX 组件

```tsx
<Scene onCreated={(scene) => { /* 初始化场景 */ }}>
  <freeCamera name="cam" position={new Vector3(0, 0, -10)}
    onCreated={(cam) => cam.inputs.clear()} />
  <hemisphericLight name="light" direction={new Vector3(0, 1, 0)} />
  <box name="box" size={2} position={new Vector3(0, 0, 0)}>
    <standardMaterial name="mat" diffuseColor={Color3.Red()} />
  </box>
</Scene>
```

### Three.js → react-babylonjs 对应表

| react-three-map (R3F) | react-babylon-map (react-babylonjs) |
|----------------------|-------------------------------------|
| `<Canvas>` | `<MapEngine>` + `<Scene>` |
| `useFrame(cb)` | `useBeforeRender(cb)` |
| `useThree(s => s.camera)` | `useScene()?.activeCamera` |
| `useThree(s => s.gl)` | `useEngine()` |
| `useThree(s => s.scene)` | `useScene()` |
| `createRoot(canvas)` | `<MapEngine externalContext={gl}>` |
| `advance(timestamp)` | `scene.render()` |
| `gl.resetState()` | `engine.resetCustomCache()` |
| `<perspectiveCamera>` | `<freeCamera>` |
| `<mesh>` + `<boxGeometry>` | `<box>` |
| `<meshStandardMaterial>` | `<standardMaterial>` |
| R3F `createPortal` | react-babylonjs `createPortal` |
| `Raycaster` | `scene.pick()` / `onMeshPicked` |

## 10. 测试策略

### 单元测试
- 矩阵转换工具（列主序 ↔ 行主序）
- `coordsToMatrix` 输出与 Three.js 版本对比（转置后应一致）
- `coordsToVector3` / `vector3ToCoords` 往返精度
- 相机同步矩阵分解

### 集成测试
- Canvas-in-layer: 模拟 MapLibre map，验证 Babylon Engine 在共享上下文上创建
- Canvas-overlay: 验证 overlay canvas 定位
- 事件: 指针事件映射到正确的 Babylon pick

### 视觉回归测试
- Three.js 版本与 Babylon.js 版本截图对比
- 不同缩放级别和坐标的相机同步精度

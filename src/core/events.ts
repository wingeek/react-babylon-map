import { Scene } from '@babylonjs/core';

/**
 * Pointer event handler that maps DOM pointer coordinates to Babylon.js scene picking.
 * Used for both canvas-in-layer and canvas-overlay modes.
 */
export interface PointerEventHandler {
  /** Attach pointer listeners to the given DOM element (usually the map canvas parent). */
  connect(target: HTMLElement): void;
  /** Detach listeners. */
  disconnect(): void;
}

/**
 * Create a pointer event handler that bridges map DOM events to Babylon scene picking.
 */
export function createPointerHandler(scene: Scene, canvas: HTMLCanvasElement): PointerEventHandler {
  let target: HTMLElement | null = null;

  const onPointerDown = (evt: PointerEvent) => {
    const pickResult = scene.pick(
      evt.offsetX * (canvas.width / canvas.clientWidth),
      evt.offsetY * (canvas.height / canvas.clientHeight),
    );
    if (pickResult?.hit && pickResult.pickedMesh) {
      const mesh = pickResult.pickedMesh;
      mesh.metadata?.onPointerDown?.(evt, pickResult);
    }
  };

  const onPointerMove = (evt: PointerEvent) => {
    const pickResult = scene.pick(
      evt.offsetX * (canvas.width / canvas.clientWidth),
      evt.offsetY * (canvas.height / canvas.clientHeight),
    );
    if (pickResult?.hit && pickResult.pickedMesh) {
      const mesh = pickResult.pickedMesh;
      mesh.metadata?.onPointerMove?.(evt, pickResult);
    }
  };

  return {
    connect(el: HTMLElement) {
      target = el;
      target.addEventListener('pointerdown', onPointerDown as EventListener);
      target.addEventListener('pointermove', onPointerMove as EventListener);
    },
    disconnect() {
      if (!target) return;
      target.removeEventListener('pointerdown', onPointerDown as EventListener);
      target.removeEventListener('pointermove', onPointerMove as EventListener);
      target = null;
    },
  };
}

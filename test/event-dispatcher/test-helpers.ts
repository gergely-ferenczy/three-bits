import * as THREE from 'three';
import { createCanvas } from '../test-helpers/create-canvas';

export type EventCallLog = { listener: string; target: string; currentTarget: string };

export const canvasWidth = 200;
export const canvasHeight = 100;
export const ratio = canvasWidth / canvasHeight;

export function createTestResources() {
  const canvas = createCanvas(canvasWidth, canvasHeight);

  const camera = new THREE.OrthographicCamera(-ratio, ratio, 1, -1);
  camera.position.set(-5, 0, 0);
  camera.lookAt(0, 0, 0);

  return {
    canvas,
    camera,
  };
}

export function createPointerEvent(
  type: string,
  options?: Partial<PointerEventInit> & { pointerId?: number },
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: canvasWidth / 2,
    clientY: canvasHeight / 2,
    ...options,
  });
}

export function createMouseEvent(type: string, options?: MouseEventInit): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: canvasWidth / 2,
    clientY: canvasHeight / 2,
    ...options,
  });
}

export function createWheelEvent(type: string, options?: WheelEventInit): WheelEvent {
  return new WheelEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: canvasWidth / 2,
    clientY: canvasHeight / 2,
    ...options,
  });
}

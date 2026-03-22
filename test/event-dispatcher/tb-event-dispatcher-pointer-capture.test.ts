import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { TbEventDispatcher } from '../../lib/event-dispatcher/tb-event-dispatcher';
import { createCanvas } from '../test-helpers/create-canvas';

const canvasWidth = 200;
const canvasHeight = 100;
const ratio = canvasWidth / canvasHeight;

let canvas: HTMLCanvasElement;
let camera: THREE.OrthographicCamera;
let eventDispatcher: TbEventDispatcher;

function createPointerEvent(
  type: string,
  options?: Partial<PointerEventInit> & { pointerId?: number },
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    clientX: canvas.clientWidth / 2,
    clientY: canvas.clientHeight / 2,
    ...options,
  });
}

beforeAll(() => {
  canvas = createCanvas(canvasWidth, canvasHeight);

  canvas.setPointerCapture = vi.fn();
  canvas.releasePointerCapture = vi.fn();

  camera = new THREE.OrthographicCamera(-ratio, ratio, 1, -1);
  camera.position.set(-5, 0, 0);
  camera.lookAt(0, 0, 0);
});

beforeEach(() => {
  eventDispatcher = new TbEventDispatcher(canvas, camera);
});

describe('pointer capture functionality', () => {
  test('setPointerCapture captures pointer events to specific object', () => {
    const object1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object1.name = 'Object1';
    object1.position.set(0, 0, 0);

    const object2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object2.name = 'Object2';
    object2.position.set(1, 0, 0);

    const listener1 = vi.fn().mockName('listener1');
    const listener2 = vi.fn().mockName('listener2');

    eventDispatcher.addEventListener(object1, 'pointermove', listener1);
    eventDispatcher.addEventListener(object2, 'pointermove', listener2);

    // Initial pointermove over object1
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).not.toHaveBeenCalled();

    // Capture pointer to object2
    listener1.mockClear();
    listener2.mockClear();
    eventDispatcher.setPointerCapture(object2, 1);

    // Move pointer over object1's position, but it should fire on object2 due to capture
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledOnce();
  });

  test('releasePointerCapture releases captured pointer', () => {
    const object1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object1.name = 'Object1';
    object1.position.set(0, 0, 0);

    const object2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object2.name = 'Object2';
    object2.position.set(1, 0, 0);

    const listener1 = vi.fn().mockName('listener1');
    const listener2 = vi.fn().mockName('listener2');

    eventDispatcher.addEventListener(object1, 'pointermove', listener1);
    eventDispatcher.addEventListener(object2, 'pointermove', listener2);

    // Move over object1
    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Capture to object2
    eventDispatcher.setPointerCapture(object2, 1);
    listener1.mockClear();
    listener2.mockClear();

    // Verify capture is active
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledOnce();

    // Release capture
    eventDispatcher.releasePointerCapture(object2, 1);
    listener1.mockClear();
    listener2.mockClear();

    // After release, events should go to object1 again
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).not.toHaveBeenCalled();
  });

  test('hasPointerCapture correctly reports capture status', () => {
    const object1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object1.name = 'Object1';

    const object2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object2.name = 'Object2';
    object2.position.set(1, 0, 0);

    expect(eventDispatcher.hasPointerCapture(object1, 1)).toBe(false);
    expect(eventDispatcher.hasPointerCapture(object2, 1)).toBe(false);

    eventDispatcher.setPointerCapture(object1, 1);
    expect(eventDispatcher.hasPointerCapture(object1, 1)).toBe(true);
    expect(eventDispatcher.hasPointerCapture(object2, 1)).toBe(false);

    eventDispatcher.releasePointerCapture(object1, 1);
    expect(eventDispatcher.hasPointerCapture(object1, 1)).toBe(false);
    expect(eventDispatcher.hasPointerCapture(object2, 1)).toBe(false);
  });

  test('pointerup automatically releases pointer capture', () => {
    const object1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object1.name = 'Object1';
    object1.position.set(0, 0, 0);

    const object2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object2.name = 'Object2';
    object2.position.set(1, 0, 0);

    const listener1 = vi.fn().mockName('listener1');
    const listener2 = vi.fn().mockName('listener2');

    eventDispatcher.addEventListener(object1, 'pointermove', listener1);
    eventDispatcher.addEventListener(object2, 'pointermove', listener2);
    eventDispatcher.addEventListener(object2, 'pointerup', listener2);

    // Capture pointer to object2
    eventDispatcher.setPointerCapture(object2, 1);

    // Verify capture is active
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    expect(listener2).toHaveBeenCalledOnce();

    // Send pointerup - should release capture automatically
    listener2.mockClear();
    canvas.dispatchEvent(createPointerEvent('pointerup'));
    expect(listener2).toHaveBeenCalledOnce(); // pointerup still goes to captured object

    // After pointerup, capture should be released
    expect(eventDispatcher.hasPointerCapture(object2, 1)).toBe(false);

    // Subsequent pointermove should go to object1
    listener1.mockClear();
    listener2.mockClear();
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).not.toHaveBeenCalled();
  });

  test('pointercancel automatically releases pointer capture', () => {
    const object1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object1.name = 'Object1';
    object1.position.set(0, 0, 0);

    const object2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object2.name = 'Object2';
    object2.position.set(1, 0, 0);

    const listener1 = vi.fn().mockName('listener1');
    const listener2 = vi.fn().mockName('listener2');

    eventDispatcher.addEventListener(object1, 'pointermove', listener1);
    eventDispatcher.addEventListener(object2, 'pointermove', listener2);
    eventDispatcher.addEventListener(object2, 'pointercancel', listener2);

    // Initial pointermove to establish state
    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Capture pointer to object2
    listener1.mockClear();
    listener2.mockClear();
    eventDispatcher.setPointerCapture(object2, 1);
    expect(eventDispatcher.hasPointerCapture(object2, 1)).toBe(true);

    // Send pointercancel - should release capture automatically
    canvas.dispatchEvent(createPointerEvent('pointercancel'));
    expect(listener2).toHaveBeenCalledOnce(); // pointercancel still goes to captured object

    // After pointercancel, capture should be released
    expect(eventDispatcher.hasPointerCapture(object2, 1)).toBe(false);

    // Subsequent pointermove should go to object1
    listener1.mockClear();
    listener2.mockClear();
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).not.toHaveBeenCalled();
  });

  test('multiple pointers can be captured independently', () => {
    const object1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object1.name = 'Object1';
    object1.position.set(0, 0, 0);

    const object2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object2.name = 'Object2';
    object2.position.set(1, 0, 0);

    const listener1 = vi.fn().mockName('listener1');
    const listener2 = vi.fn().mockName('listener2');

    eventDispatcher.addEventListener(object1, 'pointermove', listener1);
    eventDispatcher.addEventListener(object2, 'pointermove', listener2);

    // Capture pointer 1 to object1
    eventDispatcher.setPointerCapture(object1, 1);
    // Capture pointer 2 to object2
    eventDispatcher.setPointerCapture(object2, 2);

    expect(eventDispatcher.hasPointerCapture(object1, 1)).toBe(true);
    expect(eventDispatcher.hasPointerCapture(object2, 2)).toBe(true);
    expect(eventDispatcher.hasPointerCapture(object1, 2)).toBe(false);
    expect(eventDispatcher.hasPointerCapture(object2, 1)).toBe(false);

    // Move pointer 1 - should go to object1
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).not.toHaveBeenCalled();

    // Move pointer 2 - should go to object2
    listener1.mockClear();
    listener2.mockClear();
    canvas.dispatchEvent(createPointerEvent('pointermove', { pointerId: 2 }));
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledOnce();
  });

  test('releasePointerCapture only releases if object owns the capture', () => {
    const object1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object1.name = 'Object1';

    const object2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object2.name = 'Object2';
    object2.position.set(1, 0, 0);

    // Capture pointer to object1
    eventDispatcher.setPointerCapture(object1, 1);
    expect(eventDispatcher.hasPointerCapture(object1, 1)).toBe(true);

    // Try to release from object2 (doesn't own the capture)
    eventDispatcher.releasePointerCapture(object2, 1);

    // Capture should still be on object1
    expect(eventDispatcher.hasPointerCapture(object1, 1)).toBe(true);

    // Release from object1 (owns the capture)
    eventDispatcher.releasePointerCapture(object1, 1);
    expect(eventDispatcher.hasPointerCapture(object1, 1)).toBe(false);
  });

  test('captured pointerdown event fires on capturing object', () => {
    const object1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object1.name = 'Object1';
    object1.position.set(0, 0, 0);

    const object2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object2.name = 'Object2';
    object2.position.set(1, 0, 0);

    const listener1 = vi.fn().mockName('listener1');
    const listener2 = vi.fn().mockName('listener2');

    eventDispatcher.addEventListener(object1, 'pointerdown', listener1);
    eventDispatcher.addEventListener(object2, 'pointerdown', listener2);

    // Capture pointer to object2
    eventDispatcher.setPointerCapture(object2, 1);

    // Send pointerdown at object1's position
    canvas.dispatchEvent(createPointerEvent('pointerdown'));

    // Should fire on object2 due to capture, not object1
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledOnce();
  });
});

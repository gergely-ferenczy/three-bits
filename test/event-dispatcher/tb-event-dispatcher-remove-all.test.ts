import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createMouseEvent, createPointerEvent, createTestResources } from './test-helpers';
import { TbEventDispatcher } from '../../lib';

let canvas: HTMLCanvasElement;
let camera: THREE.OrthographicCamera;
beforeAll(() => {
  const resources = createTestResources();
  canvas = resources.canvas;
  camera = resources.camera;
});

let eventDispatcher: TbEventDispatcher;
beforeEach(() => {
  eventDispatcher = new TbEventDispatcher(canvas, camera);
});

describe('removeAllEventListeners removes all listeners from object', () => {
  test('removes all event types and phases from single object', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    const clickListener = vi.fn().mockName('click-listener');
    const pointerdownListener = vi.fn().mockName('pointerdown-listener');
    const captureListener = vi.fn().mockName('capture-listener');
    const bubbleListener = vi.fn().mockName('bubble-listener');

    eventDispatcher.addEventListener(object, 'click', clickListener);
    eventDispatcher.addEventListener(object, 'pointerdown', pointerdownListener);
    eventDispatcher.addEventListener(object, 'pointermove', captureListener, { capture: true });
    eventDispatcher.addEventListener(object, 'pointermove', bubbleListener, { capture: false });

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before removal - all listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createMouseEvent('click'));
    expect(clickListener).toHaveBeenCalledOnce();
    expect(pointerdownListener).toHaveBeenCalledOnce();
    expect(captureListener).toHaveBeenCalledOnce();
    expect(bubbleListener).toHaveBeenCalledOnce();

    // Remove all listeners
    clickListener.mockClear();
    pointerdownListener.mockClear();
    captureListener.mockClear();
    bubbleListener.mockClear();
    eventDispatcher.removeAllEventListeners(object);

    // After removal - no listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createMouseEvent('click'));
    expect(clickListener).not.toHaveBeenCalled();
    expect(pointerdownListener).not.toHaveBeenCalled();
    expect(captureListener).not.toHaveBeenCalled();
    expect(bubbleListener).not.toHaveBeenCalled();
  });

  test('removes listeners only from specified object', () => {
    const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectA.position.x = 0;

    const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectB.position.x = 1;

    const listenerA = vi.fn().mockName('listener-A');
    const listenerB = vi.fn().mockName('listener-B');

    eventDispatcher.addEventListener(objectA, 'pointerdown', listenerA);
    eventDispatcher.addEventListener(objectB, 'pointerdown', listenerB, { ignoreOcclusion: true });

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before removal - both listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listenerA).toHaveBeenCalledOnce();
    expect(listenerB).toHaveBeenCalledOnce();

    // Remove listeners only from objectA
    listenerA.mockClear();
    listenerB.mockClear();
    eventDispatcher.removeAllEventListeners(objectA);

    // After removal - only listenerB should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalledOnce();
  });

  test('removes listeners from parent without affecting child', () => {
    const parent = new THREE.Group();
    parent.name = 'Parent';

    const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    child.name = 'Child';
    parent.add(child);

    const parentListener = vi.fn().mockName('parent-listener');
    const childListener = vi.fn().mockName('child-listener');

    eventDispatcher.addEventListener(parent, 'pointerdown', parentListener);
    eventDispatcher.addEventListener(child, 'pointerdown', childListener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before removal - both listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(parentListener).toHaveBeenCalledOnce();
    expect(childListener).toHaveBeenCalledOnce();

    // Remove parent listeners
    parentListener.mockClear();
    childListener.mockClear();
    eventDispatcher.removeAllEventListeners(parent);

    // After removal - only child listener should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(parentListener).not.toHaveBeenCalled();
    expect(childListener).toHaveBeenCalledOnce();
  });

  test('works on object with no listeners', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    // Should not throw when removing listeners from object with no listeners
    expect(() => {
      eventDispatcher.removeAllEventListeners(object);
    }).not.toThrow();
  });

  test('can be called multiple times on same object', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const listener = vi.fn().mockName('listener');

    eventDispatcher.addEventListener(object, 'pointerdown', listener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listener).toHaveBeenCalledOnce();

    // Remove once
    listener.mockClear();
    eventDispatcher.removeAllEventListeners(object);

    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listener).not.toHaveBeenCalled();

    // Remove again - should not throw
    expect(() => {
      eventDispatcher.removeAllEventListeners(object);
    }).not.toThrow();
  });
});

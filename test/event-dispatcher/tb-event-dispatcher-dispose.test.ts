import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  createMouseEvent,
  createPointerEvent,
  createTestResources,
  createWheelEvent,
} from './test-helpers';
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

describe('dispose removes DOM event listeners', () => {
  test('prevents further event handling after dispose', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const listener = vi.fn().mockName('listener');

    eventDispatcher.addEventListener(object, 'pointerdown', listener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before dispose - listener should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listener).toHaveBeenCalledOnce();

    // Dispose the event dispatcher
    listener.mockClear();
    eventDispatcher.dispose();

    // After dispose - listener should NOT be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listener).not.toHaveBeenCalled();
  });

  test('disposes all event types', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    const clickListener = vi.fn().mockName('click-listener');
    const dblclickListener = vi.fn().mockName('dblclick-listener');
    const pointerdownListener = vi.fn().mockName('pointerdown-listener');
    const pointerupListener = vi.fn().mockName('pointerup-listener');
    const pointermoveListener = vi.fn().mockName('pointermove-listener');
    const wheelListener = vi.fn().mockName('wheel-listener');

    eventDispatcher.addEventListener(object, 'click', clickListener);
    eventDispatcher.addEventListener(object, 'dblclick', dblclickListener);
    eventDispatcher.addEventListener(object, 'pointerdown', pointerdownListener);
    eventDispatcher.addEventListener(object, 'pointerup', pointerupListener);
    eventDispatcher.addEventListener(object, 'pointermove', pointermoveListener);
    eventDispatcher.addEventListener(object, 'wheel', wheelListener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before dispose - all listeners should work
    canvas.dispatchEvent(createMouseEvent('click'));
    canvas.dispatchEvent(createMouseEvent('dblclick'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createPointerEvent('pointerup'));
    canvas.dispatchEvent(createWheelEvent('wheel'));
    expect(clickListener).toHaveBeenCalledOnce();
    expect(dblclickListener).toHaveBeenCalledOnce();
    expect(pointerdownListener).toHaveBeenCalledOnce();
    expect(pointerupListener).toHaveBeenCalledOnce();
    expect(pointermoveListener).toHaveBeenCalled();
    expect(wheelListener).toHaveBeenCalledOnce();

    // Dispose
    clickListener.mockClear();
    dblclickListener.mockClear();
    pointerdownListener.mockClear();
    pointerupListener.mockClear();
    pointermoveListener.mockClear();
    wheelListener.mockClear();
    eventDispatcher.dispose();

    // After dispose - no listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createMouseEvent('click'));
    canvas.dispatchEvent(createMouseEvent('dblclick'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createPointerEvent('pointerup'));
    canvas.dispatchEvent(createWheelEvent('wheel'));
    expect(clickListener).not.toHaveBeenCalled();
    expect(dblclickListener).not.toHaveBeenCalled();
    expect(pointerdownListener).not.toHaveBeenCalled();
    expect(pointerupListener).not.toHaveBeenCalled();
    expect(pointermoveListener).not.toHaveBeenCalled();
    expect(wheelListener).not.toHaveBeenCalled();
  });

  test('disposes global event listeners', () => {
    const globalListener = vi.fn().mockName('global-listener');

    eventDispatcher.addGlobalEventListener('click', globalListener);

    // Before dispose - global listener should be called
    canvas.dispatchEvent(createMouseEvent('click'));
    expect(globalListener).toHaveBeenCalledOnce();

    // Dispose
    globalListener.mockClear();
    eventDispatcher.dispose();

    // After dispose - global listener should NOT be called
    canvas.dispatchEvent(createMouseEvent('click'));
    expect(globalListener).not.toHaveBeenCalled();
  });

  test('can be called multiple times safely', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const listener = vi.fn().mockName('listener');

    eventDispatcher.addEventListener(object, 'pointerdown', listener);

    // First dispose
    eventDispatcher.dispose();

    // Second dispose - should not throw
    expect(() => {
      eventDispatcher.dispose();
    }).not.toThrow();
  });
});

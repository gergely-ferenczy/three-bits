import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createMouseEvent, createPointerEvent, createTestResources, ratio } from './test-helpers';
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

describe('setCamera updates raycasting camera', () => {
  test('events fire correctly after camera change', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object.position.set(0, 0, 0);

    const listener = vi.fn().mockName('listener');
    eventDispatcher.addEventListener(object, 'click', listener);

    // Change to a new camera looking at the object
    const newCamera = new THREE.OrthographicCamera(-ratio, ratio, 1, -1);
    newCamera.position.set(0, 0, 5);
    newCamera.lookAt(0, 0, 0);

    eventDispatcher.setCamera(newCamera);
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createMouseEvent('click'));

    // Should hit object with new camera
    expect(listener).toHaveBeenCalledOnce();
  });

  test('updates hit detection after camera change', () => {
    // Create object at center
    const centerObject = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    centerObject.name = 'Center';

    // Create object far to the right
    const rightObject = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    rightObject.name = 'Right';
    rightObject.position.set(10, 0, 0);
    rightObject.updateMatrixWorld();

    const centerListener = vi.fn().mockName('center-listener');
    const rightListener = vi.fn().mockName('right-listener');

    eventDispatcher.addEventListener(centerObject, 'click', centerListener);
    eventDispatcher.addEventListener(rightObject, 'click', rightListener);

    // Camera 1: Looking at center from front
    const cameraAtCenter = new THREE.OrthographicCamera(-ratio, ratio, 1, -1);
    cameraAtCenter.position.set(0, 0, 5);
    cameraAtCenter.lookAt(0, 0, 0);

    eventDispatcher.setCamera(cameraAtCenter);
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createMouseEvent('click'));

    // Should hit center object
    expect(centerListener).toHaveBeenCalled();
    expect(rightListener).not.toHaveBeenCalled();

    // Camera 2: Looking at right object from its front
    centerListener.mockClear();
    rightListener.mockClear();

    const cameraAtRight = new THREE.OrthographicCamera(-ratio, ratio, 1, -1);
    cameraAtRight.position.set(10, 0, 5);
    cameraAtRight.lookAt(10, 0, 0);

    eventDispatcher.setCamera(cameraAtRight);
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createMouseEvent('click'));

    // Should hit right object
    expect(rightListener).toHaveBeenCalled();
    expect(centerListener).not.toHaveBeenCalled();
  });
});

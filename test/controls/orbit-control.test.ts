import { PerspectiveCamera, Vector3 } from 'three';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ControllableCamera } from '../../lib/common/controllable-camera';
import { OrbitControl } from '../../lib/controls/orbit-control';
import { createCanvas } from '../test-helpers/create-canvas';

describe('OrbitControl with PerspectiveCamera', () => {
  let camera: ControllableCamera;

  beforeEach(() => {
    camera = new PerspectiveCamera();
  });

  test('getCamera returns with the camera object supplied to contructor', () => {
    const control = new OrbitControl(camera);
    expect(control.getCamera()).toBe(camera);
  });

  test('getDistance returns with the distance between target and camera', () => {
    const control = new OrbitControl(camera);
    camera.position.set(3, 4, 12);
    control.setTarget(new Vector3(-3, -4, -12));
    expect(control.getDistance()).toBe(26);
  });

  test('distance does not change between target and camera when setTarget is called with keepRelativeCameraPos=true', () => {
    const control = new OrbitControl(camera);
    camera.position.set(3, 4, 12);
    control.setTarget(new Vector3(-3, -4, -12), true);
    expect(control.getDistance()).toBe(13);
  });

  test('passes the triggering native event to pointer interaction listeners', () => {
    const canvas = createCanvas();
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    camera.position.set(0, 0, 5);

    const control = new OrbitControl(camera);
    let startEvent: Event | undefined;
    const changeEvents: Array<Event | undefined> = [];
    let endEvent: Event | undefined;
    control.addEventListener('start', (event) => {
      startEvent = event;
    });
    control.addEventListener('change', (event) => {
      changeEvents.push(event);
    });
    control.addEventListener('end', (event) => {
      endEvent = event;
    });
    control.attach(canvas);

    const pointerDown = new PointerEvent('pointerdown', {
      bubbles: true,
      buttons: 1,
      clientX: 100,
      clientY: 50,
    });
    const pointerMove = new PointerEvent('pointermove', {
      bubbles: true,
      buttons: 1,
      clientX: 110,
      clientY: 50,
    });
    const secondPointerMove = new PointerEvent('pointermove', {
      bubbles: true,
      buttons: 1,
      clientX: 110,
      clientY: 60,
    });
    const pointerUp = new PointerEvent('pointerup', {
      bubbles: true,
      buttons: 0,
      clientX: 110,
      clientY: 60,
    });

    canvas.dispatchEvent(pointerDown);
    canvas.dispatchEvent(pointerMove);
    canvas.dispatchEvent(secondPointerMove);
    canvas.dispatchEvent(pointerUp);

    expect(startEvent).toBe(pointerDown);
    expect(changeEvents).toEqual([pointerMove, secondPointerMove]);
    expect(endEvent).toBe(pointerUp);
    control.detach();
  });

  test('passes the triggering wheel event to all wheel lifecycle listeners', () => {
    const canvas = createCanvas();
    camera.position.set(0, 0, 5);

    const control = new OrbitControl(camera);
    const receivedEvents: Array<Event | undefined> = [];
    control.addEventListener('start', (event) => receivedEvents.push(event));
    control.addEventListener('change', (event) => receivedEvents.push(event));
    control.addEventListener('end', (event) => receivedEvents.push(event));
    control.attach(canvas);

    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      deltaY: 10,
      clientX: 100,
      clientY: 50,
    });
    canvas.dispatchEvent(wheelEvent);

    expect(receivedEvents).toEqual([wheelEvent, wheelEvent, wheelEvent]);
    control.detach();
  });

  test('passes undefined to listeners for programmatic changes', () => {
    const control = new OrbitControl(camera);
    const receivedEvents: Array<Event | undefined> = [];
    control.addEventListener('start', (event) => receivedEvents.push(event));
    control.addEventListener('change', (event) => receivedEvents.push(event));
    control.addEventListener('end', (event) => receivedEvents.push(event));

    control.setZoom(2);

    expect(receivedEvents).toEqual([undefined, undefined, undefined]);
  });
});

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

  test('dispatches `start` and `end` events for pointer interactions', () => {
    const canvas = createCanvas();
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    camera.position.set(0, 0, 5);

    const control = new OrbitControl(camera);
    const events: string[] = [];
    control.addEventListener('start', () => events.push('start'));
    control.addEventListener('change', () => events.push('change'));
    control.addEventListener('end', () => events.push('end'));
    control.attach(canvas);

    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        buttons: 1,
        clientX: 100,
        clientY: 50,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        buttons: 1,
        clientX: 110,
        clientY: 50,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        buttons: 1,
        clientX: 110,
        clientY: 60,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        buttons: 0,
        clientX: 110,
        clientY: 60,
      }),
    );

    expect(events).toEqual(['start', 'change', 'change', 'end']);
    control.detach();
  });
});

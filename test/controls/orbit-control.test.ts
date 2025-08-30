import { PerspectiveCamera, Vector3 } from 'three';
import { beforeEach, describe, expect, test } from 'vitest';
import { ControllableCamera } from '../../lib/common/controllable-camera';
import { OrbitControl } from '../../lib/controls/orbit-control';

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
});

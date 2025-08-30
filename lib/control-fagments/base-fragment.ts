import * as THREE from 'three';
import { ControllableCamera } from '../common/controllable-camera';

export abstract class BaseFragment {
  protected active: boolean;

  protected camera: ControllableCamera;

  protected target: THREE.Vector3;

  constructor(camera: ControllableCamera, target: THREE.Vector3) {
    this.active = false;
    this.camera = camera;
    this.target = target;
  }

  isActive() {
    return this.active;
  }

  setActive(active: boolean) {
    this.active = active;
  }

  setTarget(target: THREE.Vector3): void {
    this.target = target;
  }

  setCamera(camera: ControllableCamera): void {
    this.camera = camera;
  }
}

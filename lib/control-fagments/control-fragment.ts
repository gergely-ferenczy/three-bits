import * as THREE from 'three';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';

export interface ControlFragment {
  isActive(): boolean;

  setActive(active: boolean): void;

  setTarget(target: THREE.Vector3): void;

  setCamera(camera: ControllableCamera): void;

  handlePointerInput?(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void;

  handleWheelInput?(
    delta: number,
    activePointer: ActivePointer,
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void;

  updateStartValues(activePointers?: ActivePointer[]): void;
}

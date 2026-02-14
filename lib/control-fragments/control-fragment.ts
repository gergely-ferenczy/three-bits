import * as THREE from 'three';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';

export interface ControlFragment {
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

  updateStartValues(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void;
}

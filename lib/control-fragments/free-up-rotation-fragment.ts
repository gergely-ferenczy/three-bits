import * as THREE from 'three';
import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { findDynamicTarget } from '../common/internal/find-dynamic-target';
import { getDeltaCoordsFromActivePointers } from '../common/internal/get-coords-from-active-pointers';
import { getOption } from '../common/internal/get-option';
import { getCameraAspectRatio } from '../utils/camera-aspect-ratio';

const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _v3c = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();

const DefaultRotationControlOptions: FreeUpRotationFragmentOptions = {
  enabled: true,
  invertHorizontal: false,
  invertVertical: false,
  speed: 1,
};

export interface FreeUpRotationFragmentOptions {
  enabled: boolean;
  speed: number | { pointer: number; touch: number };
  invertHorizontal: boolean | { pointer: boolean; touch: boolean };
  invertVertical: boolean | { pointer: boolean; touch: boolean };
  dynamicOrigin?: {
    source: THREE.Object3D | THREE.Object3D[];
    useInvisible?: boolean;
    defaultToAbsoluteOrigin?: boolean;
  };
}

export interface FreeUpRotationFragmentStartValues {
  camera: ControllableCamera;
  target: THREE.Vector3;
  origin: THREE.Vector3;
  pointerTarget: THREE.Vector3;
}

export class FreeUpRotationFragment implements ControlFragment {
  private options: FreeUpRotationFragmentOptions;
  private origin = new THREE.Vector3();

  constructor(options?: Partial<FreeUpRotationFragmentOptions>) {
    this.options = { ...DefaultRotationControlOptions, ...options };
  }

  updateOptions(options: Partial<FreeUpRotationFragmentOptions>) {
    for (const key in options) {
      const k = key as keyof FreeUpRotationFragmentOptions;
      (this.options[k] as any) = options[k];
    }
  }

  updateStartValues(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ) {
    if (this.options.dynamicOrigin) {
      const source = this.options.dynamicOrigin.source;
      const useInvisible = !!this.options.dynamicOrigin.useInvisible;
      const coords = activePointers[0].coords;
      _raycaster.setFromCamera(coords, camera);
      const dynamicOrigin = findDynamicTarget(_raycaster, source, useInvisible);
      if (dynamicOrigin) {
        this.origin = dynamicOrigin;
      } else if (this.options.dynamicOrigin.defaultToAbsoluteOrigin) {
        this.origin.set(0, 0, 0);
      } else {
        this.origin.copy(target);
      }
    } else {
      this.origin.copy(target);
    }
  }

  handlePointerInput(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    if (!this.options.enabled) return;

    const aspect = getCameraAspectRatio(camera);
    const speed = getOption(this.options.speed, activePointers[0].type);
    const invertHorizontal = getOption(this.options.invertHorizontal, activePointers[0].type);
    const invertVertical = getOption(this.options.invertVertical, activePointers[0].type);
    const deltaCoords = getDeltaCoordsFromActivePointers(activePointers);
    deltaCoords.x *= aspect;
    let horizontalAngleDelta = deltaCoords.x * 2 * speed;
    let verticalAngleDelta = deltaCoords.y * 2 * speed;

    if (invertHorizontal) {
      horizontalAngleDelta *= -1;
    }
    if (!invertVertical) {
      verticalAngleDelta *= -1;
    }

    return this.handleRotationAction(verticalAngleDelta, horizontalAngleDelta, camera, target);
  }

  handleRotationAction(
    verticalAngleDelta: number,
    horizontalAngleDelta: number,
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    const cameraDir = camera.getWorldDirection(_v3a);
    const verticalDir = _v3b.copy(cameraDir).cross(camera.up).normalize();
    const horizontalDir = _v3c.copy(verticalDir).cross(cameraDir).normalize();

    const newCameraPosition = _v3a
      .copy(camera.position)
      .sub(this.origin)
      .applyAxisAngle(verticalDir, -verticalAngleDelta)
      .applyAxisAngle(horizontalDir, -horizontalAngleDelta)
      .add(this.origin);

    camera.up.copy(horizontalDir);
    camera.position.copy(newCameraPosition);

    const newTargetPosition = _v3a
      .copy(target)
      .sub(this.origin)
      .applyAxisAngle(verticalDir, -verticalAngleDelta)
      .applyAxisAngle(horizontalDir, -horizontalAngleDelta)
      .add(this.origin);
    target.copy(newTargetPosition);
  }
}

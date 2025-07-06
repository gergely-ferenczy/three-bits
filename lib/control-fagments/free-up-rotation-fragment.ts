import * as THREE from 'three';

import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { clamp } from '../common/internal/clamp';
import { getDeltaCoordsFromActivePointers } from '../common/internal/get-coords-from-active-pointers';
import { calculateSphericalAngles } from '../utils/calculate-spherical-angles';
import { getCameraAspectRatio } from '../utils/camera-aspect-ratio';

const DefaultRotationControlOptions: FreeUpRotationFragmentOptions = {
  enabled: true,
  invertHorizontal: false,
  invertVertical: false,
  speed: 1,
};

export interface FreeUpRotationFragmentOptions {
  enabled: boolean;
  speed: number;
  invertHorizontal: boolean;
  invertVertical: boolean;
}

export interface FreeUpRotationFragmentStartValues {
  camera: ControllableCamera;
  target: THREE.Vector3;
  pointerTarget: THREE.Vector3;
}

export class FreeUpRotationFragment implements ControlFragment {
  private active: boolean;

  private camera: ControllableCamera;

  private target: THREE.Vector3;

  private options: FreeUpRotationFragmentOptions;

  private horizontalAngle = 0;

  private verticalAngle = 0;

  private start: FreeUpRotationFragmentStartValues = {
    camera: null!,
    target: new THREE.Vector3(),
    pointerTarget: new THREE.Vector3(),
  };

  constructor(
    camera: ControllableCamera,
    target: THREE.Vector3,
    options?: Partial<FreeUpRotationFragmentOptions>,
  ) {
    this.active = false;
    this.camera = camera;
    this.target = target;
    this.options = { ...DefaultRotationControlOptions, ...options };
  }

  updateOptions(options: Partial<FreeUpRotationFragmentOptions>) {
    for (const key in options) {
      // @ts-expect-error ...
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.options[key] = options[key];
    }
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

  updateStartValues(activePointers: ActivePointer[]) {
    this.updateStartValuesInner();
  }

  private updateStartValuesInner() {
    this.start.target.copy(this.target);
    this.start.camera = this.camera.clone();
  }

  handlePointerInput(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    if (!this.options.enabled) return;

    const aspect = getCameraAspectRatio(this.camera);

    const deltaCoords = getDeltaCoordsFromActivePointers(activePointers);
    deltaCoords.x *= aspect;
    let horizontalAngleDelta = deltaCoords.x * 2 * this.options.speed;
    let verticalAngleDelta = deltaCoords.y * 2 * this.options.speed;

    if (this.options.invertHorizontal) {
      horizontalAngleDelta *= -1;
    }
    if (!this.options.invertVertical) {
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
    const cameraDir = camera.getWorldDirection(new THREE.Vector3());
    const horizontalDir = cameraDir.clone().cross(camera.up).normalize();
    const verticalDir = horizontalDir.clone().cross(cameraDir).normalize();

    camera.up = verticalDir;
    camera.position
      .applyAxisAngle(verticalDir, -horizontalAngleDelta)
      .applyAxisAngle(horizontalDir, -verticalAngleDelta);
  }
}

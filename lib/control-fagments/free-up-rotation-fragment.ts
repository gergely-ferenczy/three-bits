import * as THREE from 'three';
import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { getDeltaCoordsFromActivePointers } from '../common/internal/get-coords-from-active-pointers';
import { getInvert } from '../common/internal/getInvert';
import { getSpeed } from '../common/internal/getSpeed';
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
    useInvisible: boolean;
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
    let originSet = false;
    if (this.options.dynamicOrigin) {
      const source = this.options.dynamicOrigin.source;
      const useInvisible = this.options.dynamicOrigin.useInvisible;
      const coords = activePointers[0].coords;
      _raycaster.setFromCamera(coords, camera);
      const intersections = Array.isArray(source)
        ? _raycaster.intersectObjects(source)
        : _raycaster.intersectObject(source);
      for (const i of intersections) {
        if (i.object.visible || useInvisible) {
          this.origin = i.point;
          originSet = true;
          break;
        }
      }
    }
    if (!originSet) {
      this.origin = target;
    }
  }

  handlePointerInput(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    if (!this.options.enabled) return;

    const aspect = getCameraAspectRatio(camera);
    const speed = getSpeed(this.options.speed, activePointers[0].type);
    console.log('speed', speed);
    const invertHorizontal = getInvert(this.options.invertHorizontal, activePointers[0].type);
    const invertVertical = getInvert(this.options.invertVertical, activePointers[0].type);
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

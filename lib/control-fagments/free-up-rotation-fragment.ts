import * as THREE from 'three';
import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { getDeltaCoordsFromActivePointers } from '../common/internal/get-coords-from-active-pointers';
import { getCameraAspectRatio } from '../utils/camera-aspect-ratio';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
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
  pointerTarget: THREE.Vector3;
}

export class FreeUpRotationFragment implements ControlFragment {
  private active: boolean;

  private camera: ControllableCamera;

  private target: THREE.Vector3;

  private origin: THREE.Vector3;

  private options: FreeUpRotationFragmentOptions;

  constructor(
    camera: ControllableCamera,
    target: THREE.Vector3,
    options?: Partial<FreeUpRotationFragmentOptions>,
  ) {
    this.active = false;
    this.camera = camera;
    this.target = target;
    this.origin = target;
    this.options = { ...DefaultRotationControlOptions, ...options };
  }

  updateOptions(options: Partial<FreeUpRotationFragmentOptions>) {
    for (const key in options) {
      const k = key as keyof FreeUpRotationFragmentOptions;
      (this.options[k] as any) = options[k];
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
    let originSet = false;
    if (this.options.dynamicOrigin) {
      const source = this.options.dynamicOrigin.source;
      const useInvisible = this.options.dynamicOrigin.useInvisible;
      const coords = activePointers[0].coords;
      _raycaster.setFromCamera(coords, this.camera);
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
      this.origin = this.target;
    }
  }

  handlePointerInput(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    if (!this.options.enabled) return;

    const aspect = getCameraAspectRatio(this.camera);
    const speed = getSpeed(this.options.speed, activePointers[0].type);
    const deltaCoords = getDeltaCoordsFromActivePointers(activePointers);
    deltaCoords.x *= aspect;
    let horizontalAngleDelta = deltaCoords.x * 2 * speed;
    let verticalAngleDelta = deltaCoords.y * 2 * speed;

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
    const cameraDir = camera.getWorldDirection(_v1);
    const verticalDir = _v2.copy(cameraDir).cross(camera.up).normalize();
    const horizontalDir = _v3.copy(verticalDir).cross(cameraDir).normalize();

    const newCameraPosition = _v1
      .copy(camera.position)
      .sub(this.origin)
      .applyAxisAngle(verticalDir, -verticalAngleDelta)
      .applyAxisAngle(horizontalDir, -horizontalAngleDelta)
      .add(this.origin);

    camera.up.copy(horizontalDir);
    camera.position.copy(newCameraPosition);

    const newTargetPosition = _v1
      .copy(target)
      .sub(this.origin)
      .applyAxisAngle(verticalDir, -verticalAngleDelta)
      .applyAxisAngle(horizontalDir, -horizontalAngleDelta)
      .add(this.origin);
    target.copy(newTargetPosition);
  }
}

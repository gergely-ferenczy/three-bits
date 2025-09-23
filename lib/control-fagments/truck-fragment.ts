import * as THREE from 'three';
import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import {
  getCoordsFromActivePointers,
  getDeltaCoordsFromActivePointers,
} from '../common/internal/get-coords-from-active-pointers';
import { getSpeed } from '../common/internal/getSpeed';
import { calculatePointerTarget } from '../utils/calculate-pointer-target';
import { getCameraAspectRatio } from '../utils/camera-aspect-ratio';

const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();

const DefaultTruckControlOptions: TruckFragmentOptions = {
  enabled: true,
  speed: 1,
  lock: null,
  mode: 'exact',
  maxDistance: Infinity,
};

export interface TruckFragmentOptions {
  enabled: boolean;
  speed: number | { pointer: number; touch: number };
  lock: THREE.Plane | THREE.Vector3 | null;
  mode: 'exact' | 'approximate';
  maxDistance: number;
}

export interface TruckFragmentStartValues {
  plane: THREE.Plane;
  camera: ControllableCamera;
  exact: {
    pointerTarget: THREE.Vector3;
  };
  approximate: {
    xAxis: THREE.Vector3;
    yAxis: THREE.Vector3;
    distance: number;
  };
}

export class TruckFragment implements ControlFragment {
  private options: TruckFragmentOptions;

  private start: TruckFragmentStartValues = {
    plane: new THREE.Plane(),
    camera: null!,
    exact: {
      pointerTarget: new THREE.Vector3(),
    },
    approximate: {
      xAxis: new THREE.Vector3(),
      yAxis: new THREE.Vector3(),
      distance: 0,
    },
  };

  private raycaster: THREE.Raycaster;

  constructor(options?: Partial<TruckFragmentOptions>) {
    this.options = { ...DefaultTruckControlOptions, ...options };
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.options.maxDistance;
  }

  updateOptions(options: Partial<TruckFragmentOptions>) {
    for (const key in options) {
      // @ts-expect-error ...
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.options[key] = options[key];
    }
    this.raycaster.far = this.options.maxDistance;
  }

  updateStartValues(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ) {
    this.start.camera = camera.clone();

    if (this.options.mode == 'approximate') {
      this.updateStartValuesApproximate(camera, target);
    } else {
      this.updateStartValuesExact(activePointers, camera, target);
    }
  }

  getTruckPlane() {
    return this.start.plane;
  }

  getOptions() {
    return this.options;
  }

  private updateStartValuesExact(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ) {
    if (this.options.lock instanceof THREE.Plane) {
      this.start.plane = this.options.lock;
    } else {
      let panNormal;
      if (this.options.lock instanceof THREE.Vector3) {
        const lockVector = _v3a.copy(this.options.lock);
        panNormal = _v3a
          .copy(this.options.lock)
          .clone()
          .cross(camera.position.clone().sub(target))
          .cross(lockVector)
          .normalize();
      } else {
        panNormal = camera.getWorldDirection(_v3a);
      }
      this.start.plane.setFromNormalAndCoplanarPoint(panNormal, target);
    }

    const coords = getCoordsFromActivePointers(activePointers);
    this.raycaster.setFromCamera(coords, this.start.camera);
    const pointerTarget = calculatePointerTarget(
      this.start.camera,
      this.start.plane,
      this.raycaster.ray,
      this.raycaster.far,
    );
    if (pointerTarget) {
      this.start.exact.pointerTarget = pointerTarget;
    }
  }

  private updateStartValuesApproximate(camera: ControllableCamera, target: THREE.Vector3) {
    const relativeTargetPos = _v3a.copy(target).sub(camera.position);

    if (this.options.lock instanceof THREE.Plane) {
      this.start.approximate.xAxis
        .copy(this.options.lock.normal)
        .cross(relativeTargetPos)
        .normalize();
      this.start.approximate.yAxis
        .copy(this.options.lock.normal)
        .cross(this.start.approximate.xAxis)
        .normalize();
      this.start.plane.copy(this.options.lock);
    } else if (this.options.lock instanceof THREE.Vector3) {
      const normal = _v3b.copy(this.options.lock).cross(relativeTargetPos).cross(this.options.lock);
      this.start.approximate.xAxis.copy(camera.up).cross(relativeTargetPos).normalize();
      this.start.approximate.yAxis.copy(this.start.approximate.xAxis).cross(normal).normalize();
      this.start.plane.setFromNormalAndCoplanarPoint(normal, target);
    } else {
      this.start.approximate.xAxis.copy(camera.up).cross(relativeTargetPos).normalize();
      this.start.approximate.yAxis
        .copy(this.start.approximate.xAxis)
        .cross(relativeTargetPos)
        .normalize();
      this.start.plane.setFromNormalAndCoplanarPoint(relativeTargetPos, target);
    }
    this.start.approximate.distance = relativeTargetPos.length();
  }

  handlePointerInput(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    if (!this.options.enabled) return;

    if (this.options.mode == 'approximate') {
      this.handlePointerInputApproximate(activePointers, camera, target);
    } /* if (this.options.mode == 'exact') */ else {
      this.handlePointerInputExact(activePointers, camera, target);
    }
  }

  private handlePointerInputExact(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    const coords = getCoordsFromActivePointers(activePointers);
    this.raycaster.setFromCamera(coords, this.start.camera);
    const intersection = calculatePointerTarget(
      this.start.camera,
      this.start.plane,
      this.raycaster.ray,
      this.raycaster.far,
    );

    if (!intersection) return;

    const speed = getSpeed(this.options.speed, activePointers[0].type);
    const positionDelta = _v3a
      .copy(intersection)
      .sub(this.start.exact.pointerTarget)
      .multiplyScalar(-speed);
    this.start.exact.pointerTarget.copy(intersection);

    camera.position.add(positionDelta);
    target.add(positionDelta);
  }

  private handlePointerInputApproximate(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    const aspect = getCameraAspectRatio(camera);
    const deltaCoords = getDeltaCoordsFromActivePointers(activePointers);
    deltaCoords.x *= aspect;

    const speed = getSpeed(this.options.speed, activePointers[0].type);
    let scale = speed / camera.zoom;
    if (camera instanceof THREE.PerspectiveCamera) {
      scale *= this.start.approximate.distance / 2;
    }
    const xDeltaLength = deltaCoords.x * scale;
    const yDeltaLength = deltaCoords.y * scale;
    const positionDelta = _v3a
      .copy(this.start.approximate.xAxis)
      .multiplyScalar(xDeltaLength)
      .addScaledVector(this.start.approximate.yAxis, yDeltaLength);

    camera.position.add(positionDelta);
    target.add(positionDelta);
  }
}

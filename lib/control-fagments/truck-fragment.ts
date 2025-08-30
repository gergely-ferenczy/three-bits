import * as THREE from 'three';

import { BaseFragment } from './base-fragment';
import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import {
  getCoordsFromActivePointers,
  getDeltaCoordsFromActivePointers,
} from '../common/internal/get-coords-from-active-pointers';
import { calculatePointerTarget } from '../utils/calculate-pointer-target';
import { getCameraAspectRatio } from '../utils/camera-aspect-ratio';

const _v1 = new THREE.Vector3();

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

export class TruckFragment extends BaseFragment implements ControlFragment {
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

  constructor(
    camera: ControllableCamera,
    target: THREE.Vector3,
    options?: Partial<TruckFragmentOptions>,
  ) {
    super(camera, target);
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

  updateStartValues(activePointers: ActivePointer[]) {
    this.start.camera = this.camera.clone();

    if (this.options.mode == 'approximate') {
      this.updateStartValuesApproximate();
    } /* if (this.options.mode == 'exact') */ else {
      this.updateStartValuesExact(activePointers);
    }
  }

  getTruckPlane() {
    return this.start.plane;
  }

  getOptions() {
    return this.options;
  }

  private updateStartValuesExact(activePointers: ActivePointer[]) {
    if (this.options.lock instanceof THREE.Plane) {
      this.start.plane = this.options.lock;
    } else {
      let panNormal;
      if (this.options.lock instanceof THREE.Vector3) {
        panNormal = this.calculatePanLockNormal(this.options.lock);
      } else {
        panNormal = this.camera.getWorldDirection(_v1);
      }
      this.start.plane.setFromNormalAndCoplanarPoint(panNormal, this.target.clone());
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

  private updateStartValuesApproximate() {
    const relativeTargetPos = this.target.clone().sub(this.camera.position);

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
      const normal = this.options.lock.clone().cross(relativeTargetPos).cross(this.options.lock);
      this.start.approximate.xAxis.copy(this.camera.up).cross(relativeTargetPos).normalize();
      this.start.approximate.yAxis.copy(this.start.approximate.xAxis).cross(normal).normalize();
      this.start.plane.setFromNormalAndCoplanarPoint(normal, this.target.clone());
    } else {
      this.start.approximate.xAxis.copy(this.camera.up).cross(relativeTargetPos).normalize();
      this.start.approximate.yAxis
        .copy(this.start.approximate.xAxis)
        .cross(relativeTargetPos)
        .normalize();
      this.start.plane.setFromNormalAndCoplanarPoint(
        relativeTargetPos.clone(),
        this.target.clone(),
      );
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
    const positionDelta = intersection
      .clone()
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
    const aspect = getCameraAspectRatio(this.camera);
    const deltaCoords = getDeltaCoordsFromActivePointers(activePointers);
    deltaCoords.x *= aspect;

    const speed = getSpeed(this.options.speed, activePointers[0].type);
    let scale = speed / camera.zoom;
    if (this.camera instanceof THREE.PerspectiveCamera) {
      scale *= this.start.approximate.distance / 2;
    }
    const xDeltaLength = deltaCoords.x * scale;
    const yDeltaLength = deltaCoords.y * scale;
    const positionDelta = _v1
      .copy(this.start.approximate.xAxis)
      .multiplyScalar(xDeltaLength)
      .addScaledVector(this.start.approximate.yAxis, yDeltaLength);

    camera.position.add(positionDelta);
    target.add(positionDelta);
  }

  private calculatePanLockNormal(lockVector: THREE.Vector3) {
    return lockVector
      .clone()
      .cross(this.camera.position.clone().sub(this.target))
      .cross(lockVector)
      .normalize();
  }
}

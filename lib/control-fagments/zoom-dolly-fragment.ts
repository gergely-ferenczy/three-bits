import * as THREE from 'three';
import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { clamp } from '../common/internal/clamp';
import { clampLength } from '../common/internal/clamp-length';
import { getStartCoordsFromActivePointers } from '../common/internal/get-coords-from-active-pointers';
import { getInvert } from '../common/internal/getInvert';
import { getSpeed } from '../common/internal/getSpeed';
import { calculatePointerTarget } from '../utils/calculate-pointer-target';

const _v2a = new THREE.Vector2();
const _v2b = new THREE.Vector2();
const _v3b = new THREE.Vector3();
const _v3a = new THREE.Vector3();
const _v3c = new THREE.Vector3();
const _v3d = new THREE.Vector3();
const _q1 = new THREE.Quaternion();

const DefaultZoomDollyControlOptions: ZoomDollyFragmentOptions = {
  enabled: true,
  type: 'zoom',
  secondaryMotion: 'truck',
  speed: 1,
  invert: false,
  minDistance: 0,
  maxDistance: Infinity,
  minZoom: -Infinity,
  maxZoom: Infinity,
};

export interface ZoomDollyFragmentOptions {
  enabled: boolean;
  type: 'zoom' | 'dolly' | 'zoomAndDolly';
  secondaryMotion: 'none' | 'truck' | 'orbit' | 'rotate';
  speed: number | { pointer: number; touch: number; scroll: number };
  invert: boolean | { pointer: boolean; touch: boolean; scroll: number };
  minDistance: number;
  maxDistance: number;
  minZoom: number;
  maxZoom: number;
}

export interface ZoomDollyFragmentState {
  zoom: number;
  relativeTarget: THREE.Vector3;
  plane: THREE.Plane;
  sphere: THREE.Sphere;
}

export class ZoomDollyFragment implements ControlFragment {
  private options: ZoomDollyFragmentOptions;

  private raycaster: THREE.Raycaster;

  private state: ZoomDollyFragmentState = {
    zoom: 1,
    relativeTarget: new THREE.Vector3(),
    plane: new THREE.Plane(),
    sphere: new THREE.Sphere(),
  };

  constructor(options?: Partial<ZoomDollyFragmentOptions>) {
    this.options = { ...DefaultZoomDollyControlOptions, ...options };
    this.raycaster = new THREE.Raycaster();
  }

  updateOptions(options: Partial<ZoomDollyFragmentOptions>) {
    for (const key in options) {
      // @ts-expect-error ...
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.options[key] = options[key];
    }
  }

  handlePointerInput(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    if (!this.options.enabled) return;

    this.updateStartValues(activePointers, camera, target);

    const speed = getSpeed(this.options.speed, activePointers[0].type);
    let delta;
    if (activePointers.length == 2) {
      const prevLength = _v2a.copy(activePointers[0].coords).sub(activePointers[1].coords).length();
      const length = _v2a
        .copy(activePointers[0].coords)
        .add(activePointers[0].delta)
        .sub(_v2b.copy(activePointers[1].coords).add(activePointers[1].delta))
        .length();

      delta = prevLength - length;
    } else {
      delta = activePointers[0].delta.y;
    }

    if (delta === 0.0) return;

    delta *= speed;

    const invert = getInvert(this.options.invert, activePointers[0].type);
    if (invert) {
      delta *= -1;
    }

    if (this.options.secondaryMotion == 'truck') {
      const coords = getStartCoordsFromActivePointers(activePointers);
      this.zoomOrDollyAndTruck(coords, delta, camera, target);
    } else if (
      this.options.secondaryMotion == 'orbit' ||
      this.options.secondaryMotion == 'rotate'
    ) {
      const coords = getStartCoordsFromActivePointers(activePointers);
      this.zoomOrDollyAndRotate(coords, delta, camera, target);
    } else {
      this.zoomOrDolly(delta, camera, target);
    }
  }

  handleWheelInput(
    delta: number,
    activePointer: ActivePointer,
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    if (!this.options.enabled) return;

    this.updateStartValues([activePointer], camera, target);

    const speed =
      typeof this.options.speed === 'number' ? this.options.speed : this.options.speed.scroll;
    const invert =
      typeof this.options.invert === 'boolean' ? this.options.invert : this.options.invert.scroll;
    delta *= speed;
    if (invert) {
      delta *= -1;
    }

    if (this.options.secondaryMotion == 'truck') {
      this.zoomOrDollyAndTruck(activePointer.coords, delta, camera, target);
    } else if (
      this.options.secondaryMotion == 'orbit' ||
      this.options.secondaryMotion == 'rotate'
    ) {
      this.zoomOrDollyAndRotate(activePointer.coords, delta, camera, target);
    } else {
      this.zoomOrDolly(delta, camera, target);
    }
  }

  updateStartValues(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    this.raycaster.far = 1000 / camera.zoom; // TODO: check if necessary

    if (this.options.secondaryMotion == 'truck') {
      const panNormal = camera.getWorldDirection(_v3a);
      this.state.plane.setFromNormalAndCoplanarPoint(panNormal, target);
    } else if (
      this.options.secondaryMotion == 'orbit' ||
      this.options.secondaryMotion == 'rotate'
    ) {
      this.state.sphere.center.copy(camera.position);
      if (camera instanceof THREE.OrthographicCamera) {
        const a = (camera.top - camera.bottom) / 2 / camera.zoom;
        const b = (camera.right - camera.left) / 2 / camera.zoom;
        this.state.sphere.radius = Math.sqrt(a ** 2 + b ** 2);
      }
    }
    if (this.options.type == 'zoomAndDolly' || this.options.type == 'zoom') {
      this.state.zoom = camera.zoom;
    }
    if (this.options.type == 'zoomAndDolly' || this.options.type == 'dolly') {
      this.state.relativeTarget.copy(target).sub(camera.position);
    }
  }

  public zoomOrDolly(delta: number, camera: ControllableCamera, target: THREE.Vector3): void {
    if (this.options.type == 'zoomAndDolly') {
      const { zoomDelta, dollyDelta } = this.zoomAndDolly(delta);
      camera.zoom *= zoomDelta;
      camera.updateProjectionMatrix();
      camera.position.add(dollyDelta);
      camera.updateMatrixWorld();
    } else if (this.options.type == 'zoom') {
      const zoomDelta = this.zoom(delta);
      camera.zoom *= zoomDelta;
      camera.updateProjectionMatrix();
    } else if (this.options.type == 'dolly') {
      const dollyDelta = this.dolly(delta);
      camera.position.add(dollyDelta);
      camera.updateMatrixWorld();
    }
  }

  private zoomOrDollyAndTruck(
    startCoords: THREE.Vector2,
    delta: number,
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    this.raycaster.setFromCamera(startCoords, camera);
    const intersectionA = calculatePointerTarget(
      camera,
      this.state.plane,
      this.raycaster.ray,
      this.raycaster.far,
    );

    this.zoomOrDolly(delta, camera, target);

    if (!intersectionA) return;

    this.raycaster.setFromCamera(startCoords, camera);
    const intersectionB = calculatePointerTarget(
      camera,
      this.state.plane,
      this.raycaster.ray,
      this.raycaster.far,
    );

    if (!intersectionB) return;

    const truckDelta = intersectionA.sub(intersectionB);
    camera.position.add(truckDelta);
    target.add(truckDelta);
  }

  private zoomOrDollyAndRotate(
    startCoords: THREE.Vector2,
    delta: number,
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    if (camera instanceof THREE.PerspectiveCamera) {
      this.state.sphere.radius = camera.position.distanceTo(target);
    }

    this.raycaster.setFromCamera(startCoords, camera);
    const intersectionA = this.raycaster.ray.intersectSphere(this.state.sphere, _v3a);
    this.zoomOrDolly(delta, camera, target);

    if (!intersectionA) return;

    this.raycaster.setFromCamera(startCoords, camera);
    const intersectionB = this.raycaster.ray.intersectSphere(this.state.sphere, _v3b);
    if (!intersectionB) return;

    const relativePosA = intersectionA.sub(camera.position).normalize();
    const relativePosB = intersectionB.sub(camera.position).normalize();

    const quaternion = _q1.setFromUnitVectors(relativePosB, relativePosA);

    if (this.options.secondaryMotion === 'orbit') {
      const relativePosition = _v3a.copy(camera.position).sub(target);
      camera.position.copy(target).add(relativePosition.applyQuaternion(quaternion));
    } else {
      const relativePosition = _v3a.copy(target).sub(camera.position);
      target.copy(camera.position).add(relativePosition.applyQuaternion(quaternion));
    }
  }

  private zoom(delta: number): number {
    const deltaMultiplier = delta > 0 ? 1 / (1 + delta) : 1 - delta;
    const newZoom = this.state.zoom * deltaMultiplier;
    const clampedZoom = THREE.MathUtils.clamp(newZoom, this.options.minZoom, this.options.maxZoom);
    const zoomDelta = clampedZoom / this.state.zoom;
    this.state.zoom = clampedZoom;

    return zoomDelta;
  }

  private dolly(delta: number): THREE.Vector3 {
    const deltaMultiplier = delta > 0 ? 1 + delta : 1 / (1 - delta);
    const newRelativeTarget = _v3c
      .copy(this.state.relativeTarget)
      .multiplyScalar(deltaMultiplier)
      .clampLength(this.options.minDistance, this.options.maxDistance);
    const dollyDelta = _v3d.copy(this.state.relativeTarget).sub(newRelativeTarget);
    this.state.relativeTarget.copy(newRelativeTarget);

    return dollyDelta;
  }

  private zoomAndDolly(delta: number) {
    const zoomDeltaMultiplier = delta > 0 ? 1 / (1 + delta) : 1 - delta;
    const dollyDeltaMultiplier = delta > 0 ? 1 + delta : 1 / (1 - delta);

    let zoomClampRatio = 1;
    const newZoom = this.state.zoom * zoomDeltaMultiplier;
    clamp(newZoom, this.options.minZoom, this.options.maxZoom, (value) => {
      zoomClampRatio = newZoom / value;
    });

    let dollyClampRatio = 1;
    const newRelativeTarget = _v3c
      .copy(this.state.relativeTarget)
      .multiplyScalar(dollyDeltaMultiplier);
    clampLength(newRelativeTarget, this.options.minDistance, this.options.maxDistance, (value) => {
      dollyClampRatio = value.length() / newRelativeTarget.length();
    });

    let clampedZoom;
    let clampedRelativeTarget;

    if (Math.abs(1 - zoomClampRatio) > Math.abs(1 - dollyClampRatio)) {
      clampedZoom = newZoom / zoomClampRatio;
      clampedRelativeTarget = newRelativeTarget.multiplyScalar(zoomClampRatio);
    } else {
      clampedZoom = newZoom / dollyClampRatio;
      clampedRelativeTarget = newRelativeTarget.multiplyScalar(dollyClampRatio);
    }

    const zoomDelta = clampedZoom / this.state.zoom;
    this.state.zoom = clampedZoom;

    const dollyDelta = _v3c.copy(this.state.relativeTarget).sub(clampedRelativeTarget);
    this.state.relativeTarget.copy(clampedRelativeTarget);

    return { dollyDelta, zoomDelta };
  }
}

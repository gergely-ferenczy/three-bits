import * as THREE from 'three';

import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { clamp } from '../common/internal/clamp';
import { clampLength } from '../common/internal/clamp-length';
import { getStartCoordsFromActivePointers } from '../common/internal/get-coords-from-active-pointers';
import { calculatePointerTarget } from '../utils/calculate-pointer-target';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();

const DefaultZoomDollyControlOptions: ZoomDollyFragmentOptions = {
  enabled: true,
  type: 'zoom',
  secondaryMotion: 'truck',
  scrollSpeed: 1,
  pointerSpeed: 1,
  invertScroll: false,
  invertPointer: false,
  minDistance: 0,
  maxDistance: Infinity,
  minZoom: -Infinity,
  maxZoom: Infinity,
};

export interface ZoomDollyFragmentOptions {
  enabled: boolean;
  type: 'zoom' | 'dolly' | 'zoomAndDolly';
  secondaryMotion: 'none' | 'truck' | 'orbit' | 'rotate';
  scrollSpeed: number;
  pointerSpeed: number;
  invertScroll: boolean;
  invertPointer: boolean;
  minDistance: number;
  maxDistance: number;
  minZoom: number;
  maxZoom: number;
}

export interface ZoomDollyFragmentStartValues {
  zoom: number;
  relativeTarget: THREE.Vector3;
  plane: THREE.Plane;
  sphere: THREE.Sphere;
}

export class ZoomDollyFragment implements ControlFragment {
  private active: boolean;

  private camera: ControllableCamera;

  private target: THREE.Vector3;

  private options: ZoomDollyFragmentOptions;

  private raycaster: THREE.Raycaster;

  private start: ZoomDollyFragmentStartValues = {
    zoom: 1,
    relativeTarget: new THREE.Vector3(),
    plane: new THREE.Plane(),
    sphere: new THREE.Sphere(),
  };

  constructor(
    camera: ControllableCamera,
    target: THREE.Vector3,
    options?: Partial<ZoomDollyFragmentOptions>,
  ) {
    this.active = false;
    this.camera = camera;
    this.target = target;
    this.options = { ...DefaultZoomDollyControlOptions, ...options };
    this.raycaster = new THREE.Raycaster();
  }

  updateOptions(options: Partial<ZoomDollyFragmentOptions>) {
    for (const key in options) {
      // @ts-expect-error ...
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.options[key] = options[key];
    }
    this.raycaster.far = 1000 / this.camera.zoom;
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

  handlePointerInput(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    if (!this.options.enabled) return;

    let delta;
    if (activePointers.length == 2) {
      delta = activePointers[0].delta.clone().sub(activePointers[1].delta).length();
    } else {
      delta = activePointers[0].delta.y;
    }
    delta *= this.options.pointerSpeed;

    if (this.options.invertPointer) {
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

    this.updateStartValues([activePointer]);

    delta *= this.options.scrollSpeed;
    if (this.options.invertScroll) {
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

  updateStartValues(activePointers: ActivePointer[]) {
    if (this.options.secondaryMotion == 'truck') {
      const panNormal = this.camera.getWorldDirection(_v1);
      this.start.plane.setFromNormalAndCoplanarPoint(panNormal, this.target.clone());
    } else if (
      this.options.secondaryMotion == 'orbit' ||
      this.options.secondaryMotion == 'rotate'
    ) {
      this.start.sphere.center.copy(this.camera.position);
      if (this.camera instanceof THREE.OrthographicCamera) {
        const a = (this.camera.top - this.camera.bottom) / 2 / this.camera.zoom;
        const b = (this.camera.right - this.camera.left) / 2 / this.camera.zoom;
        this.start.sphere.radius = Math.sqrt(a ** 2 + b ** 2);
      } else {
        this.start.sphere.radius = 1;
      }
    }
    if (this.options.type == 'zoomAndDolly' || this.options.type == 'zoom') {
      this.start.zoom = this.camera.zoom;
    }
    if (this.options.type == 'zoomAndDolly' || this.options.type == 'dolly') {
      this.start.relativeTarget.copy(this.target).sub(this.camera.position);
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
      this.start.plane,
      this.raycaster.ray,
      this.raycaster.far,
    );

    this.zoomOrDolly(delta, camera, target);

    if (!intersectionA) return;

    this.raycaster.setFromCamera(startCoords, camera);
    const intersectionB = calculatePointerTarget(
      camera,
      this.start.plane,
      this.raycaster.ray,
      this.raycaster.far,
    );

    if (!intersectionB) return;

    const truckDelta = intersectionA.clone().sub(intersectionB);
    camera.position.add(truckDelta);
    target.add(truckDelta);
  }

  private zoomOrDollyAndRotate(
    startCoords: THREE.Vector2,
    delta: number,
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    this.raycaster.setFromCamera(startCoords, camera);
    const intersectionA = this.raycaster.ray.intersectSphere(this.start.sphere, _v1);
    this.zoomOrDolly(delta, camera, target);

    if (!intersectionA) return;

    this.raycaster.setFromCamera(startCoords, camera);
    const intersectionB = this.raycaster.ray.intersectSphere(this.start.sphere, _v2);
    if (!intersectionB) return;

    const relativePosA = intersectionA.clone().sub(camera.position).normalize();
    const relativePosB = intersectionB.clone().sub(camera.position).normalize();

    const quaternion = _q1.setFromUnitVectors(relativePosB, relativePosA);

    if (this.options.secondaryMotion == 'orbit') {
      const relativePosition = camera.position.clone().sub(target);
      camera.position.copy(target).add(relativePosition.applyQuaternion(quaternion));
    } else {
      const relativePosition = target.clone().sub(camera.position);
      target.copy(camera.position).add(relativePosition.applyQuaternion(quaternion));
    }
  }

  private zoom(delta: number) {
    const deltaMultiplier = delta > 0 ? 1 / (1 + delta) : 1 - delta;
    const newZoom = this.start.zoom * deltaMultiplier;
    const clampedZoom = THREE.MathUtils.clamp(newZoom, this.options.minZoom, this.options.maxZoom);
    const zoomDelta = clampedZoom / this.start.zoom;
    this.start.zoom = clampedZoom;

    return zoomDelta;
  }

  private dolly(delta: number) {
    const deltaMultiplier = delta > 0 ? 1 + delta : 1 / (1 - delta);
    const newRelativeTarget = this.start.relativeTarget
      .clone()
      .multiplyScalar(deltaMultiplier)
      .clampLength(this.options.minDistance, this.options.maxDistance);
    const dollyDelta = this.start.relativeTarget.clone().sub(newRelativeTarget);
    this.start.relativeTarget.copy(newRelativeTarget);

    return dollyDelta;
  }

  private zoomAndDolly(delta: number) {
    const zoomDeltaMultiplier = delta > 0 ? 1 / (1 + delta) : 1 - delta;
    const dollyDeltaMultiplier = delta > 0 ? 1 + delta : 1 / (1 - delta);

    let zoomClampRatio = 1;
    const newZoom = this.start.zoom * zoomDeltaMultiplier;
    clamp(newZoom, this.options.minZoom, this.options.maxZoom, (value) => {
      zoomClampRatio = newZoom / value;
    });

    let dollyClampRatio = 1;
    const newRelativeTarget = this.start.relativeTarget
      .clone()
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

    const zoomDelta = clampedZoom / this.start.zoom;
    this.start.zoom = clampedZoom;

    const dollyDelta = this.start.relativeTarget.clone().sub(clampedRelativeTarget);
    this.start.relativeTarget.copy(clampedRelativeTarget);

    return { dollyDelta, zoomDelta };
  }
}

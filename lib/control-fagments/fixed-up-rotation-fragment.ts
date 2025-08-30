import * as THREE from 'three';

import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { calculateSphericalAngles } from '../utils/calculate-spherical-angles';
import { getCameraAspectRatio } from '../utils/camera-aspect-ratio';

const _v3 = new THREE.Vector3();
const _v2 = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

const DefaultHorizontalAxis = new THREE.Vector3(0, 1, 0);
const AbsoluteMaxVerticalAngle = Math.PI / 2 - 1e-8;

const DefaultRotationControlOptions: FixedUpRotationFragmentOptions = {
  enabled: true,
  speed: 1,
  maxHorizontalAngle: Infinity,
  minHorizontalAngle: -Infinity,
  maxVerticalAngle: Math.PI,
  minVerticalAngle: -Math.PI,
  invertHorizontal: false,
  invertVertical: false,
};

export interface FixedUpRotationFragmentOptions {
  enabled: boolean;
  speed: number | { pointer: number; touch: number };
  minHorizontalAngle: number;
  maxHorizontalAngle: number;
  minVerticalAngle: number;
  maxVerticalAngle: number;
  invertHorizontal: boolean | { pointer: boolean; touch: boolean };
  invertVertical: boolean | { pointer: boolean; touch: boolean };
  dynamicOrigin?: {
    source: THREE.Object3D | THREE.Object3D[];
    useInvisible: boolean;
  };
}

export class FixedUpRotationFragment implements ControlFragment {
  private active: boolean;

  private camera: ControllableCamera;

  private target: THREE.Vector3;

  private origin: THREE.Vector3;

  private orbit: boolean;

  private options: FixedUpRotationFragmentOptions;

  private rotationBasis: THREE.Matrix4;

  private horizontalAngle = 0;

  private verticalAngle = 0;

  constructor(
    camera: ControllableCamera,
    target: THREE.Vector3,
    orbit: boolean,
    options?: Partial<FixedUpRotationFragmentOptions>,
  ) {
    this.active = false;
    this.camera = camera;
    this.target = target;
    this.origin = target;
    this.orbit = orbit;
    const normal = DefaultHorizontalAxis.clone().cross(camera.up).normalize();
    const angle = -camera.up.angleTo(DefaultHorizontalAxis);
    this.rotationBasis = new THREE.Matrix4().makeRotationAxis(normal, angle);
    this.options = { ...DefaultRotationControlOptions, ...options };
  }

  updateOptions(options: Partial<FixedUpRotationFragmentOptions>) {
    for (const key in options) {
      const k = key as keyof FixedUpRotationFragmentOptions;
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
    if (this.orbit) {
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
    } else {
      this.origin = this.camera.position;
    }

    const relativePosition = this.calculateRelativePosition();
    const angles = this.calculateAngles(relativePosition);
    this.horizontalAngle = angles.horizontalAngle;
    this.verticalAngle = angles.verticalAngle;
  }

  handlePointerInput(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    if (!this.options.enabled) return;

    const speed = getSpeed(this.options.speed, activePointers[0].type);
    const invertHorizontal = getInvert(this.options.invertHorizontal, activePointers[0].type);
    const invertVertical = getInvert(this.options.invertVertical, activePointers[0].type);
    const aspect = getCameraAspectRatio(this.camera);
    const deltaCoords = _v2.copy(activePointers[0].delta);
    deltaCoords.x *= aspect;
    let horizontalAngleDelta = deltaCoords.x * speed;
    let verticalAngleDelta = deltaCoords.y * speed;

    if (this.orbit) {
      if (invertHorizontal) {
        horizontalAngleDelta *= -1;
      }
      if (!invertVertical) {
        verticalAngleDelta *= -1;
      }
    } else {
      if (!invertHorizontal) {
        horizontalAngleDelta *= -1;
      }
      if (!invertVertical) {
        verticalAngleDelta *= -1;
      }
    }

    return this.handleRotationAction(verticalAngleDelta, horizontalAngleDelta, camera, target);
  }

  handleRotationAction(
    verticalAngleDelta: number,
    horizontalAngleDelta: number,
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    const { cameraDelta, targetDelta } = this.rotateBy(verticalAngleDelta, horizontalAngleDelta);
    camera.position.add(cameraDelta);
    target.add(targetDelta);
  }

  getRotationBasis() {
    return this.rotationBasis;
  }

  getHorizontalAngle() {
    return this.horizontalAngle;
  }

  setHorizontalAngle(angle: number) {
    const relativePosition = this.calculateRelativePosition();
    const angles = this.calculateAngles(relativePosition);
    const { cameraDelta, targetDelta } = this.rotateTo(angles.verticalAngle, angle);

    this.camera.position.add(cameraDelta);
    this.target.add(targetDelta);
    this.camera.lookAt(this.target);
  }

  getVerticalAngle() {
    return this.verticalAngle;
  }

  setVerticalAngle(angle: number) {
    const relativePosition = this.calculateRelativePosition();
    const angles = this.calculateAngles(relativePosition);
    const { cameraDelta, targetDelta } = this.rotateTo(angle, angles.horizontalAngle);

    this.camera.position.add(cameraDelta);
    this.target.add(targetDelta);
    this.camera.lookAt(this.target);
  }

  private calculateRelativePosition(): THREE.Vector3 {
    return this.orbit
      ? this.camera.position.clone().sub(this.target)
      : this.target.clone().sub(this.camera.position);
  }

  private calculateAngles(relativePosition: THREE.Vector3): {
    verticalAngle: number;
    horizontalAngle: number;
  } {
    // Translated relative position
    const trp = _v3.copy(relativePosition).applyMatrix4(this.rotationBasis);
    const sphericalAngles = calculateSphericalAngles(trp);
    return {
      verticalAngle: sphericalAngles.verticalAngle,
      horizontalAngle: sphericalAngles.horizontalAngle,
    };
  }

  private rotateBy(
    verticalAngleDelta: number,
    horizontalAngleDelta: number,
  ): { cameraDelta: THREE.Vector3; targetDelta: THREE.Vector3 } {
    const relativePosition = this.calculateRelativePosition();
    const angles = this.calculateAngles(relativePosition);
    return this.rotateTo(
      angles.verticalAngle + verticalAngleDelta,
      angles.horizontalAngle + horizontalAngleDelta,
    );
  }

  private rotateTo(
    verticalAngle: number,
    horizontalAngle: number,
  ): { cameraDelta: THREE.Vector3; targetDelta: THREE.Vector3 } {
    let newHorizontalAngle;

    // This is different than using MathUtils.clamp(). It handles tha case when
    // this.options.minHorizontalAngle > this.options.maxHorizontalAngle, which is
    // necessary, to be able to limit rotation to the opposite region of a circle.
    if (horizontalAngle < this.options.minHorizontalAngle) {
      newHorizontalAngle = this.options.minHorizontalAngle;
    } else if (horizontalAngle > this.options.maxHorizontalAngle) {
      newHorizontalAngle = this.options.maxHorizontalAngle;
    } else {
      newHorizontalAngle = horizontalAngle;
    }

    if (newHorizontalAngle > Math.PI) {
      newHorizontalAngle = ((newHorizontalAngle + Math.PI) % (Math.PI * 2)) - Math.PI;
    } else if (newHorizontalAngle < -Math.PI) {
      newHorizontalAngle = ((newHorizontalAngle - Math.PI) % (Math.PI * 2)) + Math.PI;
    }
    const horizontalAngleDelta = newHorizontalAngle - this.horizontalAngle;
    this.horizontalAngle = newHorizontalAngle;

    const minVerticalAngle = Math.max(this.options.minVerticalAngle, -AbsoluteMaxVerticalAngle);
    const maxVerticalAngle = Math.min(this.options.maxVerticalAngle, AbsoluteMaxVerticalAngle);
    const newVerticalAngle = THREE.MathUtils.clamp(
      verticalAngle,
      minVerticalAngle,
      maxVerticalAngle,
    );
    const verticalAngleDelta = newVerticalAngle - this.verticalAngle;
    this.verticalAngle = newVerticalAngle;

    const horizontalAxis = this.camera.up;
    const verticalAxis = this.camera
      .getWorldDirection(new THREE.Vector3())
      .cross(this.camera.up)
      .normalize();

    const relativeCameraPos = _v3.copy(this.camera.position).sub(this.origin);
    const newRelativeCameraPos = relativeCameraPos
      .clone()
      .applyAxisAngle(verticalAxis, this.orbit ? -verticalAngleDelta : verticalAngleDelta)
      .applyAxisAngle(horizontalAxis, -horizontalAngleDelta);
    const cameraRotationDelta = newRelativeCameraPos.sub(relativeCameraPos);

    const relativeTargetPos = _v3.copy(this.target).sub(this.origin);
    const newRelativeTargetPos = relativeTargetPos
      .clone()
      .applyAxisAngle(verticalAxis, this.orbit ? -verticalAngleDelta : verticalAngleDelta)
      .applyAxisAngle(horizontalAxis, -horizontalAngleDelta);
    const targetRotationDelta = newRelativeTargetPos.sub(relativeTargetPos);

    return { cameraDelta: cameraRotationDelta, targetDelta: targetRotationDelta };
  }
}

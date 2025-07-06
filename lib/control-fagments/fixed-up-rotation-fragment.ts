import * as THREE from 'three';

import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { clamp } from '../common/internal/clamp';
import { getDeltaCoordsFromActivePointers } from '../common/internal/get-coords-from-active-pointers';
import { calculateSphericalAngles } from '../utils/calculate-spherical-angles';
import { getCameraAspectRatio } from '../utils/camera-aspect-ratio';

const DefaultVerticalAxis = new THREE.Vector3(1, 0, 0);
const DefaultHorizontalAxis = new THREE.Vector3(0, 1, 0);
const DefaultDirectionAxis = new THREE.Vector3(0, 0, 1);
const AbsoluteMaxVerticalAngle = Math.PI / 2 - 0.0001;

const DefaultRotationControlOptions: FixedUpRotationFragmentOptions = {
  enabled: true,
  invertHorizontal: false,
  invertVertical: false,
  maxHorizontalAngle: Infinity,
  minHorizontalAngle: -Infinity,
  maxVerticalAngle: Math.PI,
  minVerticalAngle: -Math.PI,
  speed: 1,
};

export interface FixedUpRotationFragmentOptions {
  enabled: boolean;
  speed: number;
  minHorizontalAngle: number;
  maxHorizontalAngle: number;
  minVerticalAngle: number;
  maxVerticalAngle: number;
  invertHorizontal: boolean;
  invertVertical: boolean;
}

export class FixedUpRotationFragment implements ControlFragment {
  private active: boolean;

  private camera: ControllableCamera;

  private target: THREE.Vector3;

  private orbit: boolean;

  private options: FixedUpRotationFragmentOptions;

  private rotationBasis: THREE.Matrix4;

  private inverseRotationBasis: THREE.Matrix4;

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
    this.orbit = orbit;
    const normal = DefaultHorizontalAxis.clone().cross(camera.up).normalize();
    const angle = -camera.up.angleTo(DefaultHorizontalAxis);
    this.rotationBasis = new THREE.Matrix4().makeRotationAxis(normal, angle);
    this.inverseRotationBasis = this.rotationBasis.clone().invert();
    this.options = { ...DefaultRotationControlOptions, ...options };
  }

  updateOptions(options: Partial<FixedUpRotationFragmentOptions>) {
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

  updateStartValues(activePointers: ActivePointer[]) {}

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
    const trp = relativePosition.clone().applyMatrix4(this.rotationBasis);
    const sphericalAngles = calculateSphericalAngles(trp);
    return {
      verticalAngle: sphericalAngles.verticalAngle,
      horizontalAngle: sphericalAngles.horizontalAngle,
    };
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
    let horizontalAngleDelta = deltaCoords.x * this.options.speed;
    let verticalAngleDelta = deltaCoords.y * this.options.speed;

    if (this.orbit) {
      if (this.options.invertHorizontal) {
        horizontalAngleDelta *= -2;
      }
      if (!this.options.invertVertical) {
        verticalAngleDelta *= -2;
      }
    } else {
      if (!this.options.invertHorizontal) {
        horizontalAngleDelta *= -1;
      }
      if (!this.options.invertVertical) {
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
    const rotationDelta = this.rotateBy(verticalAngleDelta, horizontalAngleDelta);
    if (this.orbit) {
      camera.position.add(rotationDelta);
    } else {
      target.add(rotationDelta);
    }
  }

  getRotationBasis() {
    return this.rotationBasis;
  }

  private rotateBy(verticalAngleDelta: number, horizontalAngleDelta: number): THREE.Vector3 {
    const relativePosition = this.calculateRelativePosition();
    const angles = this.calculateAngles(relativePosition);
    return this.rotateTo(
      angles.verticalAngle + verticalAngleDelta,
      angles.horizontalAngle + horizontalAngleDelta,
      relativePosition,
    );
  }

  private rotateTo(
    verticalAngle: number,
    horizontalAngle: number,
    relativePosition: THREE.Vector3,
  ): THREE.Vector3 {
    this.horizontalAngle = THREE.MathUtils.clamp(
      horizontalAngle,
      this.options.minHorizontalAngle,
      this.options.maxHorizontalAngle,
    );
    if (this.horizontalAngle > Math.PI) {
      this.horizontalAngle = ((this.horizontalAngle + Math.PI) % (Math.PI * 2)) - Math.PI;
    } else if (this.horizontalAngle < -Math.PI) {
      this.horizontalAngle = ((this.horizontalAngle - Math.PI) % (Math.PI * 2)) + Math.PI;
    }

    const minVerticalAngle = Math.max(this.options.minVerticalAngle, -AbsoluteMaxVerticalAngle);
    const maxVerticalAngle = Math.min(this.options.maxVerticalAngle, AbsoluteMaxVerticalAngle);
    this.verticalAngle = THREE.MathUtils.clamp(verticalAngle, minVerticalAngle, maxVerticalAngle);

    const horizontalQuaternion = new THREE.Quaternion().setFromAxisAngle(
      DefaultHorizontalAxis,
      -this.horizontalAngle,
    );
    const verticalQuaternion = new THREE.Quaternion().setFromAxisAngle(
      DefaultVerticalAxis,
      -this.verticalAngle,
    );
    const baseCameraPosition = DefaultDirectionAxis.clone().multiplyScalar(
      relativePosition.length(),
    );

    const rotationDelta = baseCameraPosition
      .applyQuaternion(verticalQuaternion)
      .applyQuaternion(horizontalQuaternion)
      .applyMatrix4(this.inverseRotationBasis)
      .sub(relativePosition);

    return rotationDelta;
  }

  getHorizontalAngle() {
    return this.horizontalAngle;
  }

  setHorizontalAngle(angle: number) {
    const relativePosition = this.calculateRelativePosition();
    const angles = this.calculateAngles(relativePosition);
    const rotationDelta = this.rotateTo(angles.verticalAngle, angle, relativePosition);

    if (this.orbit) {
      this.camera.position.add(rotationDelta);
    } else {
      this.target.add(rotationDelta);
    }
    this.camera.lookAt(this.target);
  }

  getVerticalAngle() {
    return this.verticalAngle;
  }

  setVerticalAngle(angle: number) {
    const relativePosition = this.calculateRelativePosition();
    const angles = this.calculateAngles(relativePosition);
    const rotationDelta = this.rotateTo(angle, angles.horizontalAngle, relativePosition);

    if (this.orbit) {
      this.camera.position.add(rotationDelta);
    } else {
      this.target.add(rotationDelta);
    }
    this.camera.lookAt(this.target);
  }
}

import * as THREE from 'three';
import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { getInvert } from '../common/internal/getInvert';
import { getSpeed } from '../common/internal/getSpeed';
import { getCameraAspectRatio } from '../utils/camera-aspect-ratio';
import { calculateSphericalAngles } from '../utils';

const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _v3c = new THREE.Vector3();
const _v3d = new THREE.Vector3();
const _v2 = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

const DefaultVerticalAxis = new THREE.Vector3(1, 0, 0);
const DefaultHorizontalAxis = new THREE.Vector3(0, 1, 0);
const DefaultDirectionAxis = new THREE.Vector3(0, 0, 1);
const AbsoluteMaxVerticalAngle = Math.PI / 2 - 1e-8;

const DefaultRotationControlOptions: FixedUpRotationFragmentOptions = {
  enabled: true,
  speed: 1,
  minHorizontalAngle: -Infinity,
  maxHorizontalAngle: Infinity,
  minVerticalAngle: -AbsoluteMaxVerticalAngle,
  maxVerticalAngle: AbsoluteMaxVerticalAngle,
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
  private orbit: boolean;
  private options: FixedUpRotationFragmentOptions;
  private rotationBasis: THREE.Matrix4;
  private inverseRotationBasis: THREE.Matrix4;
  private horizontalAngle = 0;
  private verticalAngle = 0;
  private origin = new THREE.Vector3();

  constructor(orbit: boolean, options?: Partial<FixedUpRotationFragmentOptions>) {
    this.orbit = orbit;
    const normal = _v3a.copy(DefaultHorizontalAxis).cross(THREE.Object3D.DEFAULT_UP).normalize();
    const angle = -THREE.Object3D.DEFAULT_UP.angleTo(DefaultHorizontalAxis);
    this.rotationBasis = new THREE.Matrix4().makeRotationAxis(normal, angle);
    this.inverseRotationBasis = this.rotationBasis.clone().invert();
    this.options = { ...DefaultRotationControlOptions };
    if (options) {
      this.updateOptions(options);
    }
  }

  updateOptions(options: Partial<FixedUpRotationFragmentOptions>) {
    for (const key in options) {
      const k = key as keyof FixedUpRotationFragmentOptions;
      (this.options[k] as any) = options[k];
    }

    if (this.options.minHorizontalAngle !== -Infinity) {
      this.options.minHorizontalAngle = Math.max(this.options.minHorizontalAngle, -2 * Math.PI);
    }
    if (this.options.maxHorizontalAngle !== Infinity) {
      this.options.maxHorizontalAngle = Math.min(this.options.maxHorizontalAngle, 2 * Math.PI);
    }

    this.options.minVerticalAngle = Math.max(
      this.options.minVerticalAngle,
      -AbsoluteMaxVerticalAngle,
    );
    this.options.maxVerticalAngle = Math.min(
      this.options.maxVerticalAngle,
      AbsoluteMaxVerticalAngle,
    );
  }

  updateStartValues(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ) {
    if (this.orbit) {
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
    } else {
      this.origin = camera.position;
    }

    const relativePosition = this.calculateRelativePosition(camera, target);
    const angles = this.calculateAngles(relativePosition);
    this.verticalAngle = angles.verticalAngle;
    this.horizontalAngle = angles.horizontalAngle;
    if (
      this.horizontalAngle > this.options.maxHorizontalAngle &&
      this.options.minHorizontalAngle < -Math.PI
    ) {
      this.horizontalAngle -= 2 * Math.PI;
    } else if (
      this.horizontalAngle < this.options.minHorizontalAngle &&
      this.options.maxHorizontalAngle > Math.PI
    ) {
      this.horizontalAngle += 2 * Math.PI;
    }
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
    const aspect = getCameraAspectRatio(camera);
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

    this.handleRotationAction(verticalAngleDelta, horizontalAngleDelta, camera, target);
  }

  handleRotationAction(
    verticalAngleDelta: number,
    horizontalAngleDelta: number,
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    const { cameraDelta, targetDelta } = this.rotateBy(
      verticalAngleDelta,
      horizontalAngleDelta,
      camera,
      target,
    );
    camera.position.add(cameraDelta);
    target.add(targetDelta);
  }

  getRotationBasis() {
    return this.rotationBasis;
  }

  getHorizontalAngle() {
    return this.horizontalAngle;
  }

  setHorizontalAngle(angle: number, camera: ControllableCamera, target: THREE.Vector3) {
    const { cameraDelta, targetDelta } = this.rotateTo(this.verticalAngle, angle, camera, target);

    camera.position.add(cameraDelta);
    target.add(targetDelta);
    camera.lookAt(target);
  }

  getVerticalAngle() {
    return this.verticalAngle;
  }

  setVerticalAngle(angle: number, camera: ControllableCamera, target: THREE.Vector3) {
    const { cameraDelta, targetDelta } = this.rotateTo(angle, this.horizontalAngle, camera, target);

    camera.position.add(cameraDelta);
    target.add(targetDelta);
    camera.lookAt(target);
  }

  private calculateRelativePosition(
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): THREE.Vector3 {
    return this.orbit ? camera.position.clone().sub(target) : target.clone().sub(camera.position);
  }

  private calculateAngles(relativePosition: THREE.Vector3): {
    verticalAngle: number;
    horizontalAngle: number;
  } {
    // Translated relative position
    const trp = _v3a.copy(relativePosition).applyMatrix4(this.rotationBasis);
    const sphericalAngles = calculateSphericalAngles(trp);
    return {
      verticalAngle: sphericalAngles.verticalAngle,
      horizontalAngle: sphericalAngles.horizontalAngle,
    };
  }

  private rotateBy(
    verticalAngleDelta: number,
    horizontalAngleDelta: number,
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): { cameraDelta: THREE.Vector3; targetDelta: THREE.Vector3 } {
    const newHorizontalAngle = THREE.MathUtils.clamp(
      this.horizontalAngle + horizontalAngleDelta,
      this.options.minHorizontalAngle,
      this.options.maxHorizontalAngle,
    );
    horizontalAngleDelta = newHorizontalAngle - this.horizontalAngle;
    this.horizontalAngle = newHorizontalAngle;

    const newVerticalAngle = THREE.MathUtils.clamp(
      this.verticalAngle + verticalAngleDelta,
      this.options.minVerticalAngle,
      this.options.maxVerticalAngle,
    );
    verticalAngleDelta = newVerticalAngle - this.verticalAngle;
    this.verticalAngle = newVerticalAngle;

    const horizontalAxis = camera.up;
    const verticalAxis = camera.getWorldDirection(new THREE.Vector3()).cross(camera.up).normalize();

    const relativeCameraPos = _v3a.copy(camera.position).sub(this.origin);
    const newRelativeCameraPos = _v3b
      .copy(relativeCameraPos)
      .applyAxisAngle(verticalAxis, this.orbit ? -verticalAngleDelta : verticalAngleDelta)
      .applyAxisAngle(horizontalAxis, -horizontalAngleDelta);
    const cameraRotationDelta = newRelativeCameraPos.sub(relativeCameraPos);

    const relativeTargetPos = _v3c.copy(target).sub(this.origin);
    const newRelativeTargetPos = _v3d
      .copy(relativeTargetPos)
      .applyAxisAngle(verticalAxis, this.orbit ? -verticalAngleDelta : verticalAngleDelta)
      .applyAxisAngle(horizontalAxis, -horizontalAngleDelta);
    const targetRotationDelta = newRelativeTargetPos.sub(relativeTargetPos);

    return { cameraDelta: cameraRotationDelta, targetDelta: targetRotationDelta };
  }

  private rotateTo(
    verticalAngle: number,
    horizontalAngle: number,
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): { cameraDelta: THREE.Vector3; targetDelta: THREE.Vector3 } {
    const newHorizontalAngle = THREE.MathUtils.clamp(
      horizontalAngle,
      this.options.minHorizontalAngle,
      this.options.maxHorizontalAngle,
    );
    this.horizontalAngle = newHorizontalAngle;

    const newVerticalAngle = THREE.MathUtils.clamp(
      verticalAngle,
      this.options.minVerticalAngle,
      this.options.maxVerticalAngle,
    );
    this.verticalAngle = newVerticalAngle;

    const relativeCameraPos = _v3a.copy(camera.position).sub(this.origin);
    const baseCameraPosition = _v3b
      .copy(DefaultDirectionAxis)
      .multiplyScalar(relativeCameraPos.length());

    const newRelativeCameraPos = baseCameraPosition
      .applyAxisAngle(DefaultVerticalAxis, this.orbit ? -newVerticalAngle : newVerticalAngle)
      .applyAxisAngle(DefaultHorizontalAxis, -newHorizontalAngle)
      .applyMatrix4(this.inverseRotationBasis);
    const cameraRotationDelta = newRelativeCameraPos.sub(relativeCameraPos);

    const relativeTargetPos = _v3c.copy(target).sub(this.origin);
    const newRelativeTargetPos = _v3d
      .copy(relativeTargetPos)
      .applyAxisAngle(DefaultVerticalAxis, this.orbit ? -newVerticalAngle : newVerticalAngle)
      .applyAxisAngle(DefaultHorizontalAxis, -newHorizontalAngle)
      .applyMatrix4(this.inverseRotationBasis);
    const targetRotationDelta = newRelativeTargetPos.sub(relativeTargetPos);

    return { cameraDelta: cameraRotationDelta, targetDelta: targetRotationDelta };
  }
}

import * as THREE from 'three';
import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { findDynamicTarget } from '../common/internal/find-dynamic-target';
import { getOption } from '../common/internal/get-option';
import { InternalOptions } from '../common/internal/internal-options';
import { calculateSphericalAngles } from '../utils';
import { getCameraAspectRatio } from '../utils/camera-aspect-ratio';

type FixedUpRotationFragmentOptionsInternal = InternalOptions<
  FixedUpRotationFragmentOptions,
  'dynamicOrigin'
>;

const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _v3c = new THREE.Vector3();
const _v3d = new THREE.Vector3();
const _v2 = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

const defaultVerticalAxis = new THREE.Vector3(1, 0, 0);
const defaultHorizontalAxis = new THREE.Vector3(0, 1, 0);
const defaultDirectionAxis = new THREE.Vector3(0, 0, 1);
const absoluteMaxVerticalAngle = Math.PI / 2 - 1e-8;

const defaultRotationControlOptions: FixedUpRotationFragmentOptionsInternal = {
  enabled: true,
  speed: 1,
  minHorizontalAngle: -Infinity,
  maxHorizontalAngle: Infinity,
  minVerticalAngle: -absoluteMaxVerticalAngle,
  maxVerticalAngle: absoluteMaxVerticalAngle,
  invertHorizontal: false,
  invertVertical: false,
  defaultToAbsoluteOrigin: false,
};

export interface FixedUpRotationFragmentOptions {
  /**
   * Whether the rotation control is enabled.
   * @default true
   */
  enabled?: boolean;

  /**
   * Speed multiplier for rotation motion.
   * Can be a single number or an object specifying different speeds for each
   * input type.
   * @default 1
   */
  speed?: number | { pointer: number; touch: number };

  /**
   * Minimum horizontal rotation angle in radians.
   *
   * Clamped between -2π and the maxHorizontalAngle.
   * @default -Infinity
   */
  minHorizontalAngle?: number;

  /**
   * Maximum horizontal rotation angle in radians.
   *
   * Clamped between the minHorizontalAngle and 2π.
   * @default Infinity
   */
  maxHorizontalAngle?: number;

  /**
   * Minimum vertical rotation angle in radians (pitch/elevation).
   *
   * Cannot be less than approximately -π/2 to prevent gimbal lock.
   * @default approximately -π/2
   */
  minVerticalAngle?: number;

  /**
   * Maximum vertical rotation angle in radians (pitch/elevation).
   *
   * Cannot exceed approximately π/2 to prevent gimbal lock.
   * @default approximately π/2
   */
  maxVerticalAngle?: number;

  /**
   * Whether to invert horizontal rotation direction.
   * Can be a boolean or an object specifying different inversions for each
   * input type.
   * @default false
   */
  invertHorizontal?: boolean | { pointer: boolean; touch: boolean };

  /**
   * Whether to invert vertical rotation direction.
   * Can be a boolean or an object specifying different inversions for each
   * input type.
   * @default false
   */
  invertVertical?: boolean | { pointer: boolean; touch: boolean };

  /**
   * Configuration for dynamic origin detection.
   *
   * When provided (in orbit mode), raycasts against the specified objects to
   * dynamically determine the rotation origin based on what's under the pointer
   * at the start of the interaction.
   */
  dynamicOrigin?: {
    /**
     * The object(s) to raycast against for dynamic origin detection.
     */
    source: THREE.Object3D | THREE.Object3D[];

    /**
     * Whether to consider invisible objects when raycasting.
     * @default false
     */
    useInvisible?: boolean;
  };

  /**
   * Whether to use the absolute world origin (0,0,0) as the rotation origin
   * when in orbit mode and no dynamic origin is detected.
   *
   * If false, uses the control target as the origin.
   * @default false
   */
  defaultToAbsoluteOrigin?: boolean;
}

export class FixedUpRotationFragment implements ControlFragment {
  private orbit: boolean;
  private options: FixedUpRotationFragmentOptionsInternal;
  private rotationBasis: THREE.Matrix4;
  private inverseRotationBasis: THREE.Matrix4;
  private horizontalAngle = 0;
  private verticalAngle = 0;
  private origin = new THREE.Vector3();

  constructor(orbit: boolean, options?: FixedUpRotationFragmentOptions) {
    this.orbit = orbit;
    const normal = _v3a.copy(defaultHorizontalAxis).cross(THREE.Object3D.DEFAULT_UP).normalize();
    const angle = -THREE.Object3D.DEFAULT_UP.angleTo(defaultHorizontalAxis);
    this.rotationBasis = new THREE.Matrix4().makeRotationAxis(normal, angle);
    this.inverseRotationBasis = this.rotationBasis.clone().invert();
    this.options = { ...defaultRotationControlOptions };
    if (options) {
      this.updateOptions(options);
    }
  }

  updateOptions(options: FixedUpRotationFragmentOptions) {
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
      -absoluteMaxVerticalAngle,
    );
    this.options.maxVerticalAngle = Math.min(
      this.options.maxVerticalAngle,
      absoluteMaxVerticalAngle,
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
        const useInvisible = !!this.options.dynamicOrigin.useInvisible;
        const coords = activePointers[0].coords;
        _raycaster.setFromCamera(coords, camera);
        const dynamicOrigin = findDynamicTarget(_raycaster, source, useInvisible);
        if (dynamicOrigin) {
          this.origin = dynamicOrigin;
          originSet = true;
        }
      }

      if (!originSet) {
        if (this.options.defaultToAbsoluteOrigin) {
          this.origin.set(0, 0, 0);
        } else {
          this.origin.copy(target);
        }
      }
    } else {
      this.origin.copy(camera.position);
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

    const speed = getOption(this.options.speed, activePointers[0].type);
    const invertHorizontal = getOption(this.options.invertHorizontal, activePointers[0].type);
    const invertVertical = getOption(this.options.invertVertical, activePointers[0].type);
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
      .copy(defaultDirectionAxis)
      .multiplyScalar(relativeCameraPos.length());

    const newRelativeCameraPos = baseCameraPosition
      .applyAxisAngle(defaultVerticalAxis, this.orbit ? -newVerticalAngle : newVerticalAngle)
      .applyAxisAngle(defaultHorizontalAxis, -newHorizontalAngle)
      .applyMatrix4(this.inverseRotationBasis);
    const cameraRotationDelta = newRelativeCameraPos.sub(relativeCameraPos);

    const relativeTargetPos = _v3c.copy(target).sub(this.origin);
    const newRelativeTargetPos = _v3d
      .copy(relativeTargetPos)
      .applyAxisAngle(defaultVerticalAxis, this.orbit ? -newVerticalAngle : newVerticalAngle)
      .applyAxisAngle(defaultHorizontalAxis, -newHorizontalAngle)
      .applyMatrix4(this.inverseRotationBasis);
    const targetRotationDelta = newRelativeTargetPos.sub(relativeTargetPos);

    return { cameraDelta: cameraRotationDelta, targetDelta: targetRotationDelta };
  }
}

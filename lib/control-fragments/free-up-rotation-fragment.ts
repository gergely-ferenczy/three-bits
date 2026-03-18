import * as THREE from 'three';
import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { findDynamicTarget } from '../common/internal/find-dynamic-target';
import { getDeltaCoordsFromActivePointers } from '../common/internal/get-coords-from-active-pointers';
import { getOption } from '../common/internal/get-option';
import { InternalOptions } from '../common/internal/internal-options';
import { getCameraAspectRatio } from '../utils/camera-aspect-ratio';

type FreeUpRotationFragmentOptionsInternal = InternalOptions<
  FreeUpRotationFragmentOptions,
  'dynamicOrigin'
>;

const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _v3c = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();

const defaultRotationControlOptions: FreeUpRotationFragmentOptionsInternal = {
  enabled: true,
  invertHorizontal: false,
  invertVertical: false,
  speed: 1,
  defaultToAbsoluteOrigin: false,
};

export interface FreeUpRotationFragmentOptions {
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

export class FreeUpRotationFragment implements ControlFragment {
  private options: FreeUpRotationFragmentOptionsInternal;
  private origin = new THREE.Vector3();

  constructor(options?: FreeUpRotationFragmentOptions) {
    this.options = { ...defaultRotationControlOptions, ...options };
  }

  updateOptions(options: FreeUpRotationFragmentOptions) {
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
  }

  handlePointerInput(
    activePointers: ActivePointer[],
    camera: ControllableCamera,
    target: THREE.Vector3,
  ): void {
    if (!this.options.enabled) return;

    const aspect = getCameraAspectRatio(camera);
    const speed = getOption(this.options.speed, activePointers[0].type);
    const invertHorizontal = getOption(this.options.invertHorizontal, activePointers[0].type);
    const invertVertical = getOption(this.options.invertVertical, activePointers[0].type);
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

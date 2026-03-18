import * as THREE from 'three';
import { ControlFragment } from './control-fragment';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import {
  getCoordsFromActivePointers,
  getDeltaCoordsFromActivePointers,
} from '../common/internal/get-coords-from-active-pointers';
import { getOption } from '../common/internal/get-option';
import { InternalOptions } from '../common/internal/internal-options';
import { calculatePointerTarget } from '../utils/calculate-pointer-target';
import { getCameraAspectRatio } from '../utils/camera-aspect-ratio';

type TruckFragmentOptionsInternal = InternalOptions<TruckFragmentOptions, 'dynamicTarget'>;

const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();

const defaultTruckControlOptions: TruckFragmentOptionsInternal = {
  enabled: true,
  speed: 1,
  lock: null,
  mode: 'exact',
  maxDistance: Infinity,
};

export interface TruckFragmentOptions {
  /**
   * Whether the truck control is enabled.
   * @default true
   */
  enabled?: boolean;

  /**
   * Speed multiplier for truck motion.
   * Can be a single number or an object specifying different speeds for each
   * input type.
   * @default 1
   */
  speed?: number | { pointer: number; touch: number };

  /**
   * Constraint for truck motion.
   * - `THREE.Plane`: Locks trucking to the specified plane.
   * - `THREE.Vector3`: Locks trucking perpendicular to the specified direction vector.
   * - `null`: No constraint, trucking occurs perpendicular to the camera's view direction.
   * @default null
   */
  lock?: THREE.Plane | THREE.Vector3 | null;

  /**
   * Maximum distance a single truck motion can move the camera from its stating
   * position.
   *
   * Limits how far the raycaster will check for intersections with the truck
   * plane.
   * @default Infinity
   */
  maxDistance?: number;

  /**
   * Calculation mode for truck motion.
   * - `'exact'`: Uses raycasting to calculate precise intersection points with
   *    the truck plane.
   * - `'approximate'`: Uses delta coordinates for approximate calculations. Can
   *    be useful when trucking is locked to a fixed plane via the `lock`
   *    property.
   * @default 'exact'
   */
  mode?: 'exact' | 'approximate';

  /**
   * Configuration for dynamic target detection.
   *
   * When provided, raycasts against the specified objects recursively to
   * dynamically determine the truck plane based on what's under the pointer at
   * the start of the interaction.
   *
   * Only used in 'exact' mode.
   */
  dynamicTarget?: {
    /**
     * The object(s) to raycast against for dynamic target detection.
     */
    source: THREE.Object3D | THREE.Object3D[];

    /**
     * Whether to consider invisible objects when raycasting.
     */
    useInvisible: boolean;
  };
}

interface TruckFragmentState {
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
  private options: TruckFragmentOptionsInternal;

  private state: TruckFragmentState = {
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
    this.options = { ...defaultTruckControlOptions, ...options };
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
    this.state.camera = camera.clone();

    if (this.options.mode == 'approximate') {
      this.updateStartValuesApproximate(camera, target);
    } else {
      this.updateStartValuesExact(activePointers, camera, target);
    }
  }

  getTruckPlane() {
    return this.state.plane;
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
      this.state.plane = this.options.lock;
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

      let dynamicTarget = target;
      if (this.options.dynamicTarget) {
        const source = this.options.dynamicTarget.source;
        const useInvisible = this.options.dynamicTarget.useInvisible;
        const coords = activePointers[0].coords;
        this.raycaster.setFromCamera(coords, camera);
        const intersections = Array.isArray(source)
          ? this.raycaster.intersectObjects(source)
          : this.raycaster.intersectObject(source);
        for (const i of intersections) {
          if (i.object.visible || useInvisible) {
            dynamicTarget = i.point;
            break;
          }
        }
      }
      this.state.plane.setFromNormalAndCoplanarPoint(panNormal, dynamicTarget);
    }

    const coords = getCoordsFromActivePointers(activePointers);
    this.raycaster.setFromCamera(coords, this.state.camera);
    const pointerTarget = calculatePointerTarget(
      this.state.camera,
      this.state.plane,
      this.raycaster.ray,
      this.raycaster.far,
    );
    if (pointerTarget) {
      this.state.exact.pointerTarget = pointerTarget;
    }
  }

  private updateStartValuesApproximate(camera: ControllableCamera, target: THREE.Vector3) {
    const relativeTargetPos = _v3a.copy(target).sub(camera.position);

    if (this.options.lock instanceof THREE.Plane) {
      this.state.approximate.xAxis
        .copy(this.options.lock.normal)
        .cross(relativeTargetPos)
        .normalize();
      this.state.approximate.yAxis
        .copy(this.options.lock.normal)
        .cross(this.state.approximate.xAxis)
        .normalize();
      this.state.plane.copy(this.options.lock);
    } else if (this.options.lock instanceof THREE.Vector3) {
      const normal = _v3b.copy(this.options.lock).cross(relativeTargetPos).cross(this.options.lock);
      this.state.approximate.xAxis.copy(camera.up).cross(relativeTargetPos).normalize();
      this.state.approximate.yAxis.copy(this.state.approximate.xAxis).cross(normal).normalize();
      this.state.plane.setFromNormalAndCoplanarPoint(normal, target);
    } else {
      this.state.approximate.xAxis.copy(camera.up).cross(relativeTargetPos).normalize();
      this.state.approximate.yAxis
        .copy(this.state.approximate.xAxis)
        .cross(relativeTargetPos)
        .normalize();
      this.state.plane.setFromNormalAndCoplanarPoint(relativeTargetPos, target);
    }
    this.state.approximate.distance = relativeTargetPos.length();
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
    this.raycaster.setFromCamera(coords, this.state.camera);
    const intersection = calculatePointerTarget(
      this.state.camera,
      this.state.plane,
      this.raycaster.ray,
      this.raycaster.far,
    );

    if (!intersection) return;

    const speed = getOption(this.options.speed, activePointers[0].type);
    const positionDelta = _v3a
      .copy(intersection)
      .sub(this.state.exact.pointerTarget)
      .multiplyScalar(-speed);
    this.state.exact.pointerTarget.copy(intersection);

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

    const speed = getOption(this.options.speed, activePointers[0].type);
    let scale = speed / camera.zoom;
    if (camera instanceof THREE.PerspectiveCamera) {
      scale *= this.state.approximate.distance / 2;
    }
    const xDeltaLength = deltaCoords.x * scale;
    const yDeltaLength = deltaCoords.y * scale;
    const positionDelta = _v3a
      .copy(this.state.approximate.xAxis)
      .multiplyScalar(xDeltaLength)
      .addScaledVector(this.state.approximate.yAxis, yDeltaLength);

    camera.position.add(positionDelta);
    target.add(positionDelta);
  }
}

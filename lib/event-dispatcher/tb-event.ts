import * as THREE from 'three';
import { TbEventType } from './tb-event-types';

/**
 * Represents a synthetic event dispatched by {@link TbEventDispatcher} for
 * {@link THREE.Object3D} objects.
 *
 * Wraps a native DOM event and provides additional Three.js specific context.
 * Supports event propagation phases and propagation control methods.
 *
 * @template E The type of the underlying native DOM event.
 */
export interface TbEvent<E extends Event = Event, G extends 'object' | 'global' = 'object'> {
  /**
   * Original object onto which the event was dispatched.
   */
  readonly target: G extends 'object' ? THREE.Object3D : THREE.Object3D | undefined;

  /**
   * Object to which the event handler has been attached.
   */
  readonly currentTarget: G extends 'object' ? THREE.Object3D : THREE.Object3D | undefined;

  /**
   * Array of intersections from the latest raycast.
   */
  readonly intersections: THREE.Intersection[];

  /**
   * Ray used for intersection testing.
   */
  readonly ray: THREE.Ray;

  /**
   * Camera used for raycasting.
   */
  readonly camera: THREE.Camera;

  /**
   * Event type (e.g., 'pointerdown', 'pointermove', etc.).
   */
  readonly type: TbEventType;

  /**
   * Original native DOM event that triggered this event.
   */
  readonly nativeEvent: E;

  /**
   * Current event propagation phase (CAPTURING_PHASE, AT_TARGET, BUBBLING_PHASE).
   *
   * See {@link Event}
   */
  readonly eventPhase: number;

  /**
   * Prevents further propagation of the current event in the capturing and
   * bubbling phases.
   */
  stopPropagation: () => void;

  /**
   * Prevents other listeners of the same event from being called.
   */
  stopImmediatePropagation: () => void;
}

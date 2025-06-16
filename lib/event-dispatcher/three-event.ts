import * as THREE from 'three';

import { ThreeEventType } from './three-event-types';

/**
 * Represents a synthetic event dispatched by {@link ThreeEventDispatcher} for
 * {@link THREE.Object3D} objects.
 *
 * Wraps a native DOM event and provides additional Three.js specific context.
 * Supports event propagation phases and propagation control methods.
 *
 * @template E The type of the underlying native DOM event.
 */
export interface ThreeEvent<E extends Event = Event> {
  /**
   * Original object onto which the event was dispatched.
   */
  readonly target: THREE.Object3D;

  /**
   * Object to which the event handler has been attached.
   */
  readonly currentTarget: THREE.Object3D;

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
  readonly type: ThreeEventType;

  /**
   * Original native DOM event that triggered this event.
   */
  readonly nativeEvent: E;

  /**
   * Current event propagation phase (capturing, at-target, bubbling).
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

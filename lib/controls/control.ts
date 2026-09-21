import * as THREE from 'three';
import { ControlEventListener } from '../common/control-event-listener';
import { ControlEventType } from '../common/control-event-type';
import { ControllableCamera } from '../common/controllable-camera';

export interface Control {
  attach(domElement: HTMLElement): void;

  detach(): void;

  getTarget(): THREE.Vector3;

  setTarget(target: THREE.Vector3, keepRelativeCameraPos: boolean): void;

  getDistance(): number;

  setDistance(distance: number): void;

  getZoom(): number;

  setZoom(zoom: number): void;

  getCamera(): ControllableCamera;

  setCamera(camera: ControllableCamera): void;

  /**
   * Adds a listener for a control lifecycle event.
   *
   * Available event types are:
   * - `start`: An interaction starts, or a manual change begins.
   * - `change`: The camera or target changes during an interaction, or a
   *   manual change is applied.
   * - `end`: An interaction ends, or a manual change finishes.
   *
   * For pointer and wheel interactions, the listener receives the native event
   * that triggered the control event. For manual changes made through methods
   * such as `setTarget`, `setDistance`, `setZoom`, `setHorizontalAngle`, or
   * `setVerticalAngle`, the event parameter is `undefined`.
   */
  addEventListener(type: ControlEventType, listener: ControlEventListener): void;

  removeEventListener(type: ControlEventType, listener: ControlEventListener): void;
}

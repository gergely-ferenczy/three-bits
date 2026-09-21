import * as THREE from 'three';
import { Control } from './control';
import { PointerHandler, PointerHandlerOptions } from './handlers/pointer-handler';
import { ControlFragment } from '../control-fragments/control-fragment';
import { WheelHandler } from './handlers/wheel-handler';
import { ActivePointer } from '../common/active-pointer';
import { ControlEventListener } from '../common/control-event-listener';
import { ControlEventType } from '../common/control-event-type';
import { ControllableCamera } from '../common/controllable-camera';

export interface BaseControlOptions {
  pointerHandlerOptions?: PointerHandlerOptions;
}

/**
 * Base implementation shared by the camera controls.
 *
 * Manages camera and target state, DOM input handlers, control fragments, and
 * lifecycle event listeners.
 */
export abstract class BaseControl implements Control {
  private enabled: boolean;

  private controlFragmentMap: Map<string, ControlFragment>;

  private pointerHandler: PointerHandler;

  private wheelHandler: WheelHandler;

  private activeControls: Set<string>;

  // TODO sort out all this protected stuff
  protected start: {
    cameraPos: THREE.Vector3;
    cameraZoom: number;
    target: THREE.Vector3;
  };

  private listeners: { [key in ControlEventType]: Set<ControlEventListener> };

  protected camera: ControllableCamera;

  protected target: THREE.Vector3;

  constructor(
    camera: ControllableCamera,
    target: THREE.Vector3,
    controlFragmentMap: Map<string, ControlFragment>,
    options: Required<BaseControlOptions>,
  ) {
    this.enabled = true;
    this.camera = camera;
    this.target = target;
    this.listeners = {
      start: new Set(),
      end: new Set(),
      change: new Set(),
    };
    this.start = {
      cameraPos: new THREE.Vector3(),
      cameraZoom: 0,
      target: new THREE.Vector3(),
    };

    this.activeControls = new Set();
    this.controlFragmentMap = controlFragmentMap;

    this.pointerHandler = new PointerHandler(
      options.pointerHandlerOptions,
      this.handleActiveControlChange.bind(this),
      this.handleInputChange.bind(this),
    );
    this.wheelHandler = new WheelHandler(this.handleWheelChange.bind(this));
  }

  /**
   * Returns the distance between the camera and the current target.
   */
  public getDistance(): number {
    return this.target.distanceTo(this.camera.position);
  }

  /**
   * Moves the camera to the specified distance from the current target and
   * dispatches a manual lifecycle event sequence.
   *
   * @param distance The new distance between the camera and the target.
   */
  public setDistance(distance: number): void {
    const direction = this.camera.getWorldDirection(new THREE.Vector3());
    const newPosition = this.target.clone().sub(direction.multiplyScalar(distance));
    this.camera.position.copy(newPosition);
    this.dispatchAtomicEvent();
  }

  /**
   * Returns the camera's current zoom value.
   */
  public getZoom(): number {
    return this.camera.zoom;
  }

  /**
   * Sets the camera's zoom, updates its projection matrix, and dispatches a
   * manual lifecycle event sequence.
   *
   * @param zoom The new camera zoom value.
   */
  public setZoom(zoom: number): void {
    this.camera.zoom = zoom;
    this.camera.updateProjectionMatrix();
    this.dispatchAtomicEvent();
  }

  /**
   * Attaches pointer and wheel input handling to a DOM element.
   *
   * @param domElement The element that receives control input events.
   */
  public attach(domElement: HTMLElement): void {
    this.pointerHandler.attach(domElement);
    this.wheelHandler.attach(domElement);
  }

  /**
   * Detaches pointer and wheel input handling from the attached DOM element.
   *
   * @param restoreTouchAction Whether to restore the element's previous
   * `touch-action` style.
   * @default true
   */
  public detach(restoreTouchAction = true): void {
    this.pointerHandler.detach(restoreTouchAction);
    this.wheelHandler.detach();
  }

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
   * such as `setTarget`, `setDistance`, `setZoom`, etc., the event parameter is
   * `undefined`.
   */
  public addEventListener(type: ControlEventType, listener: ControlEventListener): void {
    this.listeners[type].add(listener);
  }

  /**
   * Removes a previously registered control lifecycle event listener.
   *
   * @param type The lifecycle event type.
   * @param listener The listener to remove.
   */
  public removeEventListener(type: ControlEventType, listener: ControlEventListener): void {
    this.listeners[type].delete(listener);
  }

  /**
   * Returns a clone of the control's current target.
   */
  public getTarget(): THREE.Vector3 {
    return this.target.clone();
  }

  /**
   * Sets a new target point for the control, which is typically the point the
   * camera orbits around or looks at.
   *
   * @param target The new target as a THREE.Vector3.
   * @param keepRelativeCameraPos  Moves the camera so its position relative to
   *  the target remains unchanged. [default=false]
   */
  public setTarget(target: THREE.Vector3, keepRelativeCameraPos = false): void {
    const newTarget = target.clone();
    if (keepRelativeCameraPos) {
      const relativeCameraPos = this.camera.position.clone().sub(this.target);
      this.camera.position.copy(newTarget).add(relativeCameraPos);
    } else {
      this.camera.lookAt(target);
    }
    this.target = newTarget;
    this.dispatchAtomicEvent();
  }

  /**
   * Returns the camera controlled by this control.
   */
  public getCamera(): ControllableCamera {
    return this.camera;
  }

  /**
   * Replaces the camera controlled by this control.
   *
   * @param camera The new camera to control.
   */
  public setCamera(camera: ControllableCamera): void {
    this.camera = camera;
  }

  /**
   * Enables control input processing without attaching new DOM listeners.
   */
  public enable(): void {
    this.enabled = true;
  }

  /**
   * Disables control input processing while leaving the DOM listeners
   * attached.
   */
  public disable(): void {
    this.enabled = false;
  }

  protected updateHandlerOptions(options: BaseControlOptions): void {
    if (options.pointerHandlerOptions) {
      this.pointerHandler.updateOptions(options.pointerHandlerOptions);
    }
  }

  protected dispatchAtomicEvent(): void {
    this.dispatchEvent('start');
    this.dispatchEvent('change');
    this.dispatchEvent('end');
  }

  protected dispatchEvent(type: ControlEventType, event?: Event): void {
    for (const listener of this.listeners[type]) {
      listener(event);
    }
  }

  private handleActiveControlChange(
    activeControls: Set<string>,
    activePointers: ActivePointer[],
    event: PointerEvent,
  ): void {
    const interactionStarted = this.activeControls.size === 0 && activeControls.size > 0;
    const interactionEnded = this.activeControls.size > 0 && activeControls.size === 0;

    this.updateStartValues();

    for (const [controlId, controlFragment] of this.controlFragmentMap.entries()) {
      if (activeControls.has(controlId)) {
        controlFragment.updateStartValues(activePointers, this.camera, this.target);
      }
    }
    this.activeControls = new Set(activeControls);

    if (interactionStarted) {
      this.dispatchEvent('start', event);
    } else if (interactionEnded) {
      this.dispatchEvent('end', event);
    }
  }

  private handleInputChange(activePointers: ActivePointer[], event: PointerEvent): void {
    if (!this.enabled) return;

    for (const controlId of this.activeControls) {
      const controlFragment = this.controlFragmentMap.get(controlId);
      if (!controlFragment || !controlFragment.handlePointerInput) continue;

      controlFragment.handlePointerInput(activePointers, this.camera, this.target);
      this.camera.lookAt(this.target);
      this.camera.updateProjectionMatrix();
    }

    this.dispatchEvent('change', event);
  }

  private handleWheelChange(delta: number, activePointer: ActivePointer, event: WheelEvent): void {
    if (!this.enabled) return;

    this.dispatchEvent('start', event);

    for (const controlFragment of this.controlFragmentMap.values()) {
      if (!controlFragment.handleWheelInput) continue;

      controlFragment.handleWheelInput(delta, activePointer, this.camera, this.target);
    }
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();

    this.dispatchEvent('change', event);
    this.dispatchEvent('end', event);
  }

  protected updateStartValues(): void {
    this.start.cameraPos.copy(this.camera.position);
    this.start.cameraZoom = this.camera.zoom;
    this.start.target.copy(this.target);
  }
}

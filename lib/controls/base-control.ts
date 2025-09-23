import * as THREE from 'three';
import { Control } from './control';
import { PointerHandler, PointerHandlerOptions } from './handlers/pointer-handler';
import { ControlFragment } from '../control-fagments/control-fragment';
import { WheelHandler, WheelHandlerOptions } from './handlers/wheel-handler';
import { ActivePointer } from '../common/active-pointer';
import { ControlEventListener } from '../common/control-event-listener';
import { ControlEventType } from '../common/control-event-type';
import { ControllableCamera } from '../common/controllable-camera';

export interface BaseControlOptions {
  pointerHandlerOptions: PointerHandlerOptions;
  wheelHandlerOptions: WheelHandlerOptions;
}

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

  private listeners: { [key in ControlEventType]: ControlEventListener[] };

  protected camera: ControllableCamera;

  protected target: THREE.Vector3;

  constructor(
    camera: ControllableCamera,
    target: THREE.Vector3,
    controlFragmentMap: Map<string, ControlFragment>,
    options: BaseControlOptions,
  ) {
    this.enabled = true;
    this.camera = camera;
    this.target = target;
    this.listeners = {
      start: [],
      end: [],
      change: [],
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
    this.wheelHandler = new WheelHandler(
      options.wheelHandlerOptions,
      this.handleWheelChange.bind(this),
    );
  }

  protected updateHandlerOptions(options: Partial<BaseControlOptions>) {
    if (options.pointerHandlerOptions) {
      this.pointerHandler.updateOptions(options.pointerHandlerOptions);
    }
    if (options.wheelHandlerOptions) {
      this.wheelHandler.updateOptions(options.wheelHandlerOptions);
    }
  }

  getDistance() {
    return this.target.distanceTo(this.camera.position);
  }

  setDistance(distance: number) {
    const direction = this.camera.getWorldDirection(new THREE.Vector3());
    const newPosition = this.target.clone().sub(direction.multiplyScalar(distance));
    this.camera.position.copy(newPosition);
    this.dispatchAtomicEvent();
  }

  getZoom() {
    return this.camera.zoom;
  }

  setZoom(zoom: number) {
    this.camera.zoom = zoom;
    this.camera.updateProjectionMatrix();
    this.dispatchAtomicEvent();
  }

  attach(domElement: HTMLElement) {
    this.pointerHandler.attach(domElement);
    this.wheelHandler.attach(domElement);
  }

  detach(restoreTouchAction = true) {
    this.pointerHandler.detach(restoreTouchAction);
    this.wheelHandler.detach();
  }

  addEventListener(type: ControlEventType, listener: ControlEventListener) {
    this.listeners[type].push(listener);
  }

  removeEventListener(type: ControlEventType, listener: ControlEventListener) {
    this.listeners[type].filter((l) => l !== listener);
  }

  getTarget() {
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
  setTarget(target: THREE.Vector3, keepRelativeCameraPos = false) {
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

  getCamera() {
    return this.camera;
  }

  setCamera(camera: ControllableCamera) {
    this.camera = camera;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  protected dispatchAtomicEvent() {
    this.dispatchEvent('start');
    this.dispatchEvent('change');
    this.dispatchEvent('end');
  }

  protected dispatchEvent(type: ControlEventType) {
    for (const listener of this.listeners[type]) {
      listener();
    }
  }

  private handleActiveControlChange(activeControls: Set<string>, activePointers: ActivePointer[]) {
    this.updateStartValues();

    for (const [conrtolId, controlFragment] of this.controlFragmentMap.entries()) {
      if (activeControls.has(conrtolId)) {
        controlFragment.updateStartValues(activePointers, this.camera, this.target);
      }
    }
    this.activeControls = new Set(activeControls);
  }

  private handleInputChange(activePointers: ActivePointer[]) {
    if (!this.enabled) return;

    for (const controlId of this.activeControls) {
      const controlFragment = this.controlFragmentMap.get(controlId);
      if (!controlFragment || !controlFragment.handlePointerInput) continue;

      controlFragment.handlePointerInput(activePointers, this.camera, this.target);
      this.camera.lookAt(this.target);
      this.camera.updateProjectionMatrix();
    }

    this.dispatchEvent('change');
  }

  private handleWheelChange(delta: number, activePointer: ActivePointer) {
    if (!this.enabled) return;

    this.dispatchEvent('start');

    for (const controlFragment of this.controlFragmentMap.values()) {
      if (!controlFragment.handleWheelInput) continue;

      controlFragment.handleWheelInput(delta, activePointer, this.camera, this.target);
    }
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();

    this.dispatchEvent('change');
    this.dispatchEvent('end');
  }

  protected updateStartValues() {
    this.start.cameraPos.copy(this.camera.position);
    this.start.cameraZoom = this.camera.zoom;
    this.start.target.copy(this.target);
  }
}

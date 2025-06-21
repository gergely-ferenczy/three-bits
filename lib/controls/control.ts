import * as THREE from 'three';

import { ControllableCamera } from '../common/controllable-camera';
import { ControlEventType } from '../common/control-event-type';
import { ControlEventListener } from '../common/control-event-listener';

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

  addEventListener(type: ControlEventType, listener: ControlEventListener): void;

  removeEventListener(type: ControlEventType, listener: ControlEventListener): void;
}

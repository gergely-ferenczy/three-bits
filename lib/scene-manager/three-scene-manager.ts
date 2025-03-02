import * as THREE from 'three';

import { disposeObjectResources } from '../utils/dispose-object-resources';
import { syncCameras } from '../utils/sync-cameras';
import { ThreeEventDispatcher } from '../event-dispatcher/three-event-dispatcher';

export class ThreeSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderInProgress: boolean;
  private renderCallback: (() => void) | undefined;
  public eventDispatcher: ThreeEventDispatcher;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera;
    this.scene = new THREE.Scene();
    this.eventDispatcher = new ThreeEventDispatcher(domElement, camera);
    this.renderInProgress = false;
  }

  dispose() {
    this.scene.traverse((object: THREE.Object3D) => {
      disposeObjectResources(object);
    });
    this.eventDispatcher.dispose();
  }

  add(object: THREE.Object3D) {
    this.scene.add(object);
  }

  remove(object: THREE.Object3D, dispose = true) {
    if (dispose) {
      disposeObjectResources(object);
    }
    object.parent?.remove(object);
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  setCamera(camera: THREE.Camera, sync = false, target?: THREE.Vector3) {
    if (this.camera === camera) return;

    if (sync) {
      syncCameras(this.camera, camera, target ?? new THREE.Vector3());
    }
    this.camera = camera;
    this.eventDispatcher.setCamera(camera);
  }

  setRenderCallback(callback: () => void) {
    this.renderCallback = callback;
  }

  render(): void {
    this.renderCallback?.();
  }

  requestRender(): void {
    if (this.renderInProgress) return;

    this.renderInProgress = true;
    requestAnimationFrame(() => {
      this.renderInProgress = false;
      this.renderCallback?.();
    });
  }
}

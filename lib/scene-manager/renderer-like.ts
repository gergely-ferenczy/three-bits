import * as THREE from 'three';

export interface RendererLike {
  domElement: HTMLElement;

  render(scene: THREE.Object3D, camera: THREE.Camera): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  setPixelRatio(value: number): void;
}

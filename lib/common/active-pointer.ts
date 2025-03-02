import * as THREE from 'three';

export interface ActivePointer {
  id?: number;
  startCoords: THREE.Vector2;
  coords: THREE.Vector2;
  delta: THREE.Vector2;
}

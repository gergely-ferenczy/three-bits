import * as THREE from 'three';

import { ActivePointer } from '../active-pointer';

export function getCoordsFromActivePointers(activePointers: ActivePointer[]): THREE.Vector2 {
  if (activePointers.length == 2) {
    return new THREE.Vector2().lerpVectors(activePointers[0].coords, activePointers[1].coords, 0.5);
  } else {
    return activePointers[0].coords.clone();
  }
}

export function getStartCoordsFromActivePointers(activePointers: ActivePointer[]): THREE.Vector2 {
  if (activePointers.length == 2) {
    return new THREE.Vector2().lerpVectors(
      activePointers[0].startCoords,
      activePointers[1].startCoords,
      0.5,
    );
  } else {
    return activePointers[0].startCoords.clone();
  }
}

export function getDeltaCoordsFromActivePointers(activePointers: ActivePointer[]): THREE.Vector2 {
  if (activePointers.length == 2) {
    return new THREE.Vector2().lerpVectors(activePointers[0].delta, activePointers[1].delta, 0.5);
  } else {
    return activePointers[0].delta.clone();
  }
}

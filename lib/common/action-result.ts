import * as THREE from 'three';

interface ActionResult {
  targetDelta?: THREE.Vector3;
  cameraPosDelta?: THREE.Vector3;
  cameraZoomDelta?: number;
}

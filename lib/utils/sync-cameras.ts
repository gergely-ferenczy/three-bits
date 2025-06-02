import * as THREE from 'three';

import { getCameraAspectRatio } from './camera-aspect-ratio';

export function syncCameras(from: THREE.Camera, to: THREE.Camera, target: THREE.Vector3) {
  if (from instanceof THREE.PerspectiveCamera && to instanceof THREE.OrthographicCamera) {
    const pc = from;
    const oc = to;
    const distance = pc.position.distanceTo(target);
    const zoom = (1 / (distance * Math.tan(THREE.MathUtils.degToRad(0.5 * pc.fov)))) * pc.zoom;

    oc.left = -pc.aspect;
    oc.right = pc.aspect;
    oc.top = 1;
    oc.bottom = -1;
    oc.zoom = zoom;
    oc.position.copy(pc.position);
    oc.lookAt(target);
    oc.updateProjectionMatrix();
  } else if (from instanceof THREE.OrthographicCamera && to instanceof THREE.PerspectiveCamera) {
    const oc = from;
    const pc = to;
    const distance =
      ((oc.top - oc.bottom) / 2 / oc.zoom / Math.tan(THREE.MathUtils.degToRad(0.5 * pc.fov))) *
      pc.zoom;
    const cameraDir = oc.position.clone().sub(target).normalize();
    pc.position.copy(target).add(cameraDir.multiplyScalar(distance));
    pc.aspect = getCameraAspectRatio(from);
    pc.lookAt(target);
    pc.updateProjectionMatrix();
  }
}

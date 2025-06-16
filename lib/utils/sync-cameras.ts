import * as THREE from 'three';

import { getCameraAspectRatio } from './camera-aspect-ratio';

/**
 * Synchronizes the position, orientation, and projection parameters between a
 * {@link THREE.PerspectiveCamera} and an {@link THREE.OrthographicCamera}.
 *
 * When converting from a PerspectiveCamera to an OrthographicCamera, this
 * function sets the orthographic camera's bounds, zoom, and position to match
 * the perspective camera's view.
 *
 * When converting from an OrthographicCamera to a PerspectiveCamera, it sets
 * the perspective camera's position and aspect ratio to match the orthographic
 * camera's view at the given target point.
 *
 * @note If either `from` or `to` is an unknown type of camera, the function
 * returns without any action.
 *
 * @param from Source camera which can be either a
 *  {@link THREE.PerspectiveCamera} or an {@link THREE.OrthographicCamera}.
 * @param to Destination camera which can be either a
 *  {@link THREE.PerspectiveCamera} or an {@link THREE.OrthographicCamera}.
 * @param target Point that the `from` source camera looks at.
 */
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

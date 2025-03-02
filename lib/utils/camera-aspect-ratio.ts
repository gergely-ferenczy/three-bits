import * as THREE from 'three';

/**
 * Returns the aspect ratio of a perspective or orthographic camera. If called
 * with any orher type of camera, it returns `1`.
 */
export function getCameraAspectRatio(
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera,
): number {
  let aspect;
  if (camera instanceof THREE.OrthographicCamera) {
    aspect = camera.right / camera.top;
  } else if (camera instanceof THREE.PerspectiveCamera) {
    aspect = camera.aspect;
  } else {
    aspect = 1;
  }
  return aspect;
}

// TODO: doc
export function updateCameraAspectRatio(camera: THREE.Camera, width: number, height: number) {
  const aspectRatio = width / height;
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();
  } else if (camera instanceof THREE.OrthographicCamera) {
    camera.right = camera.top * aspectRatio;
    camera.left = -camera.right;
    camera.updateProjectionMatrix();
  }
}

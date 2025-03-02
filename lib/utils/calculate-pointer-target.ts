import * as THREE from 'three';

/**
 * Calculates a target point in 3D space based on a pointer's 2D screen
 * coordinates.
 *
 * The function uses a raycaster to determine the intersection point of a ray
 * cast from the camera through the pointer coordinates on screen towards a
 * specified plane. It also calculates the intersection with a sphere centered
 * at the camera position whose radius is determined by the raycaster's far
 * plane distance. If the raycaster did not hit the plane, or the sphere
 * intersection is closer to the camera than the plane intersection, the
 * function returns the sphere intersection point projected onto the plane.
 *
 * This can be useful for implementing different kinds of controls, where the
 * motion of the pointer must be tracked on a specific plane in the scene.
 *
 * The function may return `null` if neither the plane nor the sphere intersects
 * the ray.
 *
 * @param camera Camera used for raycasting.
 * @param plane Plane used for intersection calculations.
 * @param ray Ray used for plane intersection calculations.
 * @param maxDistance Distance used as the bounding sphere radius.
 * @returns Intersection point of the ray with the plane or the sphere,
 * depending on their distances to the camera.
 */
export function calculatePointerTarget(
  camera: THREE.Camera,
  plane: THREE.Plane,
  ray: THREE.Ray,
  maxDistance?: number,
): THREE.Vector3 | null {
  let planeIntersection = ray.intersectPlane(plane, new THREE.Vector3());
  if (!planeIntersection && camera instanceof THREE.OrthographicCamera) {
    ray.direction.multiplyScalar(-1);
    planeIntersection = ray.intersectPlane(plane, new THREE.Vector3());
  }

  const projectedCameraPosition = plane.projectPoint(camera.position, new THREE.Vector3());
  if (planeIntersection) {
    if (maxDistance) {
      return projectedCameraPosition.add(
        planeIntersection.sub(projectedCameraPosition).clampLength(0, maxDistance),
      );
    } else {
      return planeIntersection;
    }
  } else if (maxDistance) {
    const sphere = new THREE.Sphere(camera.position, maxDistance);
    const sphereIntersection = ray.intersectSphere(sphere, new THREE.Vector3());
    if (sphereIntersection) {
      plane.projectPoint(sphereIntersection, sphereIntersection);
      return projectedCameraPosition.add(
        sphereIntersection.sub(projectedCameraPosition).setLength(maxDistance),
      );
    }
  }

  return null;
}

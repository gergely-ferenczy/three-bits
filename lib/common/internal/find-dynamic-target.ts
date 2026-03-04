import * as THREE from 'three';

export function findDynamicTarget(
  raycaster: THREE.Raycaster,
  source: THREE.Object3D | THREE.Object3D[],
  useInvisible: boolean = false,
): THREE.Vector3 | null {
  const intersections = Array.isArray(source)
    ? raycaster.intersectObjects(source)
    : raycaster.intersectObject(source);
  for (const i of intersections) {
    if (i.object.visible || useInvisible) {
      return i.point;
    }
  }
  return null;
}

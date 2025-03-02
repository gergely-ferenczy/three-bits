import * as THREE from 'three';

export function disposeObjectResources(object: THREE.Object3D) {
  const o = object as unknown as {
    geometry?: THREE.BufferGeometry;
    material?: THREE.Material | THREE.Material[];
  };
  if (o.geometry) {
    o.geometry.dispose();
  }
  if (Array.isArray(o.material)) {
    for (const material of o.material) {
      material.dispose();
    }
  } else if (o.material) {
    o.material.dispose();
  }
}

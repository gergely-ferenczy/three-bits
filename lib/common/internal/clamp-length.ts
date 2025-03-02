import * as THREE from 'three';

export function clampLength(
  value: THREE.Vector3,
  min: number,
  max: number,
  clampCallback?: (value: THREE.Vector3) => void,
) {
  const result = value.clone();
  const length = result.length();
  if (length < min) {
    result.divideScalar(length).multiplyScalar(min);
    clampCallback?.(result);
  } else if (length > max) {
    result.divideScalar(length).multiplyScalar(max);
    clampCallback?.(result);
  }
  return result;
}

import * as THREE from 'three';

function formatNumber(value: number, decimals: number, padding?: number) {
  return padding !== undefined
    ? value.toFixed(decimals).padStart(padding)
    : value.toFixed(decimals);
}

/**
 * Returns the Three.js vector as a formatted string.
 *
 * @example
 * debugPrint(new Vector2(2.221, 3.325), 2)
 * // Output: [1.00, 2.22, 3.33]
 * debugPrint(new Vector3(1.23456789, -123, 0))
 * // Output: [1.235 -123.000 0.000]
 * debugPrint(new THREE.Vector4(1.23456789, -123, 0, -9.8765), 3, 8)
 * // Output: [   1.235 -123.000    0.000   -9.877]
 */
export function debugPrint(object: THREE.Vector2, decimals?: number, padding?: number): string;
export function debugPrint(object: THREE.Vector3, decimals?: number, padding?: number): string;
export function debugPrint(object: THREE.Vector4, decimals?: number, padding?: number): string;
export function debugPrint(object: unknown, decimals = 3, padding?: number) {
  if (object instanceof THREE.Vector2) {
    return (
      `[${formatNumber(object.x, decimals, padding)}` +
      ` ${formatNumber(object.y, decimals, padding)}]`
    );
  } else if (object instanceof THREE.Vector3) {
    return (
      `[${formatNumber(object.x, decimals, padding)}` +
      ` ${formatNumber(object.y, decimals, padding)}` +
      ` ${formatNumber(object.z, decimals, padding)}]`
    );
  } else if (object instanceof THREE.Vector4) {
    return (
      `[${formatNumber(object.x, decimals, padding)}` +
      ` ${formatNumber(object.y, decimals, padding)}` +
      ` ${formatNumber(object.z, decimals, padding)}` +
      ` ${formatNumber(object.w, decimals, padding)}]`
    );
  }
}

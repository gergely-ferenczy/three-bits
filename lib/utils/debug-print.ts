import * as THREE from 'three';

function formatNumber(value: number, decimals: number, padding?: number) {
  return padding !== undefined
    ? value.toFixed(decimals).padStart(padding)
    : value.toFixed(decimals);
}

/**
 * Converts a Three.js vector to a formatted string in the form of [x, y, z].
 *
 * @example
 * formatVector(new Vector2(2.221, 3.325), 2)
 * // Output: [1.00, 2.22, 3.33]
 * formatVector(new Vector3(1.23456789, -123, 0))
 * // Output: [1.235 -123.000 0.000]
 * formatVector(new THREE.Vector4(1.23456789, -123, 0, -9.8765), 3, 8)
 * // Output: [   1.235 -123.000    0.000   -9.877]
 */
export function formatVector(object: THREE.Vector2, decimals?: number, padding?: number): string;
export function formatVector(object: THREE.Vector3, decimals?: number, padding?: number): string;
export function formatVector(object: THREE.Vector4, decimals?: number, padding?: number): string;
export function formatVector(object: unknown, decimals = 3, padding?: number) {
  const p = padding ?? decimals + 3;
  if (object instanceof THREE.Vector2) {
    return `[${formatNumber(object.x, decimals, p)},` + ` ${formatNumber(object.y, decimals, p)}]`;
  } else if (object instanceof THREE.Vector3) {
    return (
      `[${formatNumber(object.x, decimals, p)},` +
      ` ${formatNumber(object.y, decimals, p)},` +
      ` ${formatNumber(object.z, decimals, p)}]`
    );
  } else if (object instanceof THREE.Vector4) {
    return (
      `[${formatNumber(object.x, decimals, p)},` +
      ` ${formatNumber(object.y, decimals, p)},` +
      ` ${formatNumber(object.z, decimals, p)},` +
      ` ${formatNumber(object.w, decimals, p)}]`
    );
  }
}

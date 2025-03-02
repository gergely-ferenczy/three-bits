import * as THREE from 'three';

/**
 * Calculates normalized device coordinates (NDC) from a pointer event.
 *
 * Converts the pointer's offset position within the canvas element into a
 * `THREE.Vector2` representing normalized device coordinates, where:
 * - X ranges from -1 (left) to 1 (right)
 * - Y ranges from -1 (bottom) to 1 (top)
 *
 * These coordinates are often used for raycasting or interaction in 3D scenes
 * using Three.js.
 *
 * @param event Pointer event containing `clientX` and `clientY` relative
 * to the canvas.
 * @param domElement HTML element on which the pointer event occurred.
 * @param output When set, the result will be copied into this parameter instead
 * of creating a new Vector2 instance.
 * @returns A `THREE.Vector2` representing the pointer's position in normalized
 * device coordinates.
 */
export function calculatePointerCoords(
  event: { clientX: number; clientY: number },
  domElement: HTMLElement,
  output?: THREE.Vector2,
): THREE.Vector2 {
  const rect = domElement.getBoundingClientRect();
  const result = output ?? new THREE.Vector2();
  return result.set(
    ((event.clientX - rect.left) / domElement.clientWidth) * 2 - 1,
    -(((event.clientY - rect.top) / domElement.clientHeight) * 2 - 1),
  );
}

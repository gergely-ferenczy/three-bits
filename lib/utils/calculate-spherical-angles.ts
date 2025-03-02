import * as THREE from 'three';

/**
 * Calculates the horizontal and vertical angles of a vector in radians.
 *
 * The function conforms with Three.js defaults and considers the Y axis the
 * vertical direction.
 *
 * - `verticalAngle` is the angle between the vector and the X-Z plane in the
 *    range of `[-PI, PI]`. Sometimes also called polar angle.
 * - `horizontalAngle` is the angle in the X-Z plane from the Z-axis in the
 *    range of `[-PI/2, PI/2]`, measured counter-clockwise. Sometimes also called
 *    azimuth angle.
 *
 * Here are some example inputs and their respective outputs:
 * @example
 *  x  y  z       vertical  horizontal
 * [ 0,  0,  1]    0°        0°
 * [ 1,  0,  1]    0°       -45°
 * [ 1,  0,  0]    0°       -90°
 * [-1,  0,  1]    0°        45°
 * [-1,  0,  0]    0°        90°
 * [ 0,  1,  1]    45°       0°
 * [ 0, -1,  1]   -45°       0°
 *
 * @param vector Input vector.
 * @returns The calculated vertical (polar) and horizontal (azimuth) angles.
 */
export function calculateSphericalAngles(vector: THREE.Vector3) {
  const v = vector;
  const horizontalDistance = Math.sqrt(v.x ** 2 + v.z ** 2);
  const verticalAngle = Math.atan2(v.y, horizontalDistance);
  const horizontalAngle = -Math.atan2(v.x, v.z);
  return { verticalAngle, horizontalAngle };
}

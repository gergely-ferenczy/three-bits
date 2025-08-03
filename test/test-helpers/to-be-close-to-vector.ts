import * as THREE from 'three';
import { expect } from 'vitest';

import 'vitest';
import { formatVector } from '../../lib/utils';

interface ToBeCloseToVectorMatcher<R = unknown> {
  toBeCloseToVector: (expected: THREE.Vector3, epsilon?: number, numDigits?: number) => R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends ToBeCloseToVectorMatcher<T> {}
  interface AsymmetricMatchersContaining extends ToBeCloseToVectorMatcher {}
}

expect.extend({
  toBeCloseToVector(
    actual: THREE.Vector3,
    expected: THREE.Vector3,
    epsilon: number = 1e-5,
    numDigits: number = 5,
  ) {
    const dx = Math.abs(actual.x - expected.x);
    const dy = Math.abs(actual.y - expected.y);
    const dz = Math.abs(actual.z - expected.z);

    const pass = dx < epsilon && dy < epsilon && dz < epsilon;
    const padding = numDigits + 3;

    return {
      pass,
      message: () =>
        `Expected vectors${this.isNot ? ' not' : ''} to be close within epsilon ${epsilon.toFixed(numDigits)}\n` +
        `Actual:   ${formatVector(actual, numDigits, padding)})\n` +
        `Expected: ${formatVector(expected, numDigits, padding)}\n` +
        `Delta:    ${formatVector(new THREE.Vector3(dx, dy, dz), numDigits, padding)}`,
    };
  },
});

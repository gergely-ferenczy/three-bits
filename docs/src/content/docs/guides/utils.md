---
title: Utils
---

three-bits exports a set of standalone utility functions for common Three.js tasks. All functions are tree-shakable and have no side effects.

## `calculatePointerCoords`

Converts a pointer event's client position into normalized device coordinates (NDC) for use with `THREE.Raycaster`.

NDC range: X and Y each run from `-1` (left/bottom) to `+1` (right/top).

```ts
import { calculatePointerCoords } from 'three-bits';

renderer.domElement.addEventListener('pointermove', (event) => {
  const coords = calculatePointerCoords(event, renderer.domElement);
  raycaster.setFromCamera(coords, camera);
});
```

An optional third argument accepts an existing `THREE.Vector2` to write into, avoiding allocation in hot paths:

```ts
const coords = new THREE.Vector2();
renderer.domElement.addEventListener('pointermove', (event) => {
  calculatePointerCoords(event, renderer.domElement, coords);
  raycaster.setFromCamera(coords, camera);
});
```

## `calculatePointerTarget`

Raycasts from a camera through 2D pointer coordinates and returns the intersection point with a plane, falling back to a bounding sphere when the ray misses the plane. Returns `null` if neither is hit.

Useful when implementing custom drag interactions that need to track a pointer on a specific world-space plane.

```ts
import { calculatePointerTarget } from 'three-bits';

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ray = new THREE.Ray();

renderer.domElement.addEventListener('pointermove', (event) => {
  const coords = calculatePointerCoords(event, renderer.domElement);
  raycaster.setFromCamera(coords, camera);
  ray.copy(raycaster.ray);

  const target = calculatePointerTarget(camera, groundPlane, ray);
  if (target) {
    draggedObject.position.copy(target);
  }
});
```

The optional `maxDistance` parameter clamps how far from the camera the intersection can be, useful to prevent objects from being dragged to infinity when the ray nearly grazes the plane.

## `calculateSphericalAngles`

Decomposes a `THREE.Vector3` direction into horizontal (azimuth) and vertical (polar) angles in radians, following Three.js conventions (Y up).

```ts
import { calculateSphericalAngles } from 'three-bits';

const dir = camera.getWorldDirection(new THREE.Vector3());
const { horizontalAngle, verticalAngle } = calculateSphericalAngles(dir);

console.log('yaw:', THREE.MathUtils.radToDeg(horizontalAngle));
console.log('pitch:', THREE.MathUtils.radToDeg(verticalAngle));
```

Angle conventions:

| Direction             | `horizontalAngle` | `verticalAngle` |
| --------------------- | ----------------- | --------------- |
| `(0, 0, 1)` - forward | 0°                | 0°              |
| `(1, 0, 0)` - right   | −90°              | 0°              |
| `(−1, 0, 0)` - left   | 90°               | 0°              |
| `(0, 1, 0)` - up      | 0°                | 90°             |

## `syncCameras`

Synchronizes position, orientation, and projection between a `PerspectiveCamera` and an `OrthographicCamera`. Useful when toggling between perspective and orthographic views without jarring jumps.

```ts
import { syncCameras } from 'three-bits';

const perspCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
const target = new THREE.Vector3(); // the point the camera looks at

// Switch from perspective to orthographic
syncCameras(perspCamera, orthoCamera, target);
renderer.render(scene, orthoCamera);

// Switch back
syncCameras(orthoCamera, perspCamera, target);
renderer.render(scene, perspCamera);
```

When using `OrbitControl` or `FpvControl`, pass `control.getTarget()` as the target:

```ts
syncCameras(perspCamera, orthoCamera, control.getTarget());
control.setCamera(orthoCamera);
```

## `getCameraAspectRatio`

Returns the aspect ratio of a `PerspectiveCamera` or `OrthographicCamera`. Returns `1` for any other camera type.

```ts
import { getCameraAspectRatio } from 'three-bits';

const aspect = getCameraAspectRatio(camera);
```

## `updateCameraAspectRatio`

Updates a camera's aspect ratio after a canvas resize and calls `updateProjectionMatrix()`. Works for both `PerspectiveCamera` and `OrthographicCamera`.

```ts
import { updateCameraAspectRatio } from 'three-bits';

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraAspectRatio(camera, window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
});
```

## `disposeObjectResources`

Disposes of the `geometry` and `material` (or array of materials) attached to a single `Object3D`. This does not traverse children - call it inside `object.traverse()` to dispose an entire hierarchy.

```ts
import { disposeObjectResources } from 'three-bits';

// Dispose a single mesh
disposeObjectResources(mesh);

// Dispose an entire scene graph
scene.traverse((object) => disposeObjectResources(object));
```

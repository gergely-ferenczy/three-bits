---
title: TrackballControl
---

`TrackballControl` is a free-rotation trackball: the camera rolls freely in all directions without maintaining a fixed up vector. Unlike `OrbitControl`, there is no polar angle clamping - the camera can orbit over the poles and roll freely, so the horizon is not preserved. The equivalent in three.js is `TrackballControls`.

## Basic usage

```ts
import { TrackballControl } from 'three-bits';

const control = new TrackballControl(camera);
control.attach(renderer.domElement);

control.addEventListener('change', () => renderer.render(scene, camera));

// When the control is no longer needed, detach it to remove all DOM event
// listeners.
control.detach();
```

## Full configuration

```ts
import { TrackballControl, MouseButton, TouchGesture } from 'three-bits';

const control = new TrackballControl(camera, {
  rotation: {
    /**
     * Whether the rotation control is enabled.
     * @default true
     */
    enabled?: boolean;

    /**
     * Whether to compensate rotation sensitivity for camera zoom.
     * When enabled, pointer rotation deltas are divided by `camera.zoom`.
     * Useful when the control should maintain a consistent apparent rotation
     * speed while zooming.
     * @default false
     */
    zoomCompensation?: boolean;

    /**
     * Speed multiplier for rotation motion.
     * Can be a single number or an object specifying different speeds for each
     * input type.
     * @default 1
     */
    speed?: number | { pointer: number; touch: number };

    /**
     * Whether to invert horizontal rotation direction.
     * Can be a boolean or an object specifying different inversions for each
     * input type.
     * @default false
     */
    invertHorizontal?: boolean | { pointer: boolean; touch: boolean };

    /**
     * Whether to invert vertical rotation direction.
     * Can be a boolean or an object specifying different inversions for each
     * input type.
     * @default false
     */
    invertVertical?: boolean | { pointer: boolean; touch: boolean };

    /**
     * Configuration for dynamic origin detection.
     *
     * When provided (in orbit mode), raycasts against the specified objects to
     * dynamically determine the rotation origin based on what's under the pointer
     * at the start of the interaction.
     */
    dynamicOrigin?: {
      /**
       * The object(s) to raycast against for dynamic origin detection.
       */
      source: THREE.Object3D | THREE.Object3D[];

      /**
       * Whether to consider invisible objects when raycasting.
       * @default false
       */
      useInvisible?: boolean;
    } | null;

    /**
     * Whether to use the absolute world origin (0,0,0) as the rotation origin
     * when in orbit mode and no dynamic origin is detected.
     *
     * If false, uses the control target as the origin.
     * @default false
     */
    defaultToAbsoluteOrigin?: boolean;
  },
  truck: {
    /**
     * Whether the truck control is enabled.
     * @default true
     */
    enabled?: boolean;

    /**
     * Speed multiplier for truck motion.
     * Can be a single number or an object specifying different speeds for each
     * input type.
     * @default 1
     */
    speed?: number | { pointer: number; touch: number };

    /**
     * Constraint for truck motion.
     * - `THREE.Plane`: Locks trucking to the specified plane.
     * - `THREE.Vector3`: Locks trucking perpendicular to the specified direction
     *    vector.
     * - `null`: No constraint, trucking occurs perpendicular to the camera's view
     *    direction.
     * @default null
     */
    lock?: THREE.Plane | THREE.Vector3 | null;

    /**
     * Maximum distance a single truck motion can move the camera from its stating
     * position.
     *
     * Limits how far the raycaster will check for intersections with the truck
     * plane.
     * @default Infinity
     */
    maxDistance?: number;

    /**
     * Calculation mode for truck motion.
     * - `'exact'`: Uses raycasting to calculate precise intersection points with
     *    the truck plane.
     * - `'approximate'`: Uses delta coordinates for approximate calculations. Can
     *    be useful when trucking is locked to a fixed plane via the `lock`
     *    property.
     * @default 'exact'
     */
    mode?: 'exact' | 'approximate';

    /**
     * Configuration for dynamic target detection.
     *
     * When provided, raycasts against the specified objects recursively to
     * dynamically determine the truck plane based on what's under the pointer at
     * the start of the interaction.
     *
     * Only used in 'exact' mode.
     */
    dynamicTarget?: {
      /**
       * The object(s) to raycast against for dynamic target detection.
       */
      source: THREE.Object3D | THREE.Object3D[];

      /**
       * Whether to consider invisible objects when raycasting.
       */
      useInvisible: boolean;
    };
  },
  zoomOrDolly: {
    /**
     * Whether the zoom/dolly control is enabled.
     * @default true
     */
    enabled?: boolean;

    /**
     * The kind of camera motion to apply on zoom/dolly input.
     * - `'zoom'`: Adjusts `camera.zoom` (works best with orthographic cameras).
     * - `'dolly'`: Moves the camera position along the view axis.
     * - `'zoomAndDolly'`: Applies both simultaneously, balancing each against the
     *   configured min/max limits.
     * @default 'zoom'
     */
    type?: 'zoom' | 'dolly' | 'zoomAndDolly';

    /**
     * Secondary motion applied alongside the zoom/dolly to keep a world point
     * under the pointer.
     *
     * - `'none'`: No secondary motion.
     * - `'truck'`: Translates the camera and target so that the pointer remains
     *   over the same world point on the target plane.
     * - `'orbit'`: Rotates the camera around the target to preserve the world
     *   point under the pointer.
     * - `'rotate'`: Rotates the target around the camera to preserve the world
     *   point under the pointer.
     * @default 'truck'
     */
    secondaryMotion?: 'none' | 'truck' | 'orbit' | 'rotate';

    /**
     * Speed multiplier for zoom/dolly motion.
     * Can be a single number or an object specifying different speeds for each
     * input type.
     * @default 1
     */
    speed?: number | { pointer: number; touch: number; scroll: number };

    /**
     * Whether to invert the zoom/dolly direction.
     * Can be a boolean or an object specifying different inversions for each
     * input type.
     * @default false
     */
    invert?: boolean | { pointer: boolean; touch: boolean; scroll: boolean };

    /**
     * Minimum allowed distance between the camera and the target.
     *
     * Only applies when `type` is `'dolly'` or `'zoomAndDolly'`.
     * @default 0
     */
    minDistance?: number;

    /**
     * Maximum allowed distance between the camera and the target.
     *
     * Only applies when `type` is `'dolly'` or `'zoomAndDolly'`.
     * @default Infinity
     */
    maxDistance?: number;

    /**
     * Minimum allowed value for `camera.zoom`.
     *
     * Only applies when `type` is `'zoom'` or `'zoomAndDolly'`.
     * @default -Infinity
     */
    minZoom?: number;

    /**
     * Maximum allowed value for `camera.zoom`.
     *
     * Only applies when `type` is `'zoom'` or `'zoomAndDolly'`.
     * @default Infinity
     */
    maxZoom?: number;

    /**
     * How the dolly step size is calculated.
     * - `'scale'`: Multiplies the current camera-to-target distance by a factor
     *   derived from the delta (relative motion).
     * - `'fixed'`: Moves the camera by a fixed world-space amount proportional to
     *   the delta (linear motion).
     * @default 'scale'
     */
    dollyType?: 'fixed' | 'scale';
  },
  inputMappings: {
    rotate: [{ mouseButton: MouseButton.Primary, touchGesture: TouchGesture.One }],
    truck: [{ mouseButton: MouseButton.Secondary, touchGesture: TouchGesture.Two }],
    zoomOrDolly: [{ mouseButton: MouseButton.Auxiliary }],
  },
});
```

## Dynamic orbit origin

By default, the camera always rotates around the fixed control target. With `dynamicOrigin`, the rotation pivot snaps to whatever geometry is under the pointer at the start of each drag - the same CAD/DCC-style behaviour as in `OrbitControl`. Because `TrackballControl` has no angle clamping, the dynamic pivot is especially useful: it lets users freely spin around any part of a complex model without repositioning the target.

```ts
const control = new TrackballControl(camera, {
  rotation: {
    dynamicOrigin: {
      source: scene, // Object3D or Object3D[] to raycast against
      useInvisible: false,
    },
  },
});
```

## Dynamic truck target

When `dynamicTarget` is set, the truck plane is determined by raycasting into the scene at the start of the interaction, so the camera slides along the surface under the pointer rather than an abstract plane through the control target. See [OrbitControl - Dynamic truck target](/guides/controls/orbit-control/#dynamic-truck-target) for a detailed explanation.

```ts
const control = new TrackballControl(camera, {
  truck: {
    dynamicTarget: {
      source: scene,
      useInvisible: false,
    },
  },
});
```

## Locking the truck plane

By default trucking slides the camera and target freely in any direction perpendicular to the view. The `lock` option constrains that motion to a specific plane or axis, which is useful whenever the scene has a natural ground or working plane that trucking should respect.

**Lock to a plane**: The camera slides only within the given `THREE.Plane`, regardless of where the camera is pointing. A common use case is an architectural or GIS viewer where trucking should always stay on the ground plane:

```ts
// XZ plane at Y=0
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const control = new TrackballControl(camera, {
  truck: {
    lock: groundPlane,
    mode: 'approximate', // Approximate mode can be useful when locked to a
  }, // fixed plane
});
```

**Lock to a direction vector**: The camera slides only in a plane perpendicular to the given `THREE.Vector3`. This is useful when you want to prevent drifting along a particular axis, for example keeping a front-elevation view locked to the vertical plane:

```ts
const control = new TrackballControl(camera, {
  truck: {
    lock: new THREE.Vector3(1, 0, 0), // Perpendicular to X = the YZ plane
    mode: 'approximate',
  },
});
```

:::note
When using `lock`, switch `mode` to `'approximate'`. The `'exact'` mode raycasts against scene geometry to find the intersection point on the truck plane; with a fixed lock plane that geometry is often absent, and the raycast may miss entirely.
:::

## Updating options at runtime

```ts
control.updateOptions({
  rotation: { speed: 2 },
  truck: { enabled: false },
});
```

## Comparison with three.js TrackballControls

| Feature                          | three.js TrackballControls             | three-bits TrackballControl                      |
| -------------------------------- | -------------------------------------- | ------------------------------------------------ |
| Free rotation (no fixed up)      | ✓                                      | ✓                                                |
| Min / max distance / zoom        | ✓                                      | ✓                                                |
| Rotate / pan / zoom enable flags | `noRotate`, `noPan`, `noZoom`          | Per-fragment `enabled` option                    |
| Speed control                    | `rotateSpeed`, `panSpeed`, `zoomSpeed` | Per-fragment `speed` (per-input-type)            |
| Damping                          | `staticMoving`, `dynamicDampingFactor` | ✗                                                |
| `handleResize()`                 | Required after window resize           | Not needed                                       |
| `reset()`                        | ✓                                      | ✗                                                |
| Input inversion                  | ✗                                      | `invertHorizontal`, `invertVertical`             |
| Truck plane lock                 | ✗                                      | `lock` (plane or direction)                      |
| Dynamic orbit origin             | ✗                                      | `dynamicOrigin`: raycasts to pick rotation pivot |
| Truck dynamic target             | ✗                                      | `dynamicTarget`: raycasts to pick pan plane      |
| Zoom vs dolly choice             | ✗                                      | `type: 'zoom' \| 'dolly' \| 'zoomAndDolly'`      |
| Custom input mappings            | Key-modifier mode switching only       | `inputMappings`                                  |
| Requires `update()` each frame   | Always                                 | Never                                            |

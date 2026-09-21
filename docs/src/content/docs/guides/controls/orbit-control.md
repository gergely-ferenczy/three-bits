---
title: OrbitControl
---

`OrbitControl` orbits the camera around a target point while keeping the world up axis fixed - meaning the camera can never roll, and the horizon always stays level. Vertical rotation is clamped just inside ±90° to prevent the camera from flipping upside-down when orbiting over the poles. It is the equivalent of three.js `OrbitControls`.

## Basic usage

```ts
import { OrbitControl } from 'three-bits';

const control = new OrbitControl(camera);
control.attach(renderer.domElement);

control.addEventListener('change', () => renderer.render(scene, camera));

// When the control is no longer needed, detach it to remove all DOM event
// listeners.
control.detach();
```

## Full configuration

```ts
import { OrbitControl, MouseButton, TouchGesture } from 'three-bits';
import * as THREE from 'three';

const control = new OrbitControl(camera, {
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
     * Minimum horizontal (azimuth) rotation angle in radians.
     *
     * Clamped between -2π and the maxHorizontalAngle.
     * @default -Infinity
     */
    minHorizontalAngle?: number;

    /**
     * Maximum horizontal (azimuth) rotation angle in radians.
     *
     * Clamped between the minHorizontalAngle and 2π.
     * @default Infinity
     */
    maxHorizontalAngle?: number;

    /**
     * Minimum vertical (polar) rotation angle in radians.
     *
     * Cannot be less than approximately -π/2 to prevent gimbal lock.
     * @default approximately -π/2
     */
    minVerticalAngle?: number;

    /**
     * Maximum vertical (polar) rotation angle in radians.
     *
     * Cannot exceed approximately π/2 to prevent gimbal lock.
     * @default approximately π/2
     */
    maxVerticalAngle?: number;

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
    rotate: [
      { mouseButton: MouseButton.Primary, touchGesture: TouchGesture.One }
    ],
    truck: [
      { mouseButton: MouseButton.Secondary, touchGesture: TouchGesture.Two }
    ],
    zoomOrDolly:[
      { mouseButton: MouseButton.Auxiliary }
    ],
  },
});
```

## Dynamic orbit origin

By default, the camera always orbits around the fixed control target - a single point in world space. This is fine for simple scenes, but feels unnatural when the user wants to inspect different parts of a model: orbiting around a point that is far from the area of interest causes the scene to swing wildly around an invisible anchor.

With `dynamicOrigin`, the orbit pivot snaps to whatever geometry is under the pointer at the start of each drag. This is how viewport controls work in most CAD and DCC tools (Blender, Maya, etc.) - you orbit around what you're looking at, not around an arbitrary world-space point. The result is that every part of the scene feels equally easy to inspect, without ever needing to manually reposition the target.

```ts
const control = new OrbitControl(camera, {
  rotation: {
    dynamicOrigin: {
      source: scene, // Object3D or Object3D[] to raycast against
      useInvisible: false,
    },
  },
});
```

## Dynamic truck target

By default, trucking slides the camera along a plane that is perpendicular to the camera's view direction and passes through the control target. This works well for abstract scenes, but breaks down when the geometry under the pointer is far from the target - the camera ends up sliding past objects at a very different rate from what the pointer suggests.

When `dynamicTarget` is set, the truck plane is determined by raycasting into the scene at the moment the interaction begins. The camera then slides along the plane that passes through whatever world point was under the pointer, giving a natural "grab and drag" feeling regardless of scene depth.

```ts
const control = new OrbitControl(camera, {
  truck: {
    dynamicTarget: {
      source: scene, // Object3D or Object3D[] to raycast against
      useInvisible: false,
    },
  },
});
```

## Reading and writing the look direction

```ts
// Get current angles
const h = control.getHorizontalAngle(); // yaw in radians
const v = control.getVerticalAngle(); // pitch in radians

// Snap the camera to face a specific direction programmatically
control.setHorizontalAngle(Math.PI / 2);
control.setVerticalAngle(0);
```

This pairs well with `dynamicOrigin`. Both features use the same pick-under-pointer approach, so orbit and trucking feel consistent with each other.

## Locking the truck plane

By default trucking slides the camera and target freely in any direction perpendicular to the view. The `lock` option constrains that motion to a specific plane or axis, which is useful whenever the scene has a natural ground or working plane that trucking should respect.

**Lock to a plane**: The camera slides only within the given `THREE.Plane`, regardless of where the camera is pointing. A common use case is an architectural or GIS viewer where trucking should always stay on the ground plane:

```ts
// XZ plane at Y=0
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const control = new OrbitControl(camera, {
  truck: {
    lock: groundPlane,
    mode: 'approximate', // Approximate mode can be useful when locked to a
  }, // fixed plane
});
```

**Lock to a direction vector**: The camera slides only in a plane perpendicular to the given `THREE.Vector3`. This is useful when you want to prevent drifting along a particular axis, for example keeping a front-elevation view locked to the vertical plane:

```ts
const control = new OrbitControl(camera, {
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

## Comparison with three.js OrbitControls

| Feature                          | three.js OrbitControls                  | three-bits OrbitControl                               |
| -------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| Fixed up vector                  | ✓                                       | ✓                                                     |
| Min / max polar & azimuth angles | ✓                                       | ✓                                                     |
| Min / max distance / zoom        | ✓                                       | ✓                                                     |
| Rotate / pan / zoom enable flags | Per-feature booleans                    | Per-fragment `enabled` option                         |
| Speed control                    | `rotateSpeed`, `panSpeed`, `zoomSpeed`  | Per-fragment `speed` (uniform or per-input-type)      |
| Input inversion                  | ✗                                       | `invertHorizontal`, `invertVertical` (per-input-type) |
| Damping / inertia                | `enableDamping` + `update()` each frame | ✗                                                     |
| Auto-rotate                      | `autoRotate` + `update()` each frame    | ✗                                                     |
| `saveState` / `reset`            | ✓                                       | ✗                                                     |
| Keyboard pan / rotate            | `listenToKeyEvents`                     | ✗                                                     |
| Zoom to cursor                   | `zoomToCursor`                          | Via `secondaryMotion: 'orbit'` on zoom fragment       |
| Dynamic orbit origin             | ✗                                       | `dynamicOrigin`: raycasts to pick rotation pivot      |
| Truck plane lock                 | ✗                                       | `lock` (plane or direction)                           |
| Truck dynamic target             | ✗                                       | `dynamicTarget`: raycasts to pick pan plane           |
| Zoom vs dolly choice             | ✗ (always dolly)                        | `type: 'zoom' \| 'dolly' \| 'zoomAndDolly'`           |
| Custom input mappings            | `mouseButtons`, `touches`               | `inputMappings`                                       |
| Requires `update()` each frame   | Only with damping/autoRotate            | Never                                                 |

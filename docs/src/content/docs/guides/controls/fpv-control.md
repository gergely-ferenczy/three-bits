---
title: FpvControl
---

`FpvControl` rotates the camera around its own position - the camera itself is the pivot, so the world appears to turn as the viewer looks around. Like `OrbitControl`, the up axis stays fixed and vertical rotation is clamped just inside ±90° to prevent flipping. It shares the same options as `OrbitControl`. The conceptual equivalent in three.js is `FirstPersonControls`.

`FpvControl` is focused purely on pointer-driven look rotation. It does not implement keyboard walking, which keeps it lean for use cases like panorama viewers, map pitch-tilt controls, or any scenario where movement is handled separately.

## Basic usage

```ts
import { FpvControl } from 'three-bits';

const control = new FpvControl(camera);
control.attach(renderer.domElement);

control.addEventListener('change', () => renderer.render(scene, camera));

// When the control is no longer needed, detach it to remove all DOM event
// listeners.
control.detach();
```

## Full configuration

```ts
import { FpvControl, MouseButton, TouchGesture } from 'three-bits';

const control = new FpvControl(camera, {
  rotation: {
    /**
     * Whether the rotation control is enabled.
     * @default true
     */
    enabled?: boolean;

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
    zoomOrDolly: [
      { mouseButton: MouseButton.Auxiliary }
    ],
  },
});
```

## Panoramic zoom with `secondaryMotion: 'rotate'`

In a standard panoramic viewer the camera sits at a fixed position inside a sphere or cube, and the user only ever looks around - the camera never moves. Setting `secondaryMotion: 'rotate'` keeps the camera locked in place while zooming: instead of translating toward or away from the target, the secondary motion rotates the target around the camera to keep the point under the pointer stationary as the field of view changes - exactly like pinch-to-zoom on a phone photo.

```ts
const control = new FpvControl(camera, {
  zoomOrDolly: {
    type: 'zoom', // adjust FOV, not camera position
    secondaryMotion: 'rotate', // rotate target around camera instead of trucking
    minZoom: 1, // prevent zooming out beyond the original FOV
    maxZoom: 10, // limit how far in the user can zoom
  },
  truck: {
    enabled: false, // no panning - camera stays at the origin
  },
});
```

This also pairs naturally with a locked horizontal or vertical range if the panorama only covers a limited field of view:

```ts
const control = new FpvControl(camera, {
  rotation: {
    minHorizontalAngle: -Math.PI / 2,
    maxHorizontalAngle: Math.PI / 2,
    minVerticalAngle: -Math.PI / 4,
    maxVerticalAngle: Math.PI / 4,
  },
  zoomOrDolly: {
    type: 'zoom',
    secondaryMotion: 'rotate',
    minZoom: 1,
    maxZoom: 8,
  },
  truck: { enabled: false },
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

## Updating options at runtime

```ts
control.updateOptions({
  rotation: { speed: 2 },
  truck: { enabled: false },
});
```

## Comparison with three.js FirstPersonControls

| Feature                             | three.js FirstPersonControls | three-bits FpvControl                                    |
| ----------------------------------- | ---------------------------- | -------------------------------------------------------- |
| Rotate around camera                | ✓                            | ✓                                                        |
| Look speed                          | `lookSpeed`                  | `rotation.speed`                                         |
| Vertical look toggle                | `lookVertical`               | `rotation.minVerticalAngle` / `maxVerticalAngle`         |
| Min / max vertical angle            | `verticalMin`, `verticalMax` | `rotation.minVerticalAngle`, `rotation.maxVerticalAngle` |
| Input inversion                     | ✗                            | `invertHorizontal`, `invertVertical`                     |
| Keyboard-driven movement (WASD)     | ✓                            | ✗                                                        |
| Auto-forward                        | `autoForward`                | ✗                                                        |
| Height-based speed                  | `heightSpeed` + `heightCoef` | ✗                                                        |
| Trucking                            | ✗                            | ✓                                                        |
| Zoom / dolly                        | ✗                            | ✓                                                        |
| Requires `update(delta)` each frame | Always                       | Never                                                    |
| Custom input mappings               | ✗                            | `inputMappings`                                          |

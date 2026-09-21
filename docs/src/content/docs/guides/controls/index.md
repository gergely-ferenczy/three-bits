---
title: Controls
---

three-bits provides three camera controls: `OrbitControl`, `FpvControl`, and `TrackballControl`. Each one is built from composable fragments for rotation, trucking, and zoom/dolly. All three share the same base API and the same option structure.

## Shared API

Every control exposes the same lifecycle, camera, and event methods.

### Lifecycle

```ts
// Attach to a DOM element to start handling input
control.attach(renderer.domElement);

// Detach - pass false to skip restoring the CSS touch-action property
control.detach();

// Dynamically enable or disable without detaching
control.enable();
control.disable();
```

### Camera and target

```ts
control.setTarget(new THREE.Vector3(0, 0, 0));
control.setTarget(new THREE.Vector3(0, 0, 0), true); // keepRelativeCameraPos

control.getTarget(); // returns a clone of the target Vector3
control.getDistance(); // distance between camera and target
control.setDistance(5);
control.getZoom(); // camera.zoom
control.setZoom(2);
control.getCamera();
control.setCamera(newCamera);
```

### Events

All controls fire `start`, `change`, and `end` events, matching the three.js controls convention. Listeners receive the native `PointerEvent` or `WheelEvent` that triggered the event for pointer and wheel interactions.

- `start` fires when an interaction starts.
- `change` fires when the camera or target changes.
- `end` fires when an interaction ends.

These events also fire for manual changes made through methods such as `setTarget`, `setDistance`, `setZoom`, etc. Manual changes do not have a native event, so the listener parameter is `undefined` in those cases.

```ts
control.addEventListener('start', (event) => console.log('interaction started', event));
control.addEventListener('change', (event) => renderer.render(scene, camera));
control.addEventListener('end', (event) => console.log('interaction ended', event));

control.removeEventListener('change', myListener);
```

### Animation loop

Unlike some three.js controls, none of the three-bits controls require `update()` to be called every frame. Only attach, interact, and listen for `change`.

## Custom input mappings

All three controls accept an `inputMappings` option that remaps which mouse buttons and touch gestures trigger which actions.

```ts
import { OrbitControl, MouseButton, TouchGesture } from 'three-bits';

const control = new OrbitControl(camera, {
  inputMappings: {
    rotate: [{ mouseButton: MouseButton.Primary, touchGesture: TouchGesture.One }],
    truck: [{ mouseButton: MouseButton.Secondary, touchGesture: TouchGesture.Two }],
    zoomOrDolly: [
      { mouseButton: MouseButton.Auxiliary },
      // Ctrl+left also zooms
      { mouseButton: MouseButton.Primary, modifiers: { ctrl: true } },
    ],
  },
});
```

---
title: Event Handling
---

`TbEventDispatcher` brings DOM-style pointer and mouse events to Three.js `Object3D` instances. It attaches to a canvas element, uses a `Raycaster` to determine which objects are hit, and fires typed events with full propagation support - all without requiring any specific framework.

## Comparison with React Three Fiber events

[React Three Fiber (R3F)](https://r3f.docs.pmnd.rs/api/events) has a built-in event system that is tightly coupled to React's component model. Events are declared as JSX props on mesh elements:

```jsx
<mesh onClick={(e) => console.log('clicked')} />
```

`TbEventDispatcher` covers the same event surface but is **framework-agnostic**. It works identically in vanilla Three.js, React (without R3F), Vue, Svelte, Angular, or any other environment.

| Feature                            | React Three Fiber           | TbEventDispatcher               |
| ---------------------------------- | --------------------------- | ------------------------------- |
| Framework requirement              | React                       | None - works everywhere         |
| API style                          | Declarative (JSX props)     | Imperative (`addEventListener`) |
| Pointer events                     | ✓                           | ✓                               |
| Mouse events (`click`, `dblclick`) | ✓                           | ✓                               |
| Wheel events                       | ✓                           | ✓                               |
| `pointerenter` / `pointerleave`    | Aliased to over/out         | Full, correct semantics         |
| `pointerover` / `pointerout`       | ✓                           | ✓                               |
| Event bubbling                     | ✓                           | ✓                               |
| Capturing phase                    | ✗                           | ✓                               |
| `stopPropagation`                  | ✓                           | ✓                               |
| `stopImmediatePropagation`         | ✗                           | ✓                               |
| Global listeners (pointer missed)  | `onPointerMissed` on canvas | `addGlobalEventListener`        |
| Pointer capture                    | Via `event.target` only     | `dispatcher.setPointerCapture`  |
| `once` option                      | ✗                           | ✓                               |
| `AbortSignal` support              | ✗                           | ✓                               |
| Occlusion control                  | ✗                           | `ignoreOcclusion` option        |
| Invisible object events            | ✗                           | `includeInvisible` option       |
| Camera change refresh              | `useFrame` + `update()`     | `dispatcher.update()`           |

## Basic setup

Instantiate `TbEventDispatcher` with your canvas element and camera. Call `dispose()` when the scene is torn down.

```ts
import { TbEventDispatcher } from 'three-bits';
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const dispatcher = new TbEventDispatcher(renderer.domElement, camera);

// Clean up when done
// dispatcher.dispose();
```

You can optionally supply your own `Raycaster` to control precision, layers, or near/far limits:

```ts
const raycaster = new THREE.Raycaster();
raycaster.params.Line.threshold = 0.1;

const dispatcher = new TbEventDispatcher(renderer.domElement, camera, raycaster);
```

## Listening to events on objects

Use `addEventListener` with any `Object3D` - meshes, groups, lines, etc.:

```ts
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

dispatcher.addEventListener(mesh, 'click', (event) => {
  console.log('clicked', event.target);
  console.log('intersection point', event.intersections[0]?.point);
});

dispatcher.addEventListener(mesh, 'pointerenter', () => {
  mesh.material.color.set(0xff6600);
});

dispatcher.addEventListener(mesh, 'pointerleave', () => {
  mesh.material.color.set(0xffffff);
});
```

The `event` object contains:

| Property        | Description                                                    |
| --------------- | -------------------------------------------------------------- |
| `target`        | The `Object3D` the event originated on                         |
| `currentTarget` | The `Object3D` whose listener is currently executing           |
| `intersections` | All `THREE.Intersection` results from the raycast              |
| `ray`           | The `THREE.Ray` used for hit-testing                           |
| `camera`        | The camera used for raycasting                                 |
| `type`          | Event type string, e.g. `'pointerdown'`                        |
| `nativeEvent`   | The original DOM `PointerEvent`, `MouseEvent`, or `WheelEvent` |
| `eventPhase`    | `CAPTURING_PHASE`, `AT_TARGET`, or `BUBBLING_PHASE`            |

## Global listeners

`addGlobalEventListener` fires on every event of that type regardless of which object (if any) was hit. This is equivalent to R3F's `onPointerMissed` but more general - it fires for all events, not only misses.

```ts
dispatcher.addGlobalEventListener('click', (event) => {
  // event.target is undefined when no object was hit
  if (!event.target) {
    console.log('clicked empty space');
  }
});
```

## Animations: keeping intersections fresh

When the camera or objects move between frames, call `dispatcher.update()` so that `pointerenter`, `pointerleave`, `pointerover`, and `pointerout` events are re-evaluated even without user input.

```ts
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  dispatcher.update(); // refresh hover state after camera/object movement
  renderer.render(scene, camera);
}
animate();
```

If you swap the active camera, notify the dispatcher:

```ts
dispatcher.setCamera(newCamera);
```

## Event propagation

Events bubble up the `Object3D` scene graph, mirroring DOM propagation. A listener on a parent group receives events from child meshes.

```ts
const group = new THREE.Group();
const child = new THREE.Mesh(geometry, material);
group.add(child);
scene.add(group);

// Fires when child (or any descendant) is clicked
dispatcher.addEventListener(group, 'click', (event) => {
  console.log('group received click from', event.target.name);
});
```

Use `stopPropagation()` to prevent the event from reaching parent listeners or farther objects:

```ts
dispatcher.addEventListener(child, 'click', (event) => {
  event.stopPropagation(); // parent group won't receive this event
});
```

Use `stopImmediatePropagation()` to also prevent other listeners of the same type on the **same object** from running.

### Capturing phase

Register a listener in the capturing phase to intercept an event before it reaches its target:

```ts
dispatcher.addEventListener(
  group,
  'pointerdown',
  (event) => {
    console.log('capturing - fires before child handlers');
  },
  { capture: true },
);
```

## Pointer capture

Pointer capture forces all subsequent pointer events to a specific object, even if the pointer moves off it. This is useful for drag interactions.

```ts
dispatcher.addEventListener(mesh, 'pointerdown', (event) => {
  dispatcher.setPointerCapture(mesh, event.nativeEvent.pointerId);
});

dispatcher.addEventListener(mesh, 'pointermove', (event) => {
  if (dispatcher.hasPointerCapture(mesh, event.nativeEvent.pointerId)) {
    // drag logic here - fires even when pointer is outside the mesh
  }
});

dispatcher.addEventListener(mesh, 'pointerup', (event) => {
  dispatcher.releasePointerCapture(mesh, event.nativeEvent.pointerId);
});
```

## Listener options

`addEventListener` accepts an options object that mirrors the DOM `AddEventListenerOptions` plus two Three.js-specific additions:

```ts
dispatcher.addEventListener(mesh, 'click', handler, {
  // DOM-standard options
  capture: false, // run in capturing phase instead of bubbling
  once: true, // auto-remove after first invocation
  signal: controller.signal, // remove when AbortController is aborted

  // three-bits extensions
  ignoreOcclusion: true, // fire even when another object is in front
  includeInvisible: true, // fire even when mesh.visible === false
});
```

### Using AbortController to manage multiple listeners

```ts
const controller = new AbortController();
const { signal } = controller;

dispatcher.addEventListener(meshA, 'pointermove', onMove, { signal });
dispatcher.addEventListener(meshB, 'pointermove', onMove, { signal });
dispatcher.addEventListener(meshC, 'click', onClick, { signal });

// Remove all three listeners at once
controller.abort();
```

## Removing listeners

```ts
// Remove a specific listener
dispatcher.removeEventListener(mesh, 'click', handler);

// Remove all listeners from an object
dispatcher.removeAllEventListeners(mesh);
```

## Cleanup

Call `dispose()` to detach all DOM event listeners from the canvas element:

```ts
dispatcher.dispose();
```

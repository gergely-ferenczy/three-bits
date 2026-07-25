---
title: Transform Tool
---

`TransformTool` is a visual 3D gizmo for translating and rotating `Object3D` instances in the scene. It renders axis arrows, arc handles, and planar controls directly in the Three.js scene, and uses `TbEventDispatcher` for pointer interaction - so it works with the same event system as the rest of the library.

The tool automatically scales itself to stay a consistent screen size regardless of camera distance, and hides handles that would be too hard to interact with from the current viewing angle.

## Basic setup

The tool needs a `TbEventDispatcher` and must be added to the scene manually via `transformObject`.

```ts
import * as THREE from 'three';
import { TbEventDispatcher, TransformTool } from 'three-bits';

const dispatcher = new TbEventDispatcher(renderer.domElement, camera);

const tool = new TransformTool(dispatcher, {
  onRequestRender: () => renderer.render(scene, camera),
});

// Add the gizmo visuals to the scene
scene.add(tool.transformObject);

// Attach to an object - the gizmo will follow it
tool.attach(mesh);
```

`onRequestRender` is the only required option. It is called whenever the tool's appearance changes and a new render is needed.

When done, detach the tool and dispose of its resources:

```ts
tool.detach();
tool.dispose();
```

## Using with a control

When a camera control and the transform tool share the same canvas, pointer events intended for the tool should not also rotate the camera. Use the `onTransformStart` and `onTransformEnd` callbacks to temporarily disable the control:

```ts
const control = new OrbitControl(camera);
control.attach(renderer.domElement);

const tool = new TransformTool(dispatcher, {
  onRequestRender: () => renderer.render(scene, camera),
  onTransformStart: () => control.disable(),
  onTransformEnd: () => control.enable(),
});
```

## Reacting to changes

Use `onPositionChange` and `onRotationChange` to respond to each incremental update:

```ts
const tool = new TransformTool(dispatcher, {
  onRequestRender: () => renderer.render(scene, camera),

  onPositionChange: (startPosition, positionDelta) => {
    // startPosition - world position at the start of the drag
    // positionDelta - total displacement since drag started
    console.log('moved by', positionDelta);
  },

  onRotationChange: (startPosition, startRotation, rotationDelta, offset) => {
    // startPosition  - world position at the start of the drag
    // startRotation  - quaternion at the start of the drag
    // rotationDelta  - incremental rotation quaternion applied this frame
    // offset         - pivot offset from object origin
    console.log('rotated by', rotationDelta);
  },
});
```

## Manual update mode

By default (`autoUpdate: true`) the tool moves and rotates the attached object directly. Set `autoUpdate: false` to take full control - the callbacks still fire with the delta values, but the tool and its target are not moved automatically:

```ts
const tool = new TransformTool(dispatcher, {
  autoUpdate: false,
  onRequestRender: () => renderer.render(scene, camera),
  onPositionChange: (startPosition, delta) => {
    // apply the delta to your own state
    myObject.position.copy(startPosition).add(delta);
  },
});
```

## Disabling axes

Hide and disable individual translation or rotation handles:

{/* prettier-ignore */}

```ts
const tool = new TransformTool(dispatcher, {
  onRequestRender: () => renderer.render(scene, camera),

  disableTranslation: { x: false, y: true, z: false }, // Hide Y arrow
  disableRotation: true, // Hide all rotation arcs
});
```

`disableTranslation` and `disableRotation` each accept either a `boolean` (disable all) or an object with per-axis flags.

## Appearance options

```ts
const tool = new TransformTool(dispatcher, {
  onRequestRender: () => renderer.render(scene, camera),

  color: '#ffffff', // Fill color of all handles
  outlineColor: '#202020', // Outline color
  highlightColor: '#40e0d0', // Color when hovering
  lineWidth: 1.5, // Inner line width
  outlineLineWidth: 1, // Outline thickness
  scale: 1, // Relative size multiplier
});
```

## Render order

The tool renders with `depthTest: false` so it always appears on top. If you need it to appear above specific objects with a custom render order, use `baseRenderOrder`. The tool uses three consecutive render order slots starting from this value:

```ts
const tool = new TransformTool(dispatcher, {
  onRequestRender: () => renderer.render(scene, camera),
  baseRenderOrder: 10, // Tool uses slots 10, 11, 12
});
```

## Layers

`tool.layers` is a `THREE.Layers` proxy that propagates layer changes to all internal meshes and lines. Use it to control which cameras render the gizmo:

```ts
// Only render the tool on camera layer 1
tool.layers.set(1);
gizmoCamera.layers.enable(1);
mainCamera.layers.disable(1);
```

---
title: Getting Started
---

three-bits is a Three.js utility library that provides camera controls, a 3D event system, and many other useful bits and pieces. It is framework-agnostic. This is a zero dependency library, so it works with vanilla Three.js without any JavaScript framework.

## Installation

```sh
npm install three-bits
```

## Basic scene setup

three-bits does not manage the renderer, scene, or animation loop - those stay in your code. The library attaches to what you already have.

```ts
// Standard Three.js setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
const canvas = this.webglRenderer.domElement;
document.body.appendChild(canvas);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  1, // aspect will be updated in the resize function
  0.1,
  1000,
);
camera.position.set(0, 2, 5);

const control = new OrbitControl(camera);
control.updateOptions({
  rotation: {
    dynamicOrigin: { source: scene },
  },
});

control.attach(renderer.domElement);
control.addEventListener('change', () => renderer.render(scene, camera));

const resize = () => {
  const width = container.clientWidth * window.devicePixelRatio;
  const height = container.clientHeight * window.devicePixelRatio;
  ThreeBitUtils.updateCameraAspectRatio(this.activeCamera, width, height);
  renderer.render(scene, camera);
};
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(container);
resize(); // Also takes care of initial render
```

## Choosing a control

| Control                                                   | Best for                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`OrbitControl`](/guides/controls/orbit-control/)         | Inspecting objects - camera orbits around a target with a fixed horizon |
| [`FpvControl`](/guides/controls/fpv-control/)             | First-person look-around - camera pivots in place, no movement          |
| [`TrackballControl`](/guides/controls/trackball-control/) | Free 3D rotation - camera rolls without a fixed up vector               |

All three controls share the same [base API](/guides/controls/) and option structure.

## Adding 3D pointer events

`TbEventDispatcher` brings DOM-style pointer events to `Object3D` instances via raycasting. It is independent of the controls and can be used alongside them or on its own.

```ts
import { TbEventDispatcher } from 'three-bits';

const dispatcher = new TbEventDispatcher(renderer.domElement, camera);

dispatcher.addEventListener(mesh, 'click', (event) => {
  console.log('clicked at', event.intersections[0]?.point);
});

dispatcher.addEventListener(mesh, 'pointerenter', () => {
  mesh.material.color.set(0xff6600);
});

dispatcher.addEventListener(mesh, 'pointerleave', () => {
  mesh.material.color.set(0xffffff);
});
```

See [Event Handling](/guides/event-handling/) for the full API.

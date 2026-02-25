import * as THREE from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import {
  OrbitControl,
  PartialOrbitControlOptions,
  ThreeBitUtils,
  ThreeEventDispatcher,
  TransformTool,
} from '../../lib';

let perspectiveCamera: THREE.PerspectiveCamera;
let orthographicCamera: THREE.OrthographicCamera;
let activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;

init();
render();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.localClippingEnabled = true;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  perspectiveCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight);
  perspectiveCamera.position.set(-15, 6, 12);
  perspectiveCamera.lookAt(0, 0, 0);

  orthographicCamera = new THREE.OrthographicCamera();

  activeCamera = perspectiveCamera;

  const box = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
  scene.add(box);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshNormalMaterial());
  sphere.position.set(5, 0, 0);
  scene.add(sphere);
  const torus = new THREE.Mesh(new THREE.TorusKnotGeometry(), new THREE.MeshNormalMaterial());
  torus.scale.setScalar(0.5);
  torus.position.set(0, 0, -4);
  scene.add(torus);
  const icosahedron = new THREE.Mesh(
    new THREE.IcosahedronGeometry(),
    new THREE.MeshNormalMaterial(),
  );
  icosahedron.scale.setScalar(0.5);
  icosahedron.position.set(0, 4, 0);
  scene.add(icosahedron);

  const eventDispatcher = new ThreeEventDispatcher(renderer.domElement, activeCamera);
  const transformTool = new TransformTool(eventDispatcher, {
    onRequestRender: render,
    target: box,
  });
  transformTool.transformObject.position.set(0, 0, 0.5);
  box.add(transformTool.transformObject);

  const controlOptions: PartialOrbitControlOptions = {
    rotation: {
      dynamicOrigin: {
        source: scene,
        useInvisible: false,
      },
    },
  };

  const control = new OrbitControl(activeCamera, controlOptions);
  control.attach(renderer.domElement);
  control.addEventListener('change', render);

  const gui = new GUI();

  // Rotation options
  const cameraOptions: { type: 'orthographic' | 'perspective' } = { type: 'perspective' };
  const cameraFolder = gui.addFolder('Camera');
  cameraFolder.add(cameraOptions, 'type', ['perspective', 'orthographic']).onChange((value) => {
    if (value === 'orthographic') {
      ThreeBitUtils.syncCameras(perspectiveCamera, orthographicCamera, control.getTarget());
      activeCamera = orthographicCamera;
    } else {
      ThreeBitUtils.syncCameras(orthographicCamera, perspectiveCamera, control.getTarget());
      activeCamera = perspectiveCamera;
    }
    control.setCamera(activeCamera);
    eventDispatcher.setCamera(activeCamera);
    render();
  });

  window.addEventListener('resize', onWindowResize);
  onWindowResize();
}

function onWindowResize() {
  ThreeBitUtils.updateCameraAspectRatio(activeCamera, window.innerWidth, window.innerHeight);
  activeCamera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function render() {
  renderer.render(scene, activeCamera);
}

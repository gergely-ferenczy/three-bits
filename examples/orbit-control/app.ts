import * as THREE from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControl, OrbitControlOptions, ThreeBitUtils } from '../../lib';

let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
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

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight);
  // camera = new THREE.OrthographicCamera();
  // camera.zoom = 0.2

  camera.position.set(-15, 6, 12);
  camera.lookAt(0, 0, 0);

  // @ts-expect-error
  window.camera = camera;

  const controlOptions: Omit<OrbitControlOptions, 'inputMappings'> = {
    rotation: {
      enabled: true,
      speed: 2,
      minHorizontalAngle: -Infinity,
      maxHorizontalAngle: Infinity,
      minVerticalAngle: -Math.PI / 2,
      maxVerticalAngle: Math.PI / 2,
      invertHorizontal: false,
      invertVertical: false,
      dynamicOrigin: {
        source: scene,
        useInvisible: false,
      },
    },
    truck: {
      enabled: true,
      speed: 1,
      lock: null,
      mode: 'exact',
      maxDistance: 100,
    },
    zoomOrDolly: {
      enabled: true,
      type: 'dolly',
      secondaryMotion: 'truck',
      speed: 1,
      invert: false,
      minDistance: 0,
      maxDistance: 100,
      minZoom: 0.1,
      maxZoom: 10,
    },
  };

  const control = new OrbitControl(camera, controlOptions);
  control.attach(renderer.domElement);
  control.addEventListener('change', render);

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

  const gui = new GUI();

  function updateControl() {
    control.updateOptions(controlOptions);
    render();
  }

  // Rotation options

  const horizontalAngleOptions = {
    '-Infinity': -Infinity,
    '-360°': -2 * Math.PI,
    '-300°': (-5 / 3) * Math.PI,
    '-240°': (-4 / 3) * Math.PI,
    '-180°': -Math.PI,
    '-150°': (-5 / 6) * Math.PI,
    '-120°': (-4 / 6) * Math.PI,
    '-90°': (-3 / 6) * Math.PI,
    '-60°': (-2 / 6) * Math.PI,
    '-30°': (-1 / 6) * Math.PI,
    '0°': 0,
    '30°': (1 / 6) * Math.PI,
    '60°': (2 / 6) * Math.PI,
    '90°': (3 / 6) * Math.PI,
    '120°': (4 / 6) * Math.PI,
    '150°': (5 / 6) * Math.PI,
    '180°': Math.PI,
    '240°': (4 / 3) * Math.PI,
    '300°': (5 / 3) * Math.PI,
    '360°': 2 * Math.PI,
    Infinity: Infinity,
  };
  const verticalAngleOptions = {
    '-90°': (-3 / 6) * Math.PI,
    '-60°': (-2 / 6) * Math.PI,
    '-30°': (-1 / 6) * Math.PI,
    '0°': 0,
    '30°': (1 / 6) * Math.PI,
    '60°': (2 / 6) * Math.PI,
    '90°': (3 / 6) * Math.PI,
  };

  const rotationFolder = gui.addFolder('Rotation');
  rotationFolder.add(controlOptions.rotation, 'enabled').onChange(updateControl);
  rotationFolder.add(controlOptions.rotation, 'speed' as any, 0.1, 10, 0.1).onChange(updateControl);
  rotationFolder
    .add(controlOptions.rotation, 'minHorizontalAngle', horizontalAngleOptions)
    .onChange(updateControl);
  rotationFolder
    .add(controlOptions.rotation, 'maxHorizontalAngle', horizontalAngleOptions)
    .onChange(updateControl);
  rotationFolder
    .add(controlOptions.rotation, 'minVerticalAngle', verticalAngleOptions)
    .onChange(updateControl);
  rotationFolder
    .add(controlOptions.rotation, 'maxVerticalAngle', verticalAngleOptions)
    .onChange(updateControl);
  rotationFolder.add(controlOptions.rotation, 'invertHorizontal' as any).onChange(updateControl);
  rotationFolder.add(controlOptions.rotation, 'invertVertical' as any).onChange(updateControl);

  const dynOriginFolder = rotationFolder.addFolder('Dynamic Origin');
  dynOriginFolder
    .add(controlOptions.rotation.dynamicOrigin as any, 'useInvisible')
    .onChange(updateControl);

  const truckFolder = gui.addFolder('Truck');
  truckFolder.add(controlOptions.truck, 'enabled').onChange(updateControl);
  truckFolder.add(controlOptions.truck, 'speed' as any, 0.01, 10, 0.01).onChange(updateControl);
  truckFolder.add(controlOptions.truck, 'mode', ['exact', 'approximate']).onChange(updateControl);
  truckFolder.add(controlOptions.truck, 'maxDistance', 0, 1000, 1).onChange(updateControl);

  const zoomFolder = gui.addFolder('Zoom/Dolly');
  zoomFolder.add(controlOptions.zoomOrDolly, 'enabled').onChange(updateControl);
  zoomFolder
    .add(controlOptions.zoomOrDolly, 'type', ['zoom', 'dolly', 'zoomAndDolly'])
    .onChange(updateControl);
  zoomFolder
    .add(controlOptions.zoomOrDolly, 'secondaryMotion', ['none', 'truck', 'orbit', 'rotate'])
    .onChange(updateControl);
  zoomFolder
    .add(controlOptions.zoomOrDolly, 'speed' as any, 0.01, 10, 0.01)
    .onChange(updateControl);
  zoomFolder.add(controlOptions.zoomOrDolly, 'invert' as any).onChange(updateControl);
  zoomFolder.add(controlOptions.zoomOrDolly, 'minDistance', 0, 100, 0.01).onChange(updateControl);
  zoomFolder.add(controlOptions.zoomOrDolly, 'maxDistance', 0, 1000, 0.01).onChange(updateControl);
  zoomFolder.add(controlOptions.zoomOrDolly, 'minZoom', 0.01, 10, 0.01).onChange(updateControl);
  zoomFolder.add(controlOptions.zoomOrDolly, 'maxZoom', 0.01, 100, 0.01).onChange(updateControl);

  window.addEventListener('resize', onWindowResize);
  onWindowResize();
}

function onWindowResize() {
  ThreeBitUtils.updateCameraAspectRatio(camera, window.innerWidth, window.innerHeight);
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function render() {
  renderer.render(scene, camera);
}

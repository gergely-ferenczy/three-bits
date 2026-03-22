import * as THREE from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControl, ThreeBitUtils, TbEvent, TbEventDispatcher } from '../../lib';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;

init();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.localClippingEnabled = true;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.name = 'scene';

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight);
  camera.position.set(-15, 6, 12);
  camera.lookAt(0, 0, 0);

  const control = new OrbitControl(camera, {
    rotation: { defaultToAbsoluteOrigin: true, speed: 2 },
  });
  control.attach(renderer.domElement);
  control.addEventListener('change', render);

  const eventDispatcher = new TbEventDispatcher(renderer.domElement, camera);

  let eventCount = 0;
  const eventLog: string[] = [];
  const eventLogDiv = document.getElementById('event-log')!;
  const addEventLog = <G extends boolean = false>(event: TbEvent<Event, G>, global?: G) => {
    const count = (++eventCount).toString().padStart(5).replaceAll(' ', '&nbsp;');
    const type = `${global ? 'global ' : ''}${event.type}`.padEnd(14).replaceAll(' ', '&nbsp;');
    const targetName = `${event.target?.name ?? 'undefined'},`.padEnd(12).replaceAll(' ', '&nbsp;');
    const currentTargetName = (event.currentTarget?.name ?? 'undefined')
      .padEnd(12)
      .replaceAll(' ', '&nbsp;');
    eventLog.push(
      `${count}: ${type} ` + `( target: ${targetName} currentTarget: ${currentTargetName} )`,
    );
    eventLogDiv.innerHTML = eventLog.slice(-10).join('<br />');
  };

  const boxGroup = new THREE.Group();
  boxGroup.name = 'boxGroup';
  for (let i = 0; i < 1; i++) {
    const boxRow = new THREE.Group();
    boxRow.name = `boxRow-${i}`;
    boxGroup.add(boxRow);
    for (let j = 0; j < 2; j++) {
      for (let k = 0; k < 1; k++) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
        box.position.set(k * 1.5, i * 1.5, j * 1.5);
        box.name = `box-${i}-${j}-${k}`;
        boxRow.add(box);
      }

      if (boxRow.name === 'boxRow-0') {
        boxRow.visible = false;
      }
    }
  }
  scene.add(boxGroup);

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshNormalMaterial());
  sphere.name = 'sphere';
  sphere.position.set(5, 0, 0);
  scene.add(sphere);
  eventDispatcher.addEventListener(sphere, 'click', (event) => addEventLog(event));

  const torus = new THREE.Mesh(new THREE.TorusKnotGeometry(), new THREE.MeshNormalMaterial());
  torus.name = 'torus';
  torus.scale.setScalar(0.5);
  torus.position.set(0, 0, -4);
  scene.add(torus);

  const icosahedron = new THREE.Mesh(
    new THREE.IcosahedronGeometry(),
    new THREE.MeshNormalMaterial(),
  );
  icosahedron.scale.setScalar(0.5);
  icosahedron.position.set(0, 4, 0);
  icosahedron.name = 'icosahedron';
  scene.add(icosahedron);

  // eventDispatcher.addGlobalEventListener('click', (event) => {
  //   addEventLog(event, true);
  // });
  eventDispatcher.addEventListener(
    scene,
    'click',
    (event) => {
      addEventLog(event);
    },
    { ignoreOcclusion: true },
  );

  const gui = new GUI();

  const boxesOptions = {
    enterLeave: {
      enabled: true,
      ignoreOcclusion: false,
      includeInvisible: true,
    },
    overOut: {
      enabled: false,
      ignoreOcclusion: false,
      includeInvisible: false,
    },
    click: {
      enabled: false,
      ignoreOcclusion: false,
      includeInvisible: false,
    },
  };

  const boxesFolder = gui.addFolder('Boxes');
  const enterLeaveFolder = boxesFolder.addFolder('enter/leave');
  enterLeaveFolder.add(boxesOptions.enterLeave, 'enabled').onChange(() => updateEvents());
  enterLeaveFolder.add(boxesOptions.enterLeave, 'ignoreOcclusion').onChange(() => updateEvents());
  enterLeaveFolder.add(boxesOptions.enterLeave, 'includeInvisible').onChange(() => updateEvents());
  const overOutFolder = boxesFolder.addFolder('over/out');
  overOutFolder.add(boxesOptions.overOut, 'enabled').onChange(() => updateEvents());
  overOutFolder.add(boxesOptions.overOut, 'ignoreOcclusion').onChange(() => updateEvents());
  overOutFolder.add(boxesOptions.overOut, 'includeInvisible').onChange(() => updateEvents());
  const clickFolder = boxesFolder.addFolder('click');
  clickFolder.add(boxesOptions.click, 'enabled').onChange(() => updateEvents());
  clickFolder.add(boxesOptions.click, 'ignoreOcclusion').onChange(() => updateEvents());
  clickFolder.add(boxesOptions.click, 'includeInvisible').onChange(() => updateEvents());

  const updateEvents = () => {
    boxGroup.traverse((object) => {
      eventDispatcher.removeAllEventListeners(object);
      if (boxesOptions.enterLeave.enabled) {
        eventDispatcher.addEventListener(object, 'pointerenter', (event) => addEventLog(event), {
          ignoreOcclusion: boxesOptions.enterLeave.ignoreOcclusion,
          includeInvisible: boxesOptions.enterLeave.includeInvisible,
        });
        eventDispatcher.addEventListener(object, 'pointerleave', (event) => addEventLog(event), {
          ignoreOcclusion: boxesOptions.enterLeave.ignoreOcclusion,
          includeInvisible: boxesOptions.enterLeave.includeInvisible,
        });
      }
      if (boxesOptions.overOut.enabled) {
        eventDispatcher.addEventListener(object, 'pointerover', (event) => addEventLog(event), {
          ignoreOcclusion: boxesOptions.overOut.ignoreOcclusion,
          includeInvisible: boxesOptions.overOut.includeInvisible,
        });
        eventDispatcher.addEventListener(object, 'pointerout', (event) => addEventLog(event), {
          ignoreOcclusion: boxesOptions.overOut.ignoreOcclusion,
          includeInvisible: boxesOptions.overOut.includeInvisible,
        });
      }
      if (boxesOptions.click.enabled) {
        eventDispatcher.addEventListener(object, 'click', (event) => addEventLog(event), {
          ignoreOcclusion: boxesOptions.click.ignoreOcclusion,
          includeInvisible: boxesOptions.click.includeInvisible,
        });
      }
    });
  };
  updateEvents();

  window.addEventListener('resize', onWindowResize);
  onWindowResize();
}

function onWindowResize() {
  ThreeBitUtils.updateCameraAspectRatio(camera, window.innerWidth, window.innerHeight);

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function render() {
  renderer.render(scene, camera);
}

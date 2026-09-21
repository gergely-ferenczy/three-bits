import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CameraInfo } from './CameraInfo';
import { ThreeBitUtils } from '../../lib';
import type { Control } from '../../lib/controls/control';

/**
 * The subset of update options shared by orbit-style and trackball-style
 * rotation controls (`OrbitControl`, `TrackballControl`, ...).
 */
export interface RotationControlUpdateOptions {
  rotation?: {
    speed?: number;
    dynamicOrigin?: { source: THREE.Object3D | THREE.Object3D[]; useInvisible?: boolean } | null;
  };
  truck?: { speed?: number };
  zoomOrDolly?: {
    speed?: number;
    secondaryMotion?: 'none' | 'truck' | 'orbit' | 'rotate';
  };
}

/**
 * The subset of the control API required to drive the shared story scene.
 */
export interface RotationLikeControl extends Control {
  updateOptions(options: RotationControlUpdateOptions): void;
}

export interface RotationControlStoryProps {
  rotationSpeed: number;
  truckSpeed: number;
  zoomDollySpeed: number;
  cursorTracking: boolean;
  dynamicOrigin: boolean;
  createControl: (camera: THREE.PerspectiveCamera) => RotationLikeControl;
}

/**
 * Shared argTypes for stories built on top of `RotationControlStory`.
 */
export const rotationControlArgTypes = {
  rotationSpeed: {
    control: { type: 'range', min: 0.1, max: 5, step: 0.1 },
    description: 'Camera rotation speed',
  },
  truckSpeed: {
    control: { type: 'range', min: 0.1, max: 5, step: 0.1 },
    description: 'Camera panning (truck) speed',
  },
  zoomDollySpeed: {
    control: { type: 'range', min: 0.1, max: 5, step: 0.1 },
    description: 'Zoom/dolly speed',
  },
  cursorTracking: {
    control: { type: 'boolean' },
    description: 'Keep the point under the cursor fixed while zooming/dollying',
  },
  dynamicOrigin: {
    control: { type: 'boolean' },
    description: 'Use the scene bounding sphere as the rotation origin source',
  },
  createControl: {
    table: { disable: true },
  },
} as const;

export const rotationControlDefaultArgs = {
  rotationSpeed: 1,
  truckSpeed: 1,
  zoomDollySpeed: 1,
  cursorTracking: true,
  dynamicOrigin: true,
};

/**
 * Scene and camera-info wiring shared by orbit-style and trackball-style
 * control stories. The concrete control instance is supplied via `createControl`.
 */
export const RotationControlStory = ({
  rotationSpeed,
  truckSpeed,
  zoomDollySpeed,
  cursorTracking,
  dynamicOrigin,
  createControl,
}: RotationControlStoryProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<RotationLikeControl | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const [cameraInfo, setCameraInfo] = useState<{
    position: THREE.Vector3;
    rotation: THREE.Euler;
    target: THREE.Vector3;
    zoom: number;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x222222);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight);
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0, 0);

    // Grid
    const grid = new THREE.GridHelper(20, 20, 0x9d4b4b, 0x6f6f6f);
    scene.add(grid);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Scene objects
    const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshNormalMaterial());
    scene.add(boxMesh);

    const sphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshNormalMaterial(),
    );
    sphereMesh.position.set(5, 0, 0);
    scene.add(sphereMesh);

    const torusKnotMesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1, 0.4, 100, 16),
      new THREE.MeshNormalMaterial(),
    );
    torusKnotMesh.position.set(0, 0, -4);
    torusKnotMesh.scale.setScalar(0.5);
    scene.add(torusKnotMesh);

    const icosahedronMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1),
      new THREE.MeshNormalMaterial(),
    );
    icosahedronMesh.position.set(0, 4, 0);
    icosahedronMesh.scale.setScalar(0.5);
    scene.add(icosahedronMesh);

    // Control
    const control = createControl(camera);
    controlRef.current = control;
    control.attach(renderer.domElement);
    control.addEventListener('change', () => {
      renderer.render(scene, camera);
      setCameraInfo({
        position: camera.position.clone(),
        rotation: camera.rotation.clone(),
        target: control.getTarget().clone(),
        zoom: camera.zoom,
      });
    });
    setCameraInfo({
      position: camera.position.clone(),
      rotation: camera.rotation.clone(),
      target: control.getTarget().clone(),
      zoom: camera.zoom,
    });

    // Resize
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      ThreeBitUtils.updateCameraAspectRatio(camera, w, h);
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    return () => {
      grid.dispose();
      boxMesh.geometry.dispose();
      (boxMesh.material as THREE.Material).dispose();
      sphereMesh.geometry.dispose();
      (sphereMesh.material as THREE.Material).dispose();
      torusKnotMesh.geometry.dispose();
      (torusKnotMesh.material as THREE.Material).dispose();
      icosahedronMesh.geometry.dispose();
      (icosahedronMesh.material as THREE.Material).dispose();
      resizeObserver.disconnect();
      control.detach();
      renderer.dispose();
      container.removeChild(renderer.domElement);

      controlRef.current = null;
      sceneRef.current = null;
    };
    // `createControl` is expected to be a stable factory (defined outside the
    // component or memoized) so the scene is only ever set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const control = controlRef.current;
    const scene = sceneRef.current;

    if (!control || !scene) return;

    control.updateOptions({
      rotation: {
        speed: rotationSpeed,
        dynamicOrigin: dynamicOrigin ? { source: scene } : null,
      },
      truck: { speed: truckSpeed },
      zoomOrDolly: {
        speed: zoomDollySpeed,
        secondaryMotion: cursorTracking ? 'truck' : 'none',
      },
    });
  }, [cursorTracking, dynamicOrigin, rotationSpeed, truckSpeed, zoomDollySpeed]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <CameraInfo info={cameraInfo} />
      <div ref={mountRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
    </div>
  );
};

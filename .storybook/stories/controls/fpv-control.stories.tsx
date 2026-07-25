import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeBitUtils } from '../../../lib';
import type { FpvControlOptions } from '../../../lib/controls/fpv-control';
import { FpvControl } from '../../../lib/controls/fpv-control';
import { CameraInfo } from '../../components/CameraInfo';
import type { Meta, StoryObj } from '@storybook/react-vite';

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

const Instructions = () => (
  <div
    style={{
      position: 'absolute',
      bottom: 10,
      left: 10,
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      padding: '10px 15px',
      borderRadius: 5,
      fontFamily: 'sans-serif',
      fontSize: 14,
      lineHeight: 1.5,
      pointerEvents: 'none',
      zIndex: 1000,
    }}
  >
    <div>
      <strong>Controls:</strong>
    </div>
    <ul>
      <li>Drag to look around</li>
      <li>
        Wheel or pinch zoom to zoom
        <br />
        <i>Notice how the camera follows your pointer while zooming</i>
      </li>
    </ul>
  </div>
);

// ---------------------------------------------------------------------------
// Story component
// ---------------------------------------------------------------------------

interface FpvControlStoryProps {
  rotationSpeed: number;
  minVerticalAngle: number;
  maxVerticalAngle: number;
  enableHorizontalLimits: boolean;
  minHorizontalAngle: number;
  maxHorizontalAngle: number;
}

const FpvControlStory = ({
  rotationSpeed,
  minVerticalAngle,
  maxVerticalAngle,
  enableHorizontalLimits,
  minHorizontalAngle,
  maxHorizontalAngle,
}: FpvControlStoryProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<FpvControl>(null);
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
    scene.background = new THREE.Color(0x222222);

    // Camera
    const camera = new THREE.PerspectiveCamera();

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    // invert the geometry on the x-axis so that all of the faces point inward
    geometry.scale(-1, 1, 1);

    const texture = new THREE.TextureLoader().load('KPNO-Drone-360-2-CC2.jpg', () => {
      renderer.render(scene, camera);
      console.log('texture');
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture });

    const mesh = new THREE.Mesh(geometry, material);

    scene.add(mesh);

    // Control
    const options: FpvControlOptions = {
      truck: { enabled: false },
      zoomOrDolly: { type: 'zoom', secondaryMotion: 'rotate', minZoom: 0.5, maxZoom: 5 },
    };

    const control = new FpvControl(camera, options);
    controlRef.current = control;
    control.setTarget(new THREE.Vector3(1, 0, 0));
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

    console.log('effect');

    return () => {
      texture.dispose();
      material.dispose();
      geometry.dispose();
      resizeObserver.disconnect();
      control.detach();
      renderer.dispose();
      container.removeChild(renderer.domElement);

      controlRef.current = null;
    };
  }, []);

  useEffect(() => {
    const control = controlRef.current;
    if (!control) return;

    control.updateOptions({
      rotation: {
        speed: rotationSpeed,
        minVerticalAngle: THREE.MathUtils.degToRad(minVerticalAngle),
        maxVerticalAngle: THREE.MathUtils.degToRad(maxVerticalAngle),
        minHorizontalAngle: enableHorizontalLimits
          ? THREE.MathUtils.degToRad(minHorizontalAngle)
          : -Infinity,
        maxHorizontalAngle: enableHorizontalLimits
          ? THREE.MathUtils.degToRad(maxHorizontalAngle)
          : Infinity,
      },
    });
  }, [
    minVerticalAngle,
    maxVerticalAngle,
    minHorizontalAngle,
    maxHorizontalAngle,
    rotationSpeed,
    enableHorizontalLimits,
  ]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <CameraInfo info={cameraInfo} />
      <Instructions />
      <div ref={mountRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
    </div>
  );
};

// Storybook metadata
const meta: Meta<typeof FpvControlStory> = {
  title: 'Controls/FpvControl',
  component: FpvControlStory,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    rotationSpeed: {
      control: { type: 'range', min: 0.1, max: 5, step: 0.1 },
      description: 'Camera rotation speed',
    },
    minVerticalAngle: {
      control: { type: 'range', min: -90, max: 90, step: 10 },
      description: 'Minimum vertical (polar) angle (degrees)',
    },
    maxVerticalAngle: {
      control: { type: 'range', min: -90, max: 90, step: 10 },
      description: 'Maximum vertical (polar) angle (degrees)',
    },
    enableHorizontalLimits: {
      control: { type: 'boolean' },
      description: 'Enable minHorizontalAngle and maxHorizontalAngle',
    },
    minHorizontalAngle: {
      control: { type: 'range', min: -360, max: 360, step: 10 },
      description: 'Minimum horizontal (azimuth) angle (degrees)',
    },
    maxHorizontalAngle: {
      control: { type: 'range', min: -360, max: 360, step: 10 },
      description: 'Maximum horizontal (azimuth) angle (degrees)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof FpvControlStory>;

export const PanoramaDemo: Story = {
  args: {
    rotationSpeed: 1,
    minVerticalAngle: -90,
    maxVerticalAngle: 90,
    enableHorizontalLimits: false,
    minHorizontalAngle: 10,
    maxHorizontalAngle: 350,
  },
};

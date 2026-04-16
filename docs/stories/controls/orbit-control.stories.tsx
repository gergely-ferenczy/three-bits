import { Grid } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControlOptions } from '../../../lib/controls/orbit-control';
import { OrbitControl } from '../../../lib/controls/orbit-control';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Component to display camera information in an overlay
 */
const CameraInfo = ({ camera, target }: { camera: THREE.Camera; target: THREE.Vector3 }) => {
  const [position, setPosition] = useState<THREE.Vector3>(camera.position.clone());
  const [targetPos, setTargetPos] = useState<THREE.Vector3>(target.clone());
  const [zoom, setZoom] = useState<number>((camera as THREE.PerspectiveCamera).zoom);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition(camera.position.clone());
      setTargetPos(target.clone());
      setZoom((camera as THREE.PerspectiveCamera).zoom);
    }, 100);

    return () => clearInterval(interval);
  }, [camera, target]);

  const formatVector3 = (v: THREE.Vector3) =>
    `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        padding: '10px 15px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.5',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <div>
        <strong>Camera:</strong> {formatVector3(position)}
      </div>
      <div>
        <strong>Target:</strong> {formatVector3(targetPos)}
      </div>
      <div>
        <strong>Zoom:</strong> {zoom.toFixed(3)}
      </div>
    </div>
  );
};

/**
 * OrbitControl component wrapper for React Three Fiber.
 * Integrates the vanilla Three.js OrbitControl with R3F.
 */
interface OrbitControlDemoProps {
  showInfo?: boolean;
  rotationSpeed?: number;
  truckSpeed?: number;
  zoomDollySpeed?: number;
  minDistance?: number;
  maxDistance?: number;
}

const OrbitControlDemo: React.FC<OrbitControlDemoProps> = ({
  rotationSpeed = 1,
  truckSpeed = 1,
  zoomDollySpeed = 1,
  minDistance = 1,
  maxDistance = 100,
}) => {
  const { gl, camera, invalidate } = useThree();
  const controlRef = useRef<OrbitControl | null>(null);
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    const options: OrbitControlOptions = {
      rotation: {
        speed: rotationSpeed,
      },
      truck: {
        speed: truckSpeed,
      },
      zoomOrDolly: {
        type: 'dolly',
        speed: zoomDollySpeed,
        minDistance,
        maxDistance,
      },
    };

    const control = new OrbitControl(camera, options);
    control.attach(gl.domElement);

    const handleChange = () => {
      invalidate();
    };

    control.addEventListener('change', handleChange);
    controlRef.current = control;
    targetRef.current = control.getTarget();

    return () => {
      control.removeEventListener('change', handleChange);
      control.detach();
    };
  }, [gl, camera, invalidate, rotationSpeed, truckSpeed, zoomDollySpeed, minDistance, maxDistance]);

  return (
    <>
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellColor="#6f6f6f"
        sectionSize={5}
        sectionColor="#9d4b4b"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
      />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Scene objects */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshNormalMaterial />
      </mesh>

      <mesh position={[5, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshNormalMaterial />
      </mesh>

      <mesh position={[0, 0, -4]} scale={0.5}>
        <torusKnotGeometry args={[1, 0.4, 100, 16]} />
        <meshNormalMaterial />
      </mesh>

      <mesh position={[0, 4, 0]} scale={0.5}>
        <icosahedronGeometry args={[1]} />
        <meshNormalMaterial />
      </mesh>
    </>
  );
};

/**
 * Story wrapper component
 */
const OrbitControlStory: React.FC<OrbitControlDemoProps> = (props) => {
  const cameraRef = useRef<THREE.Camera>(null!);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {props.showInfo && cameraRef.current && (
        <CameraInfo camera={cameraRef.current} target={new THREE.Vector3(0, 0, 0)} />
      )}
      <Canvas
        camera={{
          position: [10, 8, 10],
          fov: 50,
        }}
        gl={{ antialias: true }}
        onCreated={({ camera }) => {
          cameraRef.current = camera;
        }}
      >
        <OrbitControlDemo {...props} />
      </Canvas>
    </div>
  );
};

// Storybook metadata
const meta: Meta<typeof OrbitControlStory> = {
  title: 'Controls/OrbitControl',
  component: OrbitControlStory,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    showInfo: {
      control: 'boolean',
      description: 'Show camera information overlay',
    },
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
    minDistance: {
      control: { type: 'number', min: 0.1, max: 10 },
      description: 'Minimum camera distance from target',
    },
    maxDistance: {
      control: { type: 'number', min: 10, max: 200 },
      description: 'Maximum camera distance from target',
    },
  },
};

export default meta;
type Story = StoryObj<typeof OrbitControlStory>;

export const Default: Story = {
  args: {
    showInfo: true,
    rotationSpeed: 1,
    truckSpeed: 1,
    zoomDollySpeed: 1,
  },
};

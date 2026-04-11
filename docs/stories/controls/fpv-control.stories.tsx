import React, { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { FpvControl } from '../../../lib/controls/fpv-control';
import type { FpvControlOptions } from '../../../lib/controls/fpv-control';

/**
 * Component to display camera information in an overlay
 */
const CameraInfo = ({ camera }: { camera: THREE.Camera | null }) => {
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3());
  const [rotation, setRotation] = useState<THREE.Euler>(new THREE.Euler());

  useEffect(() => {
    let interval: number;

    if (camera) {
      interval = window.setInterval(() => {
        setPosition(camera.position.clone());
        setRotation(camera.rotation.clone());
      }, 100);
    }

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [camera]);

  const formatVector3 = (v: THREE.Vector3) =>
    `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;

  const formatEuler = (e: THREE.Euler) => {
    const toDeg = (rad: number) => ((rad * 180) / Math.PI).toFixed(1);
    return `(${toDeg(e.x)}°, ${toDeg(e.y)}°, ${toDeg(e.z)}°)`;
  };

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
        <strong>Position:</strong> {formatVector3(position)}
      </div>
      <div>
        <strong>Rotation:</strong> {formatEuler(rotation)}
      </div>
    </div>
  );
};

/**
 * Instructions overlay
 */
const Instructions: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        padding: '10px 15px',
        borderRadius: '5px',
        fontFamily: 'sans-serif',
        fontSize: '12px',
        lineHeight: '1.5',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <div>
        <strong>Controls:</strong>
      </div>
      <div>• Drag to look around (first-person view)</div>
      <div>• Right-click or 2 fingers to move camera position</div>
    </div>
  );
};

/**
 * FpvControl component wrapper for React Three Fiber.
 * Integrates the vanilla Three.js FpvControl with R3F.
 */
interface FpvControlDemoProps {
  showInfo?: boolean;
  showInstructions?: boolean;
  rotationSpeed?: number;
  truckSpeed?: number;
  minVerticalAngle?: number;
  maxVerticalAngle?: number;
}

const FpvControlDemo = ({
  rotationSpeed = 1,
  truckSpeed = 1,
  minVerticalAngle = -89,
  maxVerticalAngle = 89,
}: FpvControlDemoProps) => {
  const { gl, camera, invalidate } = useThree();
  const controlRef = useRef<FpvControl | null>(null);

  useEffect(() => {
    const options: FpvControlOptions = {
      rotation: {
        speed: rotationSpeed,
        minVerticalAngle: THREE.MathUtils.degToRad(minVerticalAngle),
        maxVerticalAngle: THREE.MathUtils.degToRad(maxVerticalAngle),
      },
      truck: {
        speed: truckSpeed,
      },
      zoomOrDolly: {
        type: 'zoom',
        secondaryMotion: 'rotate',
      },
    };

    const control = new FpvControl(camera, options);
    control.attach(gl.domElement);

    const handleChange = () => {
      invalidate();
    };

    control.addEventListener('change', handleChange);
    controlRef.current = control;

    return () => {
      control.removeEventListener('change', handleChange);
      control.detach();
    };
  }, [gl, camera, invalidate, rotationSpeed, truckSpeed, minVerticalAngle, maxVerticalAngle]);

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

      {/* Scene objects - positioned to create an environment */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshNormalMaterial />
      </mesh>

      <mesh position={[5, 1, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshNormalMaterial />
      </mesh>

      <mesh position={[0, 1, -5]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshNormalMaterial />
      </mesh>

      <mesh position={[-5, 1, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshNormalMaterial />
      </mesh>

      <mesh position={[0, 1, 5]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshNormalMaterial />
      </mesh>

      <mesh position={[0, 3, 0]} scale={0.5}>
        <torusKnotGeometry args={[1, 0.4, 100, 16]} />
        <meshNormalMaterial />
      </mesh>

      {/* Walls to give depth perception */}
      <mesh position={[10, 2, 0]}>
        <boxGeometry args={[1, 4, 20]} />
        <meshStandardMaterial color="#444444" />
      </mesh>

      <mesh position={[-10, 2, 0]}>
        <boxGeometry args={[1, 4, 20]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
    </>
  );
};

/**
 * Story wrapper component
 */
const FpvControlStory: React.FC<FpvControlDemoProps> = (props) => {
  const [camera, setCamera] = useState<THREE.Camera | null>(null);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {props.showInfo && <CameraInfo camera={camera} />}
      {props.showInstructions && <Instructions />}
      <Canvas
        camera={{
          position: [4, 10, 10],
          fov: 60,
        }}
        gl={{ antialias: true }}
        onCreated={({ camera }) => {
          setCamera(camera);
        }}
      >
        <FpvControlDemo {...props} />
      </Canvas>
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
    showInfo: {
      control: 'boolean',
      description: 'Show camera information overlay',
    },
    showInstructions: {
      control: 'boolean',
      description: 'Show control instructions',
    },
    rotationSpeed: {
      control: { type: 'range', min: 0.1, max: 5, step: 0.1 },
      description: 'Camera rotation speed',
    },
    truckSpeed: {
      control: { type: 'range', min: 0.1, max: 5, step: 0.1 },
      description: 'Camera movement (truck) speed',
    },
    minVerticalAngle: {
      control: { type: 'range', min: -90, max: 0, step: 1 },
      description: 'Minimum vertical look angle (degrees)',
    },
    maxVerticalAngle: {
      control: { type: 'range', min: 0, max: 90, step: 1 },
      description: 'Maximum vertical look angle (degrees)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof FpvControlStory>;

export const Default: Story = {
  args: {
    showInfo: true,
    rotationSpeed: 1,
    truckSpeed: 1,
  },
};

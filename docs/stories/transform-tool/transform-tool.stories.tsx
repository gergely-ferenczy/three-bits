import { Grid } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TransformTool, TbEventDispatcher, OrbitControl } from '../../../lib/index';
import type { TransformToolOptions } from '../../../lib/transform-tool/transform-tool';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Component to display transform information in an overlay
 */
const TransformInfo: React.FC<{
  objectRef: React.RefObject<THREE.Object3D | null>;
}> = ({ objectRef }) => {
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3());
  const [rotation, setRotation] = useState<THREE.Euler>(new THREE.Euler());

  useEffect(() => {
    const interval = setInterval(() => {
      if (objectRef.current) {
        setPosition(objectRef.current.position.clone());
        setRotation(objectRef.current.rotation.clone());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [objectRef]);

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
 * OrbitControl component wrapper for React Three Fiber.
 * Integrates the vanilla Three.js OrbitControl with R3F.
 */
const OrbitControlComponent = ({ ref }: { ref?: React.RefObject<OrbitControl | null> }) => {
  const { gl, camera, invalidate } = useThree();

  useEffect(() => {
    const control = new OrbitControl(camera, {
      rotation: { speed: 2 },
      zoomOrDolly: { type: 'dolly' },
    });
    control.attach(gl.domElement);

    const handleChange = () => {
      invalidate();
    };

    control.addEventListener('change', handleChange);

    if (ref) {
      ref.current = control;
    }

    return () => {
      control.removeEventListener('change', handleChange);
      control.detach();

      if (ref) {
        ref.current = null;
      }
    };
  }, [gl, camera, invalidate]);

  return null;
};

/**
 * TransformTool component wrapper for use in React Three Fiber.
 * Integrates the vanilla Three.js TransformTool with R3F.
 */
interface TransformToolDemoProps {
  color?: THREE.ColorRepresentation;
  outlineColor?: THREE.ColorRepresentation;
  highlightColor?: THREE.ColorRepresentation;
  lineWidth?: number;
  outlineLineWidth?: number;
  scale?: number;
  baseRenderOrder?: number;
  autoUpdate?: boolean;
  maxDistance?: number;
  disableTranslation?: boolean | { x: boolean; y: boolean; z: boolean };
  disableRotation?: boolean | { x: boolean; y: boolean; z: boolean };
  showInfo?: boolean;
  meshType?: 'box' | 'sphere' | 'torus' | 'cone';
  meshRef?: React.RefObject<THREE.Mesh | null>;
  controlRef?: React.RefObject<OrbitControl | null>;
}

const TransformToolDemo = ({
  color = '#ffffff',
  outlineColor = '#202020',
  highlightColor = '#40e0d0',
  lineWidth = 1.5,
  outlineLineWidth = 1,
  scale = 1,
  baseRenderOrder = 0,
  autoUpdate = true,
  maxDistance,
  disableTranslation = false,
  disableRotation = false,
  meshType = 'box',
  meshRef: externalMeshRef,
  controlRef,
}: TransformToolDemoProps) => {
  const { gl, scene, camera, invalidate } = useThree();
  const internalMeshRef = useRef<THREE.Mesh>(null);
  const meshRef = externalMeshRef || internalMeshRef;
  const toolRef = useRef<TransformTool | null>(null);
  const eventDispatcherRef = useRef<TbEventDispatcher | null>(null);

  // Create the mesh geometry based on type
  const geometry = React.useMemo(() => {
    switch (meshType) {
      case 'sphere':
        return new THREE.SphereGeometry(1, 32, 32);
      case 'torus':
        return new THREE.TorusKnotGeometry(0.7, 0.3, 100, 16);
      case 'cone':
        return new THREE.ConeGeometry(1, 2, 32);
      default:
        return new THREE.BoxGeometry(2, 2, 2);
    }
  }, [meshType]);

  useEffect(() => {
    if (!meshRef.current) return;

    // Create event dispatcher
    const eventDispatcher = new TbEventDispatcher(gl.domElement, camera);
    eventDispatcherRef.current = eventDispatcher;

    // Create transform tool
    const options: TransformToolOptions = {
      color,
      outlineColor,
      highlightColor,
      lineWidth,
      outlineLineWidth,
      scale,
      baseRenderOrder,
      autoUpdate,
      maxDistance,
      disableTranslation,
      disableRotation,
      target: meshRef.current,
      onRequestRender: () => {
        invalidate();
      },
      onTransformStart: () => {
        controlRef?.current?.disable();
      },
      onTransformEnd: () => {
        controlRef?.current?.enable();
      },
    };

    const tool = new TransformTool(eventDispatcher, options);
    toolRef.current = tool;

    // Attach tool to mesh
    tool.attach(meshRef.current);

    return () => {
      tool.dispose();
      eventDispatcher.dispose();
    };
  }, [
    gl.domElement,
    camera,
    scene,
    color,
    outlineColor,
    highlightColor,
    lineWidth,
    outlineLineWidth,
    scale,
    baseRenderOrder,
    autoUpdate,
    maxDistance,
    disableTranslation,
    disableRotation,
  ]);

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
      <mesh ref={meshRef} geometry={geometry}>
        <meshNormalMaterial />
      </mesh>
    </>
  );
};

/**
 * Story wrapper component
 */
const TransformToolStory = (props: TransformToolDemoProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const controlRef = useRef<OrbitControl>(null);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {props.showInfo && <TransformInfo objectRef={meshRef} />}
      <Canvas
        camera={{
          position: [8, 6, 8],
          fov: 50,
        }}
        gl={{ antialias: true }}
      >
        <TransformToolDemo {...props} meshRef={meshRef} controlRef={controlRef} />
        <OrbitControlComponent ref={controlRef} />
      </Canvas>
    </div>
  );
};

// Storybook metadata
const meta: Meta<typeof TransformToolStory> = {
  title: 'TransformTool',
  component: TransformToolStory,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    color: {
      control: 'color',
      description: 'Fill color of all elements',
    },
    outlineColor: {
      control: 'color',
      description: 'Outline color of all elements',
    },
    highlightColor: {
      control: 'color',
      description: 'Fill color of an element with active hover state',
    },
    lineWidth: {
      control: { type: 'range', min: 0.5, max: 5, step: 0.5 },
      description: 'Inner width of all elements',
    },
    outlineLineWidth: {
      control: { type: 'range', min: 0, max: 3, step: 0.5 },
      description: 'Outline width of all elements',
    },
    scale: {
      control: { type: 'range', min: 0.5, max: 3, step: 0.1 },
      description: 'Relative scale of the tool',
    },
    baseRenderOrder: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Base render order for materials',
    },
    autoUpdate: {
      control: 'boolean',
      description: 'Automatically update position/rotation or only call callbacks',
    },
    maxDistance: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Maximum distance a single translation action can move',
    },
    disableTranslation: {
      control: 'boolean',
      description: 'Disable translation actions',
    },
    disableRotation: {
      control: 'boolean',
      description: 'Disable rotation actions',
    },
    showInfo: {
      control: 'boolean',
      description: 'Show transform information overlay',
    },
    meshType: {
      control: 'select',
      options: ['box', 'sphere', 'torus', 'cone'],
      description: 'Type of mesh to transform',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TransformToolStory>;

/**
 * Basic TransformTool with default settings.
 * Try clicking and dragging the arrows to translate, the arcs to rotate,
 * or the corner squares to translate in a plane.
 */
export const Basic: Story = {
  args: {
    color: '#ffffff',
    outlineColor: '#202020',
    highlightColor: '#40e0d0',
    lineWidth: 1.5,
    outlineLineWidth: 1,
    scale: 1,
    baseRenderOrder: 0,
    autoUpdate: true,
    showInfo: true,
    meshType: 'box',
  },
};

/**
 * TransformTool with custom colors.
 * Demonstrates how to customize the appearance with different color schemes.
 */
export const CustomColors: Story = {
  args: {
    ...Basic.args,
    color: '#ffcc00',
    outlineColor: '#333333',
    highlightColor: '#ff6600',
    lineWidth: 2,
    outlineLineWidth: 1.5,
  },
};

/**
 * TransformTool with translation disabled.
 * Only rotation handles are visible and functional.
 */
export const TranslationDisabled: Story = {
  args: {
    ...Basic.args,
    disableTranslation: true,
  },
};

/**
 * TransformTool with rotation disabled.
 * Only translation handles are visible and functional.
 */
export const RotationDisabled: Story = {
  args: {
    ...Basic.args,
    disableRotation: true,
  },
};

/**
 * TransformTool with larger scale.
 * Makes the handles bigger and easier to interact with.
 */
export const LargerScale: Story = {
  args: {
    ...Basic.args,
    scale: 2,
    lineWidth: 2.5,
  },
};

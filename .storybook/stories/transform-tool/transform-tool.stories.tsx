import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeBitUtils, TransformTool, TbEventDispatcher, OrbitControl } from '../../../lib';
import type { TransformToolOptions } from '../../../lib/transform-tool/transform-tool';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Component to display transform information in an overlay
 */
const TransformInfo = ({ objectRef }: { objectRef: React.RefObject<THREE.Object3D | null> }) => {
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

type MeshType = 'box' | 'sphere' | 'torus' | 'cone';

const createMeshGeometry = (meshType: MeshType): THREE.BufferGeometry => {
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
};

interface SceneRefs {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  control: OrbitControl;
  eventDispatcher: TbEventDispatcher;
  mesh: THREE.Mesh;
  render: () => void;
}

// ---------------------------------------------------------------------------
// Story component
// ---------------------------------------------------------------------------

interface TransformToolStoryProps {
  color?: THREE.ColorRepresentation;
  outlineColor?: THREE.ColorRepresentation;
  highlightColor?: THREE.ColorRepresentation;
  lineWidth?: number;
  outlineLineWidth?: number;
  scale?: number;
  enableMaxDistance?: boolean;
  maxDistance?: number;
  disableTranslation?: 'none' | 'all' | 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz';
  disableRotation?: 'none' | 'all' | 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz';
  space?: 'local' | 'world';
  meshType?: MeshType;
}

const TransformToolStory = ({
  color = '#ffffff',
  outlineColor = '#202020',
  highlightColor = '#40e0d0',
  lineWidth = 1.5,
  outlineLineWidth = 1,
  scale = 1,
  maxDistance,
  disableTranslation,
  disableRotation,
  space,
  meshType = 'box',
}: TransformToolStoryProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const threeResourcesRef = useRef<SceneRefs | null>(null);
  const meshTypeInitialized = useRef(false);

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
    const camera = new THREE.OrthographicCamera();
    camera.zoom = 0.2;
    camera.position.set(8, 6, 8);
    camera.lookAt(0, 0, 0);

    // Grid
    const grid = new THREE.GridHelper(20, 20, 0x9d4b4b, 0x6f6f6f);
    scene.add(grid);

    // Mesh
    const material = new THREE.MeshNormalMaterial();
    const mesh = new THREE.Mesh(createMeshGeometry(meshType), material);
    scene.add(mesh);
    meshRef.current = mesh;

    const render = () => renderer.render(scene, camera);

    // Event dispatcher and camera control
    const eventDispatcher = new TbEventDispatcher(renderer.domElement, camera);

    const control = new OrbitControl(camera, {
      rotation: { speed: 2, dynamicOrigin: { source: scene } },
      zoomOrDolly: { type: 'dolly' },
    });
    control.attach(renderer.domElement);
    control.addEventListener('change', render);

    // Resize
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      ThreeBitUtils.updateCameraAspectRatio(camera, w, h);
      renderer.setSize(w, h);
      render();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    threeResourcesRef.current = { renderer, scene, camera, control, eventDispatcher, mesh, render };

    return () => {
      resizeObserver.disconnect();
      control.removeEventListener('change', render);
      control.detach();
      eventDispatcher.dispose();
      grid.dispose();
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);

      meshRef.current = null;
      threeResourcesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap the mesh geometry in place when the mesh type changes, keeping the
  // same Object3D identity so the TransformTool stays attached to it.
  useEffect(() => {
    const s = threeResourcesRef.current;
    if (!s) return;

    if (!meshTypeInitialized.current) {
      meshTypeInitialized.current = true;
      return;
    }

    const oldGeometry = s.mesh.geometry;
    s.mesh.geometry = createMeshGeometry(meshType);
    oldGeometry.dispose();
    s.render();
  }, [meshType]);

  useEffect(() => {
    const threeResources = threeResourcesRef.current;
    if (!threeResources) return;

    // prettier-ignore
    const processedDisableTranslation =
      disableTranslation === 'none'
        ? false
        : disableTranslation === 'all'
          ? true
          : {
              x: disableTranslation === 'x' || disableTranslation === 'xy' || disableTranslation === 'xz',
              y: disableTranslation === 'y' || disableTranslation === 'xy' || disableTranslation === 'yz',
              z: disableTranslation === 'z' || disableTranslation === 'xz' || disableTranslation === 'yz',
            };

    // prettier-ignore
    const processedDisableRotation =
      disableRotation === 'none'
        ? false
        : disableRotation === 'all'
          ? true
          : {
              x: disableRotation === 'x' || disableRotation === 'xy' || disableRotation === 'xz',
              y: disableRotation === 'y' || disableRotation === 'xy' || disableRotation === 'yz',
              z: disableRotation === 'z' || disableRotation === 'xz' || disableRotation === 'yz',
            };

    const options: TransformToolOptions = {
      color,
      outlineColor,
      highlightColor,
      lineWidth,
      outlineLineWidth,
      scale,
      maxDistance,
      disableTranslation: processedDisableTranslation,
      disableRotation: processedDisableRotation,
      space,
      target: threeResources.mesh,
      onRequestRender: () => {
        threeResources.render();
      },
      onTransformStart: () => {
        threeResources.control.disable();
      },
      onTransformEnd: () => {
        threeResources.control.enable();
      },
    };

    const tool = new TransformTool(threeResources.eventDispatcher, options);
    threeResources.mesh.add(tool.transformObject);
    threeResources.render();

    return () => {
      tool.dispose();
    };
  }, [
    color,
    outlineColor,
    highlightColor,
    lineWidth,
    outlineLineWidth,
    scale,
    maxDistance,
    disableTranslation,
    disableRotation,
    space,
  ]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <TransformInfo objectRef={meshRef} />
      <div ref={mountRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
    </div>
  );
};

// Storybook metadata
const meta: Meta<typeof TransformToolStory> = {
  title: 'Tools/TransformTool',
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
    enableMaxDistance: {
      control: { type: 'boolean' },
      description: 'Enable maxDistance',
    },
    maxDistance: {
      control: { type: 'range', min: 10, max: 100, step: 10 },
      if: { arg: 'enableMaxDistance', eq: true },
      description: 'Maximum distance a single translation action can move',
    },
    disableTranslation: {
      control: 'select',
      options: ['none', 'all', 'x', 'y', 'z', 'xy', 'xz', 'yz'],
      description: 'Disable translation actions',
    },
    disableRotation: {
      control: 'select',
      options: ['none', 'all', 'x', 'y', 'z', 'xy', 'xz', 'yz'],
      description: 'Disable rotation actions',
    },
    space: {
      control: 'radio',
      options: ['local', 'world'],
      description: "Whether handles align with the object's local axes or the world axes",
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
    meshType: 'box',
    enableMaxDistance: false,
    disableTranslation: 'none',
    disableRotation: 'none',
    space: 'local',
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
    disableTranslation: 'all',
  },
};

/**
 * TransformTool in world space mode.
 * Handles always align with the world X/Y/Z axes regardless of the object's rotation.
 * Rotate the object first, then observe that the handles stay world-aligned.
 */
export const WorldSpace: Story = {
  args: {
    ...Basic.args,
    space: 'world',
  },
};

/**
 * TransformTool with rotation disabled.
 * Only translation handles are visible and functional.
 */
export const RotationDisabled: Story = {
  args: {
    ...Basic.args,
    disableRotation: 'all',
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

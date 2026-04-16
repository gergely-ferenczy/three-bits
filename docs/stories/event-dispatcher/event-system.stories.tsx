import React, { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import * as THREE from 'three';
import { TbEventDispatcher, OrbitControl } from '../../../lib/index';

interface GroupConfig {
  geometry: THREE.BufferGeometry;
  baseColor: THREE.Color;
  hoverColor: THREE.Color;
  clickColor: THREE.Color;
  individualHoverColor: THREE.Color;
  individualClickColor: THREE.Color;
  objects: THREE.Mesh[];
  xOffset: number;
  name: string;
}

/**
 * Event System Demo Component
 */
const EventSystemDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    control: OrbitControl;
    eventDispatcher: TbEventDispatcher;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Setup orthographic camera (birds eye view)
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const frustumSize = 15;
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000,
    );
    camera.position.set(6, 8, 12);
    camera.lookAt(0, 0, 0);

    // Add table top
    const tableGeometry = new THREE.BoxGeometry(20, 0.5, 20);
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });
    const tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
    tableMesh.name = 'table-top';
    tableMesh.position.y = -1;
    scene.add(tableMesh);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    ambientLight.name = 'ambient-light';
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.name = 'directional-light';
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Group configurations
    const groups: GroupConfig[] = [
      {
        geometry: new THREE.BoxGeometry(1, 1, 1),
        baseColor: new THREE.Color(0x194a8d),
        hoverColor: new THREE.Color(0x2d6bb3),
        clickColor: new THREE.Color(0xfecf6a),
        individualHoverColor: new THREE.Color(0x4d8bd3),
        individualClickColor: new THREE.Color(0xfee8b7),
        objects: [],
        xOffset: -6,
        name: 'box-group',
      },
      {
        geometry: new THREE.TorusGeometry(0.6, 0.25, 16, 100),
        baseColor: new THREE.Color(0x8f3985),
        hoverColor: new THREE.Color(0xb34da5),
        clickColor: new THREE.Color(0xfecf6a),
        individualHoverColor: new THREE.Color(0xd36dc5),
        individualClickColor: new THREE.Color(0xfee8b7),
        objects: [],
        xOffset: 0,
        name: 'torus-group',
      },
      {
        geometry: new THREE.DodecahedronGeometry(0.6),
        baseColor: new THREE.Color(0xdf1c44),
        hoverColor: new THREE.Color(0xf34060),
        clickColor: new THREE.Color(0xfecf6a),
        individualHoverColor: new THREE.Color(0xff6484),
        individualClickColor: new THREE.Color(0xfee8b7),
        objects: [],
        xOffset: 6,
        name: 'dodecahedron-group',
      },
    ];

    // Create groups and objects
    groups.forEach((groupConfig, groupIndex) => {
      const group = new THREE.Group();
      group.name = groupConfig.name;
      group.userData.groupConfig = groupConfig;
      group.userData.isHovered = false;
      group.userData.isClicked = false;

      // Create 6 objects in a 2x3 grid
      for (let i = 0; i < 6; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;

        const material = new THREE.MeshStandardMaterial({
          color: groupConfig.baseColor,
        });

        const mesh = new THREE.Mesh(groupConfig.geometry, material);
        mesh.name = `${groupConfig.name}-${i}`;
        mesh.position.set(groupConfig.xOffset + col * 2 - 0.5, 0, row * 2 - 2);
        mesh.userData.baseColor = groupConfig.baseColor.clone();
        mesh.userData.currentColor = groupConfig.baseColor.clone();
        mesh.userData.isHovered = false;
        mesh.userData.isClicked = false;
        mesh.userData.group = group;

        groupConfig.objects.push(mesh);
        group.add(mesh);
      }

      scene.add(group);
    });

    // Setup event dispatcher
    const eventDispatcher = new TbEventDispatcher(renderer.domElement, camera);

    // Helper function to update mesh color
    const updateMeshColor = (mesh: THREE.Mesh) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      const group = mesh.userData.group as THREE.Group;
      const groupConfig = group.userData.groupConfig as GroupConfig;

      let color: THREE.Color;

      if (mesh.userData.isClicked) {
        color = groupConfig.individualClickColor;
      } else if (group.userData.isClicked) {
        color = groupConfig.clickColor;
      } else if (mesh.userData.isHovered) {
        color = groupConfig.individualHoverColor;
      } else if (group.userData.isHovered) {
        color = groupConfig.hoverColor;
      } else {
        color = groupConfig.baseColor;
      }

      mesh.userData.currentColor = color.clone();
      material.color.copy(color);
      renderer.render(scene, camera);
    };

    // Add event listeners to groups
    groups.forEach((groupConfig) => {
      const group = scene.getObjectByName(groupConfig.name) as THREE.Group;

      // Group hover events
      eventDispatcher.addEventListener(group, 'pointerenter', () => {
        group.userData.isHovered = true;
        groupConfig.objects.forEach((mesh) => updateMeshColor(mesh));
      });

      eventDispatcher.addEventListener(group, 'pointerleave', () => {
        group.userData.isHovered = false;
        groupConfig.objects.forEach((mesh) => updateMeshColor(mesh));
      });

      // Individual object events
      groupConfig.objects.forEach((mesh) => {
        // Individual hover events
        eventDispatcher.addEventListener(mesh, 'pointerenter', (event) => {
          mesh.userData.isHovered = true;
          updateMeshColor(mesh);
          event.stopPropagation(); // Prevent group hover
        });

        eventDispatcher.addEventListener(mesh, 'pointerleave', () => {
          mesh.userData.isHovered = false;
          updateMeshColor(mesh);
        });

        // Click events
        eventDispatcher.addEventListener(mesh, 'pointerdown', (event) => {
          // Reset all objects in all groups
          groups.forEach((gc) => {
            const g = scene.getObjectByName(gc.name) as THREE.Group;
            g.userData.isClicked = false;
            gc.objects.forEach((m) => {
              m.userData.isClicked = false;
              updateMeshColor(m);
            });
          });

          // Set clicked state for this group and mesh
          group.userData.isClicked = true;
          mesh.userData.isClicked = true;

          // Update all objects in clicked group
          groupConfig.objects.forEach((m) => updateMeshColor(m));

          event.stopPropagation();
        });
      });
    });

    // Global click away listener to deselect
    eventDispatcher.addGlobalEventListener('click', (event) => {
      if (event.target && event.target.name !== 'table-top') return;

      // Reset all objects in all groups
      groups.forEach((gc) => {
        const g = scene.getObjectByName(gc.name) as THREE.Group;
        g.userData.isClicked = false;
        gc.objects.forEach((m) => {
          m.userData.isClicked = false;
          updateMeshColor(m);
        });
      });
    });

    // Setup orbit control
    const control = new OrbitControl(camera);
    control.attach(renderer.domElement);
    control.addEventListener('change', () => {
      renderer.render(scene, camera);
    });

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;

      const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.left = (frustumSize * aspect) / -2;
      camera.right = (frustumSize * aspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
      camera.updateProjectionMatrix();

      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(containerRef.current);

    // Initial render
    renderer.render(scene, camera);

    // Store references for cleanup
    sceneRef.current = { scene, camera, renderer, control, eventDispatcher };

    // Cleanup
    return () => {
      resizeObserver.disconnect();

      if (sceneRef.current) {
        sceneRef.current.control.detach();
        sceneRef.current.eventDispatcher.dispose();
      }

      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }

      // Dispose geometries and materials
      tableGeometry.dispose();
      tableMaterial.dispose();

      groups.forEach((groupConfig) => {
        groupConfig.geometry.dispose();
        groupConfig.objects.forEach((mesh) => {
          (mesh.material as THREE.Material).dispose();
        });
      });

      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          padding: '15px 20px',
          borderRadius: '5px',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          lineHeight: '1.6',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Event System Demo</div>
        <div>• Hover over objects to highlight them and their group</div>
        <div>• Click any object to select the group</div>
        <div>• Click anywhere in the scene to deselect the highlighted object</div>
      </div>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

// Storybook metadata
const meta: Meta<typeof EventSystemDemo> = {
  title: 'Event System/Event Dispatcher',
  component: EventSystemDemo,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof EventSystemDemo>;

/**
 * Interactive demonstration of the three-bits event system.
 *
 * This story showcases the TbEventDispatcher with hierarchical event handling:
 *
 * **Three object groups:**
 * - Blue boxes (left)
 * - Purple toruses (center)
 * - Red dodecahedrons (right)
 *
 * **Event handling:**
 * - **Group hover**: Mouse over any group highlights all objects in that group
 * - **Individual hover**: Mouse over a specific object gives it an even brighter highlight
 * - **Click selection**: Click any object to select the entire group (yellow/gold color)
 * - **Event propagation**: Individual object hover stops propagation to prevent group hover
 *
 * The event system handles pointer events on 3D objects with proper enter/leave
 * detection and event propagation control, similar to DOM events.
 */
export const InteractiveDemo: Story = {};

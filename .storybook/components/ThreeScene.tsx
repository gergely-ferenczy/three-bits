import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';

export interface ThreeSceneProps {
  children: React.ReactNode;
  showGrid?: boolean;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
}

/**
 * A reusable Three.js scene wrapper for Storybook stories.
 * Provides a consistent canvas setup with optional grid and orbit controls.
 */
export const ThreeScene: React.FC<ThreeSceneProps> = ({
  children,
  showGrid = true,
  cameraPosition = [10, 10, 10],
  cameraFov = 50,
}) => {
  return (
    <Canvas
      camera={{
        position: cameraPosition,
        fov: cameraFov,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      {showGrid && (
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
      )}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      {children}
      <OrbitControls makeDefault />
    </Canvas>
  );
};

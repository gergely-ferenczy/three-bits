import React, { useState, useEffect } from 'react';
import * as THREE from 'three';

export interface SceneInfoProps {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  quaternion?: THREE.Quaternion;
  scale?: THREE.Vector3;
}

/**
 * Displays transform information (position, rotation, scale) in an overlay.
 * Useful for debugging and demonstrating transform changes.
 */
export const SceneInfo: React.FC<SceneInfoProps> = ({ position, rotation, quaternion, scale }) => {
  const formatVector3 = (v: THREE.Vector3) =>
    `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;

  const formatEuler = (e: THREE.Euler) => {
    const toDeg = (rad: number) => ((rad * 180) / Math.PI).toFixed(1);
    return `(${toDeg(e.x)}°, ${toDeg(e.y)}°, ${toDeg(e.z)}°)`;
  };

  const formatQuaternion = (q: THREE.Quaternion) =>
    `(${q.x.toFixed(2)}, ${q.y.toFixed(2)}, ${q.z.toFixed(2)}, ${q.w.toFixed(2)})`;

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
      {position && (
        <div>
          <strong>Position:</strong> {formatVector3(position)}
        </div>
      )}
      {rotation && (
        <div>
          <strong>Rotation:</strong> {formatEuler(rotation)}
        </div>
      )}
      {quaternion && (
        <div>
          <strong>Quaternion:</strong> {formatQuaternion(quaternion)}
        </div>
      )}
      {scale && (
        <div>
          <strong>Scale:</strong> {formatVector3(scale)}
        </div>
      )}
    </div>
  );
};

export interface AnimatedSceneInfoProps {
  objectRef: React.RefObject<THREE.Object3D>;
}

/**
 * A version of SceneInfo that automatically updates by polling an object reference.
 * Useful for showing real-time transform updates during interactions.
 */
export const AnimatedSceneInfo: React.FC<AnimatedSceneInfoProps> = ({ objectRef }) => {
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3());
  const [rotation, setRotation] = useState<THREE.Euler>(new THREE.Euler());
  const [scale, setScale] = useState<THREE.Vector3>(new THREE.Vector3(1, 1, 1));

  useEffect(() => {
    const interval = setInterval(() => {
      if (objectRef.current) {
        setPosition(objectRef.current.position.clone());
        setRotation(objectRef.current.rotation.clone());
        setScale(objectRef.current.scale.clone());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [objectRef]);

  return <SceneInfo position={position} rotation={rotation} scale={scale} />;
};

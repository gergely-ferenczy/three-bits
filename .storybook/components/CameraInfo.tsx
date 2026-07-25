import { useMemo } from 'react';
import * as THREE from 'three';

const formatVector3 = (v: THREE.Vector3 | null) =>
  v ? `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})` : '';

export interface CameraInfoProps {
  info: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    target: THREE.Vector3;
    zoom: number;
  } | null;
}

export const CameraInfo = ({ info }: CameraInfoProps) => {
  const position = info?.position ?? null;
  const rotation = info?.rotation ?? null;
  const target = info?.target ?? null;
  const zoom = info?.zoom ?? null;

  const positionStr = useMemo(() => formatVector3(position), [position]);

  const rotationStr = useMemo(() => {
    const deg = (r: number) => ((r * 180) / Math.PI).toFixed(1);
    return rotation ? `(${deg(rotation.x)}°, ${deg(rotation.y)}°, ${deg(rotation.z)}°)` : '';
  }, [rotation]);

  const targetStr = useMemo(() => formatVector3(target ?? null), [target]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '10px 15px',
        borderRadius: 5,
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 1.5,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <div>
        <strong>Position:</strong> {positionStr}
      </div>
      <div>
        <strong>Rotation:</strong> {rotationStr}
      </div>
      <div>
        <strong>Target:</strong> {targetStr}
      </div>
      <div>
        <strong>Zoom:</strong> {zoom !== null ? zoom.toFixed(3) : ''}
      </div>
    </div>
  );
};

import * as THREE from 'three';

import { ThreeEventType } from './three-event-types';

export interface ThreeEvent<E extends Event = Event> {
  readonly target: THREE.Object3D;
  readonly currentTarget: THREE.Object3D;
  readonly intersections: THREE.Intersection[];
  readonly ray: THREE.Ray;
  readonly camera: THREE.Camera;
  readonly type: ThreeEventType;
  readonly nativeEvent: E;
  readonly eventPhase: number;
  stopPropagation: () => void;
  stopImmediatePropagation: () => void;
}

import * as THREE from 'three';
import { describe, expect, test } from 'vitest';

import { getCameraAspectRatio, syncCameras } from '../../lib/utils';
import '../helpers/to-be-close-to-vector';
interface Case {
  orthographicCamera: THREE.OrthographicCamera;
  perspectiveCamera: THREE.PerspectiveCamera;
  fromPos: THREE.Vector3;
  fromZoom: number;
  target: THREE.Vector3;
  expectedPos: THREE.Vector3;
  expectedZoom: number;
  expectedAspect: number;
  hint: string;
}
describe('synchronize a perspective camera to an orthographic camera', () => {
  test.each<Case>([
    {
      orthographicCamera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000),
      perspectiveCamera: new THREE.PerspectiveCamera(55, 1, 0.1, 1000),
      fromPos: new THREE.Vector3(30, 40, 50),
      fromZoom: 1,
      target: new THREE.Vector3(3, 2, 1),
      expectedPos: new THREE.Vector3(3.7669, 3.07934, 2.39178),
      expectedZoom: 1,
      expectedAspect: 1,
      hint: 'baseline',
    },
    {
      orthographicCamera: new THREE.OrthographicCamera(-1.2, 1.2, 1, -1, 0.1, 1000),
      perspectiveCamera: new THREE.PerspectiveCamera(55, 1, 0.1, 1000),
      fromPos: new THREE.Vector3(30, 40, 50),
      fromZoom: 1,
      target: new THREE.Vector3(3, 2, 1),
      expectedPos: new THREE.Vector3(3.7669, 3.07934, 2.39178),
      expectedZoom: 1,
      expectedAspect: 1.2,
      hint: 'aspect1',
    },
    {
      orthographicCamera: new THREE.OrthographicCamera(-0.7, 0.7, 1, -1, 0.1, 1000),
      perspectiveCamera: new THREE.PerspectiveCamera(55, 1, 0.1, 1000),
      fromPos: new THREE.Vector3(30, 40, 50),
      fromZoom: 1,
      target: new THREE.Vector3(3, 2, 1),
      expectedPos: new THREE.Vector3(3.7669, 3.07934, 2.39178),
      expectedZoom: 1,
      expectedAspect: 0.7,
      hint: 'aspect2',
    },
    {
      orthographicCamera: new THREE.OrthographicCamera(-1, 1, 1.2, -1.2, 0.1, 1000),
      perspectiveCamera: new THREE.PerspectiveCamera(55, 1, 0.1, 1000),
      fromPos: new THREE.Vector3(30, 40, 50),
      fromZoom: 1,
      target: new THREE.Vector3(3, 2, 1),
      expectedPos: new THREE.Vector3(3.92028, 3.29521, 2.67014),
      expectedZoom: 1,
      expectedAspect: 1 / 1.2,
      hint: 'aspect3',
    },
    {
      orthographicCamera: new THREE.OrthographicCamera(-1, 1, 0.7, -0.7, 0.1, 1000),
      perspectiveCamera: new THREE.PerspectiveCamera(55, 1, 0.1, 1000),
      fromPos: new THREE.Vector3(30, 40, 50),
      fromZoom: 1,
      target: new THREE.Vector3(3, 2, 1),
      expectedPos: new THREE.Vector3(3.53683, 2.75554, 1.97425),
      expectedZoom: 1,
      expectedAspect: 1 / 0.7,
      hint: 'aspect4',
    },
    {
      orthographicCamera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000),
      perspectiveCamera: new THREE.PerspectiveCamera(55, 1, 0.1, 1000),
      fromPos: new THREE.Vector3(30, 40, 50),
      fromZoom: 0.2,
      target: new THREE.Vector3(3, 2, 1),
      expectedPos: new THREE.Vector3(6.8345, 7.39671, 7.95891),
      expectedZoom: 1,
      expectedAspect: 1,
      hint: 'zoom < 1',
    },
    {
      orthographicCamera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000),
      perspectiveCamera: new THREE.PerspectiveCamera(55, 1, 0.1, 1000),
      fromPos: new THREE.Vector3(30, 40, 50),
      fromZoom: 6,
      target: new THREE.Vector3(3, 2, 1),
      expectedPos: new THREE.Vector3(3.12782, 2.17989, 1.23196),
      expectedZoom: 1,
      expectedAspect: 1,
      hint: 'zoom > 1',
    },
  ])(
    '$hint',
    ({
      orthographicCamera,
      perspectiveCamera,
      fromPos,
      fromZoom,
      target,
      expectedPos,
      expectedZoom,
      expectedAspect,
    }) => {
      orthographicCamera.position.copy(fromPos);
      const orthographicCameraVertical = (orthographicCamera.top - orthographicCamera.bottom) / 2;
      orthographicCamera.zoom = fromZoom;
      syncCameras(orthographicCamera, perspectiveCamera, target);

      expect(perspectiveCamera.position).toBeCloseToVector(expectedPos);
      expect(perspectiveCamera.zoom).toBeCloseTo(expectedZoom, 5);
      expect(perspectiveCamera.aspect).toBeCloseTo(expectedAspect, 5);

      syncCameras(perspectiveCamera, orthographicCamera, target);

      expect(orthographicCamera.position).toBeCloseToVector(expectedPos);
      expect(orthographicCamera.zoom).toBeCloseTo(fromZoom / orthographicCameraVertical, 5);
      expect(getCameraAspectRatio(orthographicCamera)).toBeCloseTo(expectedAspect, 5);
    },
  );
});

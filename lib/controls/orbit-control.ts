import { BaseRotationControl } from './base-rotation-control';
import { BaseRotationControlOptions } from './base-rotation-control-options';
import { ControllableCamera } from '../common/controllable-camera';

export type OrbitControlOptions = BaseRotationControlOptions;

export class OrbitControl extends BaseRotationControl {
  constructor(camera: ControllableCamera, options?: OrbitControlOptions) {
    super(camera, true, options);
  }
}

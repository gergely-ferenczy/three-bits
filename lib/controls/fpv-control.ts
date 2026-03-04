import { BaseRotationControl } from './base-rotation-control';
import { BaseRotationControlOptions } from './base-rotation-control-options';
import { ControllableCamera } from '../common/controllable-camera';

export type FpvControlOptions = BaseRotationControlOptions;

export class FpvControl extends BaseRotationControl {
  constructor(camera: ControllableCamera, options?: FpvControlOptions) {
    super(camera, false, options);
  }
}

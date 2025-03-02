import { BaseRotationControl } from './base-rotation-control';
import {
  BaseRotationControlOptions,
  PartialBaseRotationControlOptions,
} from './base-rotation-control-options';
import { ControllableCamera } from '../common/controllable-camera';

export type FpvControlOptions = BaseRotationControlOptions;

export type PartialFpvControlOptions = PartialBaseRotationControlOptions;
export class FpvControl extends BaseRotationControl {
  constructor(camera: ControllableCamera, options?: PartialFpvControlOptions) {
    super(camera, false, options);
  }
}

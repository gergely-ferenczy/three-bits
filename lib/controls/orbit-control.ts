import { BaseRotationControl } from './base-rotation-control';
import {
  BaseRotationControlOptions,
  PartialBaseRotationControlOptions,
} from './base-rotation-control-options';
import { ControllableCamera } from '../common/controllable-camera';

export type OrbitControlOptions = BaseRotationControlOptions;

export type PartialOrbitControlOptions = PartialBaseRotationControlOptions;

export class OrbitControl extends BaseRotationControl {
  constructor(camera: ControllableCamera, options?: PartialOrbitControlOptions) {
    super(camera, true, options);
  }
}

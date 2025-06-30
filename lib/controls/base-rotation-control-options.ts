import { ControlInput } from '../common/control-input';
import { FixedUpRotationFragmentOptions } from '../control-fagments/fixed-up-rotation-fragment';
import { TruckFragmentOptions } from '../control-fagments/truck-fragment';
import { ZoomDollyFragmentOptions } from '../control-fagments/zoom-dolly-fragment';

export type MovementType = 'rotate' | 'truck' | 'zoomOrDolly';

export interface BaseRotationControlOptions {
  rotation: FixedUpRotationFragmentOptions;
  truck: TruckFragmentOptions;
  zoomOrDolly: ZoomDollyFragmentOptions;
  inputMappings: { [key in MovementType]: ControlInput[] };
}

export type InputMappings = { [key in MovementType]: ControlInput[] };

export interface PartialBaseRotationControlOptions {
  rotation?: Partial<FixedUpRotationFragmentOptions>;
  truck?: Partial<TruckFragmentOptions>;
  zoomOrDolly?: Partial<ZoomDollyFragmentOptions>;
  inputMappings?: InputMappings;
  inverseWheel?: boolean;
}

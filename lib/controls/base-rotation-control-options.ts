import { ControlInput } from '../common/control-input';
import { InputMappings } from '../common/input-mappings';
import { FixedUpRotationFragmentOptions } from '../control-fragments/fixed-up-rotation-fragment';
import { TruckFragmentOptions } from '../control-fragments/truck-fragment';
import { ZoomDollyFragmentOptions } from '../control-fragments/zoom-dolly-fragment';

export type MovementType = 'rotate' | 'truck' | 'zoomOrDolly';

export interface BaseRotationControlOptions {
  rotation: FixedUpRotationFragmentOptions;
  truck: TruckFragmentOptions;
  zoomOrDolly: ZoomDollyFragmentOptions;
  inputMappings: { [key in MovementType]: ControlInput[] };
}

export interface PartialBaseRotationControlOptions {
  rotation?: Partial<FixedUpRotationFragmentOptions>;
  truck?: Partial<TruckFragmentOptions>;
  zoomOrDolly?: Partial<ZoomDollyFragmentOptions>;
  inputMappings?: InputMappings;
  inverseWheel?: boolean;
}

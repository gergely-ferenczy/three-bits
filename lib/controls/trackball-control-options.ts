import { ControlInput } from '../common/control-input';
import { InputMappings } from '../common/input-mappings';
import { FreeUpRotationFragmentOptions } from '../control-fragments/free-up-rotation-fragment';
import { TruckFragmentOptions } from '../control-fragments/truck-fragment';
import { ZoomDollyFragmentOptions } from '../control-fragments/zoom-dolly-fragment';

export type MovementType = 'rotate' | 'truck' | 'zoomOrDolly';

export interface TrackballControlOptions {
  rotation: FreeUpRotationFragmentOptions;
  truck: TruckFragmentOptions;
  zoomOrDolly: ZoomDollyFragmentOptions;
  inputMappings: { [key in MovementType]: ControlInput[] };
}

export interface PartialTrackballControlOptions {
  rotation?: Partial<FreeUpRotationFragmentOptions>;
  truck?: Partial<TruckFragmentOptions>;
  zoomOrDolly?: Partial<ZoomDollyFragmentOptions>;
  inputMappings?: InputMappings;
  inverseWheel?: boolean;
}

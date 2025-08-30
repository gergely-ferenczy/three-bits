import { ControlInput } from './control-input';
import { MovementType } from '../controls/base-rotation-control-options';

export type InputMappings = { [key in MovementType]: ControlInput[] };

import { MouseButton } from './mouse-button';
import { TouchGesture } from './touch-gesture';

export interface ControlInput {
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
  mouseButton?: MouseButton;
  touchGesture?: TouchGesture;
}

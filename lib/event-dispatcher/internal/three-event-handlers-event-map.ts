import { ThreeEvent } from '../three-event';
import {
  ThreeMouseEventType,
  ThreePointerEventType,
  ThreeWheelEventType,
} from '../three-event-types';

type ThreePointerEventHandlersEventMap = Record<ThreePointerEventType, ThreeEvent<PointerEvent>>;
type ThreeMouseEventHandlersEventMap = Record<ThreeMouseEventType, ThreeEvent<MouseEvent>>;
type ThreeWheelEventHandlersEventMap = Record<ThreeWheelEventType, ThreeEvent<WheelEvent>>;

export type ThreeEventHandlersEventMap = ThreePointerEventHandlersEventMap &
  ThreeMouseEventHandlersEventMap &
  ThreeWheelEventHandlersEventMap;

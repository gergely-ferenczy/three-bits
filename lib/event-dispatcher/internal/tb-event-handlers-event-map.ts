import { TbEvent } from '../tb-event';
import { TbMouseEventType, TbPointerEventType, TbWheelEventType } from '../tb-event-types';

type TbPointerEventHandlersEventMap<G extends 'object' | 'global'> = Record<
  TbPointerEventType,
  TbEvent<PointerEvent, G>
>;
type TbMouseEventHandlersEventMap<G extends 'object' | 'global'> = Record<
  TbMouseEventType,
  TbEvent<MouseEvent, G>
>;
type TbWheelEventHandlersEventMap<G extends 'object' | 'global'> = Record<
  TbWheelEventType,
  TbEvent<WheelEvent, G>
>;

export type TbEventHandlersEventMap<G extends 'object' | 'global' = 'object'> =
  TbPointerEventHandlersEventMap<G> &
    TbMouseEventHandlersEventMap<G> &
    TbWheelEventHandlersEventMap<G>;

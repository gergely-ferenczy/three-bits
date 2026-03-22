import type { TbEventDispatcher } from './tb-event-dispatcher';

/**
 * Supported pointer event types by {@link TbEventDispatcher}.
 */
export type TbPointerEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointerenter'
  | 'pointerleave'
  | 'pointerover'
  | 'pointerout'
  | 'pointercancel';

/**
 * Supported mouse event types by {@link TbEventDispatcher}.
 */
export type TbMouseEventType = 'click' | 'dblclick';

/**
 * Supported wheel event types by {@link TbEventDispatcher}.
 */
export type TbWheelEventType = 'wheel';

/**
 * All supported event types by {@link TbEventDispatcher}.
 */
export type TbEventType = TbPointerEventType | TbMouseEventType | TbWheelEventType;

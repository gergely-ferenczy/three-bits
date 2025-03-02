export type ThreePointerEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointerenter'
  | 'pointerleave'
  | 'pointerover'
  | 'pointerout'
  | 'pointercancel';

export type ThreeMouseEventType = 'click' | 'dblclick';

export type ThreeWheelEventType = 'wheel';

export type ThreeEventType = ThreePointerEventType | ThreeMouseEventType | ThreeWheelEventType;

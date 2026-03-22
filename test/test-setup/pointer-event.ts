if (typeof PointerEvent === 'undefined') {
  // @ts-expect-error polyfill for PointerEvent
  global.PointerEvent = class PointerEvent extends MouseEvent {};
}

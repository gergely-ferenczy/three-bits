if (typeof PointerEvent === 'undefined') {
  // @ts-expect-error
  global.PointerEvent = class PointerEvent extends MouseEvent {};
}

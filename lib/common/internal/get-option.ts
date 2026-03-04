export function getOption<T extends number | boolean | string>(
  option: T | { pointer: T; touch: T },
  type: 'pointer' | 'touch',
): T {
  return typeof option === 'object' //
    ? type === 'touch'
      ? option.touch
      : option.pointer
    : option;
}

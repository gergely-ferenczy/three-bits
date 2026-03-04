export function getOption<T extends number | boolean | string>(
  option: T | { pointer: T; touch: T },
  type: 'pointer' | 'touch',
): T;
export function getOption<T extends number | boolean | string>(
  option: T | { pointer: T; touch: T; scroll: T },
  type: 'pointer' | 'touch' | 'scroll',
): T;
export function getOption<T extends number | boolean | string>(
  option: T | { pointer: T; touch: T; scroll: T },
  type: 'pointer' | 'touch' | 'scroll',
): T {
  return typeof option === 'object'
    ? type === 'touch'
      ? option.touch
      : type === 'scroll'
        ? option.scroll
        : option.pointer
    : option;
}

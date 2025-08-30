function getInvert(
  invertOption: boolean | { pointer: boolean; touch: boolean },
  type: 'pointer' | 'touch',
): boolean {
  return typeof invertOption === 'boolean'
    ? invertOption
    : type == 'touch'
      ? invertOption.touch
      : invertOption.pointer;
}

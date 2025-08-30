export function getSpeed(
  speedOption: number | { pointer: number; touch: number },
  type: 'pointer' | 'touch',
): number {
  return typeof speedOption === 'number'
    ? speedOption
    : type == 'touch'
      ? speedOption.touch
      : speedOption.pointer;
}

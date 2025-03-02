export function clamp(
  value: number,
  min: number,
  max: number,
  clampCallback?: (value: number) => void,
) {
  if (value < min) {
    clampCallback?.(min);
    return min;
  } else if (value > max) {
    clampCallback?.(max);
    return max;
  }
  return value;
}

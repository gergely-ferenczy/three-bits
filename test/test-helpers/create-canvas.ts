import { vi } from 'vitest';

export function createCanvas(width = 200, height = 100) {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'clientWidth', {
    value: width,
    configurable: true,
  });
  Object.defineProperty(canvas, 'clientHeight', {
    value: height,
    configurable: true,
  });
  canvas.getBoundingClientRect = vi.fn(() => ({
    width: width,
    height: height,
    top: 0,
    left: 0,
    bottom: height,
    right: width,
    x: 0,
    y: 0,
    toJSON: () => {},
  }));
  return canvas;
}

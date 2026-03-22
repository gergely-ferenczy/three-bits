import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  createMouseEvent,
  createPointerEvent,
  createTestResources,
  createWheelEvent,
} from './test-helpers';
import { TbEventDispatcher } from '../../lib';
import { TbEventType } from '../../lib/event-dispatcher/tb-event-types';

let canvas: HTMLCanvasElement;
let camera: THREE.OrthographicCamera;
beforeAll(() => {
  const resources = createTestResources();
  canvas = resources.canvas;
  camera = resources.camera;
});

let eventDispatcher: TbEventDispatcher;
beforeEach(() => {
  eventDispatcher = new TbEventDispatcher(canvas, camera);
});

test('global event handlers can be added/removed', () => {
  const testEventHandler = vi.fn().mockName('testEventHandler');
  eventDispatcher.addGlobalEventListener('click', testEventHandler);

  canvas.dispatchEvent(createMouseEvent('click'));
  expect(testEventHandler).toHaveBeenCalledOnce();

  eventDispatcher.removeGlobalEventListener('click', testEventHandler);
  testEventHandler.mockClear();
  canvas.dispatchEvent(createMouseEvent('click'));
  expect(testEventHandler).not.toHaveBeenCalledOnce();
});

describe('global event handlers fire', () => {
  test.each<{ type: TbEventType }>([
    { type: 'click' },
    { type: 'dblclick' },
    { type: 'pointerdown' },
    { type: 'pointerup' },
    { type: 'wheel' },
  ])('$type', ({ type }) => {
    const testEventHandlerCapture = vi.fn().mockName('testEventHandlerCapture');
    const testEventHandlerBubble = vi.fn().mockName('testEventHandlerBubble');
    eventDispatcher.addGlobalEventListener(type, testEventHandlerCapture, true);
    eventDispatcher.addGlobalEventListener(type, testEventHandlerBubble);

    const simulatedEvent =
      type === 'wheel'
        ? createWheelEvent(type)
        : type === 'click' || type === 'dblclick'
          ? createMouseEvent(type)
          : createPointerEvent(type);
    canvas.dispatchEvent(simulatedEvent);

    expect(testEventHandlerCapture).toHaveBeenCalledOnce();
    expect(testEventHandlerBubble).toHaveBeenCalledOnce();
    expect(testEventHandlerBubble).toHaveBeenCalledAfter(testEventHandlerCapture);
  });
});

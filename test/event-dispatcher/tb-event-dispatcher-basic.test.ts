import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  createMouseEvent,
  createPointerEvent,
  createTestResources,
  createWheelEvent,
  EventCallLog,
} from './test-helpers';
import { TbEvent, TbEventDispatcher } from '../../lib';
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

describe('event handlers can be added/removed', () => {
  test('single event on single object with no options', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    const testEventHandler = vi.fn().mockName('testEventHandler');
    eventDispatcher.addEventListener(object, 'click', testEventHandler);

    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createMouseEvent('click'));
    expect(testEventHandler).toHaveBeenCalledOnce();

    eventDispatcher.removeEventListener(object, 'click', testEventHandler);
    testEventHandler.mockClear();
    canvas.dispatchEvent(createMouseEvent('click'));
    expect(testEventHandler).not.toHaveBeenCalledOnce();
  });

  test('trying to remove non-existent event handler does not throw', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    expect(() => {
      eventDispatcher.removeEventListener(object, 'click', () => {});
    }).not.toThrow();
  });

  test.each<TbEventType>([
    'pointerdown',
    'pointerup',
    'pointercancel',
    'pointerenter',
    'pointerleave',
    'pointerover',
    'pointerout',
    'click',
    'dblclick',
    'wheel',
  ])(
    'a non-pointermove event fired before a first pointermove event does not throw',
    (eventType) => {
      const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
      eventDispatcher.addEventListener(object, 'click', () => {});

      expect(() => {
        canvas.dispatchEvent(createPointerEvent(eventType));
      }).not.toThrow();
    },
  );

  test('multiple events on multiple objects with options', () => {
    const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectB.position.set(-1, 0, 0);

    const testEventHandlerA1 = vi.fn().mockName('testEventHandlerA1');
    const testEventHandlerA2 = vi.fn().mockName('testEventHandlerA2');
    const testEventHandlerB1 = vi.fn().mockName('testEventHandlerB1');
    const testEventHandlerB2 = vi.fn().mockName('testEventHandlerB2');
    eventDispatcher.addEventListener(objectA, 'click', testEventHandlerA1);
    eventDispatcher.addEventListener(objectA, 'click', testEventHandlerA1, true);
    eventDispatcher.addEventListener(objectA, 'click', testEventHandlerA2, false);
    eventDispatcher.addEventListener(objectA, 'click', testEventHandlerA2, true);
    eventDispatcher.addEventListener(objectB, 'click', testEventHandlerB1);
    eventDispatcher.addEventListener(objectB, 'click', testEventHandlerB2, {
      ignoreOcclusion: true,
    });

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    const clearAllMocks = () => {
      testEventHandlerA1.mockClear();
      testEventHandlerA2.mockClear();
      testEventHandlerB1.mockClear();
      testEventHandlerB2.mockClear();
    };

    const testCallCount = (a1: number, a2: number, a3: number, b1: number, b2: number) => {
      clearAllMocks();
      canvas.dispatchEvent(createMouseEvent('click'));
      expect(testEventHandlerA1).toHaveBeenCalledTimes(a1);
      expect(testEventHandlerA2).toHaveBeenCalledTimes(a2);
      expect(testEventHandlerB1).toHaveBeenCalledTimes(b1);
      expect(testEventHandlerB2).toHaveBeenCalledTimes(b2);
    };

    testCallCount(2, 2, 2, 0, 1);

    eventDispatcher.removeEventListener(objectA, 'click', testEventHandlerA1, false);
    testCallCount(1, 2, 2, 0, 1);

    eventDispatcher.removeEventListener(objectA, 'click', testEventHandlerA1, true);
    testCallCount(0, 2, 2, 0, 1);

    eventDispatcher.removeEventListener(objectA, 'click', testEventHandlerA2);
    testCallCount(0, 1, 2, 0, 1);

    eventDispatcher.removeEventListener(objectA, 'click', testEventHandlerA2, true);
    testCallCount(0, 0, 2, 0, 1);
  });
});

describe('event handlers fire on 3D object', () => {
  test.each<{ type: TbEventType }>([
    { type: 'click' },
    { type: 'dblclick' },
    { type: 'pointerdown' },
    { type: 'pointerup' },
    { type: 'wheel' },
  ])('$type', ({ type }) => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    const testEventHandler = vi.fn().mockName('testEventHandler');
    eventDispatcher.addEventListener(object, type, testEventHandler);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    const simulatedEvent =
      type === 'wheel'
        ? createWheelEvent(type)
        : type === 'click' || type === 'dblclick'
          ? createMouseEvent(type)
          : createPointerEvent(type);
    canvas.dispatchEvent(simulatedEvent);

    expect(testEventHandler).toHaveBeenCalledOnce();
  });
});

describe('event order and target data is correct', () => {
  test.each<{ type: TbEventType }>([
    { type: 'click' },
    { type: 'dblclick' },
    { type: 'pointermove' },
    { type: 'pointerdown' },
    { type: 'pointerup' },
    { type: 'pointercancel' },
    { type: 'wheel' },
  ])('$type', ({ type }) => {
    const eventOptions = { ignoreOcclusion: true };
    const callSequence: EventCallLog[] = [];

    const createGroup = (name: string): THREE.Object3D => {
      const object = new THREE.Group();
      object.name = name;

      const eventListener = vi
        .fn()
        .mockName(`${type}-${object.name}`)
        .mockImplementation((event: TbEvent) => {
          callSequence.push({
            listener: object.name,
            target: event.target.name,
            currentTarget: event.currentTarget.name,
          });
        });
      eventDispatcher.addEventListener(object, type, eventListener, eventOptions);

      return object;
    };

    const createObject = (name: string, distance: number): THREE.Object3D => {
      const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
      object.name = name;
      object.position.x = distance;
      object.updateMatrixWorld();

      const eventListener = vi
        .fn()
        .mockName(`${type}-${object.name}`)
        .mockImplementation((event: TbEvent) => {
          callSequence.push({
            listener: object.name,
            target: event.target.name,
            currentTarget: event.currentTarget.name,
          });
        });
      eventDispatcher.addEventListener(object, type, eventListener, eventOptions);

      return object;
    };

    let d = 0;
    const objectAg = createObject('Ag', d++);
    const objectA1 = createObject('A1', d++);
    const objectD1 = createObject('D1', d++);
    const objectA2 = createObject('A2', d++);

    const objectB1 = createObject('B1', d++);
    const objectB2 = createObject('B2', d++);
    const objectBg = createObject('Bg', d++);
    const objectDg = createObject('Dg', d++);

    const objectC1 = createObject('C1', d++);
    const objectCg = createObject('Cg', d++);
    const objectC2 = createObject('C2', d++);
    const objectD2 = createObject('D2', d++);

    objectAg.add(objectA1, objectA2);
    objectBg.add(objectB1, objectB2);
    objectCg.add(objectC1, objectC2);
    objectDg.add(objectD1, objectD2);

    const groupAB = createGroup('Gab');
    groupAB.add(objectAg, objectBg);

    const groupCD = createGroup('Gcd');
    groupCD.add(objectCg, objectDg);

    canvas.dispatchEvent(createPointerEvent('pointermove'));
    callSequence.length = 0;

    const simulatedEvent =
      type === 'click' || type === 'dblclick' ? createMouseEvent(type) : createPointerEvent(type);
    canvas.dispatchEvent(simulatedEvent);

    expect(callSequence).toEqual([
      { listener: 'Ag', target: 'Ag', currentTarget: 'Ag' },
      { listener: 'Gab', target: 'Ag', currentTarget: 'Gab' },
      { listener: 'A1', target: 'A1', currentTarget: 'A1' },
      { listener: 'Ag', target: 'A1', currentTarget: 'Ag' },
      { listener: 'Gab', target: 'A1', currentTarget: 'Gab' },
      { listener: 'D1', target: 'D1', currentTarget: 'D1' },
      { listener: 'Dg', target: 'D1', currentTarget: 'Dg' },
      { listener: 'Gcd', target: 'D1', currentTarget: 'Gcd' },
      { listener: 'A2', target: 'A2', currentTarget: 'A2' },
      { listener: 'Ag', target: 'A2', currentTarget: 'Ag' },
      { listener: 'Gab', target: 'A2', currentTarget: 'Gab' },
      { listener: 'B1', target: 'B1', currentTarget: 'B1' },
      { listener: 'Bg', target: 'B1', currentTarget: 'Bg' },
      { listener: 'Gab', target: 'B1', currentTarget: 'Gab' },
      { listener: 'B2', target: 'B2', currentTarget: 'B2' },
      { listener: 'Bg', target: 'B2', currentTarget: 'Bg' },
      { listener: 'Gab', target: 'B2', currentTarget: 'Gab' },
      { listener: 'Bg', target: 'Bg', currentTarget: 'Bg' },
      { listener: 'Gab', target: 'Bg', currentTarget: 'Gab' },
      { listener: 'Dg', target: 'Dg', currentTarget: 'Dg' },
      { listener: 'Gcd', target: 'Dg', currentTarget: 'Gcd' },
      { listener: 'C1', target: 'C1', currentTarget: 'C1' },
      { listener: 'Cg', target: 'C1', currentTarget: 'Cg' },
      { listener: 'Gcd', target: 'C1', currentTarget: 'Gcd' },
      { listener: 'Cg', target: 'Cg', currentTarget: 'Cg' },
      { listener: 'Gcd', target: 'Cg', currentTarget: 'Gcd' },
      { listener: 'C2', target: 'C2', currentTarget: 'C2' },
      { listener: 'Cg', target: 'C2', currentTarget: 'Cg' },
      { listener: 'Gcd', target: 'C2', currentTarget: 'Gcd' },
      { listener: 'D2', target: 'D2', currentTarget: 'D2' },
      { listener: 'Dg', target: 'D2', currentTarget: 'Dg' },
      { listener: 'Gcd', target: 'D2', currentTarget: 'Gcd' },
    ]);
  });
});

describe('renderOrder is respected for overlapping objects', () => {
  test('object with higher renderOrder receives event when objects overlap', () => {
    // Create two objects at the exact same position
    const objectLowOrder = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectLowOrder.name = 'LowOrder';
    objectLowOrder.renderOrder = 1;
    objectLowOrder.position.set(0, 0, 0);
    objectLowOrder.updateMatrixWorld();

    const objectHighOrder = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectHighOrder.name = 'HighOrder';
    objectHighOrder.renderOrder = 2;
    objectHighOrder.position.set(0, 0, 0);
    objectHighOrder.updateMatrixWorld();

    const listenerLowOrder = vi.fn().mockName('listenerLowOrder');
    const listenerHighOrder = vi.fn().mockName('listenerHighOrder');

    eventDispatcher.addEventListener(objectLowOrder, 'click', listenerLowOrder);
    eventDispatcher.addEventListener(objectHighOrder, 'click', listenerHighOrder);

    // Initialize pointer position
    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Dispatch click event
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createMouseEvent('click'));

    // Object with higher renderOrder should receive the event
    expect(listenerHighOrder).toHaveBeenCalledOnce();
    // Object with lower renderOrder should be occluded and not receive the event
    expect(listenerLowOrder).not.toHaveBeenCalled();
  });

  test('objects with same renderOrder maintain stable ordering', () => {
    // Create three objects at the same position with different renderOrders
    const object1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object1.name = 'Order10_First';
    object1.renderOrder = 10;
    object1.position.set(0, 0, 0);
    object1.updateMatrixWorld();

    const object2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object2.name = 'Order10_Second';
    object2.renderOrder = 10;
    object2.position.set(0, 0, 0);
    object2.updateMatrixWorld();

    const object3 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object3.name = 'Order5';
    object3.renderOrder = 5;
    object3.position.set(0, 0, 0);
    object3.updateMatrixWorld();

    let targetName = '';
    const listener1 = vi.fn().mockImplementation((event: TbEvent) => {
      targetName = event.target.name;
    });
    const listener2 = vi.fn().mockImplementation((event: TbEvent) => {
      targetName = event.target.name;
    });
    const listener3 = vi.fn().mockImplementation((event: TbEvent) => {
      targetName = event.target.name;
    });

    eventDispatcher.addEventListener(object1, 'click', listener1);
    eventDispatcher.addEventListener(object2, 'click', listener2);
    eventDispatcher.addEventListener(object3, 'click', listener3);

    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createMouseEvent('click'));

    // One of the objects with renderOrder 10 should receive the event
    // Object with renderOrder 5 should be occluded
    expect(listener3).not.toHaveBeenCalled();
    expect(listener1.mock.calls.length + listener2.mock.calls.length).toBe(1);
    expect(targetName).toMatch(/Order10_(First|Second)/);
  });
});

import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  createMouseEvent,
  createPointerEvent,
  createTestResources,
  createWheelEvent,
  ratio,
} from './test-helpers';
import { TbEvent, TbEventDispatcher } from '../../lib';
import { TbEventType } from '../../lib/event-dispatcher/tb-event-types';

type EventCallLog = { listener: string; target: string; currentTarget: string };

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

describe('stopPropagation callback stops event propagation', () => {
  test.each(new Array(16).fill(null).map((_, i) => i + 1))(
    'stop propagation threshold: %i',
    (stopPropagationThreshold) => {
      const eventOptions = { ignoreOcclusion: true };
      const callSequence: EventCallLog[] = [];
      let stopPropagationCntr = 0;

      const handleEvent = (object: THREE.Object3D, event: TbEvent) => {
        callSequence.push({
          listener: object.name,
          target: event.target.name,
          currentTarget: event.currentTarget.name,
        });

        if (++stopPropagationCntr === stopPropagationThreshold) {
          event.stopPropagation();
        }
      };

      const createGroup = (name: string): THREE.Object3D => {
        const object = new THREE.Group();
        object.name = name;

        const eventListener = vi
          .fn()
          .mockName(`listener-${object.name}`)
          .mockImplementation((event: TbEvent) => handleEvent(object, event));
        eventDispatcher.addEventListener(object, 'pointerdown', eventListener, {
          ...eventOptions,
        });

        return object;
      };

      const createObject = (name: string, distance: number): THREE.Object3D => {
        const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
        object.name = name;
        object.position.x = distance;
        object.updateMatrixWorld();

        const eventListener = vi
          .fn()
          .mockName(`listener-${object.name}`)
          .mockImplementation((event: TbEvent) => handleEvent(object, event));
        eventDispatcher.addEventListener(object, 'pointerdown', eventListener, eventOptions);

        return object;
      };

      let d = 0;
      const objectAg = createObject('Ag', d++);
      const objectA1 = createObject('A1', d++);
      const objectA2 = createObject('A2', d++);

      const objectB1 = createObject('B1', d++);
      const objectB2 = createObject('B2', d++);
      const objectBg = createObject('Bg', d++);

      objectAg.add(objectA1, objectA2);
      objectBg.add(objectB1, objectB2);

      const groupA = createGroup('Ga');
      groupA.add(objectAg);

      const groupB = createGroup('Gb');
      groupB.add(objectBg);

      canvas.dispatchEvent(createPointerEvent('pointermove'));
      callSequence.length = 0;

      canvas.dispatchEvent(createPointerEvent('pointerdown'));

      const expectedCallSequence = [
        { listener: 'Ag', target: 'Ag', currentTarget: 'Ag' },
        { listener: 'Ga', target: 'Ag', currentTarget: 'Ga' },
        { listener: 'A1', target: 'A1', currentTarget: 'A1' },
        { listener: 'Ag', target: 'A1', currentTarget: 'Ag' },
        { listener: 'Ga', target: 'A1', currentTarget: 'Ga' },
        { listener: 'A2', target: 'A2', currentTarget: 'A2' },
        { listener: 'Ag', target: 'A2', currentTarget: 'Ag' },
        { listener: 'Ga', target: 'A2', currentTarget: 'Ga' },
        { listener: 'B1', target: 'B1', currentTarget: 'B1' },
        { listener: 'Bg', target: 'B1', currentTarget: 'Bg' },
        { listener: 'Gb', target: 'B1', currentTarget: 'Gb' },
        { listener: 'B2', target: 'B2', currentTarget: 'B2' },
        { listener: 'Bg', target: 'B2', currentTarget: 'Bg' },
        { listener: 'Gb', target: 'B2', currentTarget: 'Gb' },
        { listener: 'Bg', target: 'Bg', currentTarget: 'Bg' },
        { listener: 'Gb', target: 'Bg', currentTarget: 'Gb' },
      ];

      const expectedCallSequenceSlice = expectedCallSequence.slice(0, stopPropagationThreshold);

      expect(callSequence).toEqual(expectedCallSequenceSlice);
      expect(callSequence.length).toBe(stopPropagationThreshold);
    },
  );
});

describe('stopImmediatePropagation prevents calls to remaining listeners on same object and bubbling', () => {
  test('call on first listener prevents other listeners on same object', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object.name = 'Target';

    const listener1 = vi
      .fn()
      .mockName('listener1')
      .mockImplementation((event: TbEvent) => {
        event.stopImmediatePropagation();
      });
    const listener2 = vi.fn().mockName('listener2');
    const listener3 = vi.fn().mockName('listener3');

    eventDispatcher.addEventListener(object, 'pointerdown', listener1);
    eventDispatcher.addEventListener(object, 'pointerdown', listener2);
    eventDispatcher.addEventListener(object, 'pointerdown', listener3);

    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).not.toHaveBeenCalled();
    expect(listener3).not.toHaveBeenCalled();
  });

  test('call on second listener prevents third listener', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object.name = 'Target';

    const listener1 = vi.fn().mockName('listener1');
    const listener2 = vi
      .fn()
      .mockName('listener2')
      .mockImplementation((event: TbEvent) => {
        event.stopImmediatePropagation();
      });
    const listener3 = vi.fn().mockName('listener3');

    eventDispatcher.addEventListener(object, 'pointerdown', listener1);
    eventDispatcher.addEventListener(object, 'pointerdown', listener2);
    eventDispatcher.addEventListener(object, 'pointerdown', listener3);

    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
    expect(listener3).not.toHaveBeenCalled();
  });

  test('call prevents bubbling to parent', () => {
    const parent = new THREE.Group();
    parent.name = 'Parent';

    const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    child.name = 'Child';
    parent.add(child);

    const childListener1 = vi.fn().mockName('child-listener1');
    const childListener2 = vi
      .fn()
      .mockName('child-listener2')
      .mockImplementation((event: TbEvent) => {
        event.stopImmediatePropagation();
      });
    const childListener3 = vi.fn().mockName('child-listener3');
    const parentListener = vi.fn().mockName('parent-listener');

    eventDispatcher.addEventListener(child, 'pointerdown', childListener1);
    eventDispatcher.addEventListener(child, 'pointerdown', childListener2);
    eventDispatcher.addEventListener(child, 'pointerdown', childListener3);
    eventDispatcher.addEventListener(parent, 'pointerdown', parentListener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));

    expect(childListener1).toHaveBeenCalledOnce();
    expect(childListener2).toHaveBeenCalledOnce();
    expect(childListener3).not.toHaveBeenCalled();
    expect(parentListener).not.toHaveBeenCalled();
  });

  test('call in capture phase prevents bubbling phase', () => {
    const parent = new THREE.Group();
    parent.name = 'Parent';

    const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    child.name = 'Child';
    parent.add(child);

    const callSequence: string[] = [];

    const parentCaptureListener = vi
      .fn()
      .mockName('parent-capture')
      .mockImplementation((event: TbEvent) => {
        callSequence.push('parent-capture');
        event.stopImmediatePropagation();
      });
    const parentBubbleListener = vi
      .fn()
      .mockName('parent-bubble')
      .mockImplementation(() => {
        callSequence.push('parent-bubble');
      });
    const childListener = vi
      .fn()
      .mockName('child-listener')
      .mockImplementation(() => {
        callSequence.push('child-listener');
      });

    eventDispatcher.addEventListener(parent, 'pointerdown', parentCaptureListener, {
      capture: true,
    });
    eventDispatcher.addEventListener(parent, 'pointerdown', parentBubbleListener, {
      capture: false,
    });
    eventDispatcher.addEventListener(child, 'pointerdown', childListener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));

    expect(callSequence).toEqual(['parent-capture']);
    expect(parentCaptureListener).toHaveBeenCalledOnce();
    expect(parentBubbleListener).not.toHaveBeenCalled();
    expect(childListener).not.toHaveBeenCalled();
  });
});

describe('capture option controls event phase', () => {
  test('capture as boolean property', () => {
    const callSequence: Array<{
      listener: string;
      target: string;
      currentTarget: string;
      eventPhase: number;
    }> = [];

    const grandchild = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    grandchild.name = 'Grandchild';

    const child = new THREE.Group();
    child.name = 'Child';
    child.add(grandchild);

    const parent = new THREE.Group();
    parent.name = 'Parent';
    parent.add(child);

    const captureTrueListener = vi
      .fn()
      .mockName('parent-capture-true')
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'parent-capture-true',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
          eventPhase: event.eventPhase,
        });
      });

    const captureFalseListener = vi
      .fn()
      .mockName('parent-capture-false')
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'parent-capture-false',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
          eventPhase: event.eventPhase,
        });
      });

    const childCaptureListener = vi
      .fn()
      .mockName('child-capture-true')
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'child-capture-true',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
          eventPhase: event.eventPhase,
        });
      });

    const childBubbleListener = vi
      .fn()
      .mockName('child-capture-false')
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'child-capture-false',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
          eventPhase: event.eventPhase,
        });
      });

    const targetListener = vi
      .fn()
      .mockName('grandchild-target')
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'grandchild-target',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
          eventPhase: event.eventPhase,
        });
      });

    eventDispatcher.addEventListener(parent, 'pointermove', captureTrueListener, true);
    eventDispatcher.addEventListener(parent, 'pointermove', captureFalseListener, false);
    eventDispatcher.addEventListener(child, 'pointermove', childCaptureListener, true);
    eventDispatcher.addEventListener(child, 'pointermove', childBubbleListener, false);
    eventDispatcher.addEventListener(grandchild, 'pointermove', targetListener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Verify order: capturing phase (parent -> child) -> at target -> bubbling phase (child -> parent)
    expect(callSequence).toEqual([
      {
        listener: 'parent-capture-true',
        target: 'Grandchild',
        currentTarget: 'Parent',
        eventPhase: 1,
      }, // CAPTURING_PHASE
      {
        listener: 'child-capture-true',
        target: 'Grandchild',
        currentTarget: 'Child',
        eventPhase: 1,
      }, // CAPTURING_PHASE
      {
        listener: 'grandchild-target',
        target: 'Grandchild',
        currentTarget: 'Grandchild',
        eventPhase: 2,
      }, // AT_TARGET
      {
        listener: 'child-capture-false',
        target: 'Grandchild',
        currentTarget: 'Child',
        eventPhase: 3,
      }, // BUBBLING_PHASE
      {
        listener: 'parent-capture-false',
        target: 'Grandchild',
        currentTarget: 'Parent',
        eventPhase: 3,
      }, // BUBBLING_PHASE
    ]);

    expect(captureTrueListener).toHaveBeenCalledOnce();
    expect(captureFalseListener).toHaveBeenCalledOnce();
    expect(childCaptureListener).toHaveBeenCalledOnce();
    expect(childBubbleListener).toHaveBeenCalledOnce();
    expect(targetListener).toHaveBeenCalledOnce();
  });

  test('capture as object property', () => {
    const callSequence: Array<{
      listener: string;
      target: string;
      currentTarget: string;
      eventPhase: number;
    }> = [];

    const grandchild = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    grandchild.name = 'Grandchild';

    const child = new THREE.Group();
    child.name = 'Child';
    child.add(grandchild);

    const parent = new THREE.Group();
    parent.name = 'Parent';
    parent.add(child);

    const captureTrueListener = vi
      .fn()
      .mockName('parent-capture-obj-true')
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'parent-capture-obj-true',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
          eventPhase: event.eventPhase,
        });
      });

    const captureFalseListener = vi
      .fn()
      .mockName('parent-capture-obj-false')
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'parent-capture-obj-false',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
          eventPhase: event.eventPhase,
        });
      });

    const childCaptureListener = vi
      .fn()
      .mockName('child-capture-obj-true')
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'child-capture-obj-true',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
          eventPhase: event.eventPhase,
        });
      });

    const childBubbleListener = vi
      .fn()
      .mockName('child-capture-obj-false')
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'child-capture-obj-false',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
          eventPhase: event.eventPhase,
        });
      });

    eventDispatcher.addEventListener(parent, 'pointermove', captureTrueListener, { capture: true });
    eventDispatcher.addEventListener(parent, 'pointermove', captureFalseListener, {
      capture: false,
    });
    eventDispatcher.addEventListener(child, 'pointermove', childCaptureListener, { capture: true });
    eventDispatcher.addEventListener(child, 'pointermove', childBubbleListener, { capture: false });

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Verify order: capturing phase (parent -> child) -> bubbling phase (child -> parent)
    // Note: grandchild has no listeners, so it's not in the sequence
    expect(callSequence).toEqual([
      {
        listener: 'parent-capture-obj-true',
        target: 'Grandchild',
        currentTarget: 'Parent',
        eventPhase: 1,
      }, // CAPTURING_PHASE
      {
        listener: 'child-capture-obj-true',
        target: 'Grandchild',
        currentTarget: 'Child',
        eventPhase: 1,
      }, // CAPTURING_PHASE
      {
        listener: 'child-capture-obj-false',
        target: 'Grandchild',
        currentTarget: 'Child',
        eventPhase: 3,
      }, // BUBBLING_PHASE
      {
        listener: 'parent-capture-obj-false',
        target: 'Grandchild',
        currentTarget: 'Parent',
        eventPhase: 3,
      }, // BUBBLING_PHASE
    ]);

    expect(captureTrueListener).toHaveBeenCalledOnce();
    expect(captureFalseListener).toHaveBeenCalledOnce();
    expect(childCaptureListener).toHaveBeenCalledOnce();
    expect(childBubbleListener).toHaveBeenCalledOnce();
  });

  test('capture option can be removed independently', () => {
    const parent = new THREE.Group();
    parent.name = 'Parent';

    const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    child.name = 'Child';
    parent.add(child);

    const captureListener = vi.fn().mockName('capture-listener');
    const bubbleListener = vi.fn().mockName('bubble-listener');

    eventDispatcher.addEventListener(parent, 'pointermove', captureListener, true);
    eventDispatcher.addEventListener(parent, 'pointermove', bubbleListener, false);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    expect(captureListener).toHaveBeenCalledOnce();
    expect(bubbleListener).toHaveBeenCalledOnce();

    // Remove only the capture listener
    captureListener.mockClear();
    bubbleListener.mockClear();
    eventDispatcher.removeEventListener(parent, 'pointermove', captureListener, true);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    expect(captureListener).not.toHaveBeenCalled();
    expect(bubbleListener).toHaveBeenCalledOnce();

    // Remove the bubble listener
    bubbleListener.mockClear();
    eventDispatcher.removeEventListener(parent, 'pointermove', bubbleListener, false);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    expect(captureListener).not.toHaveBeenCalled();
    expect(bubbleListener).not.toHaveBeenCalled();
  });
});

describe('once option removes listener after first call', () => {
  test('once as boolean in options object', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    const onceListener = vi.fn().mockName('once-listener');

    eventDispatcher.addEventListener(object, 'pointerdown', onceListener, { once: true });

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // First call - listener should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(onceListener).toHaveBeenCalledOnce();

    // Second call - listener should NOT be called (auto-removed)
    onceListener.mockClear();
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(onceListener).not.toHaveBeenCalled();
  });

  test('once option works with capture phase', () => {
    const parent = new THREE.Group();
    parent.name = 'Parent';

    const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    child.name = 'Child';
    parent.add(child);

    const onceListener = vi.fn().mockName('once-capture-listener');

    eventDispatcher.addEventListener(parent, 'pointerdown', onceListener, {
      once: true,
      capture: true,
    });

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // First call - listener should be called during capture phase
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(onceListener).toHaveBeenCalledOnce();

    // Second call - listener should NOT be called
    onceListener.mockClear();
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(onceListener).not.toHaveBeenCalled();
  });

  test('multiple once listeners on same object fire independently', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    const onceListener1 = vi.fn().mockName('once-listener-1');
    const onceListener2 = vi.fn().mockName('once-listener-2');
    const regularListener = vi.fn().mockName('regular-listener');

    eventDispatcher.addEventListener(object, 'pointerdown', onceListener1, { once: true });
    eventDispatcher.addEventListener(object, 'pointerdown', onceListener2, { once: true });
    eventDispatcher.addEventListener(object, 'pointerdown', regularListener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // First call - all listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(onceListener1).toHaveBeenCalledOnce();
    expect(onceListener2).toHaveBeenCalledOnce();
    expect(regularListener).toHaveBeenCalledOnce();

    // Second call - only regular listener should be called
    onceListener1.mockClear();
    onceListener2.mockClear();
    regularListener.mockClear();
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(onceListener1).not.toHaveBeenCalled();
    expect(onceListener2).not.toHaveBeenCalled();
    expect(regularListener).toHaveBeenCalledOnce();
  });

  test('once listener removed even if stopPropagation is called', () => {
    const parent = new THREE.Group();
    parent.name = 'Parent';

    const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    child.name = 'Child';
    parent.add(child);

    const onceListener = vi.fn().mockName('once-with-stop');

    eventDispatcher.addEventListener(
      child,
      'pointerdown',
      (event) => {
        onceListener();
        event.stopPropagation();
      },
      { once: true },
    );

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // First call - listener should be called and stops propagation
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(onceListener).toHaveBeenCalledOnce();

    // Second call - listener should NOT be called (removed despite stopPropagation)
    onceListener.mockClear();
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(onceListener).not.toHaveBeenCalled();
  });
});

describe('signal option controls listener lifetime', () => {
  test('signal aborts and removes listener', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const abortController = new AbortController();

    const signalListener = vi.fn().mockName('signal-listener');

    eventDispatcher.addEventListener(object, 'pointerdown', signalListener, {
      signal: abortController.signal,
    });

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before abort - listener should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(signalListener).toHaveBeenCalledOnce();

    // Abort the signal
    signalListener.mockClear();
    abortController.abort();

    // After abort - listener should NOT be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(signalListener).not.toHaveBeenCalled();
  });

  test('signal works with capture phase', () => {
    const parent = new THREE.Group();
    parent.name = 'Parent';

    const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    child.name = 'Child';
    parent.add(child);

    const abortController = new AbortController();
    const signalListener = vi.fn().mockName('signal-capture-listener');

    eventDispatcher.addEventListener(parent, 'pointerdown', signalListener, {
      signal: abortController.signal,
      capture: true,
    });

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before abort - listener should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(signalListener).toHaveBeenCalledOnce();

    // Abort the signal
    signalListener.mockClear();
    abortController.abort();

    // After abort - listener should NOT be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(signalListener).not.toHaveBeenCalled();
  });

  test('multiple listeners can share same signal', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const abortController = new AbortController();

    const signalListener1 = vi.fn().mockName('signal-listener-1');
    const signalListener2 = vi.fn().mockName('signal-listener-2');
    const regularListener = vi.fn().mockName('regular-listener');

    eventDispatcher.addEventListener(object, 'pointerdown', signalListener1, {
      signal: abortController.signal,
    });
    eventDispatcher.addEventListener(object, 'pointerdown', signalListener2, {
      signal: abortController.signal,
    });
    eventDispatcher.addEventListener(object, 'pointerdown', regularListener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before abort - all listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(signalListener1).toHaveBeenCalledOnce();
    expect(signalListener2).toHaveBeenCalledOnce();
    expect(regularListener).toHaveBeenCalledOnce();

    // Abort the signal
    signalListener1.mockClear();
    signalListener2.mockClear();
    regularListener.mockClear();
    abortController.abort();

    // After abort - only regular listener should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(signalListener1).not.toHaveBeenCalled();
    expect(signalListener2).not.toHaveBeenCalled();
    expect(regularListener).toHaveBeenCalledOnce();
  });

  test('listener with already aborted signal is not added', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const abortController = new AbortController();

    // Abort before adding listener
    abortController.abort();

    const signalListener = vi.fn().mockName('pre-aborted-listener');

    eventDispatcher.addEventListener(object, 'pointerdown', signalListener, {
      signal: abortController.signal,
    });

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Listener should NOT be called because signal was already aborted
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(signalListener).not.toHaveBeenCalled();
  });
});

describe('removeAllEventListeners removes all listeners from object', () => {
  test('removes all event types and phases from single object', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    const clickListener = vi.fn().mockName('click-listener');
    const pointerdownListener = vi.fn().mockName('pointerdown-listener');
    const captureListener = vi.fn().mockName('capture-listener');
    const bubbleListener = vi.fn().mockName('bubble-listener');

    eventDispatcher.addEventListener(object, 'click', clickListener);
    eventDispatcher.addEventListener(object, 'pointerdown', pointerdownListener);
    eventDispatcher.addEventListener(object, 'pointermove', captureListener, { capture: true });
    eventDispatcher.addEventListener(object, 'pointermove', bubbleListener, { capture: false });

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before removal - all listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createMouseEvent('click'));
    expect(clickListener).toHaveBeenCalledOnce();
    expect(pointerdownListener).toHaveBeenCalledOnce();
    expect(captureListener).toHaveBeenCalledOnce();
    expect(bubbleListener).toHaveBeenCalledOnce();

    // Remove all listeners
    clickListener.mockClear();
    pointerdownListener.mockClear();
    captureListener.mockClear();
    bubbleListener.mockClear();
    eventDispatcher.removeAllEventListeners(object);

    // After removal - no listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createMouseEvent('click'));
    expect(clickListener).not.toHaveBeenCalled();
    expect(pointerdownListener).not.toHaveBeenCalled();
    expect(captureListener).not.toHaveBeenCalled();
    expect(bubbleListener).not.toHaveBeenCalled();
  });

  test('removes listeners only from specified object', () => {
    const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectA.position.x = 0;

    const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectB.position.x = 1;

    const listenerA = vi.fn().mockName('listener-A');
    const listenerB = vi.fn().mockName('listener-B');

    eventDispatcher.addEventListener(objectA, 'pointerdown', listenerA);
    eventDispatcher.addEventListener(objectB, 'pointerdown', listenerB, { ignoreOcclusion: true });

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before removal - both listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listenerA).toHaveBeenCalledOnce();
    expect(listenerB).toHaveBeenCalledOnce();

    // Remove listeners only from objectA
    listenerA.mockClear();
    listenerB.mockClear();
    eventDispatcher.removeAllEventListeners(objectA);

    // After removal - only listenerB should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalledOnce();
  });

  test('removes listeners from parent without affecting child', () => {
    const parent = new THREE.Group();
    parent.name = 'Parent';

    const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    child.name = 'Child';
    parent.add(child);

    const parentListener = vi.fn().mockName('parent-listener');
    const childListener = vi.fn().mockName('child-listener');

    eventDispatcher.addEventListener(parent, 'pointerdown', parentListener);
    eventDispatcher.addEventListener(child, 'pointerdown', childListener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before removal - both listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(parentListener).toHaveBeenCalledOnce();
    expect(childListener).toHaveBeenCalledOnce();

    // Remove parent listeners
    parentListener.mockClear();
    childListener.mockClear();
    eventDispatcher.removeAllEventListeners(parent);

    // After removal - only child listener should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(parentListener).not.toHaveBeenCalled();
    expect(childListener).toHaveBeenCalledOnce();
  });

  test('works on object with no listeners', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    // Should not throw when removing listeners from object with no listeners
    expect(() => {
      eventDispatcher.removeAllEventListeners(object);
    }).not.toThrow();
  });

  test('can be called multiple times on same object', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const listener = vi.fn().mockName('listener');

    eventDispatcher.addEventListener(object, 'pointerdown', listener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listener).toHaveBeenCalledOnce();

    // Remove once
    listener.mockClear();
    eventDispatcher.removeAllEventListeners(object);

    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listener).not.toHaveBeenCalled();

    // Remove again - should not throw
    expect(() => {
      eventDispatcher.removeAllEventListeners(object);
    }).not.toThrow();
  });
});

describe('dispose removes DOM event listeners', () => {
  test('prevents further event handling after dispose', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const listener = vi.fn().mockName('listener');

    eventDispatcher.addEventListener(object, 'pointerdown', listener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before dispose - listener should be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listener).toHaveBeenCalledOnce();

    // Dispose the event dispatcher
    listener.mockClear();
    eventDispatcher.dispose();

    // After dispose - listener should NOT be called
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    expect(listener).not.toHaveBeenCalled();
  });

  test('disposes all event types', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    const clickListener = vi.fn().mockName('click-listener');
    const dblclickListener = vi.fn().mockName('dblclick-listener');
    const pointerdownListener = vi.fn().mockName('pointerdown-listener');
    const pointerupListener = vi.fn().mockName('pointerup-listener');
    const pointermoveListener = vi.fn().mockName('pointermove-listener');
    const wheelListener = vi.fn().mockName('wheel-listener');

    eventDispatcher.addEventListener(object, 'click', clickListener);
    eventDispatcher.addEventListener(object, 'dblclick', dblclickListener);
    eventDispatcher.addEventListener(object, 'pointerdown', pointerdownListener);
    eventDispatcher.addEventListener(object, 'pointerup', pointerupListener);
    eventDispatcher.addEventListener(object, 'pointermove', pointermoveListener);
    eventDispatcher.addEventListener(object, 'wheel', wheelListener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));

    // Before dispose - all listeners should work
    canvas.dispatchEvent(createMouseEvent('click'));
    canvas.dispatchEvent(createMouseEvent('dblclick'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createPointerEvent('pointerup'));
    canvas.dispatchEvent(createWheelEvent('wheel'));
    expect(clickListener).toHaveBeenCalledOnce();
    expect(dblclickListener).toHaveBeenCalledOnce();
    expect(pointerdownListener).toHaveBeenCalledOnce();
    expect(pointerupListener).toHaveBeenCalledOnce();
    expect(pointermoveListener).toHaveBeenCalled();
    expect(wheelListener).toHaveBeenCalledOnce();

    // Dispose
    clickListener.mockClear();
    dblclickListener.mockClear();
    pointerdownListener.mockClear();
    pointerupListener.mockClear();
    pointermoveListener.mockClear();
    wheelListener.mockClear();
    eventDispatcher.dispose();

    // After dispose - no listeners should be called
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createMouseEvent('click'));
    canvas.dispatchEvent(createMouseEvent('dblclick'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));
    canvas.dispatchEvent(createPointerEvent('pointerup'));
    canvas.dispatchEvent(createWheelEvent('wheel'));
    expect(clickListener).not.toHaveBeenCalled();
    expect(dblclickListener).not.toHaveBeenCalled();
    expect(pointerdownListener).not.toHaveBeenCalled();
    expect(pointerupListener).not.toHaveBeenCalled();
    expect(pointermoveListener).not.toHaveBeenCalled();
    expect(wheelListener).not.toHaveBeenCalled();
  });

  test('disposes global event listeners', () => {
    const globalListener = vi.fn().mockName('global-listener');

    eventDispatcher.addGlobalEventListener('click', globalListener);

    // Before dispose - global listener should be called
    canvas.dispatchEvent(createMouseEvent('click'));
    expect(globalListener).toHaveBeenCalledOnce();

    // Dispose
    globalListener.mockClear();
    eventDispatcher.dispose();

    // After dispose - global listener should NOT be called
    canvas.dispatchEvent(createMouseEvent('click'));
    expect(globalListener).not.toHaveBeenCalled();
  });

  test('can be called multiple times safely', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const listener = vi.fn().mockName('listener');

    eventDispatcher.addEventListener(object, 'pointerdown', listener);

    // First dispose
    eventDispatcher.dispose();

    // Second dispose - should not throw
    expect(() => {
      eventDispatcher.dispose();
    }).not.toThrow();
  });
});

describe('setCamera updates raycasting camera', () => {
  test('events fire correctly after camera change', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object.position.set(0, 0, 0);

    const listener = vi.fn().mockName('listener');
    eventDispatcher.addEventListener(object, 'click', listener);

    // Change to a new camera looking at the object
    const newCamera = new THREE.OrthographicCamera(-ratio, ratio, 1, -1);
    newCamera.position.set(0, 0, 5);
    newCamera.lookAt(0, 0, 0);

    eventDispatcher.setCamera(newCamera);
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createMouseEvent('click'));

    // Should hit object with new camera
    expect(listener).toHaveBeenCalledOnce();
  });

  test('updates hit detection after camera change', () => {
    // Create object at center
    const centerObject = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    centerObject.name = 'Center';

    // Create object far to the right
    const rightObject = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    rightObject.name = 'Right';
    rightObject.position.set(10, 0, 0);
    rightObject.updateMatrixWorld();

    const centerListener = vi.fn().mockName('center-listener');
    const rightListener = vi.fn().mockName('right-listener');

    eventDispatcher.addEventListener(centerObject, 'click', centerListener);
    eventDispatcher.addEventListener(rightObject, 'click', rightListener);

    // Camera 1: Looking at center from front
    const cameraAtCenter = new THREE.OrthographicCamera(-ratio, ratio, 1, -1);
    cameraAtCenter.position.set(0, 0, 5);
    cameraAtCenter.lookAt(0, 0, 0);

    eventDispatcher.setCamera(cameraAtCenter);
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createMouseEvent('click'));

    // Should hit center object
    expect(centerListener).toHaveBeenCalled();
    expect(rightListener).not.toHaveBeenCalled();

    // Camera 2: Looking at right object from its front
    centerListener.mockClear();
    rightListener.mockClear();

    const cameraAtRight = new THREE.OrthographicCamera(-ratio, ratio, 1, -1);
    cameraAtRight.position.set(10, 0, 5);
    cameraAtRight.lookAt(10, 0, 0);

    eventDispatcher.setCamera(cameraAtRight);
    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createMouseEvent('click'));

    // Should hit right object
    expect(rightListener).toHaveBeenCalled();
    expect(centerListener).not.toHaveBeenCalled();
  });
});

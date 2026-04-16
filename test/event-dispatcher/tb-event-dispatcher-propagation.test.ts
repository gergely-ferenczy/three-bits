import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createPointerEvent, createTestResources, EventCallLog } from './test-helpers';
import { TbEvent, TbEventDispatcher } from '../../lib';

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

describe('stopPropagation with global event listeners', () => {
  test('stopPropagation on object listener does not prevent global listener from being called', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object.name = 'Target';

    const objectListener = vi
      .fn()
      .mockName('object-listener')
      .mockImplementation((event: TbEvent) => {
        event.stopPropagation();
      });
    const globalListener = vi.fn().mockName('global-listener');

    eventDispatcher.addEventListener(object, 'pointerdown', objectListener);
    eventDispatcher.addGlobalEventListener('pointerdown', globalListener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));

    expect(objectListener).toHaveBeenCalledOnce();
    // Global listeners should still be called even if stopPropagation is called on object listener
    expect(globalListener).toHaveBeenCalledOnce();
  });

  test('stopImmediatePropagation on object listener does not prevent global listener from being called', () => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object.name = 'Target';

    const objectListener = vi
      .fn()
      .mockName('object-listener')
      .mockImplementation((event: TbEvent) => {
        event.stopImmediatePropagation();
      });
    const globalListener = vi.fn().mockName('global-listener');

    eventDispatcher.addEventListener(object, 'pointerdown', objectListener);
    eventDispatcher.addGlobalEventListener('pointerdown', globalListener);

    canvas.dispatchEvent(createPointerEvent('pointermove'));
    canvas.dispatchEvent(createPointerEvent('pointerdown'));

    expect(objectListener).toHaveBeenCalledOnce();
    // Global listeners should still be called even if stopImmediatePropagation is called
    expect(globalListener).toHaveBeenCalledOnce();
  });
});

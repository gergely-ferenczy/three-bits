import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createPointerEvent, createTestResources } from './test-helpers';
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

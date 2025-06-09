import * as THREE from 'three';
import { describe, expect, test, vi } from 'vitest';
import { ThreeEventDispatcher } from '../../lib/event-dispatcher/three-event-dispatcher';
import { ThreeEventType } from '../../lib/event-dispatcher/three-event-types';

function createCanvas(width = 200, height = 100) {
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

interface Case {
  type: ThreeEventType;
}

describe('global event handlers fire', () => {
  test.each<Case>([
    { type: 'click' },
    { type: 'dblclick' },
    { type: 'pointerdown' },
    { type: 'pointerup' },
    { type: 'wheel' },
  ])('$type', ({ type }) => {
    const canvas = createCanvas();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    const eventDispatcher = new ThreeEventDispatcher(canvas, camera);

    const testEventHandler = vi.fn().mockName('testEventHandler');
    eventDispatcher.addGlobalEventListener(type, testEventHandler);

    const pointerMoveEvent = new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      clientX: canvas.clientWidth / 2,
      clientY: canvas.clientHeight / 2,
    });
    canvas.dispatchEvent(pointerMoveEvent);

    let simulatedEvent: Event;
    if (type == 'wheel') {
      simulatedEvent = new WheelEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth / 2,
        clientY: canvas.clientHeight / 2,
      });
    } else if (type == 'click' || type == 'dblclick') {
      simulatedEvent = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth / 2,
        clientY: canvas.clientHeight / 2,
      });
    } else {
      simulatedEvent = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth / 2,
        clientY: canvas.clientHeight / 2,
      });
    }
    canvas.dispatchEvent(simulatedEvent);

    expect(testEventHandler).toHaveBeenCalledOnce();
  });
});

describe('event handlers fire on 3D object', () => {
  test.each<Case>([
    { type: 'click' },
    { type: 'dblclick' },
    { type: 'pointerdown' },
    { type: 'pointerup' },
    { type: 'wheel' },
  ])('$type', ({ type }) => {
    const canvas = createCanvas();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const eventDispatcher = new ThreeEventDispatcher(canvas, camera);

    const testEventHandler = vi.fn().mockName('testEventHandler');
    eventDispatcher.addEventListener(object, type, testEventHandler);

    const pointerMoveEvent = new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      clientX: canvas.clientWidth / 2,
      clientY: canvas.clientHeight / 2,
    });
    canvas.dispatchEvent(pointerMoveEvent);

    let simulatedEvent: Event;
    if (type == 'wheel') {
      simulatedEvent = new WheelEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth / 2,
        clientY: canvas.clientHeight / 2,
      });
    } else if (type == 'click' || type == 'dblclick') {
      simulatedEvent = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth / 2,
        clientY: canvas.clientHeight / 2,
      });
    } else {
      simulatedEvent = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth / 2,
        clientY: canvas.clientHeight / 2,
      });
    }
    canvas.dispatchEvent(simulatedEvent);

    expect(testEventHandler).toHaveBeenCalledOnce();
  });
});

describe('pointer enter/leave', () => {
  test('single object', () => {
    const width = 200;
    const height = 200;

    const canvas = createCanvas(width, height);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    const eventDispatcher = new ThreeEventDispatcher(canvas, camera);

    const enter = vi.fn().mockName('enter');
    eventDispatcher.addEventListener(object, 'pointerenter', enter);
    const leave = vi.fn().mockName('leave');
    eventDispatcher.addEventListener(object, 'pointerleave', leave);

    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 123,
        clientY: 100,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 124,
        clientY: 100,
      }),
    );

    expect(enter).toHaveBeenCalledOnce();
    expect(leave).toHaveBeenCalledOnce();
    expect(leave).toHaveBeenCalledAfter(enter);
  });

  test('two overlapping objects', () => {
    const width = 200;
    const height = 200;

    const canvas = createCanvas(width, height);
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2);
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectA.name = 'A';
    const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectB.name = 'B';
    objectB.position.x = -0.1;
    objectB.position.z = 0.6;
    objectB.updateMatrixWorld();

    const eventDispatcher = new ThreeEventDispatcher(canvas, camera);

    const enterA = vi.fn().mockName('enterA');
    eventDispatcher.addEventListener(objectA, 'pointerenter', enterA);
    const leaveA = vi.fn().mockName('leaveA');
    eventDispatcher.addEventListener(objectA, 'pointerleave', leaveA);
    const enterB = vi.fn().mockName('enterB');
    eventDispatcher.addEventListener(objectB, 'pointerenter', enterB);
    const leaveB = vi.fn().mockName('leaveB');
    eventDispatcher.addEventListener(objectB, 'pointerleave', leaveB);

    const clearAllMocks = () => {
      enterA.mockClear();
      leaveA.mockClear();
      enterB.mockClear();
      leaveB.mockClear();
    };

    // Enter object A
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );
    expect(enterA).toHaveBeenCalledOnce();
    expect(leaveA).not.toHaveBeenCalled();
    expect(enterB).not.toHaveBeenCalled();
    expect(leaveB).not.toHaveBeenCalled();

    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 90,
        clientY: 100,
      }),
    );
    expect(enterA).not.toHaveBeenCalled();
    expect(leaveA).not.toHaveBeenCalled();
    expect(enterB).toHaveBeenCalledOnce();
    expect(leaveB).not.toHaveBeenCalled();

    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 70,
        clientY: 100,
      }),
    );
    expect(enterA).not.toHaveBeenCalled();
    expect(enterB).not.toHaveBeenCalled();
    expect(leaveA).toHaveBeenCalledOnce();
    expect(leaveB).not.toHaveBeenCalled();

    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 40,
        clientY: 100,
      }),
    );
    expect(enterA).not.toHaveBeenCalled();
    expect(enterB).not.toHaveBeenCalled();
    expect(leaveA).not.toHaveBeenCalled();
    expect(leaveB).toHaveBeenCalledOnce();
  });

  test('object group with two overlapping objects', () => {
    const width = 200;
    const height = 200;

    const canvas = createCanvas(width, height);
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2);
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    const group = new THREE.Group();
    group.name = 'Group';
    const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectA.name = 'A';
    const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectB.name = 'B';
    objectB.position.x = -0.1;
    objectB.position.z = 0.6;
    objectB.updateMatrixWorld();
    group.add(objectA, objectB);

    const eventDispatcher = new ThreeEventDispatcher(canvas, camera);

    const enterGroup = vi.fn().mockName('enterGroup');
    eventDispatcher.addEventListener(group, 'pointerenter', enterGroup);
    const leaveGroup = vi.fn().mockName('leaveGroup');
    eventDispatcher.addEventListener(group, 'pointerleave', leaveGroup);
    const enterA = vi.fn().mockName('enterA');
    eventDispatcher.addEventListener(objectA, 'pointerenter', enterA);
    const leaveA = vi.fn().mockName('leaveA');
    eventDispatcher.addEventListener(objectA, 'pointerleave', leaveA);
    const enterB = vi.fn().mockName('enterB');
    eventDispatcher.addEventListener(objectB, 'pointerenter', enterB);
    const leaveB = vi.fn().mockName('leaveB');
    eventDispatcher.addEventListener(objectB, 'pointerleave', leaveB);

    const clearAllMocks = () => {
      enterGroup.mockClear();
      leaveGroup.mockClear();
      enterA.mockClear();
      leaveA.mockClear();
      enterB.mockClear();
      leaveB.mockClear();
    };

    // Enter object A
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );
    expect(enterGroup).toHaveBeenCalledOnce();
    expect(leaveGroup).not.toHaveBeenCalled();
    expect(enterA).toHaveBeenCalledOnce();
    expect(enterA).toHaveBeenCalledAfter(enterGroup);
    expect(leaveA).not.toHaveBeenCalled();
    expect(enterB).not.toHaveBeenCalled();
    expect(leaveB).not.toHaveBeenCalled();

    // Enter object B while also staying in object A
    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 90,
        clientY: 100,
      }),
    );
    expect(enterGroup).not.toHaveBeenCalled();
    expect(leaveGroup).not.toHaveBeenCalled();
    expect(enterA).not.toHaveBeenCalled();
    expect(leaveA).not.toHaveBeenCalled();
    expect(enterB).toHaveBeenCalledOnce();
    expect(leaveB).not.toHaveBeenCalled();

    // Leave object A while staying in object B
    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 70,
        clientY: 100,
      }),
    );
    expect(enterGroup).not.toHaveBeenCalled();
    expect(leaveGroup).not.toHaveBeenCalled();
    expect(enterA).not.toHaveBeenCalled();
    expect(enterB).not.toHaveBeenCalled();
    expect(leaveA).toHaveBeenCalledOnce();
    expect(leaveB).not.toHaveBeenCalled();

    // Leave object B
    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 40,
        clientY: 100,
      }),
    );
    expect(enterGroup).not.toHaveBeenCalled();
    expect(leaveGroup).toHaveBeenCalledOnce();
    expect(enterA).not.toHaveBeenCalled();
    expect(enterB).not.toHaveBeenCalled();
    expect(leaveA).not.toHaveBeenCalled();
    expect(leaveB).toHaveBeenCalledOnce();
  });

  test('object group with two non-overlapping objects', () => {
    const width = 200;
    const height = 200;

    const canvas = createCanvas(width, height);
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2);
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    const group = new THREE.Group();
    group.name = 'Group';
    const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectA.name = 'A';
    objectA.position.z = -0.6;
    objectA.updateMatrixWorld();
    const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectB.name = 'B';
    objectB.position.x = -0.1;
    objectB.position.z = 0.6;
    objectB.updateMatrixWorld();
    group.add(objectA, objectB);

    const eventDispatcher = new ThreeEventDispatcher(canvas, camera);

    const enterGroup = vi.fn().mockName('enterGroup');
    eventDispatcher.addEventListener(group, 'pointerenter', enterGroup);
    const leaveGroup = vi.fn().mockName('leaveGroup');
    eventDispatcher.addEventListener(group, 'pointerleave', leaveGroup);
    const enterA = vi.fn().mockName('enterA');
    eventDispatcher.addEventListener(objectA, 'pointerenter', enterA);
    const leaveA = vi.fn().mockName('leaveA');
    eventDispatcher.addEventListener(objectA, 'pointerleave', leaveA);
    const enterB = vi.fn().mockName('enterB');
    eventDispatcher.addEventListener(objectB, 'pointerenter', enterB);
    const leaveB = vi.fn().mockName('leaveB');
    eventDispatcher.addEventListener(objectB, 'pointerleave', leaveB);

    const clearAllMocks = () => {
      enterGroup.mockClear();
      leaveGroup.mockClear();
      enterA.mockClear();
      leaveA.mockClear();
      enterB.mockClear();
      leaveB.mockClear();
    };

    // Enter object A
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 110,
        clientY: 100,
      }),
    );
    expect(enterGroup).toHaveBeenCalledOnce();
    expect(leaveGroup).not.toHaveBeenCalled();
    expect(enterA).toHaveBeenCalledOnce();
    expect(enterA).toHaveBeenCalledAfter(enterGroup);
    expect(leaveA).not.toHaveBeenCalled();
    expect(enterB).not.toHaveBeenCalled();
    expect(leaveB).not.toHaveBeenCalled();

    // Enter object B while leaving object A
    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 90,
        clientY: 100,
      }),
    );
    expect(enterGroup).not.toHaveBeenCalled();
    expect(leaveGroup).not.toHaveBeenCalled();
    expect(enterA).not.toHaveBeenCalled();
    expect(leaveA).toHaveBeenCalledOnce();
    expect(enterB).toHaveBeenCalledOnce();
    expect(enterB).toHaveBeenCalledAfter(leaveA);
    expect(leaveB).not.toHaveBeenCalled();

    // Leave object B
    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 40,
        clientY: 100,
      }),
    );
    expect(enterGroup).not.toHaveBeenCalled();
    expect(leaveGroup).toHaveBeenCalledOnce();
    expect(enterA).not.toHaveBeenCalled();
    expect(enterB).not.toHaveBeenCalled();
    expect(leaveA).not.toHaveBeenCalled();
    expect(leaveB).toHaveBeenCalledOnce();
  });
});

describe('pointer out/over', () => {
  test('single object', () => {
    const width = 200;
    const height = 200;

    const canvas = createCanvas(width, height);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

    const eventDispatcher = new ThreeEventDispatcher(canvas, camera);

    const over = vi.fn().mockName('over');
    eventDispatcher.addEventListener(object, 'pointerover', over);
    const out = vi.fn().mockName('out');
    eventDispatcher.addEventListener(object, 'pointerout', out);

    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 123,
        clientY: 100,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 124,
        clientY: 100,
      }),
    );

    expect(over).toHaveBeenCalledOnce();
    expect(out).toHaveBeenCalledOnce();
    expect(out).toHaveBeenCalledAfter(over);
  });

  test('two overlapping objects', () => {
    const width = 200;
    const height = 200;

    const canvas = createCanvas(width, height);
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2);
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectA.name = 'A';
    const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectB.name = 'B';
    objectB.position.x = -0.1;
    objectB.position.z = 0.6;
    objectB.updateMatrixWorld();

    const eventDispatcher = new ThreeEventDispatcher(canvas, camera);

    const overA = vi.fn().mockName('overA');
    eventDispatcher.addEventListener(objectA, 'pointerover', overA);
    const outA = vi.fn().mockName('outA');
    eventDispatcher.addEventListener(objectA, 'pointerout', outA);
    const overB = vi.fn().mockName('overB');
    eventDispatcher.addEventListener(objectB, 'pointerover', overB);
    const outB = vi.fn().mockName('outB');
    eventDispatcher.addEventListener(objectB, 'pointerout', outB);

    const clearAllMocks = () => {
      overA.mockClear();
      outA.mockClear();
      overB.mockClear();
      outB.mockClear();
    };

    // Move over object A
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );
    expect(overA).toHaveBeenCalledOnce();
    expect(outA).not.toHaveBeenCalled();
    expect(overB).not.toHaveBeenCalled();
    expect(outB).not.toHaveBeenCalled();

    // Move into the overlapping area
    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 90,
        clientY: 100,
      }),
    );
    expect(overA).not.toHaveBeenCalled();
    expect(outA).not.toHaveBeenCalled();
    expect(overB).not.toHaveBeenCalled();
    expect(outB).not.toHaveBeenCalled();

    // Move out of overlapping area while staying over object B
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 70,
        clientY: 100,
      }),
    );
    expect(overA).not.toHaveBeenCalled();
    expect(outA).toHaveBeenCalledOnce();
    expect(overB).toHaveBeenCalledOnce();
    expect(overB).toHaveBeenCalledAfter(outA);
    expect(outB).not.toHaveBeenCalled();

    // Move out of object B
    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 40,
        clientY: 100,
      }),
    );
    expect(overA).not.toHaveBeenCalled();
    expect(overB).not.toHaveBeenCalled();
    expect(outA).not.toHaveBeenCalled();
    expect(outB).toHaveBeenCalledOnce();
  });

  test('object group with two overlapping objects', () => {
    const width = 200;
    const height = 200;

    const canvas = createCanvas(width, height);
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2);
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    const group = new THREE.Group();
    group.name = 'Group';
    const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectA.name = 'A';
    const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectB.name = 'B';
    objectB.position.x = -0.1;
    objectB.position.z = 0.6;
    objectB.updateMatrixWorld();
    group.add(objectA, objectB);

    const eventDispatcher = new ThreeEventDispatcher(canvas, camera);

    const overGroup = vi.fn().mockName('overGroup');
    eventDispatcher.addEventListener(group, 'pointerover', overGroup);
    const outGroup = vi.fn().mockName('outGroup');
    eventDispatcher.addEventListener(group, 'pointerout', outGroup);
    const overA = vi.fn().mockName('overA');
    eventDispatcher.addEventListener(objectA, 'pointerover', overA);
    const outA = vi.fn().mockName('outA');
    eventDispatcher.addEventListener(objectA, 'pointerout', outA);
    const overB = vi.fn().mockName('overB');
    eventDispatcher.addEventListener(objectB, 'pointerover', overB);
    const outB = vi.fn().mockName('outB');
    eventDispatcher.addEventListener(objectB, 'pointerout', outB);

    const clearAllMocks = () => {
      overGroup.mockClear();
      outGroup.mockClear();
      overA.mockClear();
      outA.mockClear();
      overB.mockClear();
      outB.mockClear();
    };

    // Move over object A
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );
    expect(overGroup).toHaveBeenCalledOnce();
    expect(outGroup).not.toHaveBeenCalled();
    expect(overA).toHaveBeenCalledOnce();
    expect(overA).toHaveBeenCalledBefore(overGroup);
    expect(outA).not.toHaveBeenCalled();
    expect(overB).not.toHaveBeenCalled();
    expect(outB).not.toHaveBeenCalled();

    // Move into the overlapping area
    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 90,
        clientY: 100,
      }),
    );
    expect(overGroup).not.toHaveBeenCalled();
    expect(outGroup).not.toHaveBeenCalled();
    expect(overA).not.toHaveBeenCalled();
    expect(outA).not.toHaveBeenCalled();
    expect(overB).not.toHaveBeenCalled();
    expect(outB).not.toHaveBeenCalled();

    // Move out of overlapping area while staying over object B
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 70,
        clientY: 100,
      }),
    );
    expect(overGroup).toHaveBeenCalledOnce();
    expect(outGroup).toHaveBeenCalledOnce();
    expect(overA).not.toHaveBeenCalled();
    expect(outA).toHaveBeenCalledOnce();
    expect(outA).toHaveBeenCalledBefore(outGroup);
    expect(overB).toHaveBeenCalledOnce();
    expect(overB).toHaveBeenCalledAfter(outA);
    expect(overB).toHaveBeenCalledBefore(overGroup);
    expect(outB).not.toHaveBeenCalled();

    // Move out of object B
    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 40,
        clientY: 100,
      }),
    );
    expect(overGroup).not.toHaveBeenCalled();
    expect(outGroup).toHaveBeenCalledOnce();
    expect(overA).not.toHaveBeenCalled();
    expect(overB).not.toHaveBeenCalled();
    expect(outA).not.toHaveBeenCalled();
    expect(outB).toHaveBeenCalledOnce();
    expect(outB).toHaveBeenCalledBefore(outGroup);
  });

  test('object group with two non-overlapping objects', () => {
    const width = 200;
    const height = 200;

    const canvas = createCanvas(width, height);
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2);
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    const group = new THREE.Group();
    group.name = 'Group';
    const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectA.name = 'A';
    objectA.position.z = -0.6;
    objectA.updateMatrixWorld();
    const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectB.name = 'B';
    objectB.position.x = -0.1;
    objectB.position.z = 0.6;
    objectB.updateMatrixWorld();
    group.add(objectA, objectB);

    const eventDispatcher = new ThreeEventDispatcher(canvas, camera);

    const overGroup = vi.fn().mockName('overGroup');
    eventDispatcher.addEventListener(group, 'pointerover', overGroup);
    const outGroup = vi.fn().mockName('outGroup');
    eventDispatcher.addEventListener(group, 'pointerout', outGroup);
    const overA = vi.fn().mockName('overA');
    eventDispatcher.addEventListener(objectA, 'pointerover', overA);
    const outA = vi.fn().mockName('outA');
    eventDispatcher.addEventListener(objectA, 'pointerout', outA);
    const overB = vi.fn().mockName('overB');
    eventDispatcher.addEventListener(objectB, 'pointerover', overB);
    const outB = vi.fn().mockName('outB');
    eventDispatcher.addEventListener(objectB, 'pointerout', outB);

    const clearAllMocks = () => {
      overGroup.mockClear();
      outGroup.mockClear();
      overA.mockClear();
      outA.mockClear();
      overB.mockClear();
      outB.mockClear();
    };

    // Move over object A
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 110,
        clientY: 100,
      }),
    );
    expect(overGroup).toHaveBeenCalledOnce();
    expect(outGroup).not.toHaveBeenCalled();
    expect(overA).toHaveBeenCalledOnce();
    expect(overA).toHaveBeenCalledBefore(overGroup);
    expect(outA).not.toHaveBeenCalled();
    expect(overB).not.toHaveBeenCalled();
    expect(outB).not.toHaveBeenCalled();

    // Move over B while moving out of object A
    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 90,
        clientY: 100,
      }),
    );
    expect(overGroup).toHaveBeenCalledOnce();
    expect(outGroup).toHaveBeenCalledOnce();
    expect(overA).not.toHaveBeenCalled();
    expect(outA).toHaveBeenCalledOnce();
    expect(outA).toHaveBeenCalledBefore(outGroup);
    expect(overB).toHaveBeenCalledOnce();
    expect(overB).toHaveBeenCalledAfter(outA);
    expect(overB).toHaveBeenCalledBefore(overGroup);
    expect(outB).not.toHaveBeenCalled();

    // Leave object B
    clearAllMocks();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 40,
        clientY: 100,
      }),
    );
    expect(overGroup).not.toHaveBeenCalled();
    expect(outGroup).toHaveBeenCalledOnce();
    expect(overA).not.toHaveBeenCalled();
    expect(overB).not.toHaveBeenCalled();
    expect(outA).not.toHaveBeenCalled();
    expect(outB).toHaveBeenCalledOnce();
    expect(outB).toHaveBeenCalledBefore(outGroup);
  });
});

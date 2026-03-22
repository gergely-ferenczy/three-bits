import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { TbAddEventListenerOptions, TbEvent } from '../../lib';
import { TbEventDispatcher } from '../../lib/event-dispatcher/tb-event-dispatcher';
import { TbEventType } from '../../lib/event-dispatcher/tb-event-types';
import { createCanvas } from '../test-helpers/create-canvas';

type EventTargetNames = [string | undefined, string | undefined];
type EventCallLog = { listener: string; target: string; currentTarget: string };

const canvasWidth = 200;
const canvasHeight = 100;
const ratio = canvasWidth / canvasHeight;

let canvas: HTMLCanvasElement;
let camera: THREE.OrthographicCamera;
let eventDispatcher: TbEventDispatcher;

const dispatchEvent = (x: number, y: number) => {
  const clientX = (x / (2 * ratio) + 0.5) * canvasWidth;
  const clientY = (-y / 2 + 0.5) * canvasHeight;
  canvas.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX, clientY }),
  );
};

beforeAll(() => {
  canvas = createCanvas(canvasWidth, canvasHeight);
  camera = new THREE.OrthographicCamera(-ratio, ratio, 1, -1);
  camera.position.set(-5, 0, 0);
  camera.lookAt(0, 0, 0);
});

beforeEach(() => {
  eventDispatcher = new TbEventDispatcher(canvas, camera);
});

test('single object', () => {
  const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));

  let overEventTargets: EventTargetNames = [undefined, undefined];
  const over = vi
    .fn()
    .mockName('over')
    .mockImplementation((event: TbEvent) => {
      overEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(object, 'pointerover', over);

  let outEventTargets: EventTargetNames = [undefined, undefined];
  const out = vi
    .fn()
    .mockName('out')
    .mockImplementation((event: TbEvent) => {
      outEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(object, 'pointerout', out);

  dispatchEvent(0.49, 0);
  expect(over).toHaveBeenCalledOnce();
  expect(overEventTargets).toEqual([object.name, object.name]);

  dispatchEvent(0.51, 0);
  expect(over).toHaveBeenCalledOnce();
  expect(out).toHaveBeenCalledOnce();
  expect(out).toHaveBeenCalledAfter(over);
  expect(outEventTargets).toEqual([object.name, object.name]);
});

describe('object visibility changes under pointer', () => {
  test.each<{
    id: string;
    occludingObject?: 'visible' | 'invisible';
    visibilityStates: boolean[];
    expectedOverCalls: number[];
    expectedOutCalls: number[];
  }>([
    {
      id: 'single object, transition: invisible -> visible -> invisible',
      visibilityStates: [false, true, false],
      expectedOverCalls: [0, 1, 1],
      expectedOutCalls: [0, 0, 1],
    },
    {
      id: 'single object, transition: visible -> invisible -> visible',
      visibilityStates: [true, false, true],
      expectedOverCalls: [1, 1, 2],
      expectedOutCalls: [0, 1, 1],
    },
    {
      id: 'two overlapping objects, visible occluding object and transition: invisible -> visible -> invisible',
      occludingObject: 'visible',
      visibilityStates: [false, true, false],
      expectedOverCalls: [0, 0, 0],
      expectedOutCalls: [0, 0, 0],
    },
    {
      id: 'two overlapping objects, visible occluding object and transition: visible -> invisible -> visible',
      occludingObject: 'visible',
      visibilityStates: [true, false, true],
      expectedOverCalls: [0, 0, 0],
      expectedOutCalls: [0, 0, 0],
    },
    {
      id: 'two overlapping objects, invisible occluding object and transition: invisible -> visible -> invisible',
      occludingObject: 'invisible',
      visibilityStates: [false, true, false],
      expectedOverCalls: [0, 1, 1],
      expectedOutCalls: [0, 0, 1],
    },
    {
      id: 'two overlapping objects, invisible occluding object and transition: visible -> invisible -> visible',
      occludingObject: 'invisible',
      visibilityStates: [true, false, true],
      expectedOverCalls: [1, 1, 2],
      expectedOutCalls: [0, 1, 1],
    },
  ])('$id', ({ occludingObject, visibilityStates, expectedOverCalls, expectedOutCalls }) => {
    const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectA.name = 'A';

    if (occludingObject) {
      const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
      objectB.name = 'B';
      objectB.visible = occludingObject === 'visible';
      objectB.position.x = -0.1;
      objectB.updateMatrixWorld();

      const scene = new THREE.Scene();
      scene.add(objectA);
      scene.add(objectB);
    }

    const over = vi.fn().mockName('over');
    eventDispatcher.addEventListener(objectA, 'pointerover', over);
    const out = vi.fn().mockName('out');
    eventDispatcher.addEventListener(objectA, 'pointerout', out);

    for (let i = 0; i < visibilityStates.length; i++) {
      objectA.visible = visibilityStates[i];
      dispatchEvent(0, 0);
      expect(over).toHaveBeenCalledTimes(expectedOverCalls[i]);
      expect(out).toHaveBeenCalledTimes(expectedOutCalls[i]);
    }
  });
});

describe('two overlapping objects', () => {
  test.each<{
    id: string;
    objectConfigs: Record<string, Pick<THREE.Object3D, 'position' | 'visible'>>;
    eventConfigs: {
      objectName: string;
      type: TbEventType;
      callCount: number[];
      options?: TbAddEventListenerOptions;
    }[];
  }>([
    {
      id: 'a-visible-b-visible',
      objectConfigs: {
        A: { position: new THREE.Vector3(0.0, 0.0, 0.0), visible: true },
        B: { position: new THREE.Vector3(-0.1, 0.0, 0.6), visible: true },
      },
      // prettier-ignore
      eventConfigs: [
          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: {} },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 1, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: {} },

          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: { includeInvisible: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: { includeInvisible: true } },

          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 0, 1, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: { ignoreOcclusion: true } },

          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 0, 1, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: { includeInvisible: true, ignoreOcclusion: true } },
        ],
    },
    {
      id: 'a-invisible-b-invisible',
      objectConfigs: {
        A: { position: new THREE.Vector3(0.0, 0.0, 0.0), visible: false },
        B: { position: new THREE.Vector3(-0.1, 0.0, 0.6), visible: false },
      },
      // prettier-ignore
      eventConfigs: [
          { objectName: 'A', type: 'pointerover', callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerover', callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 0], options: {} },

          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: { includeInvisible: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: { includeInvisible: true } },

          { objectName: 'A', type: 'pointerover', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },

          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 0, 1, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: { includeInvisible: true, ignoreOcclusion: true } },
        ],
    },
    {
      id: 'a-visible-b-invisible',
      objectConfigs: {
        A: { position: new THREE.Vector3(0.0, 0.0, 0.0), visible: true },
        B: { position: new THREE.Vector3(-0.1, 0.0, 0.6), visible: false },
      },
      // prettier-ignore
      eventConfigs: [
          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: {} },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 0, 1, 0], options: {} },
          { objectName: 'B', type: 'pointerover', callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 0], options: {} },

          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: { includeInvisible: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: { includeInvisible: true } },

          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 0, 1, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },

          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 0, 1, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: { includeInvisible: true, ignoreOcclusion: true } },
        ],
    },
    {
      id: 'a-invisible-b-visible',
      objectConfigs: {
        A: { position: new THREE.Vector3(0.0, 0.0, 0.0), visible: false },
        B: { position: new THREE.Vector3(-0.1, 0.0, 0.6), visible: true },
      },
      // prettier-ignore
      eventConfigs: [
          { objectName: 'A', type: 'pointerover', callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: {} },

          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: { includeInvisible: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: { includeInvisible: true } },

          { objectName: 'A', type: 'pointerover', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: { ignoreOcclusion: true } },

          { objectName: 'A', type: 'pointerover', callCount: [1, 0, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerout',  callCount: [0, 0, 1, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerover', callCount: [0, 1, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerout',  callCount: [0, 0, 0, 1], options: { includeInvisible: true, ignoreOcclusion: true } },
        ],
    },
  ])('$id', ({ objectConfigs, eventConfigs }) => {
    const objects = Object.fromEntries(
      Object.entries(objectConfigs).map(([objectName, objectConfig]) => {
        const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
        object.name = objectName;
        object.position.copy(objectConfig.position);
        object.visible = objectConfig.visible;
        object.updateMatrixWorld();
        return [objectName, object];
      }),
    );

    const eventFns = eventConfigs.map((config) => {
      const object = objects[config.objectName];
      const name =
        `${config.type}-${object.name}` +
        (config.options?.includeInvisible ? '-ii' : '') +
        (config.options?.ignoreOcclusion ? '-io' : '');
      const eventFn = vi.fn().mockName(name);
      eventDispatcher.addEventListener(object, config.type, eventFn, config.options);
      return eventFn;
    });

    const checkAllMocks = (stage: number) => {
      for (let i = 0; i < eventConfigs.length; i++) {
        const config = eventConfigs[i];
        const eventFn = eventFns[i];
        expect(eventFn).toHaveBeenCalledTimes(config.callCount[stage]);
      }

      for (const eventFn of eventFns) {
        eventFn.mockClear();
      }
    };

    // Move over object A
    dispatchEvent(0, 0);
    checkAllMocks(0);

    // Move into the overlapping area
    dispatchEvent(0.2, 0);
    checkAllMocks(1);

    // Move out of overlapping area while staying over object B
    dispatchEvent(0.6, 0);
    checkAllMocks(2);

    // Move out of object B
    dispatchEvent(1.2, 0);
    checkAllMocks(3);
  });
});

test('object group with two overlapping objects', () => {
  const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  objectA.name = 'A';

  const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  objectB.name = 'B';
  objectB.position.x = 0.1;
  objectB.position.z = 0.6;
  objectB.updateMatrixWorld();

  const group = new THREE.Group();
  group.name = 'Group';
  group.add(objectA, objectB);

  let overGroupEventTargets: EventTargetNames = [undefined, undefined];
  const overGroup = vi
    .fn()
    .mockName('overGroup')
    .mockImplementation((event: TbEvent) => {
      overGroupEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(group, 'pointerover', overGroup);

  let outGroupEventTargets: EventTargetNames = [undefined, undefined];
  const outGroup = vi
    .fn()
    .mockName('outGroup')
    .mockImplementation((event: TbEvent) => {
      outGroupEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(group, 'pointerout', outGroup);

  let overAEventTargets: EventTargetNames = [undefined, undefined];
  const overA = vi
    .fn()
    .mockName('overA')
    .mockImplementation((event: TbEvent) => {
      overAEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(objectA, 'pointerover', overA);

  let outAEventTargets: EventTargetNames = [undefined, undefined];
  const outA = vi
    .fn()
    .mockName('outA')
    .mockImplementation((event: TbEvent) => {
      outAEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(objectA, 'pointerout', outA);

  let overBEventTargets: EventTargetNames = [undefined, undefined];
  const overB = vi
    .fn()
    .mockName('overB')
    .mockImplementation((event: TbEvent) => {
      overBEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(objectB, 'pointerover', overB);

  let outBEventTargets: EventTargetNames = [undefined, undefined];
  const outB = vi
    .fn()
    .mockName('outB')
    .mockImplementation((event: TbEvent) => {
      outBEventTargets = [event.target.name, event.currentTarget.name];
    });
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
  dispatchEvent(0, 0);
  expect(overGroup).toHaveBeenCalledOnce();
  expect(overGroupEventTargets).toEqual([objectA.name, group.name]);
  expect(overA).toHaveBeenCalledOnce();
  expect(overA).toHaveBeenCalledBefore(overGroup);
  expect(overAEventTargets).toEqual([objectA.name, objectA.name]);
  expect(outGroup).not.toHaveBeenCalled();
  expect(outA).not.toHaveBeenCalled();
  expect(overB).not.toHaveBeenCalled();
  expect(outB).not.toHaveBeenCalled();

  // Move into the overlapping area
  clearAllMocks();
  dispatchEvent(0.2, 0);
  expect(overGroup).not.toHaveBeenCalled();
  expect(outGroup).not.toHaveBeenCalled();
  expect(overA).not.toHaveBeenCalled();
  expect(outA).not.toHaveBeenCalled();
  expect(overB).not.toHaveBeenCalled();
  expect(outB).not.toHaveBeenCalled();

  // Move out of overlapping area while staying over object B
  dispatchEvent(0.6, 0);
  expect(outGroup).toHaveBeenCalledOnce();
  expect(outGroupEventTargets).toEqual([objectA.name, group.name]);
  expect(overA).not.toHaveBeenCalled();
  expect(outA).toHaveBeenCalledOnce();
  expect(outA).toHaveBeenCalledBefore(outGroup);
  expect(outAEventTargets).toEqual([objectA.name, objectA.name]);
  expect(overGroup).toHaveBeenCalledOnce();
  expect(overGroup).toHaveBeenCalledAfter(outGroup);
  expect(overGroupEventTargets).toEqual([objectB.name, group.name]);
  expect(overB).toHaveBeenCalledOnce();
  expect(overB).toHaveBeenCalledAfter(outA);
  expect(overB).toHaveBeenCalledBefore(overGroup);
  expect(overBEventTargets).toEqual([objectB.name, objectB.name]);
  expect(outB).not.toHaveBeenCalled();

  // Move out of object B
  clearAllMocks();
  dispatchEvent(1.2, 0);
  expect(overGroup).not.toHaveBeenCalled();
  expect(outGroup).toHaveBeenCalledOnce();
  expect(outGroupEventTargets).toEqual([objectB.name, group.name]);
  expect(overA).not.toHaveBeenCalled();
  expect(overB).not.toHaveBeenCalled();
  expect(outA).not.toHaveBeenCalled();
  expect(outB).toHaveBeenCalledOnce();
  expect(outB).toHaveBeenCalledBefore(outGroup);
  expect(outBEventTargets).toEqual([objectB.name, objectB.name]);
});

test('object group with two non-overlapping objects', () => {
  const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  objectA.name = 'A';
  objectA.position.z = -0.6;
  objectA.updateMatrixWorld();

  const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  objectB.name = 'B';
  objectB.position.x = 0.1;
  objectB.position.z = 0.6;
  objectB.updateMatrixWorld();

  const group = new THREE.Group();
  group.name = 'Group';
  group.add(objectA, objectB);

  let overGroupEventTargets: EventTargetNames = [undefined, undefined];
  const overGroup = vi
    .fn()
    .mockName('overGroup')
    .mockImplementation((event: TbEvent) => {
      overGroupEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(group, 'pointerover', overGroup);

  let outGroupEventTargets: EventTargetNames = [undefined, undefined];
  const outGroup = vi
    .fn()
    .mockName('outGroup')
    .mockImplementation((event: TbEvent) => {
      outGroupEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(group, 'pointerout', outGroup);

  let overAEventTargets: EventTargetNames = [undefined, undefined];
  const overA = vi
    .fn()
    .mockName('overA')
    .mockImplementation((event: TbEvent) => {
      overAEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(objectA, 'pointerover', overA);

  let outAEventTargets: EventTargetNames = [undefined, undefined];
  const outA = vi
    .fn()
    .mockName('outA')
    .mockImplementation((event: TbEvent) => {
      outAEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(objectA, 'pointerout', outA);

  let overBEventTargets: EventTargetNames = [undefined, undefined];
  const overB = vi
    .fn()
    .mockName('overB')
    .mockImplementation((event: TbEvent) => {
      overBEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(objectB, 'pointerover', overB);

  let outBEventTargets: EventTargetNames = [undefined, undefined];
  const outB = vi
    .fn()
    .mockName('outB')
    .mockImplementation((event: TbEvent) => {
      outBEventTargets = [event.target.name, event.currentTarget.name];
    });
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
  dispatchEvent(-0.2, 0);
  expect(overGroup).toHaveBeenCalledOnce();
  expect(overGroupEventTargets).toEqual([objectA.name, group.name]);
  expect(outGroup).not.toHaveBeenCalled();
  expect(overA).toHaveBeenCalledOnce();
  expect(overA).toHaveBeenCalledBefore(overGroup);
  expect(overAEventTargets).toEqual([objectA.name, objectA.name]);
  expect(outA).not.toHaveBeenCalled();
  expect(overB).not.toHaveBeenCalled();
  expect(outB).not.toHaveBeenCalled();

  // Move over B while moving out of object A
  clearAllMocks();
  dispatchEvent(0.2, 0);
  expect(overGroup).toHaveBeenCalledOnce();
  expect(overGroupEventTargets).toEqual([objectB.name, group.name]);
  expect(outGroup).toHaveBeenCalledOnce();
  expect(outGroupEventTargets).toEqual([objectA.name, group.name]);
  expect(overA).not.toHaveBeenCalled();
  expect(outA).toHaveBeenCalledOnce();
  expect(outA).toHaveBeenCalledBefore(outGroup);
  expect(outAEventTargets).toEqual([objectA.name, objectA.name]);
  expect(overB).toHaveBeenCalledOnce();
  expect(overB).toHaveBeenCalledAfter(outA);
  expect(overB).toHaveBeenCalledBefore(overGroup);
  expect(overBEventTargets).toEqual([objectB.name, objectB.name]);
  expect(outB).not.toHaveBeenCalled();

  // Leave object B
  clearAllMocks();
  dispatchEvent(1.2, 0);
  expect(overGroup).not.toHaveBeenCalled();
  expect(outGroup).toHaveBeenCalledOnce();
  expect(outGroupEventTargets).toEqual([objectB.name, group.name]);
  expect(overA).not.toHaveBeenCalled();
  expect(overB).not.toHaveBeenCalled();
  expect(outA).not.toHaveBeenCalled();
  expect(outB).toHaveBeenCalledOnce();
  expect(outB).toHaveBeenCalledBefore(outGroup);
  expect(outBEventTargets).toEqual([objectB.name, objectB.name]);
});

test('object group with over/out events only on group object', () => {
  const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  objectA.name = 'A';
  objectA.position.z = -0.6;
  objectA.updateMatrixWorld();

  const objectB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  objectB.name = 'B';
  objectB.position.x = 0.1;
  objectB.position.z = 0.6;
  objectB.updateMatrixWorld();

  const group = new THREE.Group();
  group.name = 'Group';
  group.add(objectA, objectB);

  let overGroupEventTargets: EventTargetNames = [undefined, undefined];
  const overGroup = vi
    .fn()
    .mockName('overGroup')
    .mockImplementation((event: TbEvent) => {
      overGroupEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(group, 'pointerover', overGroup);

  let outGroupEventTargets: EventTargetNames = [undefined, undefined];
  const outGroup = vi
    .fn()
    .mockName('outGroup')
    .mockImplementation((event: TbEvent) => {
      outGroupEventTargets = [event.target.name, event.currentTarget.name];
    });
  eventDispatcher.addEventListener(group, 'pointerout', outGroup);

  const clearAllMocks = () => {
    overGroup.mockClear();
    outGroup.mockClear();
  };

  // Move over object A
  dispatchEvent(-0.2, 0);
  expect(overGroup).toHaveBeenCalledOnce();
  expect(overGroupEventTargets).toEqual([objectA.name, group.name]);
  expect(outGroup).not.toHaveBeenCalled();

  // Move over B while moving out of object A
  clearAllMocks();
  dispatchEvent(0.6, 0);
  expect(overGroup).toHaveBeenCalledOnce();
  expect(overGroupEventTargets).toEqual([objectB.name, group.name]);
  expect(outGroup).toHaveBeenCalledOnce();
  expect(outGroupEventTargets).toEqual([objectA.name, group.name]);

  // Leave object B
  clearAllMocks();
  dispatchEvent(1.2, 0);
  expect(overGroup).not.toHaveBeenCalled();
  expect(outGroup).toHaveBeenCalledOnce();
  expect(outGroupEventTargets).toEqual([objectB.name, group.name]);
});

test('event order is correct', () => {
  const eventOptions: TbAddEventListenerOptions = { ignoreOcclusion: true };
  const callSequence: EventCallLog[] = [];

  const createGroup = (name: string): THREE.Object3D => {
    const object = new THREE.Group();
    object.name = name;

    const overListener = vi
      .fn()
      .mockName(`over-${object.name}`)
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'over',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
        });
      });
    const outListener = vi
      .fn()
      .mockName(`out-${object.name}`)
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'out',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
        });
      });

    eventDispatcher.addEventListener(object, 'pointerover', overListener, eventOptions);
    eventDispatcher.addEventListener(object, 'pointerout', outListener, eventOptions);

    return object;
  };

  const createObject = (name: string, distance: number): THREE.Object3D => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object.name = name;
    object.position.x = distance;
    object.updateMatrixWorld();

    const overListener = vi
      .fn()
      .mockName(`over-${object.name}`)
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'over',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
        });
      });
    const outListener = vi
      .fn()
      .mockName(`out-${object.name}`)
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'out',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
        });
      });

    eventDispatcher.addEventListener(object, 'pointerover', overListener, eventOptions);
    eventDispatcher.addEventListener(object, 'pointerout', outListener, eventOptions);

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

  const objectE = createObject('E', 0);
  objectE.position.set(0, 2, 2);
  objectE.updateMatrixWorld();

  dispatchEvent(0, 0);
  expect(callSequence).toEqual([
    { listener: 'over', target: 'Ag', currentTarget: 'Ag' },
    { listener: 'over', target: 'Ag', currentTarget: 'Gab' },
    { listener: 'over', target: 'A1', currentTarget: 'A1' },
    { listener: 'over', target: 'A1', currentTarget: 'Ag' },
    { listener: 'over', target: 'A1', currentTarget: 'Gab' },
    { listener: 'over', target: 'D1', currentTarget: 'D1' },
    { listener: 'over', target: 'D1', currentTarget: 'Dg' },
    { listener: 'over', target: 'D1', currentTarget: 'Gcd' },
    { listener: 'over', target: 'A2', currentTarget: 'A2' },
    { listener: 'over', target: 'A2', currentTarget: 'Ag' },
    { listener: 'over', target: 'A2', currentTarget: 'Gab' },
    { listener: 'over', target: 'B1', currentTarget: 'B1' },
    { listener: 'over', target: 'B1', currentTarget: 'Bg' },
    { listener: 'over', target: 'B1', currentTarget: 'Gab' },
    { listener: 'over', target: 'B2', currentTarget: 'B2' },
    { listener: 'over', target: 'B2', currentTarget: 'Bg' },
    { listener: 'over', target: 'B2', currentTarget: 'Gab' },
    { listener: 'over', target: 'Bg', currentTarget: 'Bg' },
    { listener: 'over', target: 'Bg', currentTarget: 'Gab' },
    { listener: 'over', target: 'Dg', currentTarget: 'Dg' },
    { listener: 'over', target: 'Dg', currentTarget: 'Gcd' },
    { listener: 'over', target: 'C1', currentTarget: 'C1' },
    { listener: 'over', target: 'C1', currentTarget: 'Cg' },
    { listener: 'over', target: 'C1', currentTarget: 'Gcd' },
    { listener: 'over', target: 'Cg', currentTarget: 'Cg' },
    { listener: 'over', target: 'Cg', currentTarget: 'Gcd' },
    { listener: 'over', target: 'C2', currentTarget: 'C2' },
    { listener: 'over', target: 'C2', currentTarget: 'Cg' },
    { listener: 'over', target: 'C2', currentTarget: 'Gcd' },
    { listener: 'over', target: 'D2', currentTarget: 'D2' },
    { listener: 'over', target: 'D2', currentTarget: 'Dg' },
    { listener: 'over', target: 'D2', currentTarget: 'Gcd' },
  ]);

  callSequence.length = 0;
  dispatchEvent(2, 2);
  expect(callSequence).toEqual([
    { listener: 'out', target: 'D2', currentTarget: 'D2' },
    { listener: 'out', target: 'D2', currentTarget: 'Dg' },
    { listener: 'out', target: 'D2', currentTarget: 'Gcd' },
    { listener: 'out', target: 'C2', currentTarget: 'C2' },
    { listener: 'out', target: 'C2', currentTarget: 'Cg' },
    { listener: 'out', target: 'C2', currentTarget: 'Gcd' },
    { listener: 'out', target: 'Cg', currentTarget: 'Cg' },
    { listener: 'out', target: 'Cg', currentTarget: 'Gcd' },
    { listener: 'out', target: 'C1', currentTarget: 'C1' },
    { listener: 'out', target: 'C1', currentTarget: 'Cg' },
    { listener: 'out', target: 'C1', currentTarget: 'Gcd' },
    { listener: 'out', target: 'Dg', currentTarget: 'Dg' },
    { listener: 'out', target: 'Dg', currentTarget: 'Gcd' },
    { listener: 'out', target: 'Bg', currentTarget: 'Bg' },
    { listener: 'out', target: 'Bg', currentTarget: 'Gab' },
    { listener: 'out', target: 'B2', currentTarget: 'B2' },
    { listener: 'out', target: 'B2', currentTarget: 'Bg' },
    { listener: 'out', target: 'B2', currentTarget: 'Gab' },
    { listener: 'out', target: 'B1', currentTarget: 'B1' },
    { listener: 'out', target: 'B1', currentTarget: 'Bg' },
    { listener: 'out', target: 'B1', currentTarget: 'Gab' },
    { listener: 'out', target: 'A2', currentTarget: 'A2' },
    { listener: 'out', target: 'A2', currentTarget: 'Ag' },
    { listener: 'out', target: 'A2', currentTarget: 'Gab' },
    { listener: 'out', target: 'D1', currentTarget: 'D1' },
    { listener: 'out', target: 'D1', currentTarget: 'Dg' },
    { listener: 'out', target: 'D1', currentTarget: 'Gcd' },
    { listener: 'out', target: 'A1', currentTarget: 'A1' },
    { listener: 'out', target: 'A1', currentTarget: 'Ag' },
    { listener: 'out', target: 'A1', currentTarget: 'Gab' },
    { listener: 'out', target: 'Ag', currentTarget: 'Ag' },
    { listener: 'out', target: 'Ag', currentTarget: 'Gab' },
    { listener: 'over', target: 'E', currentTarget: 'E' },
  ]);
});

describe('stopPropagation callback stops event propagation', () => {
  test.each(new Array(16).fill(null).map((_, i) => i + 1))(
    'pointerover - stop propagation threshold: %i',
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
        eventDispatcher.addEventListener(object, 'pointerover', eventListener, eventOptions);

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
        eventDispatcher.addEventListener(object, 'pointerover', eventListener, eventOptions);

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

      // Move pointer to trigger over events
      const pointerMoveEvent = new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth / 2,
        clientY: canvas.clientHeight / 2,
      });
      canvas.dispatchEvent(pointerMoveEvent);

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

  test.each(new Array(16).fill(null).map((_, i) => i + 1))(
    'pointerout - stop propagation threshold: %i',
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
        eventDispatcher.addEventListener(object, 'pointerout', eventListener, eventOptions);

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
        eventDispatcher.addEventListener(object, 'pointerout', eventListener, eventOptions);

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

      // Move pointer to trigger over events first
      const pointerMoveEvent1 = new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth / 2,
        clientY: canvas.clientHeight / 2,
      });
      canvas.dispatchEvent(pointerMoveEvent1);

      // Clear sequence and move pointer away to trigger out events
      callSequence.length = 0;
      const pointerMoveEvent2 = new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth * 2,
        clientY: canvas.clientHeight * 2,
      });
      canvas.dispatchEvent(pointerMoveEvent2);

      const expectedCallSequence = [
        { listener: 'Bg', target: 'Bg', currentTarget: 'Bg' },
        { listener: 'Gb', target: 'Bg', currentTarget: 'Gb' },
        { listener: 'B2', target: 'B2', currentTarget: 'B2' },
        { listener: 'Bg', target: 'B2', currentTarget: 'Bg' },
        { listener: 'Gb', target: 'B2', currentTarget: 'Gb' },
        { listener: 'B1', target: 'B1', currentTarget: 'B1' },
        { listener: 'Bg', target: 'B1', currentTarget: 'Bg' },
        { listener: 'Gb', target: 'B1', currentTarget: 'Gb' },
        { listener: 'A2', target: 'A2', currentTarget: 'A2' },
        { listener: 'Ag', target: 'A2', currentTarget: 'Ag' },
        { listener: 'Ga', target: 'A2', currentTarget: 'Ga' },
        { listener: 'A1', target: 'A1', currentTarget: 'A1' },
        { listener: 'Ag', target: 'A1', currentTarget: 'Ag' },
        { listener: 'Ga', target: 'A1', currentTarget: 'Ga' },
        { listener: 'Ag', target: 'Ag', currentTarget: 'Ag' },
        { listener: 'Ga', target: 'Ag', currentTarget: 'Ga' },
      ];

      const expectedCallSequenceSlice = expectedCallSequence.slice(0, stopPropagationThreshold);

      expect(callSequence).toEqual(expectedCallSequenceSlice);
      expect(callSequence.length).toBe(stopPropagationThreshold);
    },
  );
});

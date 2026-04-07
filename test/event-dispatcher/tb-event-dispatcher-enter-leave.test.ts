import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { TbAddEventListenerOptions, TbEvent } from '../../lib';
import { TbEventDispatcher } from '../../lib/event-dispatcher/tb-event-dispatcher';
import { TbEventType } from '../../lib/event-dispatcher/tb-event-types';
import { createCanvas } from '../test-helpers/create-canvas';

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

  const enter = vi.fn().mockName('enter');
  eventDispatcher.addEventListener(object, 'pointerenter', enter);
  const leave = vi.fn().mockName('leave');
  eventDispatcher.addEventListener(object, 'pointerleave', leave);

  dispatchEvent(0.49, 0);
  expect(enter).toHaveBeenCalledOnce();

  dispatchEvent(0.51, 0);
  expect(enter).toHaveBeenCalledOnce();
  expect(leave).toHaveBeenCalledOnce();
  expect(leave).toHaveBeenCalledAfter(enter);
});

describe('object visibility changes under pointer', () => {
  test.each<{
    id: string;
    occludingObject?: 'visible' | 'invisible';
    visibilityStates: boolean[];
    expectedEnterCalls: number[];
    expectedLeaveCalls: number[];
  }>([
    {
      id: 'single object, transition: invisible -> visible -> invisible',
      visibilityStates: [false, true, false],
      expectedEnterCalls: [0, 1, 1],
      expectedLeaveCalls: [0, 0, 1],
    },
    {
      id: 'single object, transition: visible -> invisible -> visible',
      visibilityStates: [true, false, true],
      expectedEnterCalls: [1, 1, 2],
      expectedLeaveCalls: [0, 1, 1],
    },
    {
      id: 'two overlapping objects, visible occluding object and transition: invisible -> visible -> invisible',
      occludingObject: 'visible',
      visibilityStates: [false, true, false],
      expectedEnterCalls: [0, 0, 0],
      expectedLeaveCalls: [0, 0, 0],
    },
    {
      id: 'two overlapping objects, visible occluding object and transition: visible -> invisible -> visible',
      occludingObject: 'visible',
      visibilityStates: [true, false, true],
      expectedEnterCalls: [0, 0, 0],
      expectedLeaveCalls: [0, 0, 0],
    },
    {
      id: 'two overlapping objects, invisible occluding object and transition: invisible -> visible -> invisible',
      occludingObject: 'invisible',
      visibilityStates: [false, true, false],
      expectedEnterCalls: [0, 1, 1],
      expectedLeaveCalls: [0, 0, 1],
    },
    {
      id: 'two overlapping objects, invisible occluding object and transition: visible -> invisible -> visible',
      occludingObject: 'invisible',
      visibilityStates: [true, false, true],
      expectedEnterCalls: [1, 1, 2],
      expectedLeaveCalls: [0, 1, 1],
    },
  ])('$id', ({ occludingObject, visibilityStates, expectedEnterCalls, expectedLeaveCalls }) => {
    const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    objectA.name = 'AAA';

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

    const enter = vi.fn().mockName('enter');
    eventDispatcher.addEventListener(objectA, 'pointerenter', enter);
    const leave = vi.fn().mockName('leave');
    eventDispatcher.addEventListener(objectA, 'pointerleave', leave);

    for (let i = 0; i < visibilityStates.length; i++) {
      objectA.visible = visibilityStates[i];
      dispatchEvent(0, 0);
      expect(enter).toHaveBeenCalledTimes(expectedEnterCalls[i]);
      expect(leave).toHaveBeenCalledTimes(expectedLeaveCalls[i]);
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
          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: {} },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 1, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: {} },

          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: { includeInvisible: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: { includeInvisible: true } },

          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 0, 1, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: { ignoreOcclusion: true } },

          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 0, 1, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: { includeInvisible: true, ignoreOcclusion: true } },
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
          { objectName: 'A', type: 'pointerenter', callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 0], options: {} },

          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: { includeInvisible: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: { includeInvisible: true } },

          { objectName: 'A', type: 'pointerenter', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },

          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 0, 1, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: { includeInvisible: true, ignoreOcclusion: true } },
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
          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: {} },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 0, 1, 0], options: {} },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 0], options: {} },

          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: { includeInvisible: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: { includeInvisible: true } },

          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 0, 1, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },

          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 0, 1, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: { includeInvisible: true, ignoreOcclusion: true } },
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
          { objectName: 'A', type: 'pointerenter', callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 0, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: {} },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: {} },

          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: { includeInvisible: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: { includeInvisible: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: { includeInvisible: true } },

          { objectName: 'A', type: 'pointerenter', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 0, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: { ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: { ignoreOcclusion: true } },

          { objectName: 'A', type: 'pointerenter', callCount: [1, 0, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'A', type: 'pointerleave', callCount: [0, 0, 1, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerenter', callCount: [0, 1, 0, 0], options: { includeInvisible: true, ignoreOcclusion: true } },
          { objectName: 'B', type: 'pointerleave', callCount: [0, 0, 0, 1], options: { includeInvisible: true, ignoreOcclusion: true } },
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

    // Enter object A
    dispatchEvent(0, 0);
    checkAllMocks(0);

    // Enter object B
    dispatchEvent(0.2, 0);
    checkAllMocks(1);

    // Leave object A
    dispatchEvent(0.6, 0);
    checkAllMocks(2);

    // Leave object B
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

  const eventOptions: TbAddEventListenerOptions = { ignoreOcclusion: true };
  const enterGroup = vi.fn().mockName('enterGroup');
  eventDispatcher.addEventListener(group, 'pointerenter', enterGroup, eventOptions);
  const leaveGroup = vi.fn().mockName('leaveGroup');
  eventDispatcher.addEventListener(group, 'pointerleave', leaveGroup, eventOptions);
  const enterA = vi.fn().mockName('enterA');
  eventDispatcher.addEventListener(objectA, 'pointerenter', enterA, eventOptions);
  const leaveA = vi.fn().mockName('leaveA');
  eventDispatcher.addEventListener(objectA, 'pointerleave', leaveA, eventOptions);
  const enterB = vi.fn().mockName('enterB');
  eventDispatcher.addEventListener(objectB, 'pointerenter', enterB, eventOptions);
  const leaveB = vi.fn().mockName('leaveB');
  eventDispatcher.addEventListener(objectB, 'pointerleave', leaveB, eventOptions);

  const clearAllMocks = () => {
    enterGroup.mockClear();
    leaveGroup.mockClear();
    enterA.mockClear();
    leaveA.mockClear();
    enterB.mockClear();
    leaveB.mockClear();
  };

  // Enter object A
  dispatchEvent(0, 0);
  expect(enterGroup).toHaveBeenCalledOnce();
  expect(leaveGroup).not.toHaveBeenCalled();
  expect(enterA).toHaveBeenCalledOnce();
  expect(enterA).toHaveBeenCalledAfter(enterGroup);
  expect(leaveA).not.toHaveBeenCalled();
  expect(enterB).not.toHaveBeenCalled();
  expect(leaveB).not.toHaveBeenCalled();

  // Enter object B while also staying in object A
  clearAllMocks();
  dispatchEvent(0.2, 0);
  expect(enterGroup).not.toHaveBeenCalled();
  expect(leaveGroup).not.toHaveBeenCalled();
  expect(enterA).not.toHaveBeenCalled();
  expect(leaveA).not.toHaveBeenCalled();
  expect(enterB).toHaveBeenCalledOnce();
  expect(leaveB).not.toHaveBeenCalled();

  // Leave object A while staying in object B
  clearAllMocks();
  dispatchEvent(0.6, 0);
  expect(enterGroup).not.toHaveBeenCalled();
  expect(leaveGroup).not.toHaveBeenCalled();
  expect(enterA).not.toHaveBeenCalled();
  expect(enterB).not.toHaveBeenCalled();
  expect(leaveA).toHaveBeenCalledOnce();
  expect(leaveB).not.toHaveBeenCalled();

  // Leave object B
  clearAllMocks();
  dispatchEvent(1.2, 0);
  expect(enterGroup).not.toHaveBeenCalled();
  expect(leaveGroup).toHaveBeenCalledOnce();
  expect(enterA).not.toHaveBeenCalled();
  expect(enterB).not.toHaveBeenCalled();
  expect(leaveA).not.toHaveBeenCalled();
  expect(leaveB).toHaveBeenCalledOnce();
});

test('object group with enter/leave events only on group object', () => {
  const objectA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  objectA.name = 'A';
  const objectB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 2));
  objectB.name = 'B';

  const group = new THREE.Group();
  group.name = 'Group';
  group.add(objectA, objectB);

  const enterGroup = vi.fn().mockName('enterGroup');
  eventDispatcher.addEventListener(group, 'pointerenter', enterGroup);
  const leaveGroup = vi.fn().mockName('leaveGroup');
  eventDispatcher.addEventListener(group, 'pointerleave', leaveGroup);

  dispatchEvent(1.1, 0);
  expect(enterGroup).not.toHaveBeenCalled();
  expect(leaveGroup).not.toHaveBeenCalled();

  dispatchEvent(-0.6, 0);
  expect(enterGroup).toHaveBeenCalledTimes(1);
  expect(leaveGroup).not.toHaveBeenCalled();

  dispatchEvent(0, 0);
  expect(enterGroup).toHaveBeenCalledTimes(1);
  expect(leaveGroup).not.toHaveBeenCalled();

  dispatchEvent(0.6, 0);
  expect(enterGroup).toHaveBeenCalledTimes(1);
  expect(leaveGroup).not.toHaveBeenCalled();

  dispatchEvent(1.1, 0);
  expect(enterGroup).toHaveBeenCalledTimes(1);
  expect(leaveGroup).toHaveBeenCalledTimes(1);
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
  dispatchEvent(-0.2, 0);
  expect(enterGroup).toHaveBeenCalledOnce();
  expect(leaveGroup).not.toHaveBeenCalled();
  expect(enterA).toHaveBeenCalledOnce();
  expect(enterA).toHaveBeenCalledAfter(enterGroup);
  expect(leaveA).not.toHaveBeenCalled();
  expect(enterB).not.toHaveBeenCalled();
  expect(leaveB).not.toHaveBeenCalled();

  // Enter object B while leaving object A
  clearAllMocks();
  dispatchEvent(0.2, 0);
  expect(enterGroup).not.toHaveBeenCalled();
  expect(leaveGroup).not.toHaveBeenCalled();
  expect(enterA).not.toHaveBeenCalled();
  expect(leaveA).toHaveBeenCalledOnce();
  expect(enterB).toHaveBeenCalledOnce();
  expect(enterB).toHaveBeenCalledAfter(leaveA);
  expect(leaveB).not.toHaveBeenCalled();

  // Leave object B
  clearAllMocks();
  dispatchEvent(1.2, 0);
  expect(enterGroup).not.toHaveBeenCalled();
  expect(leaveGroup).toHaveBeenCalledOnce();
  expect(enterA).not.toHaveBeenCalled();
  expect(enterB).not.toHaveBeenCalled();
  expect(leaveA).not.toHaveBeenCalled();
  expect(leaveB).toHaveBeenCalledOnce();
});

test('event order is correct', () => {
  const eventOptions: TbAddEventListenerOptions = { ignoreOcclusion: true };
  const callSequence: EventCallLog[] = [];

  const createGroup = (name: string): THREE.Object3D => {
    const object = new THREE.Group();
    object.name = name;

    const enterListener = vi
      .fn()
      .mockName(`enter-${object.name}`)
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'enter',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
        });
      });
    const leaveListener = vi
      .fn()
      .mockName(`leave-${object.name}`)
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'leave',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
        });
      });

    eventDispatcher.addEventListener(object, 'pointerenter', enterListener, eventOptions);
    eventDispatcher.addEventListener(object, 'pointerleave', leaveListener, eventOptions);

    return object;
  };

  const createObject = (name: string, distance: number): THREE.Object3D => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    object.name = name;
    object.position.x = distance;
    object.updateMatrixWorld();

    const enterListener = vi
      .fn()
      .mockName(`enter-${object.name}`)
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'enter',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
        });
      });
    const leaveListener = vi
      .fn()
      .mockName(`leave-${object.name}`)
      .mockImplementation((event: TbEvent) => {
        callSequence.push({
          listener: 'leave',
          target: event.target.name,
          currentTarget: event.currentTarget.name,
        });
      });

    eventDispatcher.addEventListener(object, 'pointerenter', enterListener, eventOptions);
    eventDispatcher.addEventListener(object, 'pointerleave', leaveListener, eventOptions);

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
    { listener: 'enter', target: 'Gab', currentTarget: 'Gab' },
    { listener: 'enter', target: 'Ag', currentTarget: 'Ag' },
    { listener: 'enter', target: 'A1', currentTarget: 'A1' },
    { listener: 'enter', target: 'Gcd', currentTarget: 'Gcd' },
    { listener: 'enter', target: 'Dg', currentTarget: 'Dg' },
    { listener: 'enter', target: 'D1', currentTarget: 'D1' },
    { listener: 'enter', target: 'A2', currentTarget: 'A2' },
    { listener: 'enter', target: 'Bg', currentTarget: 'Bg' },
    { listener: 'enter', target: 'B1', currentTarget: 'B1' },
    { listener: 'enter', target: 'B2', currentTarget: 'B2' },
    { listener: 'enter', target: 'Cg', currentTarget: 'Cg' },
    { listener: 'enter', target: 'C1', currentTarget: 'C1' },
    { listener: 'enter', target: 'C2', currentTarget: 'C2' },
    { listener: 'enter', target: 'D2', currentTarget: 'D2' },
  ]);

  callSequence.length = 0;
  dispatchEvent(2, 2);
  expect(callSequence).toEqual([
    { listener: 'leave', target: 'D2', currentTarget: 'D2' },
    { listener: 'leave', target: 'C2', currentTarget: 'C2' },
    { listener: 'leave', target: 'C1', currentTarget: 'C1' },
    { listener: 'leave', target: 'Cg', currentTarget: 'Cg' },
    { listener: 'leave', target: 'B2', currentTarget: 'B2' },
    { listener: 'leave', target: 'B1', currentTarget: 'B1' },
    { listener: 'leave', target: 'Bg', currentTarget: 'Bg' },
    { listener: 'leave', target: 'A2', currentTarget: 'A2' },
    { listener: 'leave', target: 'D1', currentTarget: 'D1' },
    { listener: 'leave', target: 'Dg', currentTarget: 'Dg' },
    { listener: 'leave', target: 'Gcd', currentTarget: 'Gcd' },
    { listener: 'leave', target: 'A1', currentTarget: 'A1' },
    { listener: 'leave', target: 'Ag', currentTarget: 'Ag' },
    { listener: 'leave', target: 'Gab', currentTarget: 'Gab' },
    { listener: 'enter', target: 'E', currentTarget: 'E' },
  ]);
});

describe('stopPropagation callback stops event propagation', () => {
  test.each(new Array(8).fill(null).map((_, i) => i + 1))(
    'pointerenter - stop propagation threshold: %i',
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
        eventDispatcher.addEventListener(object, 'pointerenter', eventListener, eventOptions);

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
        eventDispatcher.addEventListener(object, 'pointerenter', eventListener, eventOptions);

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

      // Move pointer to enter all objects
      const pointerMoveEvent = new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth / 2,
        clientY: canvas.clientHeight / 2,
      });
      canvas.dispatchEvent(pointerMoveEvent);

      const expectedCallSequence = [
        { listener: 'Ga', target: 'Ga', currentTarget: 'Ga' },
        { listener: 'Ag', target: 'Ag', currentTarget: 'Ag' },
        { listener: 'A1', target: 'A1', currentTarget: 'A1' },
        { listener: 'A2', target: 'A2', currentTarget: 'A2' },
        { listener: 'Gb', target: 'Gb', currentTarget: 'Gb' },
        { listener: 'Bg', target: 'Bg', currentTarget: 'Bg' },
        { listener: 'B1', target: 'B1', currentTarget: 'B1' },
        { listener: 'B2', target: 'B2', currentTarget: 'B2' },
      ];

      const expectedCallSequenceSlice = expectedCallSequence.slice(0, stopPropagationThreshold);

      expect(callSequence).toEqual(expectedCallSequenceSlice);
      expect(callSequence.length).toBe(stopPropagationThreshold);
    },
  );

  test.each(new Array(8).fill(null).map((_, i) => i + 1))(
    'pointerleave - stop propagation threshold: %i',
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
        eventDispatcher.addEventListener(object, 'pointerleave', eventListener, eventOptions);

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
        eventDispatcher.addEventListener(object, 'pointerleave', eventListener, eventOptions);

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

      // Move pointer to enter all objects first
      const pointerMoveEvent1 = new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth / 2,
        clientY: canvas.clientHeight / 2,
      });
      canvas.dispatchEvent(pointerMoveEvent1);

      // Clear sequence and move pointer away to leave all objects
      callSequence.length = 0;
      const pointerMoveEvent2 = new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: canvas.clientWidth * 2,
        clientY: canvas.clientHeight * 2,
      });
      canvas.dispatchEvent(pointerMoveEvent2);

      const expectedCallSequence = [
        { listener: 'B2', target: 'B2', currentTarget: 'B2' },
        { listener: 'B1', target: 'B1', currentTarget: 'B1' },
        { listener: 'Bg', target: 'Bg', currentTarget: 'Bg' },
        { listener: 'Gb', target: 'Gb', currentTarget: 'Gb' },
        { listener: 'A2', target: 'A2', currentTarget: 'A2' },
        { listener: 'A1', target: 'A1', currentTarget: 'A1' },
        { listener: 'Ag', target: 'Ag', currentTarget: 'Ag' },
        { listener: 'Ga', target: 'Ga', currentTarget: 'Ga' },
      ];

      const expectedCallSequenceSlice = expectedCallSequence.slice(0, stopPropagationThreshold);

      expect(callSequence).toEqual(expectedCallSequenceSlice);
      expect(callSequence.length).toBe(stopPropagationThreshold);
    },
  );
});

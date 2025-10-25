import * as THREE from 'three';
import { EventPhases } from './event-phases';
import { ThreeEventHandlersEventMap } from './internal/three-event-handlers-event-map';
import { Writable } from './internal/writable';
import { ThreeEvent } from './three-event';
import { ThreeEventListener } from './three-event-listener';
import { ThreeEventType } from './three-event-types';
import { calculatePointerCoords } from '../utils';

type HandlerEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'click'
  | 'dblclick'
  | 'wheel';

interface ThreeEventListenerEntry {
  type: ThreeEventType;
  listener: ThreeEventListener;
  options?: boolean | AddEventListenerOptions;
}

interface ObjectEventState {
  listenerEntries: ThreeEventListenerEntry[];
  entered: boolean;
  over: boolean;
}

interface StopPropagationRef {
  value: boolean;
}

/**
 * Dispatches pointer and mouse events to {@link THREE.Object3D} instances in a
 * Three.js scene.
 *
 * Handles event registration, propagation (capturing, bubbling, at-target),
 * pointer capture, and intersection-based hit testing. Supports global and
 * per-object event listeners, and manages pointer enter/leave/over/out events
 * for interactive 3D objects.
 *
 * Usage:
 *  - Instantiate with a DOM element and camera.
 *  - Register event listeners on {@link THREE.Object3D} instances.
 *  - When using animations, call `update()` on animation frames to refresh
 *    pointer intersections.
 *  - Use `dispose()` to remove all DOM event listeners when done.
 */
export class ThreeEventDispatcher {
  private handlers: { [key in HandlerEventType]: (ev: HTMLElementEventMap[key]) => void };
  private lastPointerEvent: PointerEvent | null;
  private domElement: HTMLElement;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;

  private targetIntersections = new Array<THREE.Intersection>();
  private targetObjects = new Array<THREE.Object3D>();
  private eventObjects = new Array<THREE.Object3D>();
  private events = new Map<THREE.Object3D, ObjectEventState>();
  private globalListeners: ThreeEventListenerEntry[] = [];
  private pointerCaptures = new Map<number, THREE.Object3D>();

  // TODO add missing stopimmediatepropagation events
  constructor(domElement: HTMLElement, camera: THREE.Camera, raycaster?: THREE.Raycaster) {
    this.domElement = domElement;
    this.camera = camera;
    this.raycaster = raycaster ?? new THREE.Raycaster();

    const pointerEventHandler = this.handlePointerEvent.bind(this);
    this.handlers = {
      pointerdown: pointerEventHandler,
      pointermove: pointerEventHandler,
      pointerup: pointerEventHandler,
      pointercancel: pointerEventHandler,
      click: this.handleClick.bind(this),
      dblclick: this.handleDblClick.bind(this),
      wheel: this.handleWheel.bind(this),
    };

    this.lastPointerEvent = null;

    this.domElement.addEventListener('pointerdown', this.handlers.pointerdown);
    this.domElement.addEventListener('pointerup', this.handlers.pointerup);
    this.domElement.addEventListener('pointermove', this.handlers.pointermove);
    this.domElement.addEventListener('pointercancel', this.handlers.pointercancel);
    this.domElement.addEventListener('click', this.handlers.click);
    this.domElement.addEventListener('dblclick', this.handlers.dblclick);
    this.domElement.addEventListener('wheel', this.handlers.wheel);
  }

  /**
   * Removes all DOM event listeners and cleans up resources.
   */
  dispose() {
    this.domElement.removeEventListener('pointerdown', this.handlers.pointerdown);
    this.domElement.removeEventListener('pointerup', this.handlers.pointerup);
    this.domElement.removeEventListener('pointermove', this.handlers.pointermove);
    this.domElement.removeEventListener('pointercancel', this.handlers.pointercancel);
    this.domElement.removeEventListener('click', this.handlers.click);
    this.domElement.removeEventListener('dblclick', this.handlers.dblclick);
    this.domElement.removeEventListener('wheel', this.handlers.wheel);
  }

  /**
   * Updates the raycaster intersections and hit box events.
   *
   * When using animations, call `update()` on animation frames to refresh
   * pointer intersections.
   */
  update() {
    this.updateIntersections();
    this.updateHitBoxEvents();
  }

  /**
   * Sets the camera used for raycasting.
   *
   * @param camera
   */
  setCamera(camera: THREE.Camera) {
    this.camera = camera;
    this.updateIntersections();
    this.updateHitBoxEvents();
  }

  /**
   * Adds an event listener to a {@link THREE.Object3D}.
   *
   * @param object Object to attach the listener to.
   * @param type Event type.
   * @param listener Event handler function.
   * @param options Optional event listener options (capture, once, signal).
   */
  addEventListener<K extends keyof ThreeEventHandlersEventMap>(
    object: THREE.Object3D,
    type: K,
    listener: (ev: ThreeEventHandlersEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    const listenerEntry: ThreeEventListenerEntry = {
      type,
      listener: listener as ThreeEventListener,
      options,
    };
    const eventState = this.events.get(object);
    if (eventState) {
      if (eventState.listenerEntries) {
        eventState.listenerEntries.push(listenerEntry);
      } else {
        eventState.listenerEntries = [listenerEntry];
      }
    } else {
      this.events.set(object, { listenerEntries: [listenerEntry], entered: false, over: false });
    }

    if (typeof listenerEntry.options !== 'boolean' && listenerEntry.options?.signal) {
      listenerEntry.options?.signal.addEventListener('abort', () => {
        this.removeEventListener(
          object,
          listenerEntry.type,
          listenerEntry.listener,
          listenerEntry.options,
        );
      });
    }

    this.eventObjects = Array.from(this.events.keys());
  }

  /**
   * Removes an event listener from a {@link THREE.Object3D}.
   *
   * @param object Object to remove the listener from.
   * @param type Event type.
   * @param listener Event handler function.
   * @param options Optional event listener options.
   */
  removeEventListener<K extends keyof ThreeEventHandlersEventMap>(
    object: THREE.Object3D,
    type: K,
    listener: (ev: ThreeEventHandlersEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    const eventState = this.events.get(object);
    if (eventState) {
      const captureOption = typeof options == 'boolean' ? options : (options?.capture ?? false);

      eventState.listenerEntries = eventState.listenerEntries.filter(
        (s) =>
          !(
            s.type === type &&
            s.listener === listener &&
            (typeof s.options == 'boolean' ? s.options : (s.options?.capture ?? false)) ===
              captureOption
          ),
      );
      if (eventState.listenerEntries.length == 0) {
        this.events.delete(object);
        this.eventObjects = Array.from(this.events.keys());
      }
    }
  }

  /**
   * Removes all event listeners from a {@link THREE.Object3D}.
   *
   * @param object Object to remove all listeners from.
   */
  removeAllEventListeners(object: THREE.Object3D): void {
    this.events.delete(object);
    this.eventObjects = Array.from(this.events.keys());
  }

  /**
   * Adds a global event listener to the scene.
   *
   * @param type Event type.
   * @param listener Event handler function.
   * @param options Optional event listener options.
   */
  addGlobalEventListener<K extends keyof ThreeEventHandlersEventMap>(
    type: K,
    listener: (ev: ThreeEventHandlersEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.globalListeners.push({ type, listener: listener as ThreeEventListener, options });
  }

  /**
   * Removes a global event listener from the scene.
   *
   * @param type Event type.
   * @param listener Event handler function.
   * @param options Optional event listener options.
   */
  removeGlobalEventListener<K extends keyof ThreeEventHandlersEventMap>(
    type: K,
    listener: (ev: ThreeEventHandlersEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.globalListeners = this.globalListeners.filter(
      (s) => !(s.type === type && s.listener === listener && s.options === options),
    );
  }

  /**
   * Sets pointer capture for a specific pointerId on a {@link THREE.Object3D}.
   *
   * @param object Object to capture the pointer.
   * @param pointerId Pointer identifier.
   */
  setPointerCapture(object: THREE.Object3D, pointerId: number): void {
    this.domElement.setPointerCapture(pointerId);
    this.pointerCaptures.set(pointerId, object);
  }

  /**
   * Releases pointer capture for a specific `pointerId` on a {@link THREE.Object3D}.
   *
   * @param object Object to release the pointer from.
   * @param pointerId Pointer identifier.
   */
  releasePointerCapture(object: THREE.Object3D, pointerId: number): void {
    if (this.pointerCaptures.get(pointerId) === object) {
      this.domElement.releasePointerCapture(pointerId);
      this.pointerCaptures.delete(pointerId);
    }
  }

  /**
   * Checks if a {@link THREE.Object3D} has pointer capture for a given
   * pointerId.
   *
   * @param object The object to check.
   * @param pointerId The pointer identifier.
   * @returns True if the object has pointer capture for the pointerId.
   */
  hasPointerCapture(object: THREE.Object3D, pointerId: number): boolean {
    return this.pointerCaptures.get(pointerId) === object;
  }

  private updateHitBoxEvents() {
    this.updatePointerOverOutEvents();
    this.updatePointerEnterLeaveEvents();
  }

  private updateIntersections(): void {
    if (!this.lastPointerEvent) return;

    if (this.camera.matrixWorldNeedsUpdate) {
      this.camera.updateMatrixWorld();
    }
    const coords = calculatePointerCoords(this.lastPointerEvent, this.domElement);
    this.raycaster.setFromCamera(coords, this.camera);
    this.targetIntersections = this.raycaster
      .intersectObjects(this.eventObjects)
      .filter((i) => i.object.visible);
    this.targetObjects = [...new Set(this.targetIntersections.map((i) => i.object))];
  }

  private updatePointerEnterLeaveEvents(): void {
    if (!this.lastPointerEvent) return;

    for (const [eventObject, eventState] of this.events) {
      const hovered = this.containsAnyInObjectTree(this.targetObjects, eventObject);

      if (hovered && !eventState.entered) {
        const threeEvent = this.createThreeEvent('pointerenter', this.lastPointerEvent);
        threeEvent.stopPropagation = () => {};
        this.handleSingleEvent(threeEvent, eventObject, eventObject);
        eventState.entered = true;
      } else if (!hovered && eventState.entered) {
        const threeEvent = this.createThreeEvent('pointerleave', this.lastPointerEvent);
        threeEvent.stopPropagation = () => {};
        this.handleSingleEvent(threeEvent, eventObject, eventObject);
        eventState.entered = false;
      }
    }
  }

  private updatePointerOverOutEvents(): void {
    if (!this.lastPointerEvent) return;

    const stopPropagationRef: StopPropagationRef = { value: false };
    let overObject: THREE.Object3D | null = null;
    let overObjectEventState: ObjectEventState | undefined;

    const captureObject = this.pointerCaptures.get(this.lastPointerEvent.pointerId);
    if (captureObject) {
      overObject = captureObject;
      overObjectEventState = this.events.get(captureObject);
    } else {
      // Traverse through all target objects and for each target object, traverse up
      // the object tree until the root object (scene) to find all possible event
      // object matches.
      for (const { object } of this.targetIntersections) {
        let objectItr: THREE.Object3D | null = object;
        while (objectItr) {
          const eventState = this.events.get(objectItr);
          if (eventState) {
            overObject = object;
            overObjectEventState = eventState;
            break;
          }
          objectItr = objectItr.parent;
        }
        if (overObject) break;
      }
    }

    for (const [eventObject, eventState] of this.events) {
      if (eventObject !== overObject && eventState.over) {
        const threeEvent = this.createThreeEvent('pointerout', this.lastPointerEvent);
        threeEvent.stopPropagation = () => {
          stopPropagationRef.value = true;
        };
        this.handleBubblingEvent(threeEvent, eventObject, stopPropagationRef);
        eventState.over = false;
      }
    }

    if (overObject && overObjectEventState && !overObjectEventState.over) {
      const threeEvent = this.createThreeEvent('pointerover', this.lastPointerEvent);
      threeEvent.stopPropagation = () => {
        stopPropagationRef.value = true;
      };
      this.handleBubblingEvent(threeEvent, overObject, stopPropagationRef);
      overObjectEventState.over = true;
    }
  }

  private containsAnyInObjectTree(searchArray: THREE.Object3D[], root: THREE.Object3D): boolean {
    let result = !!searchArray.find((o) => o === root);
    if (result) return result;

    for (const child of root.children) {
      result = this.containsAnyInObjectTree(searchArray, child);
      if (result) return result;
    }
    return false;
  }

  private getParents(object: THREE.Object3D): THREE.Object3D[] {
    const result: THREE.Object3D[] = [];
    let iter: THREE.Object3D | null = object.parent;
    while (iter) {
      result.push(iter);
      iter = iter.parent;
    }
    return result;
  }

  private createThreeEvent<E extends Event>(type: ThreeEventType, nativeEvent: E): ThreeEvent<E> {
    return {
      type,
      nativeEvent,
      intersections: this.targetIntersections,
      ray: this.raycaster.ray,
      camera: this.camera,
    } as ThreeEvent<E>;
  }

  private handleBaseEvent<E extends Event>(ev: E): void {
    const threeEvent = this.createThreeEvent(ev.type as ThreeEventType, ev);
    this.handleEvent(threeEvent);
  }

  private handlePointerEvent(ev: PointerEvent): void {
    this.lastPointerEvent = ev;
    this.update();
    this.handleBaseEvent(ev);
  }

  private handleClick(ev: MouseEvent): void {
    this.handleBaseEvent(ev);
  }

  private handleDblClick(ev: MouseEvent): void {
    this.handleBaseEvent(ev);
  }

  private handleWheel(ev: WheelEvent): void {
    this.update();
    this.handleBaseEvent(ev);
  }

  private handleEvent(event: ThreeEvent): void {
    const editableEvent = event as Writable<ThreeEvent>;
    const stopPropagationRef = { value: false };
    editableEvent.stopPropagation = () => {
      stopPropagationRef.value = true;
    };

    this.handleGlobalEvents(editableEvent, EventPhases.CAPTURING_PHASE);

    if (event.nativeEvent instanceof PointerEvent) {
      editableEvent.eventPhase = EventPhases.AT_TARGET;
      const captureObject = this.pointerCaptures.get(event.nativeEvent.pointerId);
      if (captureObject) {
        if (event.nativeEvent.type == 'pointerup' || event.nativeEvent.type == 'pointercancel') {
          this.pointerCaptures.delete(event.nativeEvent.pointerId);
          this.handleBubblingEvent(event, captureObject, stopPropagationRef);
        } else {
          this.handleSingleEvent(editableEvent, captureObject, captureObject);
        }
        return;
      }
    }

    const handledCaptureTargets = new Set<THREE.Object3D>();
    const handledBubbleTargets = new Set<THREE.Object3D>();

    for (const target of this.targetObjects) {
      this.handleBubblingEvent(
        event,
        target,
        stopPropagationRef,
        handledCaptureTargets,
        handledBubbleTargets,
      );

      if (stopPropagationRef.value) break;
    }

    this.handleGlobalEvents(editableEvent, EventPhases.BUBBLING_PHASE);
  }

  private handleGlobalEvents(event: Writable<ThreeEvent>, phase: number): void {
    event.target = this.targetObjects[0];
    event.currentTarget = this.targetObjects[0];
    event.eventPhase = phase;

    const captureEvent = phase === EventPhases.CAPTURING_PHASE;
    const listenerEntries = this.globalListeners.filter((l) => {
      const captureOption =
        typeof l.options == 'boolean' ? l.options : (l.options?.capture ?? false);
      return l.type === event.type && captureEvent == captureOption;
    });

    for (const listenerEntry of listenerEntries) {
      if (listenerEntry.type == event.type) {
        listenerEntry.listener(event);
      }
    }
  }

  private handleBubblingEvent(
    event: Writable<ThreeEvent>,
    target: THREE.Object3D,
    stopPropagationRef: StopPropagationRef,
    handledCaptureTargets?: Set<THREE.Object3D>,
    handledBubbleTargets?: Set<THREE.Object3D>,
  ): void {
    const targetParents = this.getParents(target);
    const targetParentsReverse = targetParents.slice().reverse();

    // Capturing phase
    event.eventPhase = EventPhases.CAPTURING_PHASE;
    for (const currentTarget of targetParentsReverse) {
      if (handledCaptureTargets?.has(currentTarget)) continue;

      this.handleSingleEvent(event, target, currentTarget);
      if (stopPropagationRef.value) return;

      handledCaptureTargets?.add(currentTarget);
    }

    // Target phase
    event.eventPhase = EventPhases.AT_TARGET;
    this.handleSingleEvent(event, target, target);
    if (stopPropagationRef.value) return;

    handledCaptureTargets?.add(target);
    handledBubbleTargets?.add(target);

    // Bubbling phase
    event.eventPhase = EventPhases.BUBBLING_PHASE;
    for (const currentTarget of targetParents) {
      if (handledBubbleTargets?.has(currentTarget)) continue;

      this.handleSingleEvent(event, target, currentTarget);
      if (stopPropagationRef.value) return;

      handledBubbleTargets?.add(currentTarget);
    }
  }

  private handleSingleEvent(
    event: Writable<ThreeEvent>,
    target: THREE.Object3D,
    currentTarget: THREE.Object3D,
  ): void {
    let stopImmediatePropagation = false;
    event.stopImmediatePropagation = () => {
      stopImmediatePropagation = true;
      event.stopPropagation();
    };

    const eventState = this.events.get(currentTarget);
    if (!eventState) return;

    const captureEvent = event.eventPhase === EventPhases.CAPTURING_PHASE;
    const listenerEntries = eventState.listenerEntries.filter((l) => {
      const captureOption =
        typeof l.options == 'boolean' ? l.options : (l.options?.capture ?? false);
      return (
        l.type === event.type &&
        (event.eventPhase === EventPhases.AT_TARGET || captureEvent == captureOption)
      );
    });

    for (const listenerEntry of listenerEntries) {
      event.target = target;
      event.currentTarget = currentTarget;
      listenerEntry.listener(event);

      if (stopImmediatePropagation) {
        break;
      }

      if (typeof listenerEntry.options !== 'boolean' && listenerEntry.options?.once) {
        this.removeEventListener(
          currentTarget,
          listenerEntry.type,
          listenerEntry.listener,
          listenerEntry.options,
        );
      }
    }
  }
}

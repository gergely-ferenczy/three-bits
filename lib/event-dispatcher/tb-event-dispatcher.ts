import * as THREE from 'three';
import { TbEventHandlersEventMap } from './internal/tb-event-handlers-event-map';
import { Writable } from './internal/writable';
import { TbEvent } from './tb-event';
import { TbEventListener } from './tb-event-listener';
import { TbEventType } from './tb-event-types';
import { calculatePointerCoords } from '../utils';
import { TbAddEventListenerOptions } from './tb-add-event-listener-options';

type HandlerEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'click'
  | 'dblclick'
  | 'wheel';

interface TbEventListenerEntry<G extends 'object' | 'global' = 'object'> {
  type: TbEventType;
  listener: TbEventListener<Event, G>;
  options?: boolean | TbAddEventListenerOptions;
}

interface MatchParams {
  visible: boolean;
  inSight: boolean;
  inSightWithInvisible: boolean;
  visibilityChange?: boolean;
  sightChange?: boolean;
  sightWithInvisibleChange?: boolean;
  hoverChange?: boolean;
}

interface ObjectEventState {
  listenerEntries: TbEventListenerEntry[];
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
export class TbEventDispatcher {
  private handlers: { [key in HandlerEventType]: (ev: HTMLElementEventMap[key]) => void };
  private lastPointerEvent: PointerEvent | null;
  private domElement: HTMLElement;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;

  private targetIntersections = new Array<THREE.Intersection>();
  private targetObjects = new Set<THREE.Object3D>();
  private eventObjects = new Array<THREE.Object3D>();
  private eventMap = new Map<THREE.Object3D, ObjectEventState>();
  private globalListeners: TbEventListenerEntry<'global'>[] = [];
  private pointerCaptures = new Map<number, THREE.Object3D>();

  /** Stores the state of active enter/leave events. */
  private enterLeaveState: {
    /** A subset of `eventObjects` that have enter/leave event listeners attached to
     *  them. */
    objects: Set<THREE.Object3D>;

    /** Information about the current enter/leave hover state of event objects. */
    hovers: Map<THREE.Object3D, MatchParams>;
  } = { objects: new Set(), hovers: new Map() };

  /** Stores the state of active over/out events. */
  private overOutState: {
    /** A subset of `eventObjects` that have over/out event listeners attached to
     * them. */
    objects: Set<THREE.Object3D>;

    /** Information about the current enter/leave hover state of event objects. */
    hovers: Map<THREE.Object3D, MatchParams>;
  } = { objects: new Set(), hovers: new Map() };

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
    this.updateHitBoxEvents();
  }

  /**
   * Sets the camera used for raycasting.
   *
   * @param camera
   */
  setCamera(camera: THREE.Camera) {
    this.camera = camera;
    this.update();
  }

  /**
   * Adds an event listener to a {@link THREE.Object3D}.
   *
   * @param object Object to attach the listener to.
   * @param type Event type.
   * @param listener Event handler function.
   * @param options An object that specifies characteristics about the event
   *  listener.
   */
  addEventListener<K extends keyof TbEventHandlersEventMap>(
    object: THREE.Object3D,
    type: K,
    listener: (ev: TbEventHandlersEventMap[K]) => void,
    options?: boolean | TbAddEventListenerOptions,
  ): void {
    if (typeof options !== 'boolean' && options?.signal?.aborted) {
      return;
    }

    const listenerEntry: TbEventListenerEntry = {
      type,
      listener: listener as TbEventListener,
      options,
    };
    const eventState = this.eventMap.get(object);
    if (eventState) {
      eventState.listenerEntries.push(listenerEntry);
    } else {
      this.eventMap.set(object, {
        listenerEntries: [listenerEntry],
      });
    }

    if (typeof listenerEntry.options !== 'boolean' && listenerEntry.options?.signal) {
      listenerEntry.options.signal.addEventListener('abort', () => {
        this.removeEventListener(
          object,
          listenerEntry.type,
          listenerEntry.listener,
          listenerEntry.options,
        );
      });
    }

    this.updateEventObjects();
  }

  /**
   * Removes an event listener from a {@link THREE.Object3D}.
   *
   * @param object Object to remove the listener from.
   * @param type Event type.
   * @param listener Event handler function.
   * @param options An object that specifies characteristics about the event
   *  listener.
   */
  removeEventListener<K extends keyof TbEventHandlersEventMap>(
    object: THREE.Object3D,
    type: K,
    listener: (ev: TbEventHandlersEventMap[K]) => void,
    options?: boolean | TbAddEventListenerOptions,
  ): void {
    const eventState = this.eventMap.get(object);
    if (!eventState) return;

    const captureOption = typeof options === 'boolean' ? options : (options?.capture ?? false);
    eventState.listenerEntries = eventState.listenerEntries.filter(
      (s) =>
        !(
          s.type === type &&
          s.listener === listener &&
          (typeof s.options === 'boolean' ? s.options : (s.options?.capture ?? false)) ===
            captureOption
        ),
    );
    if (eventState.listenerEntries.length === 0) {
      this.eventMap.delete(object);
      this.updateEventObjects();
    }
  }

  /**
   * Removes all event listeners from a {@link THREE.Object3D}.
   *
   * @param object Object to remove all listeners from.
   */
  removeAllEventListeners(object: THREE.Object3D): void {
    this.eventMap.delete(object);
    this.updateEventObjects();
  }

  /**
   * Adds a global event listener to the scene.
   *
   * @param type Event type.
   * @param listener Event handler function.
   * @param options An object that specifies characteristics about the event
   *  listener.
   */
  addGlobalEventListener<K extends keyof TbEventHandlersEventMap>(
    type: K,
    listener: (ev: TbEventHandlersEventMap<'global'>[K]) => void,
    options?: boolean | TbAddEventListenerOptions,
  ): void {
    this.globalListeners.push({
      type,
      listener: listener as TbEventListener<Event, 'global'>,
      options,
    });
  }

  /**
   * Removes a global event listener from the scene.
   *
   * @param type Event type.
   * @param listener Event handler function.
   * @param options An object that specifies characteristics about the event
   *  listener.
   */
  removeGlobalEventListener<K extends keyof TbEventHandlersEventMap>(
    type: K,
    listener: (ev: TbEventHandlersEventMap<'global'>[K]) => void,
    options?: boolean | TbAddEventListenerOptions,
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
    if (!this.lastPointerEvent) return;

    if (this.camera.matrixWorldNeedsUpdate) {
      this.camera.updateMatrixWorld();
    }
    const coords = calculatePointerCoords(this.lastPointerEvent, this.domElement);
    this.raycaster.setFromCamera(coords, this.camera);
    this.targetIntersections = this.raycaster
      .intersectObjects(this.eventObjects)
      .sort((a, b) => b.object.renderOrder - a.object.renderOrder);
    this.targetObjects = new Set(this.targetIntersections.map((i) => i.object));

    this.updatePointerOverOutEvents();
    this.updatePointerEnterLeaveEvents();
  }

  private updatePointerEnterLeaveEvents(): void {
    const leaveEventQueue: { object: THREE.Object3D; match: MatchParams }[] = [];
    const enterEventQueue: { object: THREE.Object3D; match: MatchParams }[] = [];

    // Enter/leave events do not bubble, but when children are hit, the listeners
    // registered on parents must also be called in a top down order (parents first,
    // children after). Here we collect every object that has an enter/leave
    // listener and is either a direct target or a parent of a direct target.
    const hovers = new Map<THREE.Object3D, MatchParams>();
    for (const target of this.targetObjects) {
      const localQueue: { object: THREE.Object3D; match: MatchParams }[] = [];
      let currentMatch: MatchParams = {
        visible: true,
        inSight: false,
        inSightWithInvisible: false,
      };

      let current: THREE.Object3D | null = target;
      while (current !== null) {
        const newMatch = this.captureMatchParams(current);
        currentMatch = this.mergeMatch(newMatch, currentMatch);
        if (this.enterLeaveState.objects.has(current)) {
          localQueue.push({ object: current, match: currentMatch });
        }

        current = current.parent;
      }

      // We need localQueue, because the order or insertion will dictate the order of
      // listener execution.
      for (let i = localQueue.length - 1; i >= 0; i--) {
        const object = localQueue[i].object;
        const newMatch = localQueue[i].match;
        const currentMatch = hovers.get(object);
        hovers.set(localQueue[i].object, this.mergeMatch(newMatch, currentMatch));
      }
    }

    for (const [object, match] of hovers) {
      const storedMatch = this.enterLeaveState.hovers.get(object);

      if (
        !storedMatch ||
        (!storedMatch.inSight && match.inSight) ||
        (!storedMatch.inSightWithInvisible && match.inSightWithInvisible) ||
        (!storedMatch.visible && match.visible)
      ) {
        match.visibilityChange = !!storedMatch && storedMatch.visible !== match.visible;
        match.sightChange = !!storedMatch && storedMatch.inSight !== match.inSight;
        match.sightWithInvisibleChange =
          !!storedMatch && storedMatch.inSightWithInvisible !== match.inSightWithInvisible;
        match.hoverChange = !storedMatch;

        enterEventQueue.push({ object, match });
      } else if (
        storedMatch &&
        ((storedMatch.inSight && !match.inSight) ||
          (storedMatch.inSightWithInvisible && !match.inSightWithInvisible) ||
          (storedMatch.visible && !match.visible))
      ) {
        match.visibilityChange = storedMatch.visible !== match.visible;
        match.sightChange = storedMatch.inSight !== match.inSight;
        match.sightWithInvisibleChange =
          storedMatch.inSightWithInvisible !== match.inSightWithInvisible;
        match.hoverChange = false;

        leaveEventQueue.push({ object, match });
      }
    }

    const diff = new Map<THREE.Object3D, MatchParams>();
    for (const [key, value] of this.enterLeaveState.hovers) {
      if (!hovers.has(key)) {
        diff.set(key, value);
      }
    }

    for (const [object, match] of diff) {
      leaveEventQueue.push({
        object: object,
        match: {
          inSight: false,
          inSightWithInvisible: false,
          visible: match.visible,
          visibilityChange: false,
          sightChange: match.inSight,
          sightWithInvisibleChange: match.inSightWithInvisible,
          hoverChange: true,
        },
      });
    }

    this.enterLeaveState.hovers = hovers;

    if (leaveEventQueue.length > 0) {
      const leaveEvent = this.createTbEvent('pointerleave', this.lastPointerEvent!);
      const stopPropagationRef: StopPropagationRef = { value: false };
      leaveEvent.stopPropagation = () => {
        stopPropagationRef.value = true;
      };
      for (const event of leaveEventQueue.toReversed()) {
        this.handleSingleEvent(leaveEvent, event.object, event.object, event.match);

        if (stopPropagationRef.value) break;
      }
    }

    if (enterEventQueue.length > 0) {
      const enterEvent = this.createTbEvent('pointerenter', this.lastPointerEvent!);
      const stopPropagationRef: StopPropagationRef = { value: false };
      enterEvent.stopPropagation = () => {
        stopPropagationRef.value = true;
      };
      for (const event of enterEventQueue) {
        this.handleSingleEvent(enterEvent, event.object, event.object, event.match);

        if (stopPropagationRef.value) break;
      }
    }
  }

  private updatePointerOverOutEvents(): void {
    const outEventQueue: { object: THREE.Object3D; match: MatchParams }[] = [];
    const overEventQueue: { object: THREE.Object3D; match: MatchParams }[] = [];

    const hovers = new Map<THREE.Object3D, MatchParams>();
    for (const target of this.targetObjects) {
      let match: MatchParams | null = null;

      let current: THREE.Object3D | null = target;
      while (current !== null) {
        if (this.overOutState.objects.has(current)) {
          match = this.captureMatchParams(target);
          break;
        }

        current = current.parent;
      }

      if (match) {
        hovers.set(target, match);
      }
    }

    for (const [object, match] of hovers) {
      const storedMatch = this.overOutState.hovers.get(object);

      if (
        !storedMatch ||
        (!storedMatch.inSight && match.inSight) ||
        (!storedMatch.inSightWithInvisible && match.inSightWithInvisible) ||
        (!storedMatch.visible && match.visible)
      ) {
        match.visibilityChange = !!storedMatch && storedMatch.visible !== match.visible;
        match.sightChange = !!storedMatch && storedMatch.inSight !== match.inSight;
        match.sightWithInvisibleChange =
          !!storedMatch && storedMatch.inSightWithInvisible !== match.inSightWithInvisible;
        match.hoverChange = !storedMatch;

        overEventQueue.push({ object, match });
      } else if (
        storedMatch &&
        ((storedMatch.inSight && !match.inSight) ||
          (storedMatch.inSightWithInvisible && !match.inSightWithInvisible) ||
          (storedMatch.visible && !match.visible))
      ) {
        match.visibilityChange = storedMatch.visible !== match.visible;
        match.sightChange = storedMatch.inSight !== match.inSight;
        match.sightWithInvisibleChange =
          storedMatch.inSightWithInvisible !== match.inSightWithInvisible;
        match.hoverChange = false;

        outEventQueue.push({ object, match });
      }
    }

    const diff = new Map<THREE.Object3D, MatchParams>();
    for (const [key, value] of this.overOutState.hovers) {
      if (!hovers.has(key)) {
        diff.set(key, value);
      }
    }

    for (const [object, match] of diff) {
      outEventQueue.push({
        object: object,
        match: {
          inSight: false,
          inSightWithInvisible: false,
          visible: match.visible,
          visibilityChange: false,
          sightChange: match.inSight,
          sightWithInvisibleChange: match.inSightWithInvisible,
          hoverChange: true,
        },
      });
    }

    this.overOutState.hovers = hovers;

    if (outEventQueue.length > 0) {
      const leaveEvent = this.createTbEvent('pointerout', this.lastPointerEvent!);
      const stopPropagationRef: StopPropagationRef = { value: false };
      leaveEvent.stopPropagation = () => {
        stopPropagationRef.value = true;
      };

      for (const event of outEventQueue.toReversed()) {
        this.handleBubblingEvent(leaveEvent, event.object, stopPropagationRef, event.match);

        if (stopPropagationRef.value) break;
      }
    }

    if (overEventQueue.length > 0) {
      const enterEvent = this.createTbEvent('pointerover', this.lastPointerEvent!);
      const stopPropagationRef: StopPropagationRef = { value: false };
      enterEvent.stopPropagation = () => {
        stopPropagationRef.value = true;
      };

      for (const event of overEventQueue) {
        this.handleBubblingEvent(enterEvent, event.object, stopPropagationRef, event.match);

        if (stopPropagationRef.value) break;
      }
    }
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

  private createTbEvent<E extends Event>(type: TbEventType, nativeEvent: E): TbEvent<E> {
    return {
      type,
      nativeEvent,
      intersections: this.targetIntersections,
      ray: this.raycaster.ray,
      camera: this.camera,
    } as TbEvent<E>;
  }

  private handleBaseEvent<E extends Event>(ev: E): void {
    const threeEvent = this.createTbEvent(ev.type as TbEventType, ev);
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

  private handleEvent(event: TbEvent): void {
    const editableEvent = event as Writable<TbEvent>;
    const stopPropagationRef = { value: false };
    editableEvent.stopPropagation = () => {
      stopPropagationRef.value = true;
    };

    this.handleGlobalEvents(editableEvent, Event.CAPTURING_PHASE);

    if (event.nativeEvent instanceof PointerEvent) {
      editableEvent.eventPhase = Event.AT_TARGET;
      const captureObject = this.pointerCaptures.get(event.nativeEvent.pointerId);
      if (captureObject) {
        const match: MatchParams = {
          visible: true, // If a pointer is captured, visibility and occlusion states are ignored.
          inSight: true,
          inSightWithInvisible: true,
        };
        if (event.nativeEvent.type === 'pointerup' || event.nativeEvent.type === 'pointercancel') {
          this.pointerCaptures.delete(event.nativeEvent.pointerId);
          this.handleBubblingEvent(event, captureObject, stopPropagationRef, match);
        } else {
          this.handleSingleEvent(editableEvent, captureObject, captureObject, match);
        }
        return;
      }
    }

    for (const target of this.targetObjects) {
      const match = this.captureMatchParams(target);
      match.hoverChange = true;
      this.handleBubblingEvent(event, target, stopPropagationRef, match);

      if (stopPropagationRef.value) break;
    }

    this.handleGlobalEvents(editableEvent, Event.BUBBLING_PHASE);
  }

  private handleGlobalEvents(event: Writable<TbEvent<Event, 'global'>>, phase: number): void {
    event.target = this.targetObjects.values().next().value;
    event.currentTarget = event.target;
    event.eventPhase = phase;

    const captureEvent = phase === Event.CAPTURING_PHASE;
    const listenerEntries = this.globalListeners.filter((l) => {
      const captureOption =
        typeof l.options === 'boolean' ? l.options : (l.options?.capture ?? false);
      return l.type === event.type && captureEvent === captureOption;
    });

    for (const listenerEntry of listenerEntries) {
      listenerEntry.listener(event);
    }
  }

  private handleBubblingEvent(
    event: Writable<TbEvent>,
    target: THREE.Object3D,
    stopPropagationRef: StopPropagationRef,
    match: MatchParams,
  ): void {
    const targetParents = this.getParents(target);

    // Capturing phase
    event.eventPhase = Event.CAPTURING_PHASE;
    for (let i = targetParents.length - 1; i >= 0; i--) {
      const currentTarget = targetParents[i];
      this.handleSingleEvent(event, target, currentTarget, match);

      if (stopPropagationRef.value) return;
    }

    // Target phase
    event.eventPhase = Event.AT_TARGET;
    this.handleSingleEvent(event, target, target, match);

    if (stopPropagationRef.value) return;

    // Bubbling phase
    event.eventPhase = Event.BUBBLING_PHASE;
    for (let i = 0; i < targetParents.length; i++) {
      const currentTarget = targetParents[i];
      this.handleSingleEvent(event, target, currentTarget, match);

      if (stopPropagationRef.value) return;
    }
  }

  private handleSingleEvent(
    event: Writable<TbEvent>,
    target: THREE.Object3D,
    currentTarget: THREE.Object3D,
    match: MatchParams,
  ): void {
    let stopImmediatePropagation = false;
    event.stopImmediatePropagation = () => {
      stopImmediatePropagation = true;
      event.stopPropagation();
    };

    const eventState = this.eventMap.get(currentTarget);

    if (!eventState) return;

    const captureEvent = event.eventPhase === Event.CAPTURING_PHASE;

    const listenerEntries = eventState.listenerEntries.filter((l) => {
      const captureOption =
        typeof l.options === 'boolean' ? l.options : (l.options?.capture ?? false);
      const ignoreOcclusion = !!(l.options as TbAddEventListenerOptions)?.ignoreOcclusion;
      const includeInvisible = !!(l.options as TbAddEventListenerOptions)?.includeInvisible;
      const inSight = includeInvisible ? match.inSightWithInvisible : match.inSight;
      const sightChange = includeInvisible ? !!match.sightWithInvisibleChange : !!match.sightChange;
      const visible = match.visible;
      const visibilityChange = !!match.visibilityChange;
      const leaveOrOutEvent = event.type === 'pointerleave' || event.type === 'pointerout';
      const cancelEvent = event.type === 'pointercancel';

      const occlusionCheck =
        (!ignoreOcclusion &&
          (cancelEvent || (!leaveOrOutEvent && inSight) || (leaveOrOutEvent && sightChange))) ||
        (ignoreOcclusion && match.hoverChange);

      const visibilityCheck =
        (!includeInvisible && (visible || cancelEvent || (leaveOrOutEvent && visibilityChange))) ||
        (includeInvisible && !visibilityChange);

      return (
        l.type === event.type &&
        (event.eventPhase === Event.AT_TARGET || captureEvent === captureOption) &&
        occlusionCheck &&
        visibilityCheck
      );
    });

    for (const listenerEntry of listenerEntries) {
      event.target = target;
      event.currentTarget = currentTarget;
      listenerEntry.listener(event);

      if (stopImmediatePropagation) {
        break;
      }

      if ((listenerEntry.options as TbAddEventListenerOptions)?.once) {
        this.removeEventListener(
          currentTarget,
          listenerEntry.type,
          listenerEntry.listener,
          listenerEntry.options,
        );
      }
    }
  }

  private captureMatchParams(object: THREE.Object3D): MatchParams {
    const match: MatchParams = {
      visible: true,
      inSight: false,
      inSightWithInvisible: false,
    };

    let current: THREE.Object3D | null = object;
    while (current) {
      if (!current.visible) {
        match.visible = false;
        break;
      }
      current = current.parent;
    }

    match.inSightWithInvisible = this.targetIntersections[0]?.object === object;
    const firstVisible = this.targetIntersections.findIndex(
      (intersection) => intersection.object.visible,
    );
    match.inSight = firstVisible > -1 && object === this.targetIntersections[firstVisible].object;

    return match;
  }

  private mergeMatch(newMatch: MatchParams, currentMatch: MatchParams | undefined): MatchParams {
    return {
      visible: newMatch.visible === false ? false : (currentMatch?.visible ?? newMatch.visible),
      inSight: newMatch.inSight || !!currentMatch?.inSight,
      inSightWithInvisible: newMatch.inSightWithInvisible || !!currentMatch?.inSightWithInvisible,
    };
  }

  private updateEventObjects() {
    const eventObjects: THREE.Object3D[] = [];
    for (const object of this.eventMap.keys()) {
      let current = object;
      while (current.parent) {
        current = current.parent;
      }
      eventObjects.push(current);
    }
    this.eventObjects = eventObjects;

    const enterLeaveRelatedObjects = this.eventMap
      .entries()
      .filter(([_, eventState]) =>
        eventState.listenerEntries.some(
          (l) => l.type === 'pointerenter' || l.type === 'pointerleave',
        ),
      )
      .map(([object, _]) => object)
      .toArray();

    this.enterLeaveState.objects = new Set(this.orderByHierarchy(enterLeaveRelatedObjects));

    const overOutRelatedObjects = this.eventMap
      .entries()
      .filter(([_, eventState]) =>
        eventState.listenerEntries.some((l) => l.type === 'pointerover' || l.type === 'pointerout'),
      )
      .map(([object, _]) => object)
      .toArray();

    this.overOutState.objects = new Set(this.orderByHierarchy(overOutRelatedObjects));
  }

  /**
   * Orders an array of 3D objects based on their hierarchy, ensuring parents
   * appear before their children. The ordering is stable - if two objects are
   * not in a parent-child relationship, their relative order is preserved.
   *
   * @param objects Array of objects to order.
   * @returns New array with objects ordered by hierarchy.
   */
  private orderByHierarchy(objects: THREE.Object3D[]): THREE.Object3D[] {
    // Create a set for O(1) lookup
    const objectSet = new Set(objects);

    // Count ancestors in the input array for each object
    const countAncestors = (obj: THREE.Object3D): number => {
      let count = 0;
      let current = obj.parent;
      while (current) {
        if (objectSet.has(current)) {
          count++;
        }
        current = current.parent;
      }
      return count;
    };

    // Create array with original indices for stable sorting
    const indexed = objects.map((obj, index) => ({
      obj,
      index,
      ancestorCount: countAncestors(obj),
    }));

    // Stable sort: first by ancestor count, then by original index
    indexed.sort((a, b) => {
      if (a.ancestorCount !== b.ancestorCount) {
        return a.ancestorCount - b.ancestorCount;
      }
      return a.index - b.index;
    });

    return indexed.map((item) => item.obj);
  }
}

import { Vector2 } from 'three';

import { ActivePointer } from '../../common/active-pointer';
import { ControlInput } from '../../common/control-input';
import { TouchGesture } from '../../common/touch-gesture';
import { calculatePointerCoords } from '../../utils/calculate-pointer-coords';

type MouseEventListener = (ev: MouseEvent) => void;

type PointerEventListener = (ev: PointerEvent) => void;

export interface PointerHandlerOptions {
  inputMappings: { [key: string]: ControlInput[] };
}

export type ActiveControlChangeListener = (
  activeControls: Set<string>,
  activePointers: ActivePointer[],
) => void;

export type InputChangeListener = (activePointers: ActivePointer[]) => void;

export class PointerHandler {
  private previousTouchAction = 'auto';

  private domElement: HTMLElement = null!;

  private options: PointerHandlerOptions;

  private handlers: {
    pointerdown: PointerEventListener;
    pointerup: PointerEventListener;
    pointermove: PointerEventListener;
    pointercancel: PointerEventListener;
    contextmenu: MouseEventListener;
  };

  private activePointers = new Array<ActivePointer>();

  private activeControls = new Set<string>();

  private onActiveControlChange: ActiveControlChangeListener;
  private onInputChange: InputChangeListener;

  constructor(
    options: PointerHandlerOptions,
    activeControlChangeListener: ActiveControlChangeListener,
    handleControlListener: InputChangeListener,
  ) {
    this.options = options;

    this.handlers = {
      pointerdown: this.handlePointerDown.bind(this),
      pointerup: this.handlePointerUp.bind(this),
      pointermove: this.handlePointerMove.bind(this),
      pointercancel: this.handlePointerUp.bind(this),
      contextmenu: this.handleContextMenu.bind(this),
    };
    this.onActiveControlChange = activeControlChangeListener;
    this.onInputChange = handleControlListener;
  }

  updateOptions(options: PointerHandlerOptions) {
    this.options = options;
  }

  attach(domElement: HTMLElement) {
    this.domElement = domElement;
    this.previousTouchAction = domElement.style.touchAction;
    domElement.style.touchAction = 'none';
    domElement.addEventListener('pointerdown', this.handlers.pointerdown);
  }

  detach(restoreTouchAction = true) {
    if (!this.domElement) return;

    this.domElement.removeEventListener('pointerdown', this.handlers.pointerdown);
    this.domElement.removeEventListener('pointerup', this.handlers.pointerup);
    this.domElement.removeEventListener('pointercancel', this.handlers.pointerup);
    this.domElement.removeEventListener('pointermove', this.handlers.pointermove);

    if (restoreTouchAction) {
      this.domElement.style.touchAction = this.previousTouchAction;
    }
  }

  private handlePointerDown(event: PointerEvent) {
    this.domElement.setPointerCapture(event.pointerId);

    const coords = calculatePointerCoords(event, this.domElement);
    this.activePointers.push({
      id: event.pointerId,
      coords: coords,
      startCoords: coords.clone(),
      delta: new Vector2(),
      type: event.pointerType === 'touch' ? 'touch' : 'pointer',
    });

    if (this.activePointers.length == 1) {
      this.domElement.addEventListener('pointerup', this.handlers.pointerup);
      this.domElement.addEventListener('pointercancel', this.handlers.pointerup);
      this.domElement.addEventListener('pointermove', this.handlers.pointermove);
      window.addEventListener('contextmenu', this.handlers.contextmenu);
    }

    this.updateActiveControls(event);
  }

  private handlePointerMove(event: PointerEvent) {
    this.updateActiveControls(event);

    if (this.activeControls.size > 0) {
      const pointer = this.activePointers.find((p) => p.id == event.pointerId)!;
      const newCoords = calculatePointerCoords(event, this.domElement);
      pointer.delta = newCoords.clone().sub(pointer.coords);
      pointer.coords.copy(newCoords);
      this.onInputChange(this.activePointers);
    }
  }

  private handlePointerUp(event: PointerEvent) {
    this.domElement.releasePointerCapture(event.pointerId);
    this.activePointers = this.activePointers.filter((p) => p.id != event.pointerId);

    if (this.activePointers.length == 0) {
      this.domElement.removeEventListener('pointerup', this.handlers.pointerup);
      this.domElement.removeEventListener('pointermove', this.handlers.pointermove);
    }

    this.updateActiveControls(event);
  }

  private handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    if (this.activePointers.length == 0) {
      window.removeEventListener('contextmenu', this.handlers.contextmenu);
    }
  }

  private isInputActive(event: PointerEvent, input: ControlInput) {
    // prettier-ignore
    return (
      (
        event.pointerType != 'touch' &&
        (event.buttons & (input.mouseButton ?? 0)) != 0 &&
        ((!!input.modifiers?.ctrl && event.ctrlKey) || (!input.modifiers?.ctrl && !event.ctrlKey)) &&
        ((!!input.modifiers?.shift && event.shiftKey) || (!input.modifiers?.shift && !event.shiftKey)) &&
        ((!!input.modifiers?.alt && event.altKey) || (!input.modifiers?.alt && !event.altKey)) &&
        ((!!input.modifiers?.meta && event.metaKey) || (!input.modifiers?.meta && !event.metaKey))
      ) || (
        event.pointerType == 'touch' && (
          (this.activePointers.length == 1 && input.touchGesture == TouchGesture.One) ||
          (this.activePointers.length == 2 && input.touchGesture == TouchGesture.Two)
        )
      )
    );
  }

  private updateActiveControls(event: PointerEvent) {
    let activeControlsChanged = false;
    for (const controlId in this.options.inputMappings) {
      const inputMapping = this.options.inputMappings[controlId];
      const inputActive = inputMapping.some((i) => this.isInputActive(event, i));

      if (inputActive) {
        if (!this.activeControls.has(controlId)) {
          this.activeControls.add(controlId);
          activeControlsChanged = true;
        }
      } else {
        if (this.activeControls.delete(controlId)) {
          activeControlsChanged = true;
        }
      }
    }

    if (activeControlsChanged) {
      for (const pointer of this.activePointers) {
        pointer.startCoords = pointer.coords.clone();
      }
      this.onActiveControlChange(this.activeControls, this.activePointers);
    }
  }
}

import { Vector2 } from 'three';
import { ActivePointer } from '../../common/active-pointer';
import { calculatePointerCoords } from '../../utils/calculate-pointer-coords';

export type WheelEventListener = (ev: WheelEvent) => void;

export type WheelHandlerListener = (delta: number, activePointer: ActivePointer) => void;

const zoomLogScaleFactorA = 1;

const zoomLogScaleFactorB = 40;

export class WheelHandler {
  private domElement: HTMLElement = null!;

  private handler: WheelEventListener;

  private onChange: WheelHandlerListener;

  constructor(onChange: WheelHandlerListener) {
    this.handler = this.handleWheel.bind(this);
    this.onChange = onChange;
  }

  attach(domElement: HTMLElement) {
    this.domElement = domElement;
    domElement.addEventListener('wheel', this.handler, true);
  }

  detach() {
    if (!this.domElement) return;

    this.domElement.removeEventListener('wheel', this.handler, true);
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault();
    const absDelta = Math.abs(event.deltaY);
    const scaledDelta = Math.log(1 + zoomLogScaleFactorA * absDelta) / zoomLogScaleFactorB;
    const wheelDelta = Math.sign(event.deltaY) * scaledDelta;
    const coords = calculatePointerCoords(event, this.domElement);
    const activePointer: ActivePointer = {
      coords: coords,
      startCoords: coords.clone(),
      delta: new Vector2(),
      type: 'pointer',
    };
    this.onChange(wheelDelta, activePointer);
  }
}

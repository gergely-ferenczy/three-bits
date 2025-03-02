import { Vector2 } from 'three';
import { ActivePointer } from '../../common/active-pointer';
import { calculatePointerCoords } from '../../utils/calculate-pointer-coords';

export type WheelEventListener = (ev: WheelEvent) => void;

export interface WheelHandlerOptions {
  inverse?: boolean;
}

export type WheelHandlerListener = (delta: number, activePointer: ActivePointer) => void;

const ZoomLogScaleFactorA = 1;

const ZoomLogScaleFactorB = 40;

const DefaultWheelHandlerOptions: WheelHandlerOptions = {
  inverse: false,
};

export class WheelHandler {
  private domElement: HTMLElement = null!;

  private options: WheelHandlerOptions;

  private handler: WheelEventListener;

  private onChange: WheelHandlerListener;

  constructor(options: WheelHandlerOptions, onChange: WheelHandlerListener) {
    this.options = { ...DefaultWheelHandlerOptions, ...options };
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

  updateOptions(options: WheelHandlerOptions) {
    this.options = options;
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault();
    const absDelta = Math.abs(event.deltaY);
    const scaledDelta = Math.log(1 + ZoomLogScaleFactorA * absDelta) / ZoomLogScaleFactorB;
    const wheelDelta = Math.sign(event.deltaY) * scaledDelta;
    const coords = calculatePointerCoords(event, this.domElement);
    const activePointer: ActivePointer = {
      coords: coords,
      startCoords: coords.clone(),
      delta: new Vector2(),
    };
    this.onChange(this.options.inverse ? wheelDelta : -wheelDelta, activePointer);
  }
}

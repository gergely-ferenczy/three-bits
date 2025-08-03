import * as THREE from 'three';

import { BaseControl, BaseControlOptions } from './base-control';
import { PartialBaseRotationControlOptions } from './base-rotation-control-options';
import { ActivePointer } from '../common/active-pointer';
import { ControllableCamera } from '../common/controllable-camera';
import { MouseButton } from '../common/mouse-button';
import { TouchGesture } from '../common/touch-gesture';
import { ControlFragment } from '../control-fagments/control-fragment';
import { FixedUpRotationFragment } from '../control-fagments/fixed-up-rotation-fragment';
import { TruckFragment } from '../control-fagments/truck-fragment';
import { ZoomDollyFragment } from '../control-fagments/zoom-dolly-fragment';

const DefaultInputMappings = {
  rotate: [
    {
      mouseButton: MouseButton.Primary,
      touchGesture: TouchGesture.One,
    },
  ],
  truck: [
    {
      mouseButton: MouseButton.Secondary,
      touchGesture: TouchGesture.Two,
    },
    {
      mouseButton: MouseButton.Primary,
      touchGesture: TouchGesture.Two,
      modifiers: {
        ctrl: true,
      },
    },
  ],
  zoomOrDolly: [
    {
      mouseButton: MouseButton.Auxiliary,
      touchGesture: TouchGesture.Two,
    },
    {
      mouseButton: MouseButton.Primary,
      touchGesture: TouchGesture.Two,
      modifiers: {
        shift: true,
      },
    },
  ],
};

export class BaseRotationControl extends BaseControl {
  private rotationFragment: FixedUpRotationFragment;
  private truckFragment: TruckFragment;
  private zoomDollyFragment: ZoomDollyFragment;

  constructor(
    camera: ControllableCamera,
    orbit: boolean,
    options?: PartialBaseRotationControlOptions,
  ) {
    const target = new THREE.Vector3();
    const controlFragmentMap = new Map<string, ControlFragment>();
    const inputMappings = { ...DefaultInputMappings, ...options?.inputMappings };
    const baseControlOptions: BaseControlOptions = {
      pointerHandlerOptions: {
        inputMappings,
      },
      wheelHandlerOptions: {
        inverse: options?.inverseWheel,
      },
    };
    super(camera, target, controlFragmentMap, baseControlOptions);

    this.rotationFragment = new FixedUpRotationFragment(camera, target, orbit, options?.rotation);
    controlFragmentMap.set('rotate', this.rotationFragment);

    this.truckFragment = new TruckFragment(camera, target, options?.truck);
    controlFragmentMap.set('truck', this.truckFragment);

    this.zoomDollyFragment = new ZoomDollyFragment(camera, target, options?.zoomOrDolly);
    controlFragmentMap.set('zoomOrDolly', this.zoomDollyFragment);
  }

  updateOptions(options: PartialBaseRotationControlOptions) {
    const baseControlOptions: Partial<BaseControlOptions> = {
      ...(options.inputMappings
        ? {
            pointerHandlerOptions: {
              inputMappings: options.inputMappings,
            },
          }
        : {}),
      wheelHandlerOptions: {
        inverse: options?.inverseWheel,
      },
    };
    super.updateHandlerOptions(baseControlOptions);

    if (options.rotation) {
      this.rotationFragment.updateOptions(options.rotation);
    }
    if (options.truck) {
      this.truckFragment.updateOptions(options.truck);
    }
    if (options.zoomOrDolly) {
      this.zoomDollyFragment.updateOptions(options.zoomOrDolly);
    }
  }

  override attach(domElement: HTMLElement) {
    super.attach(domElement);

    this.updateStartValues();

    const dummyPointers: ActivePointer[] = [
      {
        id: NaN,
        coords: new THREE.Vector2(),
        startCoords: new THREE.Vector2(),
        delta: new THREE.Vector2(),
      },
    ];

    this.rotationFragment.updateStartValues(dummyPointers);
    this.rotationFragment.handleRotationAction(0, 0, this.camera, this.target);

    this.zoomDollyFragment.updateStartValues(dummyPointers);
    this.zoomDollyFragment.zoomOrDolly(0, this.camera, this.target);

    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
  }

  getHorizontalAngle() {
    return this.rotationFragment.getHorizontalAngle();
  }

  setHorizontalAngle(angle: number) {
    this.rotationFragment.setHorizontalAngle(angle);
    this.dispatchAtomicEvent();
  }

  getVerticalAngle() {
    return this.rotationFragment.getVerticalAngle();
  }

  setVerticalAngle(angle: number) {
    this.rotationFragment.setVerticalAngle(angle);
    this.dispatchAtomicEvent();
  }
}

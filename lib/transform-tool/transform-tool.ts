import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { MouseButtonValues, ThreeBitUtils } from '..';
import { ThreeEvent } from '../event-dispatcher/three-event';
import { ThreeEventDispatcher } from '../event-dispatcher/three-event-dispatcher';
import { ThreeEventListener } from '../event-dispatcher/three-event-listener';

const TransformToolName = 'TransformTool';
const DefaultScale = 150;
const DefaultArrowDir = new THREE.Vector3(1, 0, 0);
const DefaultArrowFaceDir = new THREE.Vector3(0, 1, 0);
const MinCameraAngle = THREE.MathUtils.degToRad(8);
const RenderOrders = {
  outer: 0,
  inner: 1,
  hitbox: 2,
};

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();

export interface TransformToolOptions {
  /** Fill color of all elements. Default is `#ffffff`. */
  color?: THREE.ColorRepresentation;

  /** Outline color of all elements. Default is `#202020`. */
  outlineColor?: THREE.ColorRepresentation;

  /** Fill color of an element with active hover state. Default is `#40e0d0`. */
  highlightColor?: THREE.ColorRepresentation;

  /** Inner width of all elements. Default is `1.5`. */
  lineWidth?: number;

  /** Outline width of all elements. Default is `1`. */
  outlineLineWidth?: number;

  /** Relative scale. Default is `1`. */
  scale?: number;

  /**
   * All elements are rendered with materials whose `depthTest` property is set
   * to `true`. With `baseRenderOrder` you can set the `renderOrder` of all
   * internally used materials to a value that is above the `renderOrder` of
   * other objects you want the TransformTool to appear on top of. The tool will
   * use renderOrder values for its internal materials in the range of
   * `[baseRenderOrder, baseRenderOrder + 2]`. Default is `0`.
   */
  baseRenderOrder?: number;

  /** An object you want to the tool to attach to. Default is `undefined`. */
  target?: THREE.Object3D;

  /**
   * When set to false, the tool will not update its (or the target's) position
   * or rotation, only call the `onPositionChange` and `onRotationChange`
   * callbacks. Default is `true`.
   * */
  autoUpdate?: boolean;

  /**
   * The maximum distance a single translation action is allowed to move the
   * tool or its target. A translation action is considered to be a single
   * continuous pointer action. Default is `undefined`.
   */
  maxDistance?: number;

  /**
   * Disable translation actions fully or partially. When a translation action
   * is disabled, the corresponding visual elements are not visible. Default is
   * `false`.
   */
  disableTranslation?: boolean | { x: boolean; y: boolean; z: boolean };

  /**
   * Disable rotation actions fully or partially. When a rotation action is
   * disabled, the corresponding visual elements are not visible. Default is
   * `false`.
   */
  disableRotation?: boolean | { x: boolean; y: boolean; z: boolean };

  /** Called on every position change of the tool or its target. */
  onPositionChange?: (startPosition: THREE.Vector3, positionDelta: THREE.Vector3) => void;

  /** Called on every rotation change of the tool or its target. */
  onRotationChange?: (
    startPosition: THREE.Vector3,
    startRotation: THREE.Quaternion,
    rotationDelta: THREE.Quaternion,
    offset: THREE.Vector3,
  ) => void;

  /** Called when the tool's appearance, position or rotation has changed. */
  onRequestRender: () => void;
}

type OptionalOptions =
  | 'target'
  | 'maxDistance'
  | 'autoUpdate'
  | 'disableTranslation'
  | 'disableRotation'
  | 'onPositionChange'
  | 'onRotationChange';

type TransformToolOptionsInternal = Required<Omit<TransformToolOptions, OptionalOptions>> &
  Pick<TransformToolOptions, OptionalOptions>;

const DefaultOptions: TransformToolOptionsInternal = {
  color: '#ffffff',
  outlineColor: '#202020',
  highlightColor: '#40e0d0',
  lineWidth: 1.5,
  outlineLineWidth: 1,
  scale: 1,
  baseRenderOrder: 0,
  autoUpdate: true,
  onRequestRender: undefined!,
};

/**
 * A visual 3D transformation tool that provides interactive controls for
 * translating and rotating objects. The tool displays arrows for translation
 * along axes, arc handles for rotation around axes,
 *
 * and planar controls for translation within planes. It automatically adjusts
 * its visual scale based on camera distance and hides elements that would be
 * hard to interact with from the current view angle.
 *
 * @example
 * ```typescript
 * const eventDispatcher = new ThreeEventDispatcher(scene, camera, renderer.domElement);
 * const transformTool = new TransformTool(eventDispatcher, {
 *   onRequestRender: () => renderer.render(scene, camera),
 *   target: myObject3D
 * });
 * transformTool.attach(myObject3D);
 * ```
 */
export class TransformTool {
  /**
   * Layers configuration for the transform tool.
   *
   * This is a proxy around a THREE.Layers instance that automatically propagates
   * layer changes to all 3D elements of the tool. You can use this to control
   * which cameras render the tool by setting or toggling layer membership.
   */
  layers: THREE.Layers;

  private root: THREE.Group;
  private eventDispatcher: ThreeEventDispatcher;
  private options: TransformToolOptionsInternal;
  private parts: {
    xTranslateArrow: THREE.Object3D | null;
    yTranslateArrow: THREE.Object3D | null;
    zTranslateArrow: THREE.Object3D | null;

    xRotateArrow: THREE.Object3D | null;
    yRotateArrow: THREE.Object3D | null;
    zRotateArrow: THREE.Object3D | null;

    xySidePlane: THREE.Object3D | null;
    xzSidePlane: THREE.Object3D | null;
    yzSidePlane: THREE.Object3D | null;
  };

  private inverseMatrixWorld: THREE.Matrix4;
  private pointerActionsDisabled: boolean;
  private globalPointerDownHandler: ThreeEventListener<PointerEvent>;
  private globalPointerUpHandler: ThreeEventListener<PointerEvent>;

  private innerMaterial: LineMaterial;
  private outerMaterial: LineMaterial;
  private highlightMaterial: LineMaterial;
  private hitboxLineMaterial: LineMaterial;
  private hitboxPlaneMaterial: THREE.MeshBasicMaterial;
  private hiddenLineMaterial: LineMaterial;
  private hiddenPlaneMaterial: THREE.MeshBasicMaterial;

  /**
   * Creates a new TransformTool instance.
   *
   * @param eventDispatcher - A {@link ThreeEventDispatcher} instance that handles 3D pointer events
   * @param options - Configuration options for the transform tool
   */
  constructor(eventDispatcher: ThreeEventDispatcher, options: TransformToolOptions) {
    const root = new THREE.Group();
    root.name = TransformToolName;
    this.eventDispatcher = eventDispatcher;
    this.options = { ...DefaultOptions, ...options };

    this.inverseMatrixWorld = root.matrixWorld.clone().invert();
    this.pointerActionsDisabled = false;
    this.globalPointerDownHandler = () => {
      this.pointerActionsDisabled = true;
    };
    this.globalPointerUpHandler = () => {
      this.pointerActionsDisabled = false;
    };
    this.eventDispatcher.addGlobalEventListener('pointerdown', this.globalPointerDownHandler);
    this.eventDispatcher.addGlobalEventListener('pointerup', this.globalPointerUpHandler);

    this.innerMaterial = new LineMaterial({
      color: this.options.color,
      linewidth: this.options.lineWidth,
      depthTest: false,
    });
    this.outerMaterial = new LineMaterial({
      color: this.options.outlineColor,
      linewidth: this.options.lineWidth + this.options.outlineLineWidth * 2,
      depthTest: false,
    });
    this.highlightMaterial = new LineMaterial({
      color: this.options.highlightColor,
      linewidth: this.options.lineWidth,
      depthTest: false,
    });
    this.hitboxLineMaterial = new LineMaterial({
      linewidth: 18 * this.options.scale + this.options.lineWidth,
      side: THREE.DoubleSide,
      depthTest: false,
      colorWrite: false,
    });
    this.hitboxPlaneMaterial = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      depthTest: false,
      colorWrite: false,
    });
    this.hiddenLineMaterial = new LineMaterial({
      depthTest: false,
      colorWrite: false,
    });
    this.hiddenPlaneMaterial = new THREE.MeshBasicMaterial({
      depthTest: false,
      colorWrite: false,
    });

    const origin = this.createOrigin();
    root.add(origin);

    this.parts = {
      xTranslateArrow: null,
      yTranslateArrow: null,
      zTranslateArrow: null,
      xRotateArrow: null,
      yRotateArrow: null,
      zRotateArrow: null,
      xySidePlane: null,
      xzSidePlane: null,
      yzSidePlane: null,
    };

    if (
      !this.options.disableTranslation ||
      (typeof this.options.disableTranslation !== 'boolean' && !this.options.disableTranslation.x)
    ) {
      this.parts.xTranslateArrow = this.createTranslateArrow('x', new THREE.Vector3(1, 0, 0));
      root.add(this.parts.xTranslateArrow);
    }
    if (
      !this.options.disableTranslation ||
      (typeof this.options.disableTranslation !== 'boolean' && !this.options.disableTranslation.y)
    ) {
      this.parts.xTranslateArrow = this.createTranslateArrow('y', new THREE.Vector3(0, 1, 0));
      root.add(this.parts.xTranslateArrow);
    }
    if (
      !this.options.disableTranslation ||
      (typeof this.options.disableTranslation !== 'boolean' && !this.options.disableTranslation.z)
    ) {
      this.parts.xTranslateArrow = this.createTranslateArrow('z', new THREE.Vector3(0, 0, 1));
      root.add(this.parts.xTranslateArrow);
    }

    if (
      !this.options.disableTranslation ||
      (typeof this.options.disableTranslation !== 'boolean' &&
        !this.options.disableTranslation.x &&
        !this.options.disableTranslation.y)
    ) {
      this.parts.xySidePlane = this.createSidePlane(new THREE.Vector3(0, 0, 1));
      root.add(this.parts.xySidePlane);
    }
    if (
      !this.options.disableTranslation ||
      (typeof this.options.disableTranslation !== 'boolean' &&
        !this.options.disableTranslation.x &&
        !this.options.disableTranslation.z)
    ) {
      this.parts.xzSidePlane = this.createSidePlane(new THREE.Vector3(0, 1, 0));
      root.add(this.parts.xzSidePlane);
    }
    if (
      !this.options.disableTranslation ||
      (typeof this.options.disableTranslation !== 'boolean' &&
        !this.options.disableTranslation.y &&
        !this.options.disableTranslation.z)
    ) {
      this.parts.yzSidePlane = this.createSidePlane(new THREE.Vector3(1, 0, 0));
      root.add(this.parts.yzSidePlane);
    }

    if (
      !this.options.disableRotation ||
      (typeof this.options.disableRotation !== 'boolean' && !this.options.disableRotation.x)
    ) {
      this.parts.xRotateArrow = this.createRotateArrow('x', new THREE.Vector3(1, 0, 0));
      root.add(this.parts.xRotateArrow);
    }
    if (
      !this.options.disableRotation ||
      (typeof this.options.disableRotation !== 'boolean' && !this.options.disableRotation.y)
    ) {
      this.parts.yRotateArrow = this.createRotateArrow('y', new THREE.Vector3(0, -1, 0));
      root.add(this.parts.yRotateArrow);
    }
    if (
      !this.options.disableRotation ||
      (typeof this.options.disableRotation !== 'boolean' && !this.options.disableRotation.z)
    ) {
      this.parts.zRotateArrow = this.createRotateArrow('z', new THREE.Vector3(0, 0, -1));
      root.add(this.parts.zRotateArrow);
    }

    const originalUpdateMatrixWorld = root.updateMatrixWorld.bind(root);
    root.updateMatrixWorld = (force?: boolean) => {
      originalUpdateMatrixWorld(force);
      this.inverseMatrixWorld.copy(root.matrixWorld).invert();
    };

    this.root = root;

    this.layers = new Proxy(new THREE.Layers(), {
      get(target, propertyKey, receiver) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const value = Reflect.get(target, propertyKey, receiver);

        if (typeof value === 'function' && propertyKey !== 'test') {
          return (...args: unknown[]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const result = Reflect.apply(value, target, args);

            root.traverse((child) => {
              const childLayers = child.layers;
              // @ts-expect-error
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const childLayersFn = childLayers[propertyKey];
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              Reflect.apply(childLayersFn, childLayers, args);
            });

            return result;
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return value;
      },
    });
  }

  /**
   * Attaches the transform tool to a 3D object.
   *
   * This adds the tool's visual representation as a child of the specified object.
   * The tool will follow the object's transformations.
   *
   * @param object - The {@link THREE.Object3D} to attach the tool to
   */
  attach(object: THREE.Object3D) {
    object.add(this.root);
  }

  /**
   * Detaches the transform tool from its current parent.
   *
   * This removes the tool's visual representation from the scene graph.
   * The tool can be reattached later using the `attach` method.
   */
  detach() {
    this.root.removeFromParent();
  }

  /**
   * Disposes of the transform tool and cleans up all resources.
   *
   * This method:
   * - Detaches the tool from its parent
   * - Removes all event listeners
   * - Disposes of all materials and geometries
   *
   * After calling this method, the tool instance cannot be used anymore.
   */
  dispose() {
    this.detach();
    this.eventDispatcher.removeGlobalEventListener('pointerdown', this.globalPointerDownHandler);
    this.eventDispatcher.removeGlobalEventListener('pointerup', this.globalPointerUpHandler);
    this.innerMaterial.dispose();
    this.outerMaterial.dispose();
    this.highlightMaterial.dispose();
    this.hitboxLineMaterial.dispose();
    this.hitboxPlaneMaterial.dispose();
    this.hiddenLineMaterial.dispose();
    this.hiddenPlaneMaterial.dispose();
    this.root.traverse((object) => {
      this.eventDispatcher.removeAllEventListeners(object);
      if (object.name == 'hitbox') {
        const hitbox = object as THREE.Mesh;
        hitbox.geometry.dispose();
      }
    });
  }

  /**
   * Gets the root {@link THREE.Object3D} that represents the transform tool.
   *
   * This object contains all the visual elements of the tool and can be added
   * to a scene or another object to make the tool visible.
   *
   * @returns The root {@link THREE.Object3D} of the transform tool
   */
  get transformObject(): THREE.Object3D {
    return this.root;
  }

  private calculateObjectScale(
    height: number,
    baseScale: number,
    camera: THREE.Camera,
    object: THREE.Object3D,
  ): number {
    const scale = baseScale / (height / DefaultScale);
    if (camera instanceof THREE.OrthographicCamera) {
      return scale / camera.zoom;
    } else if (camera instanceof THREE.PerspectiveCamera) {
      const distance = camera.position.distanceTo(object.position);
      return ((scale / camera.zoom) * distance) / 2;
    }
    return scale;
  }

  private createOrigin() {
    const circleSegments = 16;
    const circleSegmentAngle = (Math.PI * 2) / circleSegments;
    const circleRadius = 0.08;

    const originGroup = new THREE.Group();
    originGroup.name = `${TransformToolName}-Origin`;

    const positions = new Float32Array((circleSegments + 1) * 3);
    for (let i = 0; i < circleSegments + 1; i++) {
      const angle = circleSegmentAngle * i;
      positions[i * 3] = circleRadius * Math.cos(angle);
      positions[i * 3 + 1] = circleRadius * Math.sin(angle);
      positions[i * 3 + 2] = 0;
    }
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions(positions);

    const objectDir = new THREE.Vector3(0, 0, 1);
    const outerObject = new Line2(lineGeometry, this.outerMaterial);
    outerObject.name = 'outer-line';
    outerObject.renderOrder = this.options.baseRenderOrder + RenderOrders.outer;
    originGroup.add(outerObject);

    const innerObject = new Line2(lineGeometry, this.innerMaterial);
    innerObject.name = 'inner-line';
    innerObject.renderOrder = this.options.baseRenderOrder + RenderOrders.inner;
    originGroup.add(innerObject);

    const originalBeforeRender = outerObject.onBeforeRender.bind(outerObject);
    // @ts-expect-error onBeforeRender is definition is wrong in LineSegments2
    outerObject.onBeforeRender = (
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      camera: THREE.Camera,
    ) => {
      originalBeforeRender(renderer);
      const height = renderer.domElement.clientHeight;
      const scale = this.calculateObjectScale(height, this.options.scale, camera, originGroup);
      originGroup.scale.setScalar(scale);

      const viewDir = this.getViewDirection(camera, originGroup, _v1);
      const inverseWorldRotation = _q1.setFromRotationMatrix(this.inverseMatrixWorld);
      originGroup.quaternion
        .setFromUnitVectors(objectDir, viewDir)
        .premultiply(inverseWorldRotation);
      originGroup.updateMatrixWorld();
    };

    return originGroup;
  }

  private createTranslateArrow(dir: 'x' | 'y' | 'z', axis: THREE.Vector3) {
    const ass = 0.1; // arrow shaft start
    const ase = 0.72; // arrow shaft end
    const ahw = 0.16; // arrow head width
    const ahh = 0.26; // arrow head height

    // prettier-ignore
    const positions = [
      ass,      0, 0,  ase,         0, 0,
      ase, -ahw/2, 0,  ase,     ahw/2, 0,
      ase, -ahw/2, 0,  ase+ahh,     0, 0,
      ase,  ahw/2, 0,  ase+ahh,     0, 0
    ];

    const arrowGroup = new THREE.Group();
    arrowGroup.name = `${TransformToolName}-TranslateArrow-${dir}`;

    const lineSegmentsGeometry = new LineSegmentsGeometry();
    lineSegmentsGeometry.setPositions(positions);

    const outerLine = new LineSegments2(lineSegmentsGeometry, this.outerMaterial);
    outerLine.name = 'outer-line';
    outerLine.renderOrder = this.options.baseRenderOrder + RenderOrders.outer;
    arrowGroup.add(outerLine);

    const innerLine = new LineSegments2(lineSegmentsGeometry, this.innerMaterial);
    innerLine.name = 'inner-line';
    innerLine.renderOrder = this.options.baseRenderOrder + RenderOrders.inner;
    arrowGroup.add(innerLine);

    const hitboxGeometry = new LineSegmentsGeometry();
    hitboxGeometry.setPositions([0.2, 0, 0, 0.9, 0, 0]);
    const hitbox = new LineSegments2(hitboxGeometry, this.hitboxLineMaterial);
    hitbox.renderOrder = this.options.baseRenderOrder + RenderOrders.hitbox;
    hitbox.name = 'hitbox';
    this.eventDispatcher.addEventListener(
      hitbox,
      'pointerover',
      this.createHitboxPointerOverHandler(innerLine),
    );
    this.eventDispatcher.addEventListener(
      hitbox,
      'pointerout',
      this.createHitboxPointerOutHandler(innerLine),
    );
    arrowGroup.add(hitbox);

    const baseRotation = new THREE.Quaternion().setFromUnitVectors(DefaultArrowDir, axis);
    const faceDir = DefaultArrowFaceDir.clone().applyQuaternion(baseRotation);

    const originalBeforeRender = outerLine.onBeforeRender.bind(outerLine);
    // @ts-expect-error onBeforeRender is definition is wrong in LineSegments2
    outerLine.onBeforeRender = (
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      camera: THREE.Camera,
    ) => {
      originalBeforeRender(renderer);

      const worldRotation = _q1.setFromRotationMatrix(this.root.matrixWorld);
      const inverseWorldRotation = _q2.copy(worldRotation).invert();
      const rotatedAxis = _v1.copy(axis).applyQuaternion(worldRotation);
      const viewDir = this.getViewDirection(camera, arrowGroup, _v2);
      const viewAngle = rotatedAxis.angleTo(viewDir);
      const hide =
        (viewAngle > -MinCameraAngle && viewAngle < MinCameraAngle) ||
        (viewAngle > Math.PI - MinCameraAngle && viewAngle < Math.PI + MinCameraAngle);
      this.updateVisibility(outerLine, innerLine, hitbox, hide);

      if (!hide) {
        const height = renderer.domElement.clientHeight;
        const scale = this.calculateObjectScale(height, this.options.scale, camera, arrowGroup);
        arrowGroup.scale.setScalar(scale);

        const normal = _v3
          .copy(rotatedAxis)
          .cross(viewDir)
          .applyQuaternion(inverseWorldRotation)
          .normalize();

        const towardsCameraRotation = new THREE.Quaternion().setFromUnitVectors(faceDir, normal);
        arrowGroup.quaternion.copy(baseRotation).premultiply(towardsCameraRotation);
        arrowGroup.updateMatrixWorld();
      }
    };

    const objectStartPos = new THREE.Vector3();
    const intersectionStartPos = new THREE.Vector3();
    const startPlane = new THREE.Plane();
    const startAxis = new THREE.Vector3();
    const pointerMoveHandler = (event: ThreeEvent<PointerEvent>) => {
      const intersection = event.ray.intersectPlane(startPlane, new THREE.Vector3());
      if (!intersection) return;

      const delta = intersection.sub(intersectionStartPos).projectOnVector(startAxis);
      this.applyPositionChange(objectStartPos, delta);
    };
    const pointerUpHandler = this.createPointerUpHandler(hitbox, innerLine, pointerMoveHandler);
    const pointerDownHandler = this.createPointerDownHandler(
      hitbox,
      innerLine,
      pointerUpHandler,
      pointerMoveHandler,
      (event) => {
        const intersection = event.intersections.find((i) => i.object === hitbox)!;
        const target = this.getTarget();
        objectStartPos.copy(target.position);
        intersectionStartPos.copy(intersection.point);

        const cameraDir = event.camera.position.clone().sub(outerLine.position).normalize();
        const worldRotation = new THREE.Quaternion().setFromRotationMatrix(this.root.matrixWorld);
        startAxis.copy(axis).applyQuaternion(worldRotation);
        const startNormal = _v1.copy(startAxis).cross(cameraDir).cross(startAxis).normalize();
        startPlane.setFromNormalAndCoplanarPoint(startNormal, intersectionStartPos);
      },
    );
    this.eventDispatcher.addEventListener(hitbox, 'pointerdown', pointerDownHandler);

    return arrowGroup;
  }

  private createRotateArrow(dir: 'x' | 'y' | 'z', axis: THREE.Vector3) {
    const asa = THREE.MathUtils.degToRad(15); // arrow shaft angle
    const asr = 1; // arrow shaft radius
    const ass = 6; // arrow shaft segments
    const ahw = 0.12; // arrow head width
    const ahh = 0.18; // arrow head height

    // prettier-ignore
    const arrowHeadPositions = [
      0, 0, -ahw/2,  0,   0, ahw/2,
      0, 0, -ahw/2,  0, ahh,     0,
      0, 0,  ahw/2,  0, ahh,     0,
    ];
    const positions: number[] = [];

    const translateZ1 = new THREE.Matrix4().makeTranslation(0, 0, asr);
    const rotateX1 = new THREE.Matrix4().makeRotationX(-(Math.PI / 4 + asa / 2));
    const transform1 = new THREE.Matrix4().multiply(rotateX1).multiply(translateZ1);
    const positionCount = arrowHeadPositions.length / 3;
    for (let i = 0; i < positionCount; i++) {
      const v = new THREE.Vector3().fromArray(arrowHeadPositions, i * 3).applyMatrix4(transform1);
      positions.push(v.x, v.y, v.z);
    }

    const rotateX21 = new THREE.Matrix4().makeRotationX(Math.PI);
    const translateZ2 = new THREE.Matrix4().makeTranslation(0, 0, asr);
    const rotateX22 = new THREE.Matrix4().makeRotationX(-(Math.PI / 4 - asa / 2));
    const transform2 = new THREE.Matrix4()
      .multiply(rotateX22)
      .multiply(translateZ2)
      .multiply(rotateX21);
    for (let i = 0; i < positionCount; i++) {
      const v = new THREE.Vector3().fromArray(arrowHeadPositions, i * 3).applyMatrix4(transform2);
      positions.push(v.x, v.y, v.z);
    }

    const shaftStart = new THREE.Vector3(0, 0, asr).applyAxisAngle(
      DefaultArrowDir,
      -(Math.PI / 4 + asa / 2),
    );
    for (let i = 0; i < ass; i++) {
      const shaftEnd = shaftStart.clone().applyAxisAngle(DefaultArrowDir, asa / ass);
      positions.push(shaftStart.x, shaftStart.y, shaftStart.z);
      positions.push(shaftEnd.x, shaftEnd.y, shaftEnd.z);
      shaftStart.applyAxisAngle(DefaultArrowDir, asa / ass);
    }

    const hitboxPositions: number[] = [];
    const hitboxAngle = asa + Math.asin(ahh / asr) * 2;
    const hitboxPos = new THREE.Vector3(0, 0, asr).applyAxisAngle(
      DefaultArrowDir,
      -(Math.PI / 4 + hitboxAngle / 2),
    );
    for (let i = 0; i < ass + 1; i++) {
      hitboxPositions.push(hitboxPos.x, hitboxPos.y, hitboxPos.z);
      hitboxPos.applyAxisAngle(DefaultArrowDir, hitboxAngle / ass);
    }

    const arrowGroup = new THREE.Group();
    arrowGroup.name = `${TransformToolName}-RotateArrow-${dir}`;
    arrowGroup.quaternion.setFromUnitVectors(DefaultArrowDir, axis);

    const lineSegmentsGeometry = new LineSegmentsGeometry();
    lineSegmentsGeometry.setPositions(positions);

    const outerLine = new LineSegments2(lineSegmentsGeometry, this.outerMaterial);
    outerLine.name = 'outer-line';
    outerLine.renderOrder = this.options.baseRenderOrder + RenderOrders.outer;
    arrowGroup.add(outerLine);

    const innerLine = new LineSegments2(lineSegmentsGeometry, this.innerMaterial);
    innerLine.name = 'inner-line';
    innerLine.renderOrder = this.options.baseRenderOrder + RenderOrders.inner;
    arrowGroup.add(innerLine);

    const hitboxGeometry = new LineGeometry();
    hitboxGeometry.setPositions(hitboxPositions);
    const hitbox = new Line2(hitboxGeometry, this.hitboxLineMaterial);
    hitbox.renderOrder = this.options.baseRenderOrder + RenderOrders.hitbox;
    hitbox.name = 'hitbox';
    this.eventDispatcher.addEventListener(
      hitbox,
      'pointerover',
      this.createHitboxPointerOverHandler(innerLine),
    );
    this.eventDispatcher.addEventListener(
      hitbox,
      'pointerout',
      this.createHitboxPointerOutHandler(innerLine),
    );
    arrowGroup.add(hitbox);

    const originalBeforeRender = outerLine.onBeforeRender.bind(outerLine);
    // @ts-expect-error onBeforeRender is definition is wrong in LineSegments2
    outerLine.onBeforeRender = (
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      camera: THREE.Camera,
    ) => {
      originalBeforeRender(renderer);
      const worldRotation = _q1.setFromRotationMatrix(this.root.matrixWorld);
      const rotatedAxis = _v1.copy(axis).applyQuaternion(worldRotation).normalize();
      const viewDir = this.getViewDirection(camera, arrowGroup, _v2);
      const viewAngle = rotatedAxis.angleTo(viewDir);
      const hide =
        viewAngle > Math.PI / 2 - MinCameraAngle && viewAngle < Math.PI / 2 + MinCameraAngle;
      this.updateVisibility(outerLine, innerLine, hitbox, hide);

      if (!hide) {
        const height = renderer.domElement.clientHeight;
        const scale = this.calculateObjectScale(height, this.options.scale, camera, arrowGroup);
        arrowGroup.scale.setScalar(scale);
        arrowGroup.updateMatrixWorld();
      }
    };

    const startPosition = new THREE.Vector3();
    const startRotation = new THREE.Quaternion();
    const startNormal = new THREE.Vector3();
    const startOrigin = new THREE.Vector3();
    const startOffset = new THREE.Vector3();
    const startPlane = new THREE.Plane();
    const intersectionStartPos = new THREE.Vector3();
    const pointerMoveHandler = (event: ThreeEvent<PointerEvent>) => {
      const intersection = event.ray.intersectPlane(startPlane, new THREE.Vector3());
      if (!intersection) return;

      intersection.sub(startOrigin);
      const dot = intersectionStartPos.dot(intersection);
      const triple = startNormal.dot(intersectionStartPos.clone().cross(intersection));
      const angle = Math.atan2(triple, dot);

      const rotationDelta = new THREE.Quaternion().setFromAxisAngle(startNormal, angle);
      this.applyRotationChange(startPosition, startRotation, rotationDelta, startOffset);
    };
    const pointerUpHandler = this.createPointerUpHandler(hitbox, innerLine, pointerMoveHandler);
    const pointerDownHandler = this.createPointerDownHandler(
      hitbox,
      innerLine,
      pointerUpHandler,
      pointerMoveHandler,
      (event) => {
        const intersection = event.intersections.find((i) => i.object === hitbox)!;
        this.root.getWorldPosition(startOrigin);
        intersectionStartPos.copy(intersection.point).sub(startOrigin);
        const target = this.getTarget();
        startPosition.copy(target.position);
        startRotation.copy(target.quaternion);
        startNormal.copy(axis).applyQuaternion(target.quaternion);
        startPlane.setFromNormalAndCoplanarPoint(startNormal, intersection.point);
        startOffset.copy(target.getWorldPosition(_v1).sub(startOrigin));
      },
    );
    this.eventDispatcher.addEventListener(hitbox, 'pointerdown', pointerDownHandler);

    return arrowGroup;
  }

  private createSidePlane(normal: THREE.Vector3): THREE.Object3D {
    const s = 0.175;

    // prettier-ignore
    const positions = [
      -s, -s, 0,   -s,  s, 0,
       s,  s, 0,    s, -s, 0,
      -s, -s, 0,
    ];
    const offset = 0.2;

    const sidePlaneGroup = new THREE.Group();
    sidePlaneGroup.name = `${TransformToolName}-SidePlane`;
    sidePlaneGroup.quaternion.setFromUnitVectors(normal, new THREE.Vector3(0, 0, 1));
    sidePlaneGroup.position
      .set(s + offset, s + offset, 0)
      .applyQuaternion(sidePlaneGroup.quaternion);

    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions(positions);

    const outerLine = new Line2(lineGeometry, this.outerMaterial);
    outerLine.name = 'outer-line';
    outerLine.renderOrder = this.options.baseRenderOrder + RenderOrders.outer;
    sidePlaneGroup.add(outerLine);

    const innerLine = new Line2(lineGeometry, this.innerMaterial);
    innerLine.name = 'inner-line';
    innerLine.renderOrder = this.options.baseRenderOrder + RenderOrders.inner;
    sidePlaneGroup.add(innerLine);

    const hitboxGeometry = new THREE.BufferGeometry();
    const highlightSize = this.options.lineWidth + this.options.outlineLineWidth * 2;
    const hs = s + highlightSize / this.options.scale / DefaultScale;
    // prettier-ignore
    hitboxGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -hs, -hs, 0,   -hs,  hs, 0,    hs,  hs, 0,
      -hs, -hs, 0,    hs,  hs, 0,    hs, -hs, 0
    ]), 3));

    const hitbox = new THREE.Mesh(hitboxGeometry, this.hitboxPlaneMaterial);
    hitbox.name = 'hitbox';
    hitbox.renderOrder = this.options.baseRenderOrder + RenderOrders.hitbox;
    this.eventDispatcher.addEventListener(
      hitbox,
      'pointerover',
      this.createHitboxPointerOverHandler(innerLine),
    );
    this.eventDispatcher.addEventListener(
      hitbox,
      'pointerout',
      this.createHitboxPointerOutHandler(innerLine),
    );
    sidePlaneGroup.add(hitbox);

    const startPosition = sidePlaneGroup.position.clone();
    const originalBeforeRender = outerLine.onBeforeRender.bind(outerLine);
    // @ts-expect-error onBeforeRender is definition is wrong in LineSegments2
    outerLine.onBeforeRender = (
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      camera: THREE.Camera,
    ) => {
      originalBeforeRender(renderer);
      const worldRotation = _q1.setFromRotationMatrix(this.root.matrixWorld);
      const rotatedNormal = _v1.copy(normal).applyQuaternion(worldRotation);
      const viewDir = this.getViewDirection(camera, sidePlaneGroup, _v2);
      const viewAngle = rotatedNormal.angleTo(viewDir);
      const hide =
        viewAngle > Math.PI / 2 - MinCameraAngle && viewAngle < Math.PI / 2 + MinCameraAngle;
      this.updateVisibility(outerLine, innerLine, hitbox, hide);

      if (!hide) {
        const height = renderer.domElement.clientHeight;
        const scale = this.calculateObjectScale(height, this.options.scale, camera, sidePlaneGroup);
        sidePlaneGroup.scale.setScalar(scale);
        sidePlaneGroup.position.copy(startPosition).multiplyScalar(scale);
        sidePlaneGroup.updateMatrixWorld();
      }
    };

    const objectStartPos = new THREE.Vector3();
    const intersectionStartPos = new THREE.Vector3();
    const startPlane = new THREE.Plane();
    const pointerMoveHandler = (event: ThreeEvent<PointerEvent>) => {
      const intersection = ThreeBitUtils.calculatePointerTarget(
        event.camera,
        startPlane,
        event.ray,
        this.options.maxDistance,
      );
      if (!intersection) return;

      const delta = intersection.sub(intersectionStartPos);
      this.applyPositionChange(objectStartPos, delta);
    };
    const pointerUpHandler = this.createPointerUpHandler(hitbox, innerLine, pointerMoveHandler);
    const pointerDownHandler = this.createPointerDownHandler(
      hitbox,
      innerLine,
      pointerUpHandler,
      pointerMoveHandler,
      (event) => {
        const intersection = event.intersections.find((i) => i.object === hitbox)!;
        const target = this.getTarget();
        objectStartPos.copy(target.position);
        intersectionStartPos.copy(intersection.point);
        const worldRotation = _q1.setFromRotationMatrix(this.root.matrixWorld);
        const rotatedNormal = _v1.copy(normal).applyQuaternion(worldRotation);
        startPlane.setFromNormalAndCoplanarPoint(rotatedNormal, intersectionStartPos);
      },
    );

    this.eventDispatcher.addEventListener(hitbox, 'pointerdown', pointerDownHandler);

    return sidePlaneGroup;
  }

  private createPointerDownHandler(
    hitbox: THREE.Object3D,
    innerLine: THREE.Mesh,
    pointerUpHandler: (event: ThreeEvent<PointerEvent>) => void,
    pointerMoveHandler: (event: ThreeEvent<PointerEvent>) => void,
    onPointerDown: (event: ThreeEvent<PointerEvent>) => void,
  ) {
    const pointerDownHandler = (event: ThreeEvent<PointerEvent>) => {
      if (
        event.nativeEvent.pointerType === 'mouse' &&
        (event.nativeEvent.buttons & MouseButtonValues.Primary) === 0
      ) {
        return;
      }

      this.pointerActionsDisabled = true;
      // Stops other 3D events from firing that could "steal" the pointer capture
      event.stopPropagation();
      // Stops other canvas DOM event listeners (like an orbit control)
      event.nativeEvent.stopImmediatePropagation();

      this.eventDispatcher.addEventListener(hitbox, 'pointerup', pointerUpHandler);
      this.eventDispatcher.addEventListener(hitbox, 'pointermove', pointerMoveHandler);
      this.eventDispatcher.setPointerCapture(hitbox, event.nativeEvent.pointerId);
      onPointerDown(event);

      if (event.target.visible) {
        innerLine.material = this.highlightMaterial;
        this.options.onRequestRender?.();
      }
    };

    return pointerDownHandler;
  }

  private createPointerUpHandler(
    hitbox: THREE.Object3D,
    innerLine: THREE.Mesh,
    pointerMoveHandler: (event: ThreeEvent<PointerEvent>) => void,
  ) {
    const pointerUpHandler = (event: ThreeEvent<PointerEvent>) => {
      this.pointerActionsDisabled = false;
      this.eventDispatcher.removeEventListener(hitbox, 'pointerup', pointerUpHandler);
      this.eventDispatcher.removeEventListener(hitbox, 'pointermove', pointerMoveHandler);
      this.eventDispatcher.releasePointerCapture(hitbox, event.nativeEvent.pointerId);

      if (event.target.visible) {
        innerLine.material = this.innerMaterial;
        this.options.onRequestRender?.();
      }
    };

    return pointerUpHandler;
  }

  private createHitboxPointerOverHandler(innerLine: THREE.Mesh) {
    return (event: ThreeEvent<PointerEvent>) => {
      if (
        this.pointerActionsDisabled ||
        (event.nativeEvent.pointerType === 'mouse' &&
          (event.nativeEvent.buttons & MouseButtonValues.Primary) !== 0)
      ) {
        return;
      }

      if (event.target.visible) {
        innerLine.material = this.highlightMaterial;
        this.options.onRequestRender?.();
      }
    };
  }

  private createHitboxPointerOutHandler(innerLine: THREE.Mesh) {
    return (event: ThreeEvent<PointerEvent>) => {
      if (
        this.pointerActionsDisabled ||
        (event.nativeEvent.pointerType === 'mouse' &&
          (event.nativeEvent.buttons & MouseButtonValues.Primary) !== 0)
      ) {
        return;
      }
      if (event.target.visible) {
        innerLine.material = this.innerMaterial;
        this.options.onRequestRender?.();
      }
    };
  }

  private getViewDirection(camera: THREE.Camera, object: THREE.Object3D, result: THREE.Vector3) {
    if (camera instanceof THREE.PerspectiveCamera) {
      return object.getWorldPosition(result).sub(camera.position).negate().normalize();
    } else {
      return camera.getWorldDirection(result);
    }
  }

  private getTarget() {
    return this.options.target ?? this.root;
  }

  private applyRotationChange(
    startPosition: THREE.Vector3,
    startRotation: THREE.Quaternion,
    rotationDelta: THREE.Quaternion,
    offset: THREE.Vector3,
  ) {
    if (this.options.autoUpdate) {
      const target = this.getTarget();
      target.position.set(0, 0, 0);
      target.quaternion.copy(startRotation);
      const transform = _m1.makeTranslation(offset);
      _m2.makeRotationFromQuaternion(rotationDelta);
      transform.premultiply(_m2);
      _m2.makeTranslation(offset.clone().negate().add(startPosition));
      transform.premultiply(_m2);
      target.applyMatrix4(transform);
      this.options.onRequestRender?.();
    }
    this.options.onRotationChange?.(startPosition, startRotation, rotationDelta, offset);
  }

  private applyPositionChange(startPosition: THREE.Vector3, positionDelta: THREE.Vector3) {
    if (this.options.autoUpdate) {
      const target = this.getTarget();
      target.position.copy(startPosition).add(positionDelta);
      this.options.onRequestRender?.();
    }
    this.options.onPositionChange?.(startPosition, positionDelta);
  }

  private updateVisibility(
    outerLine: THREE.Mesh,
    innerLine: THREE.Mesh,
    hitbox: THREE.Mesh,
    hide: boolean,
  ) {
    if (hide && hitbox.visible) {
      outerLine.material = this.hiddenLineMaterial;
      innerLine.material = this.hiddenLineMaterial;
      hitbox.visible = false;
    } else if (!hide && !hitbox.visible) {
      outerLine.material = this.outerMaterial;
      innerLine.material = this.innerMaterial;
      hitbox.visible = true;
    }
  }
}

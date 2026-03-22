/**
 * An object that specifies characteristics about the event listener. Mimics
 * parts of {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#options AddEventListenerOptions}.
 */
export interface TbAddEventListenerOptions {
  /**
   * The event will be fired even if the target object is occluded by other
   * objects.
   *
   * @default false
   */
  ignoreOcclusion?: boolean;

  /**
   * The event will be fired even if the target object's visibility is set to
   * false.
   *
   * @default false
   */
  includeInvisible?: boolean;

  /**
   * A `boolean` value indicating that events of this type will be dispatched to
   * the registered listener before being dispatched to any EventTarget beneath
   * it in the DOM tree.
   *
   * @default false
   */
  capture?: boolean;

  /**
   * A `boolean` value indicating that the listener should be invoked at most
   * once after being added. If `true`, the listener would be automatically
   * removed when invoked.
   *
   * @default false
   */
  once?: boolean;

  /**
   * An {@link AbortSignal}. The listener will be removed when the `abort()`
   * method of the {@link AbortController} which owns the `AbortSignal` is
   * called. If not specified, no `AbortSignal` is associated with the listener.
   */
  signal?: AbortSignal;
}

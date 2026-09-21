/**
 * Listener for control lifecycle events.
 *
 * The `event` parameter is the native pointer or wheel event that triggered the
 * control event. It is `undefined` when the control event was caused by a
 * programmatic change.
 */
export type ControlEventListener = (event?: Event) => void;

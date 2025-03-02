import { ThreeEvent } from './three-event';

export type ThreeEventListener<E extends Event = Event> = (ev: ThreeEvent<E>) => void;

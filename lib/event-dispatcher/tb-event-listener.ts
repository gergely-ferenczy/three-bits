import { TbEvent } from './tb-event';

export type TbEventListener<E extends Event = Event, G extends 'object' | 'global' = 'object'> = (
  ev: TbEvent<E, G>,
) => void;

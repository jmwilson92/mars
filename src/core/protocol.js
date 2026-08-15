/** Worker ↔ main contract. Strings stay stable so a later command set can append. */

export const MSG = Object.freeze({
  INIT: 'INIT',
  SET_SPEED: 'SET_SPEED',
  SET_TICK_UNIT: 'SET_TICK_UNIT',
  SKIP_TO_EVENT: 'SKIP_TO_EVENT',
  COMMAND: 'COMMAND',
  REQUEST_SNAPSHOT: 'REQUEST_SNAPSHOT',
  SNAPSHOT: 'SNAPSHOT',
  ALERT: 'ALERT',
  PAUSED: 'PAUSED',
  SAVED: 'SAVED',
  READY: 'READY',
  ERROR: 'ERROR',
});

export const PAUSE_REASON = Object.freeze({
  USER: 'USER',
  RED_ALERT: 'RED_ALERT',
  EVENT: 'EVENT',
});

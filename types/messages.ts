export type Message =
  | { type: 'BANNER_REMOVED'; tabId?: number }
  | { type: 'GET_STATE'; tabId?: number }
  | { type: 'SET_ENABLED'; enabled: boolean }
  | { type: 'ENABLED_CHANGED'; enabled: boolean };

export interface StateResponse {
  enabled: boolean;
  removedForTab: boolean;
}

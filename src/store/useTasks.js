/**
 * React bindings for the App Tareas Store.
 *
 * Bridges the vanilla Store (created with `createStore`) into React via
 * `useSyncExternalStore`. The Store owns its state and pub-sub; this module
 * only re-renders components when a successful mutation notifies subscribers.
 */
import { useSyncExternalStore } from 'react';

/**
 * Returns the current tasks array (stable reference between mutations).
 * Re-renders the component on every successful store mutation. The returned
 * array must be treated as read-only; do not mutate.
 *
 * @param {object} store the value returned by `createStore()`.
 * @returns {Array} the raw tasks array from `store.getSnapshot()`.
 */
export function useTasks(store) {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}

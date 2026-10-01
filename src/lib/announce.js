/**
 * Announce helper shared by every component that needs to write to the
 * screen-reader live region (#app-announcer). The region is a static element
 * in `index.html`, outside the React tree.
 */

/**
 * Writes a message to the live region (#app-announcer) for screen readers.
 * No-op silently if the document or the region is not present (e.g. SSR
 * or test environment without the static HTML).
 *
 * @param {string} message
 */
export function announce(message) {
  if (typeof document === 'undefined') return;
  const region = document.getElementById('app-announcer');
  if (!region) return;
  region.textContent = message;
}

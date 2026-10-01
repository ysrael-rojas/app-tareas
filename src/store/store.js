// Modelo + persistencia (Store) de App Tareas.
// Capa canónica: la lógica de modelo y persistencia vive aquí, fuera
// de React. La app se suscribe vía useSyncExternalStore
// (src/store/useTasks.js) y la suite de unit tests verifica el
// comportamiento directamente.
// Tarea 3 de odd/tasks/react-vite-migration.md.
//
// Elección de exports: son públicos `config`, `createStore` y los helpers
// que la suite de unidad verifica en aislamiento (`normalizeTitle`,
// `normalizeDescription`, `isValidTaskShape`, `loadInitial`, `persist`).
// `makeId` y `nowIso` quedan privados: detalles de implementación sin
// contrato público.
//
// La Store expone pub-sub (`subscribe`/`getSnapshot`) para sincronizar React
// vía `useSyncExternalStore`. `getAll` sigue devolviendo copia defensiva;
// `getSnapshot` devuelve la referencia interna (solo lectura) para React.

/** Configuración inmutable de la Store. */
export const config = Object.freeze({
  appName: "App Tareas",
  storageKey: "app-tareas:v1",
  schemaVersion: 1,
  titleMinLength: 1,
  titleMaxLength: 200,
  descriptionMaxLength: 2000,
});

/** Genera un id único (crypto.randomUUID con fallback determinista). */
function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Fecha/hora actual en ISO 8601 (UTC). */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Valida y normaliza un título.
 * @param {*} raw
 * @returns {string} título recortado.
 * @throws {TypeError} si `raw` no es string.
 * @throws {RangeError} si queda fuera del rango permitido.
 */
export function normalizeTitle(raw) {
  if (typeof raw !== "string") throw new TypeError("title must be a string");
  const title = raw.trim();
  if (title.length < config.titleMinLength) {
    throw new RangeError(
      `title must be at least ${config.titleMinLength} character(s)`,
    );
  }
  if (title.length > config.titleMaxLength) {
    throw new RangeError(
      `title must be at most ${config.titleMaxLength} characters`,
    );
  }
  return title;
}

/**
 * Valida y normaliza una descripción (vacía si `raw` es null/undefined).
 * @param {*} raw
 * @returns {string} descripción recortada.
 * @throws {TypeError} si `raw` no es string.
 * @throws {RangeError} si excede el máximo permitido.
 */
export function normalizeDescription(raw) {
  if (raw === undefined || raw === null) return "";
  if (typeof raw !== "string") throw new TypeError("description must be a string");
  const description = raw.trim();
  if (description.length > config.descriptionMaxLength) {
    throw new RangeError(
      `description must be at most ${config.descriptionMaxLength} characters`,
    );
  }
  return description;
}

/**
 * Verifica (defensivamente) que `t` tiene el shape de tarea válido.
 * @param {*} t
 * @returns {boolean}
 */
export function isValidTaskShape(t) {
  return (
    t !== null &&
    typeof t === "object" &&
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.description === "string" &&
    typeof t.completed === "boolean" &&
    typeof t.createdAt === "string" &&
    typeof t.updatedAt === "string"
  );
}

/**
 * Carga el estado inicial desde `localStorage`, descartando datos inválidos.
 * @returns {Array} lista de tareas válidas ([] si no hay estado recuperable).
 */
export function loadInitial() {
  if (typeof localStorage === "undefined") return [];
  let raw;
  try {
    raw = localStorage.getItem(config.storageKey);
  } catch (err) {
    console.warn(`[${config.appName}] localStorage read failed:`, err);
    return [];
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    if (parsed.version !== config.schemaVersion) {
      console.warn(
        `[${config.appName}] storage version mismatch (got ${parsed.version}), resetting`,
      );
      return [];
    }
    if (!Array.isArray(parsed.tasks)) return [];
    return parsed.tasks.filter(isValidTaskShape);
  } catch (err) {
    console.warn(`[${config.appName}] storage parse failed, resetting:`, err);
    return [];
  }
}

/**
 * Persiste las tareas en `localStorage` bajo `config.storageKey`.
 * @param {Array} tasks
 * @throws {Error} si `localStorage` no está disponible.
 */
export function persist(tasks) {
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  const payload = JSON.stringify({ version: config.schemaVersion, tasks });
  localStorage.setItem(config.storageKey, payload);
}

/**
 * Crea una Store cerrada sobre su estado cargado una sola vez.
 * @returns {object} API { getAll, getById, add, update, toggle, remove,
 *   subscribe, getSnapshot }.
 */
export function createStore() {
  let tasks = loadInitial();

  const subscribers = new Set();

  /**
   * Registers a callback invoked after every successful mutation.
   * @param {Function} fn
   * @returns {Function} unsubscribe function that removes `fn`.
   */
  function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  /**
   * Returns the raw internal tasks array reference. The reference is stable
   * between mutations, so callers must treat it as read-only. Intended for
   * React `useSyncExternalStore`.
   * @returns {Array}
   */
  function getSnapshot() {
    return tasks;
  }

  function notify() {
    for (const fn of subscribers) fn();
  }

  /** @returns {Array} copia defensiva de las tareas. */
  function getAll() {
    return tasks.slice();
  }

  /** @param {string} id @returns {object|null} */
  function getById(id) {
    return tasks.find((t) => t.id === id) ?? null;
  }

  /**
   * @param {{ title: string, description?: string }} input
   * @returns {object} la tarea creada. Notifies subscribers on success.
   */
  function add({ title, description = "" }) {
    const normalizedTitle = normalizeTitle(title);
    const normalizedDescription = normalizeDescription(description);
    const now = nowIso();
    const task = {
      id: makeId(),
      title: normalizedTitle,
      description: normalizedDescription,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    tasks = [...tasks, task];
    persist(tasks);
    notify();
    return task;
  }

  /**
   * @param {string} id
   * @param {object} patch
   * @returns {object|null} la tarea actualizada, o null si no existe.
   *   Notifies subscribers on success.
   */
  function update(id, patch) {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const current = tasks[idx];
    const next = {
      id: current.id,
      title:
        patch.title !== undefined
          ? normalizeTitle(patch.title)
          : current.title,
      description:
        patch.description !== undefined
          ? normalizeDescription(patch.description)
          : current.description,
      completed:
        typeof patch.completed === "boolean"
          ? patch.completed
          : current.completed,
      createdAt: current.createdAt,
      updatedAt: nowIso(),
    };
    tasks = [...tasks.slice(0, idx), next, ...tasks.slice(idx + 1)];
    persist(tasks);
    notify();
    return next;
  }

  /**
   * Delegates to `update`, which notifies subscribers on success.
   * @param {string} id
   * @returns {object|null}
   */
  function toggle(id) {
    const current = getById(id);
    if (!current) return null;
    return update(id, { completed: !current.completed });
  }

  /**
   * @param {string} id
   * @returns {boolean} Notifies subscribers on success.
   */
  function remove(id) {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    tasks = [...tasks.slice(0, idx), ...tasks.slice(idx + 1)];
    persist(tasks);
    notify();
    return true;
  }

  return { getAll, getById, add, update, toggle, remove, subscribe, getSnapshot };
}

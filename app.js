// App Tareas — capa de aplicación
// Capa Store (modelo + persistencia sobre localStorage).
// Task 3 of odd/tasks/app-tareas-mvp.md.

const APP_NAMESPACE = "app-tareas";
const STORAGE_KEY = `${APP_NAMESPACE}:v1`;

export const config = Object.freeze({
  appName: "App Tareas",
  storageKey: STORAGE_KEY,
  schemaVersion: 1,
  titleMinLength: 1,
  titleMaxLength: 200,
  descriptionMaxLength: 2000,
});

/* ---------- Helpers internos ---------- */

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeTitle(raw) {
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

function normalizeDescription(raw) {
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

function isValidTaskShape(t) {
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

/* ---------- Persistencia ---------- */

function loadInitial() {
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

function persist(tasks) {
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  const payload = JSON.stringify({ version: config.schemaVersion, tasks });
  localStorage.setItem(config.storageKey, payload);
}

/* ---------- Store público ---------- */

export function createStore() {
  let tasks = loadInitial();

  function getAll() {
    // Copia defensiva: previene mutación externa del estado interno.
    return tasks.slice();
  }

  function getById(id) {
    return tasks.find((t) => t.id === id) ?? null;
  }

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
    return task;
  }

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
    return next;
  }

  function toggle(id) {
    const current = getById(id);
    if (!current) return null;
    return update(id, { completed: !current.completed });
  }

  function remove(id) {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    tasks = [...tasks.slice(0, idx), ...tasks.slice(idx + 1)];
    persist(tasks);
    return true;
  }

  return { getAll, getById, add, update, toggle, remove };
}

/* ---------- Bootstrap ---------- */

console.info(`[${config.appName}] store module loaded`);

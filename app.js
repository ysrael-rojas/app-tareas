// App Tareas — capa de aplicación
// Store (modelo + persistencia) y UI (render + form).
// Tasks 3-4 of odd/tasks/app-tareas-mvp.md.

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

/* =====================================================================
 *  Store: modelo + persistencia sobre localStorage
 * ===================================================================== */

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

export function createStore() {
  let tasks = loadInitial();

  function getAll() {
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

/* =====================================================================
 *  UI: render + form de creación + interacciones de mutación
 *  Usa textContent (no innerHTML) para todo el contenido user-provided,
 *  previniendo XSS. Tarea 5 cablea toggle, edición inline y eliminación
 *  con confirmación; tarea 6 añade filtros + contadores.
 * ===================================================================== */

const SELECTORS = Object.freeze({
  form: "#task-form",
  input: "#task-title",
  list: "#task-list",
  empty: "#empty-state",
});

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task";
  li.dataset.id = task.id;
  if (task.completed) li.classList.add("is-completed");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task__toggle";
  checkbox.checked = task.completed;
  checkbox.dataset.action = "toggle";
  checkbox.setAttribute(
    "aria-label",
    `Marcar "${task.title}" como ${task.completed ? "pendiente" : "completada"}`,
  );

  const content = document.createElement("div");
  content.className = "task__content";

  const title = document.createElement("p");
  title.className = "task__title";
  title.textContent = task.title;

  content.appendChild(title);

  if (task.description) {
    const desc = document.createElement("p");
    desc.className = "task__description";
    desc.textContent = task.description;
    content.appendChild(desc);
  }

  const actions = document.createElement("div");
  actions.className = "task__actions";
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "task__action";
  editBtn.dataset.action = "edit";
  editBtn.textContent = "Editar";
  editBtn.setAttribute("aria-label", `Editar "${task.title}"`);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "task__action task__action--danger";
  deleteBtn.dataset.action = "delete";
  deleteBtn.textContent = "Eliminar";
  deleteBtn.setAttribute("aria-label", `Eliminar "${task.title}"`);

  actions.append(editBtn, deleteBtn);

  li.append(checkbox, content, actions);
  return li;
}

function render(store) {
  const list = document.querySelector(SELECTORS.list);
  const empty = document.querySelector(SELECTORS.empty);
  if (!list || !empty) return;

  const tasks = store.getAll();
  // replaceChildren con un fragment construido: evita reflows por tarea.
  const frag = document.createDocumentFragment();
  for (const task of tasks) {
    frag.appendChild(createTaskElement(task));
  }
  list.replaceChildren(frag);
  empty.hidden = tasks.length > 0;
}

function setupForm(store) {
  const form = document.querySelector(SELECTORS.form);
  const input = document.querySelector(SELECTORS.input);
  if (!form || !input) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value;
    try {
      store.add({ title: value });
      input.value = "";
      input.removeAttribute("aria-invalid");
      render(store);
      input.focus();
    } catch (err) {
      input.setAttribute("aria-invalid", "true");
      console.warn(`[${config.appName}] add failed:`, err);
    }
  });

  // Limpia aria-invalid al empezar a escribir otra vez.
  input.addEventListener("input", () => {
    if (input.hasAttribute("aria-invalid")) {
      input.removeAttribute("aria-invalid");
    }
  });
}

/* ---------- Edición inline ---------- */

function createTaskEdit(task) {
  const li = document.createElement("li");
  li.className = "task task--editing";
  li.dataset.id = task.id;

  const form = document.createElement("form");
  form.className = "task-edit-form";
  form.noValidate = true;

  const titleId = `task-edit-title-${task.id}`;
  const descId = `task-edit-desc-${task.id}`;

  const titleLabel = document.createElement("label");
  titleLabel.className = "visually-hidden";
  titleLabel.htmlFor = titleId;
  titleLabel.textContent = "Título";

  const titleInput = document.createElement("input");
  titleInput.id = titleId;
  titleInput.name = "title";
  titleInput.type = "text";
  titleInput.className = "task-edit-form__input";
  titleInput.value = task.title;
  titleInput.maxLength = config.titleMaxLength;
  titleInput.required = true;
  titleInput.setAttribute("aria-invalid", "false");

  const descLabel = document.createElement("label");
  descLabel.className = "visually-hidden";
  descLabel.htmlFor = descId;
  descLabel.textContent = "Descripción (opcional)";

  const descInput = document.createElement("textarea");
  descInput.id = descId;
  descInput.name = "description";
  descInput.className = "task-edit-form__textarea";
  descInput.rows = 3;
  descInput.maxLength = config.descriptionMaxLength;
  descInput.placeholder = "Descripción (opcional)";
  descInput.value = task.description;

  const actions = document.createElement("div");
  actions.className = "task-edit-form__actions";

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.className = "task-edit-form__save";
  saveBtn.textContent = "Guardar";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "task-edit-form__cancel";
  cancelBtn.dataset.action = "cancel-edit";
  cancelBtn.textContent = "Cancelar";

  actions.append(saveBtn, cancelBtn);
  form.append(titleLabel, titleInput, descLabel, descInput, actions);
  li.append(form);

  return { li, form, titleInput, descInput };
}

function enterEditMode(li, task, store) {
  if (!task) return;
  const edit = createTaskEdit(task);
  li.replaceWith(edit.li);
  edit.titleInput.focus();
  edit.titleInput.select();
}

function handleSaveEdit(form, store) {
  const li = form.closest(".task");
  if (!li) return;
  const id = li.dataset.id;
  const titleInput = form.querySelector('input[name="title"]');
  const descInput = form.querySelector('textarea[name="description"]');
  if (!titleInput) return;
  try {
    store.update(id, {
      title: titleInput.value,
      description: descInput ? descInput.value : "",
    });
    render(store);
  } catch (err) {
    titleInput.setAttribute("aria-invalid", "true");
    console.warn(`[${config.appName}] update failed:`, err);
  }
}

function handleDelete(id, store) {
  const task = store.getById(id);
  if (!task) return;
  const ok = window.confirm(`¿Eliminar la tarea "${task.title}"?`);
  if (!ok) return;
  store.remove(id);
  render(store);
}

/* ---------- Eventos delegados sobre la lista ---------- */

function setupTaskEvents(store) {
  const list = document.querySelector(SELECTORS.list);
  if (!list) return;

  list.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !list.contains(target)) return;
    const action = target.dataset.action;
    const li = target.closest(".task");
    if (!li) return;
    const id = li.dataset.id;
    if (action === "edit") {
      enterEditMode(li, store.getById(id), store);
    } else if (action === "delete") {
      handleDelete(id, store);
    } else if (action === "cancel-edit") {
      render(store);
    }
  });

  list.addEventListener("change", (event) => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) ||
      target.type !== "checkbox" ||
      target.dataset.action !== "toggle"
    ) {
      return;
    }
    const li = target.closest(".task");
    if (!li) return;
    const id = li.dataset.id;
    const updated = store.toggle(id);
    if (!updated) {
      render(store);
      return;
    }
    li.classList.toggle("is-completed", updated.completed);
    target.checked = updated.completed;
    target.setAttribute(
      "aria-label",
      `Marcar "${updated.title}" como ${updated.completed ? "pendiente" : "completada"}`,
    );
  });

  list.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.classList.contains("task-edit-form")) return;
    event.preventDefault();
    handleSaveEdit(form, store);
  });

  list.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const form = event.target.closest(".task-edit-form");
    if (!form) return;
    event.preventDefault();
    render(store);
  });
}

/* =====================================================================
 *  Bootstrap
 * ===================================================================== */

function init() {
  const store = createStore();
  render(store);
  setupForm(store);
  setupTaskEvents(store);
  console.info(`[${config.appName}] initialized`);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}

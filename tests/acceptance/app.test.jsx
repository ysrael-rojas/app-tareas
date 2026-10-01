// Acceptance suite for the App Tareas MVP (React 18 + Vite + Vitest).
//
// Ports the 28 checks from the vanilla MVP acceptance suite to React
// Testing Library + Vitest. Each of the 10 acceptance criteria is covered by
// `it` blocks that drive the real React components through `userEvent` and
// assert against the accessible DOM (`screen.getByRole` / labels).
//
// Mounting strategy: `createRoot` + `act`, mirroring `src/main.jsx`. The
// render is wrapped in `act` so the concurrent root commits synchronously and
// the first `screen.*` query is deterministic (a raw `createRoot().render`
// schedules async work and would leave the DOM empty until a macrotask).
import '@testing-library/jest-dom/vitest';
import { act } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import App, { StoreProvider, useStore } from '../../src/App.jsx';
import { createStore, config } from '../../src/store/store.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Self-contained localStorage backed by a Map (no real DOM storage). */
function makeLocalStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => { map.clear(); },
    get length() { return map.size; },
    key: (i) => Array.from(map.keys())[i] ?? null,
  };
}

/** Tracked cleanups so `afterEach` can tear down every mounted root. */
const mountedCleanups = [];

/**
 * Mounts a fresh <App /> in a new container and returns its cleanup function.
 * Each call creates a brand-new Store (via <StoreProvider> in <App />), which
 * reads from the (stubbed) `localStorage` — the same effect as a browser load.
 */
function renderApp() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<App />);
  });
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  mountedCleanups.push(cleanup);
  return { container, cleanup };
}

/** Fresh user-event instance (flushes React updates synchronously via RTL). */
async function setupUser() {
  return userEvent.setup();
}

/** Creates a task through the real form. */
async function createTask(user, title) {
  const input = screen.getByRole('textbox', { name: /título de la tarea/i });
  await user.type(input, title);
  await user.click(screen.getByRole('button', { name: /agregar/i }));
}

const FILTER_LABELS = { all: 'Todas', pending: 'Pendientes', completed: 'Completadas' };

/** Reads the counter span inside a filter tab (e.g. '2'). */
function countFor(filter) {
  const tab = screen.getByRole('tab', { name: new RegExp(FILTER_LABELS[filter], 'i') });
  return tab.querySelector('[data-counter]').textContent;
}

/** Reads a fresh Store instance straight from persisted localStorage. */
function persistedTitles() {
  return createStore().getAll().map((task) => task.title);
}

/** Small probe that reads the live Store through the Context wiring. */
function StoreProbe() {
  const store = useStore();
  return <span data-testid="store-probe">{store.getAll().map((task) => task.title).join('|')}</span>;
}

/** Mounts a probe inside a fresh <StoreProvider> (its own Store instance). */
function renderStoreProbe() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <StoreProvider>
        <StoreProbe />
      </StoreProvider>,
    );
  });
  const cleanup = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  mountedCleanups.push(cleanup);
  return { container, cleanup };
}

/** True when an argument list is a known-benign React act warning. */
function isBenignActWarning(args) {
  return args.some(
    (arg) => typeof arg === 'string' && /not wrapped in act/i.test(arg),
  );
}

let errorLog;
let warnLog;

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage());
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  errorLog = [];
  warnLog = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => { errorLog.push(args); });
  vi.spyOn(console, 'warn').mockImplementation((...args) => { warnLog.push(args); });
});

afterEach(() => {
  while (mountedCleanups.length) mountedCleanups.pop()();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Criterion 1: the app opens without a server and mounts without errors
// ---------------------------------------------------------------------------

describe('Criterion 1: app mounts without a server', () => {
  it('renders the header', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'App Tareas' })).toBeInTheDocument();
  });

  it('renders the creation form', () => {
    renderApp();
    expect(screen.getByRole('textbox', { name: /título de la tarea/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument();
  });

  it('mounts without throwing or logging errors', () => {
    renderApp();
    expect(screen.getByRole('tablist', { name: /filtros de tareas/i })).toBeInTheDocument();
    expect(errorLog.filter((args) => !isBenignActWarning(args))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Criterion 2: creating a task persists across reload
// ---------------------------------------------------------------------------

describe('Criterion 2: creating a task persists across reload', () => {
  it('shows the created task', async () => {
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');
    expect(screen.getByText('Comprar pan')).toBeInTheDocument();
  });

  it('persists the task across reload (remount with the same localStorage)', async () => {
    const first = renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');
    expect(screen.getByText('Comprar pan')).toBeInTheDocument();

    // Storage-layer proof: persisted under the configured key and a fresh
    // Store instance reads it back.
    const payload = JSON.parse(localStorage.getItem(config.storageKey));
    expect(payload.tasks).toHaveLength(1);
    expect(persistedTitles()).toContain('Comprar pan');

    // Simulate a reload: unmount and mount a fresh <App />.
    first.cleanup();
    renderApp();
    expect(screen.getByText('Comprar pan')).toBeInTheDocument();

    // A fresh StoreProvider + useStore probe reads the same persisted data.
    renderStoreProbe();
    expect(screen.getByTestId('store-probe')).toHaveTextContent('Comprar pan');
  });

  it('shows an empty list after remount with cleared localStorage', async () => {
    const first = renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');
    expect(screen.getByText('Comprar pan')).toBeInTheDocument();

    localStorage.clear();
    first.cleanup();
    renderApp();
    expect(screen.queryByText('Comprar pan')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toHaveTextContent(/no hay tareas/i);
  });
});

// ---------------------------------------------------------------------------
// Criterion 3: toggle strikes through and round-trips
// ---------------------------------------------------------------------------

describe('Criterion 3: toggle completes and round-trips', () => {
  it('adds the is-completed class when the checkbox is clicked', async () => {
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');

    const checkbox = screen.getByRole('checkbox', { name: /marcar "comprar pan" como completada/i });
    await user.click(checkbox);

    const li = screen.getByText('Comprar pan').closest('li');
    expect(li).toHaveClass('is-completed');
  });

  it('removes the is-completed class on a second click', async () => {
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');

    await user.click(screen.getByRole('checkbox', { name: /marcar "comprar pan" como completada/i }));
    const li = screen.getByText('Comprar pan').closest('li');
    expect(li).toHaveClass('is-completed');

    await user.click(screen.getByRole('checkbox', { name: /marcar "comprar pan" como pendiente/i }));
    expect(li).not.toHaveClass('is-completed');
  });

  it('updates the counters to reflect the toggle', async () => {
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');
    await createTask(user, 'Llamar al médico');

    expect(countFor('all')).toBe('2');
    expect(countFor('pending')).toBe('2');
    expect(countFor('completed')).toBe('0');

    await user.click(screen.getByRole('checkbox', { name: /marcar "comprar pan" como completada/i }));

    expect(countFor('all')).toBe('2');
    expect(countFor('pending')).toBe('1');
    expect(countFor('completed')).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// Criterion 4: editing changes title/description and persists
// ---------------------------------------------------------------------------

describe('Criterion 4: editing changes title/description and persists', () => {
  it('opens the edit form when Editar is clicked', async () => {
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');

    await user.click(screen.getByRole('button', { name: /editar "comprar pan"/i }));

    expect(screen.getByRole('textbox', { name: 'Título' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Descripción (opcional)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('updates the title and description on Guardar', async () => {
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');

    await user.click(screen.getByRole('button', { name: /editar "comprar pan"/i }));
    const titleInput = screen.getByRole('textbox', { name: 'Título' });
    const descInput = screen.getByRole('textbox', { name: 'Descripción (opcional)' });

    await user.clear(titleInput);
    await user.type(titleInput, 'Comprar pan integral');
    await user.type(descInput, 'En la panadería de la esquina');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText('Comprar pan integral')).toBeInTheDocument();
    expect(screen.getByText('En la panadería de la esquina')).toBeInTheDocument();
  });

  it('persists the edit across reload', async () => {
    const first = renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');

    await user.click(screen.getByRole('button', { name: /editar "comprar pan"/i }));
    const titleInput = screen.getByRole('textbox', { name: 'Título' });
    await user.clear(titleInput);
    await user.type(titleInput, 'Comprar pan integral');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    first.cleanup();
    renderApp();
    expect(screen.getByText('Comprar pan integral')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Criterion 5: delete asks for confirmation and removes the task
// ---------------------------------------------------------------------------

describe('Criterion 5: delete asks for confirmation and removes the task', () => {
  it('invokes window.confirm with the task title', async () => {
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');

    await user.click(screen.getByRole('button', { name: /eliminar "comprar pan"/i }));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Comprar pan'));
  });

  it('keeps the task when the confirmation is cancelled', async () => {
    window.confirm.mockReturnValue(false);
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');

    await user.click(screen.getByRole('button', { name: /eliminar "comprar pan"/i }));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Comprar pan')).toBeInTheDocument();
  });

  it('removes the task when the confirmation is accepted', async () => {
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Comprar pan');

    await user.click(screen.getByRole('button', { name: /eliminar "comprar pan"/i }));

    expect(screen.queryByText('Comprar pan')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Criterion 6: filters + coherent counters
// ---------------------------------------------------------------------------

/** Seeds 3 tasks and completes "Tarea A" (pending: B, C; completed: A). */
async function seedThreeTasksWithOneCompleted(user) {
  await createTask(user, 'Tarea A');
  await createTask(user, 'Tarea B');
  await createTask(user, 'Tarea C');
  await user.click(screen.getByRole('checkbox', { name: /marcar "tarea a" como completada/i }));
}

describe('Criterion 6: filters and coherent counters', () => {
  it('filters to pending when the Pendientes tab is clicked', async () => {
    renderApp();
    const user = await setupUser();
    await seedThreeTasksWithOneCompleted(user);

    await user.click(screen.getByRole('tab', { name: /pendientes/i }));

    expect(screen.getByText('Tarea B')).toBeInTheDocument();
    expect(screen.getByText('Tarea C')).toBeInTheDocument();
    expect(screen.queryByText('Tarea A')).not.toBeInTheDocument();
  });

  it('filters to completed when the Completadas tab is clicked', async () => {
    renderApp();
    const user = await setupUser();
    await seedThreeTasksWithOneCompleted(user);

    await user.click(screen.getByRole('tab', { name: /completadas/i }));

    expect(screen.getByText('Tarea A')).toBeInTheDocument();
    expect(screen.queryByText('Tarea B')).not.toBeInTheDocument();
    expect(screen.queryByText('Tarea C')).not.toBeInTheDocument();
  });

  it('shows all tasks when the Todas tab is clicked', async () => {
    renderApp();
    const user = await setupUser();
    await seedThreeTasksWithOneCompleted(user);

    await user.click(screen.getByRole('tab', { name: /pendientes/i }));
    await user.click(screen.getByRole('tab', { name: /todas/i }));

    expect(screen.getByText('Tarea A')).toBeInTheDocument();
    expect(screen.getByText('Tarea B')).toBeInTheDocument();
    expect(screen.getByText('Tarea C')).toBeInTheDocument();
  });

  it('updates the counters when a task is toggled or removed', async () => {
    renderApp();
    const user = await setupUser();
    await seedThreeTasksWithOneCompleted(user);

    expect(countFor('all')).toBe('3');
    expect(countFor('pending')).toBe('2');
    expect(countFor('completed')).toBe('1');

    // Toggle "Tarea B" to completed.
    await user.click(screen.getByRole('checkbox', { name: /marcar "tarea b" como completada/i }));
    expect(countFor('pending')).toBe('1');
    expect(countFor('completed')).toBe('2');

    // Delete "Tarea C" (still pending).
    await user.click(screen.getByRole('button', { name: /eliminar "tarea c"/i }));
    expect(countFor('all')).toBe('2');
    expect(countFor('pending')).toBe('0');
    expect(countFor('completed')).toBe('2');
  });

  it('marks only the active tab with aria-selected="true"', async () => {
    renderApp();
    const user = await setupUser();
    await seedThreeTasksWithOneCompleted(user);

    const allTab = screen.getByRole('tab', { name: /todas/i });
    const pendingTab = screen.getByRole('tab', { name: /pendientes/i });
    const completedTab = screen.getByRole('tab', { name: /completadas/i });

    expect(allTab).toHaveAttribute('aria-selected', 'true');
    expect(pendingTab).toHaveAttribute('aria-selected', 'false');
    expect(completedTab).toHaveAttribute('aria-selected', 'false');

    await user.click(pendingTab);

    expect(allTab).toHaveAttribute('aria-selected', 'false');
    expect(pendingTab).toHaveAttribute('aria-selected', 'true');
    expect(completedTab).toHaveAttribute('aria-selected', 'false');
  });
});

// ---------------------------------------------------------------------------
// Criterion 7: contextual empty state per filter
// ---------------------------------------------------------------------------

describe('Criterion 7: contextual empty state per filter', () => {
  it('shows the generic empty message on the all filter with no tasks', () => {
    renderApp();
    expect(screen.getByTestId('empty-state')).toHaveTextContent(/no hay tareas/i);
  });

  it('shows the pending-specific message when only completed tasks exist', async () => {
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Tarea A');
    await user.click(screen.getByRole('checkbox', { name: /marcar "tarea a" como completada/i }));

    await user.click(screen.getByRole('tab', { name: /pendientes/i }));

    expect(screen.getByTestId('empty-state')).toHaveTextContent(/no hay tareas pendientes/i);
  });

  it('shows the completed-specific message when only pending tasks exist', async () => {
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Tarea A');

    await user.click(screen.getByRole('tab', { name: /completadas/i }));

    expect(screen.getByTestId('empty-state')).toHaveTextContent(/aún no has completado ninguna tarea/i);
  });

  it('shows the list on the all filter when tasks exist', async () => {
    renderApp();
    const user = await setupUser();
    await createTask(user, 'Tarea A');

    expect(screen.getByText('Tarea A')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Criterion 8: no network at runtime
// ---------------------------------------------------------------------------

describe('Criterion 8: no network calls at runtime', () => {
  it('does not call fetch or XMLHttpRequest during a session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', fetchMock);
    const xhrSpy = vi.spyOn(window.XMLHttpRequest.prototype, 'open').mockImplementation(() => {});

    renderApp();
    const user = await setupUser();
    await createTask(user, 'Tarea A');
    await user.click(screen.getByRole('checkbox', { name: /marcar "tarea a" como completada/i }));
    await user.click(screen.getByRole('tab', { name: /completadas/i }));
    await user.click(screen.getByRole('tab', { name: /todas/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Criterion 9: mobile-first at 360px
// ---------------------------------------------------------------------------

describe('Criterion 9: mobile-first at 360px', () => {
  it('uses the mobile-first layout tokens in styles.css', () => {
    const css = readFileSync(path.join(process.cwd(), 'styles.css'), 'utf8');
    expect(css).toMatch(/@media\s*\(min-width:\s*768px\)/);
    expect(css).toMatch(/max-width:\s*\d+px/);
  });
});

// ---------------------------------------------------------------------------
// Criterion 10: no console warnings in a clean session
// ---------------------------------------------------------------------------

/** Runs a full session: create + toggle + edit + filter + delete. */
async function runCleanSession(user) {
  await createTask(user, 'Tarea de ejemplo');
  await user.click(screen.getByRole('checkbox', { name: /marcar "tarea de ejemplo" como completada/i }));
  await user.click(screen.getByRole('button', { name: /editar "tarea de ejemplo"/i }));
  const titleInput = screen.getByRole('textbox', { name: 'Título' });
  await user.clear(titleInput);
  await user.type(titleInput, 'Tarea editada');
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
  await user.click(screen.getByRole('tab', { name: /completadas/i }));
  await user.click(screen.getByRole('tab', { name: /todas/i }));
  await user.click(screen.getByRole('button', { name: /eliminar/i }));
}

describe('Criterion 10: no console warnings in a clean session', () => {
  it('does not call console.error', async () => {
    renderApp();
    const user = await setupUser();
    await runCleanSession(user);

    const unexpected = errorLog.filter((args) => !isBenignActWarning(args));
    expect(unexpected).toEqual([]);
  });

  it('does not call console.warn', async () => {
    renderApp();
    const user = await setupUser();
    await runCleanSession(user);

    expect(warnLog).toEqual([]);
  });
});

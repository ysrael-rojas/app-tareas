// Tests de unidad para `src/store/store.js`.
// Port de la cobertura probada en el MVP (19/19) para la Store vanilla.
// Shim de localStorage autocontenido (Map) para no depender del DOM real.

import {
  config,
  normalizeTitle,
  normalizeDescription,
  isValidTaskShape,
  loadInitial,
  persist,
  createStore,
} from '../../src/store/store.js';

/** Fabrica un localStorage respaldado por un Map (autocontenido). */
function makeLocalStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

/** Devuelve un shape de tarea válido (con overrides opcionales). */
function makeTask(overrides = {}) {
  return {
    id: 'task-1',
    title: 'Tarea',
    description: '',
    completed: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage());
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('config', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('has storageKey "app-tareas:v1"', () => {
    expect(config.storageKey).toBe('app-tareas:v1');
  });

  it('has schemaVersion 1', () => {
    expect(config.schemaVersion).toBe(1);
  });

  it('defines the title and description length limits', () => {
    expect(config.titleMinLength).toBe(1);
    expect(config.titleMaxLength).toBe(200);
    expect(config.descriptionMaxLength).toBe(2000);
  });
});

describe('normalizeTitle', () => {
  it('returns the trimmed title', () => {
    expect(normalizeTitle('  Hola  ')).toBe('Hola');
  });

  it('throws RangeError on empty string', () => {
    expect(() => normalizeTitle('')).toThrow(RangeError);
  });

  it('throws RangeError on whitespace-only string', () => {
    expect(() => normalizeTitle('   ')).toThrow(RangeError);
  });

  it('accepts a 1-character title', () => {
    expect(normalizeTitle('a')).toBe('a');
  });

  it('accepts a 200-character title', () => {
    expect(normalizeTitle('x'.repeat(200))).toBe('x'.repeat(200));
  });

  it('throws RangeError on 201 characters', () => {
    expect(() => normalizeTitle('x'.repeat(201))).toThrow(RangeError);
  });

  it('throws TypeError on non-string', () => {
    expect(() => normalizeTitle(42)).toThrow(TypeError);
    expect(() => normalizeTitle(null)).toThrow(TypeError);
    expect(() => normalizeTitle(undefined)).toThrow(TypeError);
  });
});

describe('normalizeDescription', () => {
  it('returns "" for null', () => {
    expect(normalizeDescription(null)).toBe('');
  });

  it('returns "" for undefined', () => {
    expect(normalizeDescription(undefined)).toBe('');
  });

  it('returns the trimmed description', () => {
    expect(normalizeDescription('  Descripción  ')).toBe('Descripción');
  });

  it('accepts a 2000-character description', () => {
    expect(normalizeDescription('d'.repeat(2000))).toBe('d'.repeat(2000));
  });

  it('throws RangeError on 2001 characters', () => {
    expect(() => normalizeDescription('d'.repeat(2001))).toThrow(RangeError);
  });

  it('throws TypeError on non-string', () => {
    expect(() => normalizeDescription(42)).toThrow(TypeError);
  });
});

describe('isValidTaskShape', () => {
  it('accepts a valid task', () => {
    expect(isValidTaskShape(makeTask())).toBe(true);
  });

  it('rejects a task missing id', () => {
    expect(isValidTaskShape(makeTask({ id: undefined }))).toBe(false);
  });

  it('rejects wrong type for completed', () => {
    expect(isValidTaskShape(makeTask({ completed: 'yes' }))).toBe(false);
  });

  it('accepts extra fields', () => {
    expect(isValidTaskShape(makeTask({ extra: 'field' }))).toBe(true);
  });

  it('rejects non-object', () => {
    expect(isValidTaskShape(null)).toBe(false);
    expect(isValidTaskShape('task')).toBe(false);
    expect(isValidTaskShape(42)).toBe(false);
  });
});

describe('createStore — empty initial state', () => {
  it('getAll returns [] with empty localStorage', () => {
    const store = createStore();
    expect(store.getAll()).toEqual([]);
  });
});

describe('createStore — add', () => {
  it('adds and returns the task with expected fields', () => {
    const store = createStore();
    const task = store.add({ title: '  Comprar pan  ' });
    expect(task.title).toBe('Comprar pan');
    expect(task.description).toBe('');
    expect(task.completed).toBe(false);
  });

  it('assigns a non-empty string id', () => {
    const store = createStore();
    const task = store.add({ title: 'Tarea' });
    expect(task.id).toEqual(expect.any(String));
    expect(task.id).not.toBe('');
  });

  it('sets createdAt equal to updatedAt at creation', () => {
    const store = createStore();
    const task = store.add({ title: 'Tarea' });
    expect(task.createdAt).toBe(task.updatedAt);
    expect(new Date(task.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('sets completed to false', () => {
    const store = createStore();
    const task = store.add({ title: 'Tarea' });
    expect(task.completed).toBe(false);
  });

  it('getAll includes the new task', () => {
    const store = createStore();
    const task = store.add({ title: 'Tarea' });
    expect(store.getAll()).toContainEqual(task);
  });
});

describe('createStore — getAll defensive copy', () => {
  it('does not leak the internal array (mutations to the copy do not affect the store)', () => {
    const store = createStore();
    const original = store.add({ title: 'Original' });

    const copy = store.getAll();
    copy.push(makeTask({ id: 'fake', title: 'Fake' }));
    copy[0] = makeTask({ id: 'replaced', title: 'Replaced' });

    const fresh = store.getAll();
    expect(fresh).toHaveLength(1);
    expect(fresh[0]).toEqual(original);
    expect(fresh[0].title).toBe('Original');
  });
});

describe('createStore — getById', () => {
  it('returns the task when present', () => {
    const store = createStore();
    const task = store.add({ title: 'Tarea' });
    expect(store.getById(task.id)).toEqual(task);
  });

  it('returns null when absent', () => {
    const store = createStore();
    expect(store.getById('missing')).toBeNull();
  });
});

describe('createStore — update', () => {
  it('updates title and description', () => {
    const store = createStore();
    const task = store.add({ title: 'Original', description: 'Desc' });
    const updated = store.update(task.id, { title: '  Nuevo  ', description: 'Nueva desc' });
    expect(updated.title).toBe('Nuevo');
    expect(updated.description).toBe('Nueva desc');
    expect(store.getById(task.id).title).toBe('Nuevo');
  });

  it('preserves id and createdAt', () => {
    const store = createStore();
    const task = store.add({ title: 'Original' });
    const updated = store.update(task.id, { title: 'Nuevo' });
    expect(updated.id).toBe(task.id);
    expect(updated.createdAt).toBe(task.createdAt);
  });

  it('advances updatedAt', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const store = createStore();
      const task = store.add({ title: 'Original' });
      vi.advanceTimersByTime(1000);
      const updated = store.update(task.id, { title: 'Nuevo' });
      expect(updated.updatedAt).not.toBe(task.updatedAt);
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date(task.updatedAt).getTime(),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns null for unknown id', () => {
    const store = createStore();
    expect(store.update('missing', { title: 'X' })).toBeNull();
  });

  it('ignores non-boolean patch.completed', () => {
    const store = createStore();
    const task = store.add({ title: 'Tarea' });
    const updated = store.update(task.id, { completed: 'yes' });
    expect(updated.completed).toBe(false);
  });
});

describe('createStore — toggle', () => {
  it('flips completed', () => {
    const store = createStore();
    const task = store.add({ title: 'Tarea' });
    const toggled = store.toggle(task.id);
    expect(toggled.completed).toBe(true);
    expect(store.getById(task.id).completed).toBe(true);
    const toggledBack = store.toggle(task.id);
    expect(toggledBack.completed).toBe(false);
  });

  it('returns null for unknown id', () => {
    const store = createStore();
    expect(store.toggle('missing')).toBeNull();
  });
});

describe('createStore — remove', () => {
  it('returns true and removes a known id', () => {
    const store = createStore();
    const task = store.add({ title: 'Tarea' });
    expect(store.remove(task.id)).toBe(true);
    expect(store.getById(task.id)).toBeNull();
  });

  it('returns false for an unknown id', () => {
    const store = createStore();
    expect(store.remove('missing')).toBe(false);
  });

  it('getAll no longer contains the removed task', () => {
    const store = createStore();
    const task = store.add({ title: 'Tarea' });
    store.remove(task.id);
    expect(store.getAll()).not.toContainEqual(task);
  });
});

describe('createStore — persistence', () => {
  it('add writes { version: 1, tasks: [...] } to localStorage', () => {
    const store = createStore();
    const task = store.add({ title: 'Persistida' });
    const parsed = JSON.parse(localStorage.getItem(config.storageKey));
    expect(parsed.version).toBe(1);
    expect(parsed.tasks).toEqual([task]);
  });

  it('fresh store from non-empty localStorage returns previous tasks', () => {
    const previous = makeTask({ id: 'prev-1', title: 'Previa' });
    localStorage.setItem(
      config.storageKey,
      JSON.stringify({ version: 1, tasks: [previous] }),
    );
    const store = createStore();
    expect(store.getAll()).toEqual([previous]);
  });

  it('update persists', () => {
    const store = createStore();
    const task = store.add({ title: 'Antes' });
    store.update(task.id, { title: 'Después' });
    const parsed = JSON.parse(localStorage.getItem(config.storageKey));
    expect(parsed.tasks[0].title).toBe('Después');
  });

  it('remove persists', () => {
    const store = createStore();
    const task = store.add({ title: 'Tarea' });
    store.remove(task.id);
    const parsed = JSON.parse(localStorage.getItem(config.storageKey));
    expect(parsed.tasks).toEqual([]);
  });
});

describe('loadInitial — defensive cases', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns [] when localStorage is undefined', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(loadInitial()).toEqual([]);
  });

  it('returns [] when localStorage.getItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('quota exceeded');
      },
    });
    expect(loadInitial()).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it('returns [] on JSON parse error', () => {
    localStorage.setItem(config.storageKey, '{not valid json');
    expect(loadInitial()).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it('returns [] when parsed value is not an object', () => {
    localStorage.setItem(config.storageKey, '"just a string"');
    expect(loadInitial()).toEqual([]);
  });

  it('returns [] on version mismatch', () => {
    localStorage.setItem(
      config.storageKey,
      JSON.stringify({ version: 2, tasks: [] }),
    );
    expect(loadInitial()).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it('returns [] when tasks is not an array', () => {
    localStorage.setItem(
      config.storageKey,
      JSON.stringify({ version: 1, tasks: 'nope' }),
    );
    expect(loadInitial()).toEqual([]);
  });

  it('returns only valid tasks from a mixed list', () => {
    const valid1 = makeTask({ id: 'a' });
    const valid2 = makeTask({ id: 'b' });
    const invalid = { id: 123 };
    localStorage.setItem(
      config.storageKey,
      JSON.stringify({ version: 1, tasks: [valid1, invalid, valid2] }),
    );
    expect(loadInitial()).toEqual([valid1, valid2]);
  });
});

describe('persist', () => {
  it('throws when localStorage is undefined', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => persist([])).toThrow('localStorage unavailable');
  });

  it('serializes with the expected shape', () => {
    const task = makeTask();
    persist([task]);
    const parsed = JSON.parse(localStorage.getItem(config.storageKey));
    expect(parsed).toEqual({ version: 1, tasks: [task] });
    expect(parsed.tasks).toHaveLength(1);
  });
});

describe('store pub-sub', () => {
  describe('subscribe', () => {
    it('registers a callback and returns a callable unsubscribe function', () => {
      const store = createStore();
      const fn = vi.fn();
      const unsubscribe = store.subscribe(fn);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('calls the callback after add with the new store state', () => {
      const store = createStore();
      let snapshot;
      const fn = vi.fn(() => {
        snapshot = store.getSnapshot();
      });
      store.subscribe(fn);

      const task = store.add({ title: 'Tarea' });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(snapshot).toHaveLength(1);
      expect(snapshot).toContainEqual(task);
    });

    it('calls the callback after update only on success', () => {
      const store = createStore();
      const fn = vi.fn();
      store.subscribe(fn);
      const task = store.add({ title: 'Original' });
      fn.mockClear();

      expect(store.update('missing', { title: 'X' })).toBeNull();
      expect(fn).not.toHaveBeenCalled();

      store.update(task.id, { title: 'Nuevo' });
      expect(fn).toHaveBeenCalledTimes(1);
      expect(store.getSnapshot()[0].title).toBe('Nuevo');
    });

    it('calls the callback after toggle only when the id exists', () => {
      const store = createStore();
      const fn = vi.fn();
      store.subscribe(fn);
      const task = store.add({ title: 'Tarea' });
      fn.mockClear();

      expect(store.toggle('missing')).toBeNull();
      expect(fn).not.toHaveBeenCalled();

      const toggled = store.toggle(task.id);
      expect(toggled.completed).toBe(true);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls the callback after remove only when the id exists', () => {
      const store = createStore();
      const fn = vi.fn();
      store.subscribe(fn);
      const task = store.add({ title: 'Tarea' });
      fn.mockClear();

      expect(store.remove('missing')).toBe(false);
      expect(fn).not.toHaveBeenCalled();

      expect(store.remove(task.id)).toBe(true);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe removes the callback so later mutations do not call it', () => {
      const store = createStore();
      const fn = vi.fn();
      const unsubscribe = store.subscribe(fn);

      store.add({ title: 'Antes' });
      expect(fn).toHaveBeenCalledTimes(1);

      unsubscribe();
      store.add({ title: 'Después' });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('notifies multiple subscribers in registration order', () => {
      const store = createStore();
      const order = [];
      store.subscribe(() => order.push('first'));
      store.subscribe(() => order.push('second'));
      store.subscribe(() => order.push('third'));

      store.add({ title: 'Tarea' });

      expect(order).toEqual(['first', 'second', 'third']);
    });
  });

  describe('getSnapshot', () => {
    it('returns the same reference between calls with no mutation', () => {
      const store = createStore();
      const snap1 = store.getSnapshot();
      const snap2 = store.getSnapshot();
      expect(Object.is(snap1, snap2)).toBe(true);
    });

    it('returns a different reference after add, update, toggle and remove', () => {
      const store = createStore();
      const before = store.getSnapshot();

      const task = store.add({ title: 'Tarea' });
      const afterAdd = store.getSnapshot();
      expect(Object.is(afterAdd, before)).toBe(false);

      store.update(task.id, { title: 'Actualizada' });
      const afterUpdate = store.getSnapshot();
      expect(Object.is(afterUpdate, afterAdd)).toBe(false);

      store.toggle(task.id);
      const afterToggle = store.getSnapshot();
      expect(Object.is(afterToggle, afterUpdate)).toBe(false);

      store.remove(task.id);
      const afterRemove = store.getSnapshot();
      expect(Object.is(afterRemove, afterToggle)).toBe(false);
    });
  });

  describe('integration', () => {
    it('snapshot reflects the store after adds and a remove', () => {
      const store = createStore();
      const a = store.add({ title: 'A' });
      const b = store.add({ title: 'B' });
      const c = store.add({ title: 'C' });
      store.remove(b.id);

      const snap = store.getSnapshot();
      expect(snap).toHaveLength(2);
      expect(snap.map((t) => t.id)).toEqual([a.id, c.id]);
    });
  });
});

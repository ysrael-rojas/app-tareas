import { useRef } from 'react';
import { useStore } from '../App.jsx';
import { useTasks } from '../store/useTasks.js';
import { announce } from '../lib/announce.js';

const FILTERS = Object.freeze([
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'completed', label: 'Completadas' },
]);

const LABEL_BY_ID = Object.freeze(
  FILTERS.reduce((acc, f) => { acc[f.id] = f.label; return acc; }, {}),
);

function pluralize(n) {
  return n === 1 ? 'tarea' : 'tareas';
}

function announceFilter(id, count) {
  announce(`Filtro ${LABEL_BY_ID[id]}: ${count} ${pluralize(count)}.`);
}

/**
 * Filter tabs (ARIA tablist, hand-rolled).
 *
 * Contract:
 * - Three tabs: 'all' (Todas), 'pending' (Pendientes), 'completed' (Completadas).
 * - Roving tabindex: the active tab has tabindex=0, the others -1.
 * - Click or Enter/Space on a tab changes the filter (calls onChange)
 *   and announces the change.
 * - ArrowLeft/ArrowRight wrap around; Home/End jump to the ends.
 *   Keyboard activation is automatic: pressing ArrowRight moves focus
 *   AND applies the filter (matches the vanilla MVP).
 * - Counts are derived from the live store (re-renders via useTasks).
 */
export default function Filters({ currentFilter, onChange }) {
  const store = useStore();
  const tasks = useTasks(store);
  const tabsRef = useRef([]);

  const counts = { all: tasks.length, pending: 0, completed: 0 };
  for (const t of tasks) {
    if (t.completed) counts.completed += 1;
    else counts.pending += 1;
  }

  function activate(id) {
    if (id === currentFilter) return;
    onChange(id);
    announceFilter(id, counts[id]);
  }

  function handleClick(id) {
    activate(id);
  }

  function handleKeyDown(event, currentIndex) {
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % FILTERS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + FILTERS.length) % FILTERS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = FILTERS.length - 1;
    else return;
    event.preventDefault();
    const nextFilter = FILTERS[nextIndex].id;
    tabsRef.current[nextIndex]?.focus();
    activate(nextFilter);
  }

  return (
    <div className="filters" role="tablist" aria-label="Filtros de tareas">
      {FILTERS.map((f, i) => {
        const isActive = f.id === currentFilter;
        return (
          <button
            key={f.id}
            ref={(el) => { tabsRef.current[i] = el; }}
            type="button"
            role="tab"
            id={`filter-tab-${f.id}`}
            className={isActive ? 'filters__tab is-active' : 'filters__tab'}
            data-filter={f.id}
            aria-selected={String(isActive)}
            aria-controls="task-list-panel"
            tabIndex={isActive ? 0 : -1}
            onClick={() => handleClick(f.id)}
            onKeyDown={(event) => handleKeyDown(event, i)}
          >
            {f.label} <span className="filters__count" data-counter={f.id}>{counts[f.id]}</span>
          </button>
        );
      })}
    </div>
  );
}

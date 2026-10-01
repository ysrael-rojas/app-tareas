import { useStore } from '../App.jsx';
import { useTasks } from '../store/useTasks.js';
import TaskItem from './TaskItem.jsx';

/**
 * Live task list, subscribed to the Store via useSyncExternalStore.
 *
 * Props:
 * - filter: 'all' | 'pending' | 'completed'.
 * - onToggle, onUpdate, onDelete: pass-through to each TaskItem.
 *
 * The content is wrapped in a `role="tabpanel"` whose `aria-labelledby`
 * points at the active filter tab id. The `<ul>` deliberately has no
 * `aria-live`: list re-renders flow through the Store pub-sub +
 * `useSyncExternalStore`, and the dedicated `#app-announcer` live region
 * handles action feedback. Adding a second live region here would
 * reproduce the vanilla MVP's double-announce bug.
 */
export default function TaskList({ filter, onToggle, onUpdate, onDelete }) {
  const store = useStore();
  const tasks = useTasks(store);

  const filtered = filter === 'pending'
    ? tasks.filter((t) => !t.completed)
    : filter === 'completed'
      ? tasks.filter((t) => t.completed)
      : tasks;

  const emptyMessage = tasks.length === 0
    ? 'No hay tareas. Crea la primera con el formulario de arriba.'
    : filter === 'pending'
      ? 'No hay tareas pendientes. ¡Bien hecho!'
      : 'Aún no has completado ninguna tarea.';

  return (
    <div
      id="task-list-panel"
      role="tabpanel"
      aria-labelledby={`filter-tab-${filter}`}
      className="task-list-panel"
      data-testid="task-list-panel"
    >
      {filtered.length === 0 ? (
        <p className="empty-state" data-testid="empty-state">{emptyMessage}</p>
      ) : (
        <ul className="task-list" data-testid="task-list">
          {filtered.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

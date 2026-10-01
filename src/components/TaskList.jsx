import { useStore } from '../App.jsx';
import { useTasks } from '../store/useTasks.js';
import TaskItem from './TaskItem.jsx';

/**
 * Live task list, subscribed to the Store via useSyncExternalStore.
 *
 * Props:
 * - filter: 'all' | 'pending' | 'completed' (currently always 'all' in task 6;
 *   the future Filters component (task 8) will set this).
 * - onToggle, onUpdate, onDelete: pass-through to each TaskItem.
 *
 * The `<ul>` deliberately has no `aria-live`: list re-renders flow through the
 * Store pub-sub + `useSyncExternalStore`, and the dedicated `#app-announcer`
 * live region handles action feedback. Adding a second live region here would
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

  if (filtered.length === 0) {
    const message = tasks.length === 0
      ? 'No hay tareas. Crea la primera con el formulario de arriba.'
      : filter === 'pending'
        ? 'No hay tareas pendientes. ¡Bien hecho!'
        : 'Aún no has completado ninguna tarea.';

    return (
      <ul className="task-list" data-testid="task-list">
        <p className="empty-state" data-testid="empty-state">{message}</p>
      </ul>
    );
  }

  return (
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
  );
}

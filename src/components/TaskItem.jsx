import { useRef } from 'react';

/**
 * Single task row. Presentational: delegates the mutation through callbacks.
 *
 * Props:
 * - task: { id, title, description, completed, createdAt, updatedAt }
 * - onToggle(id): called when the user flips the checkbox.
 * - onEdit(id):  called when the user clicks Edit. STUB in this task — the
 *   handler passed in by App is a no-op. The button renders as aria-disabled.
 * - onDelete(id): same as onEdit, STUB until task 7.
 *
 * The checkbox `useRef` is reserved for future focus management (e.g. returning
 * focus after an edit/delete in task 7); it is kept intentionally even though
 * it has no behavior today.
 */
export default function TaskItem({ task, onToggle, onEdit, onDelete }) {
  const checkboxRef = useRef(null);

  function handleChange() {
    onToggle(task.id);
  }

  return (
    <li className={task.completed ? 'task is-completed' : 'task'} data-id={task.id}>
      <input
        ref={checkboxRef}
        type="checkbox"
        className="task__toggle"
        checked={task.completed}
        onChange={handleChange}
        aria-label={`Marcar "${task.title}" como ${task.completed ? 'pendiente' : 'completada'}`}
      />
      <div className="task__content">
        <p className="task__title">{task.title}</p>
        {task.description ? (
          <p className="task__description">{task.description}</p>
        ) : null}
      </div>
      <div className="task__actions">
        <button
          type="button"
          className="task__action"
          aria-label={`Editar "${task.title}"`}
          aria-disabled="true"
        >
          Editar
        </button>
        <button
          type="button"
          className="task__action task__action--danger"
          aria-label={`Eliminar "${task.title}"`}
          aria-disabled="true"
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}

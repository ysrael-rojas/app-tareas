import { useState, useRef, useEffect } from 'react';
import TaskEditForm from './TaskEditForm.jsx';

/**
 * Single task row. Presentational: delegates mutations through callbacks.
 *
 * Props:
 * - task: { id, title, description, completed, createdAt, updatedAt }
 * - onToggle(id): called when the user flips the checkbox.
 * - onUpdate(id, patch): called by TaskEditForm on save. Parent calls
 *   store.update and announces.
 * - onDelete(id): called when the user clicks Eliminar. Parent does
 *   confirm + store.remove + announce + focus return.
 *
 * Local state:
 * - isEditing: when true, the row renders <TaskEditForm> instead of the
 *   display markup. After save or cancel, focus returns to the Edit
 *   button via the useEffect at the bottom of this file.
 */
export default function TaskItem({ task, onToggle, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const editBtnRef = useRef(null);
  // Reserved for future focus management; kept bound but unused today.
  const checkboxRef = useRef(null);
  const wasEditingRef = useRef(false);

  useEffect(() => {
    if (wasEditingRef.current && !isEditing) {
      editBtnRef.current?.focus();
    }
    wasEditingRef.current = isEditing;
  }, [isEditing]);

  function handleSave(patch) {
    onUpdate(task.id, patch);
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  function handleEditClick() {
    setIsEditing(true);
  }

  function handleDeleteClick() {
    onDelete(task.id);
  }

  if (isEditing) {
    return (
      <li className="task task--editing" data-id={task.id}>
        <TaskEditForm task={task} onSave={handleSave} onCancel={handleCancel} />
      </li>
    );
  }

  return (
    <li className={task.completed ? 'task is-completed' : 'task'} data-id={task.id}>
      <input
        ref={checkboxRef}
        type="checkbox"
        className="task__toggle"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
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
          ref={editBtnRef}
          type="button"
          className="task__action"
          aria-label={`Editar "${task.title}"`}
          onClick={handleEditClick}
        >
          Editar
        </button>
        <button
          type="button"
          className="task__action task__action--danger"
          aria-label={`Eliminar "${task.title}"`}
          onClick={handleDeleteClick}
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}

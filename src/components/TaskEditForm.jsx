import { useState, useRef, useEffect } from 'react';
import { normalizeTitle, config } from '../store/store.js';
import { announce } from '../lib/announce.js';

/**
 * Inline edit form that replaces a task row while editing.
 *
 * Contract:
 * - Mounts with the task's current title and description pre-filled.
 * - On mount, focuses and selects the title input.
 * - On submit, validates the title locally via `normalizeTitle` and, on
 *   success, calls `onSave({ title, description })`. On validation
 *   failure, surfaces a `role="alert"` error and announces it without
 *   calling onSave.
 * - On Cancel button or Escape key, calls `onCancel()`.
 */
export default function TaskEditForm({ task, onSave, onCancel }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [error, setError] = useState('');
  const titleInputRef = useRef(null);
  // Reserved for future use (moving focus to the error on validation
  // failure). Kept bound today but intentionally unused.
  const errorRef = useRef(null);

  useEffect(() => {
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    try {
      normalizeTitle(title);
      onSave({ title, description });
    } catch (err) {
      const message = err instanceof RangeError
        ? 'No se pudo guardar: el título no puede estar vacío.'
        : 'No se pudo guardar la tarea. Inténtalo de nuevo.';
      setError(message);
      announce(message);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }

  const titleId = `task-edit-title-${task.id}`;
  const descId = `task-edit-desc-${task.id}`;
  const errorId = `task-edit-error-${task.id}`;

  return (
    <form
      className="task-edit-form"
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <label className="visually-hidden" htmlFor={titleId}>Título</label>
      <input
        id={titleId}
        ref={titleInputRef}
        name="title"
        type="text"
        className="task-edit-form__input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={config.titleMaxLength}
        required
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
      />
      <label className="visually-hidden" htmlFor={descId}>
        Descripción (opcional)
      </label>
      <textarea
        id={descId}
        name="description"
        className="task-edit-form__textarea"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={config.descriptionMaxLength}
        placeholder="Descripción (opcional)"
      />
      <div className="task-edit-form__actions">
        <button type="submit" className="task-edit-form__save">Guardar</button>
        <button
          type="button"
          className="task-edit-form__cancel"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
      <p
        id={errorId}
        ref={errorRef}
        className="task-form__error"
        role="alert"
        hidden={!error}
      >
        {error}
      </p>
    </form>
  );
}

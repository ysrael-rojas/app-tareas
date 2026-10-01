/**
 * Create-task form (title only).
 *
 * Contract:
 * - Renders a single text input + submit button inside `.task-form`.
 * - On submit, adds the task through the Store (`store.add({ title })`).
 * - Success: clears the input, resets any error, announces the new task to
 *   the screen-reader live region, and returns focus to the input.
 * - Failure: surfaces a visible, `role="alert"` error and announces it.
 * - Title-only by design: the edit form (task 7) owns the description input.
 */
import { useState, useRef } from 'react';
import { useStore } from '../App.jsx';
import { announce } from '../lib/announce.js';
import { config } from '../store/store.js';

export default function TaskForm() {
  const store = useStore();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  function handleSubmit(event) {
    event.preventDefault();
    try {
      const task = store.add({ title });
      setTitle('');
      setError('');
      announce(`Tarea agregada: ${task.title}`);
      inputRef.current?.focus();
    } catch (err) {
      const message = err instanceof RangeError
        ? 'El título no puede estar vacío ni pasar de 200 caracteres.'
        : 'No se pudo agregar la tarea. Inténtalo de nuevo.';
      setError(message);
      announce(message);
    }
  }

  function handleChange(event) {
    setTitle(event.target.value);
    if (error) setError('');
  }

  return (
    <form
      className="task-form"
      aria-label="Crear nueva tarea"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="task-form__row">
        <label className="visually-hidden" htmlFor="task-title">
          Título de la tarea
        </label>
        <input
          id="task-title"
          name="title"
          type="text"
          className="task-form__input"
          placeholder="¿Qué necesitas hacer?"
          autoComplete="off"
          maxLength={config.titleMaxLength}
          required
          aria-describedby="task-form-error"
          aria-invalid={error ? 'true' : 'false'}
          ref={inputRef}
          value={title}
          onChange={handleChange}
        />
        <button type="submit" className="task-form__submit">Agregar</button>
      </div>
      <p
        id="task-form-error"
        className="task-form__error"
        role="alert"
        hidden={!error}
      >
        {error}
      </p>
    </form>
  );
}

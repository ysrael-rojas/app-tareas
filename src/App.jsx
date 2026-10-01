/**
 * App shell de App Tareas.
 *
 * Arquitectura: la Store vive fuera de React (cerrada en `createStore`) y se
 * entrega a los componentes vía Context (`StoreContext` + `StoreProvider`).
 * `useStore` recupera la Store del Context. El shell renderiza el
 * `<TaskForm />` (creación, tarea 5), el `<Filters />` (filtros con ARIA
 * tabs, tarea 8), y el `<TaskList />` (lista con toggle, edición inline y
 * delete, tareas 6-7). El estado del filtro (`currentFilter`) vive aquí;
 * `<Filters />` lo lee y lo escribe.
 */
import { useState, useContext, createContext } from 'react';
import { createStore } from './store/store.js';
import { announce } from './lib/announce.js';
import TaskForm from './components/TaskForm.jsx';
import Filters from './components/Filters.jsx';
import TaskList from './components/TaskList.jsx';

export const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  // Lazy init so the Store is created exactly once per mount.
  const [store] = useState(() => createStore());
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used inside <StoreProvider>');
  }
  return store;
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const store = useStore();
  const [currentFilter, setCurrentFilter] = useState('all');

  function handleToggle(id) {
    const updated = store.toggle(id);
    if (updated) {
      announce(
        `Tarea ${updated.completed ? 'completada' : 'marcada como pendiente'}: ${updated.title}`,
      );
    }
  }

  function handleUpdate(id, patch) {
    const updated = store.update(id, patch);
    if (updated) {
      announce(`Tarea actualizada: ${updated.title}`);
    }
  }

  function handleDelete(id) {
    const task = store.getById(id);
    if (!task) return;
    const ok = window.confirm(`¿Eliminar la tarea "${task.title}"?`);
    if (!ok) return;
    store.remove(id);
    announce(`Tarea eliminada: ${task.title}`);
    // Devolver el foco al input del formulario de creación: es el lugar
    // natural al que un usuario va tras eliminar (crear otra tarea).
    // Cuando llegue Filters (tarea 8) podemos refinar esto para apuntar
    // al tab 'Todas' si el filtro activo queda vacío, igual que el MVP.
    document.getElementById('task-title')?.focus();
  }

  return (
    <>
      <header className="app-header">
        <h1 className="app-header__title">App Tareas</h1>
        <p className="app-header__subtitle">
          Gestiona tus tareas. Se guardan en este navegador.
        </p>
      </header>
      <main className="app-main">
        <TaskForm />
        <Filters currentFilter={currentFilter} onChange={setCurrentFilter} />
        <TaskList
          filter={currentFilter}
          onToggle={handleToggle}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </main>
    </>
  );
}

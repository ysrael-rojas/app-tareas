/**
 * App shell de App Tareas.
 *
 * Arquitectura: la Store vive fuera de React (cerrada en `createStore`) y se
 * entrega a los componentes vía Context (`StoreContext` + `StoreProvider`).
 * `useStore` recupera la Store del Context. El shell renderiza el
 * `<TaskForm />` (formulario de creación, tarea 5) y el `<TaskList />`
 * (lista con toggle, tarea 6). El estado del filtro (`currentFilter`) vive
 * aquí para que el futuro `<Filters />` (tarea 8) lo lea/escriba sin prop
 * drilling; por ahora queda fijado en `"all"`. Los componentes restantes
 * (`<Filters />`, `<TaskEditForm />`) llegan en las tareas 7-8.
 */
import { useState, useContext, createContext } from 'react';
import { createStore } from './store/store.js';
import { announce } from './lib/announce.js';
import TaskForm from './components/TaskForm.jsx';
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

  function handleEdit(_id) {
    // STUB: wired in task 7 (TaskEditForm).
  }

  function handleDelete(_id) {
    // STUB: wired in task 7 (delete with confirm + focus return).
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
        <TaskList
          filter={currentFilter}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </main>
    </>
  );
}

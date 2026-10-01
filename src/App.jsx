/**
 * App shell de App Tareas.
 *
 * Arquitectura: la Store vive fuera de React (cerrada en `createStore`) y se
 * entrega a los componentes vía Context (`StoreContext` + `StoreProvider`).
 * `useStore` recupera la Store del Context y `useTasks` la sincroniza con
 * `useSyncExternalStore` (pub-sub). El placeholder muestra el conteo vivo de
 * tareas como smoke test de la sincronización; las tareas 5-8 lo reemplazan
 * por componentes reales.
 */
import { useState, useContext, createContext } from 'react';
import { createStore } from './store/store.js';
import { useTasks } from './store/useTasks.js';

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
  const tasks = useTasks(store);
  // Render header + a minimal live placeholder for the rest.
  // Tasks 5-8 will replace the placeholder with real components.
  return (
    <>
      <header className="app-header">
        <h1 className="app-header__title">App Tareas</h1>
        <p className="app-header__subtitle">
          Gestiona tus tareas. Se guardan en este navegador.
        </p>
      </header>
      <main className="app-main">
        <p className="placeholder" data-testid="app-shell-placeholder">
          App shell listo. Tareas: {tasks.length}. Componentes en tareas 5–8.
        </p>
      </main>
    </>
  );
}

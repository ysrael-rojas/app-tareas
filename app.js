// App Tareas — capa de aplicación
// Punto de entrada. La lógica llega en tareas posteriores:
//   3: modelo + persistencia (Store sobre localStorage)
//   4: render + crear
//   5: toggle + editar + eliminar
//   6: filtros + contadores
//   7: pulido + accesibilidad

const APP_NAMESPACE = "app-tareas";
const STORAGE_KEY = `${APP_NAMESPACE}:v1`;

export const config = Object.freeze({
  appName: "App Tareas",
  storageKey: STORAGE_KEY,
  schemaVersion: 1,
  titleMinLength: 1,
  titleMaxLength: 200,
  descriptionMaxLength: 2000,
});

export function bootstrap() {
  // Marcador de inicio. Se reemplaza por la inicialización real en tarea 3.
  document.documentElement.dataset.appState = "bootstrap";
  console.info(`[${config.appName}] bootstrap OK`);
}

bootstrap();

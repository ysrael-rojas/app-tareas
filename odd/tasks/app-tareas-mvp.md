# Feature: app-tareas MVP

## Goal

Web app de gestión de tareas single-user, frontend puro, persistencia local.
CRUD + filtro de estado. Sin backend, sin dependencias, deployable como
static site (abrir `index.html` en cualquier navegador).

## Stack

- HTML5 semántico (single page).
- CSS3 mobile-first con custom properties.
- JavaScript ES2022 vanilla (sin frameworks, sin build).
- `localStorage` para persistencia.
- Sin npm, sin CDN obligatorio.

## Alcance MVP (v1)

- Crear tarea (título requerido, descripción opcional).
- Editar tarea (título + descripción).
- Marcar como completada / pendiente (toggle).
- Eliminar tarea (confirmación inline).
- Listar tareas con contador por estado.
- Filtrar por estado: todas / pendientes / completadas.
- Persistencia en `localStorage` bajo la clave `app-tareas:v1`.
- UI mobile-first usable en pantallas de 360px sin scroll horizontal.
- Estados vacíos y mensajes de error claros.
- Accesibilidad mínima: labels asociados, foco visible, contraste suficiente.

## Fuera de alcance v1 (extensiones futuras si se piden)

- Categorías, etiquetas, prioridades.
- Fechas de vencimiento o recordatorios.
- Búsqueda dentro de la lista.
- Multi-usuario, autenticación, sync entre dispositivos.
- Drag-and-drop, subtareas.
- Tema oscuro, internacionalización.

## Acceptance criteria

1. La app abre en cualquier navegador moderno sin servidor.
2. Crear tarea la agrega visible y persiste tras recargar la página.
3. Marcar como completada la muestra tachada; un segundo toque la devuelve a pendiente.
4. Editar cambia título/descripción en el modelo y en la vista, con persistencia.
5. Eliminar pide confirmación y desaparece tras confirmar.
6. Los filtros (todas/pendientes/completadas) muestran solo las tareas correspondientes y el contador coincide.
7. La lista vacía (en cualquier filtro) muestra un mensaje guía.
8. La app funciona offline; no hay red en runtime.
9. Mobile-first: usable a 360px de ancho sin scroll horizontal.
10. Sin warnings de consola en una sesión limpia de uso normal.

## Modelo de datos

```json
{
  "version": 1,
  "tasks": [
    {
      "id": "string (uuid-like)",
      "title": "string (1-200 chars, requerido)",
      "description": "string (0-2000 chars, opcional, '' por defecto)",
      "completed": false,
      "createdAt": "ISO 8601 timestamp",
      "updatedAt": "ISO 8601 timestamp"
    }
  ]
}
```

## Estructura de archivos

```
app-tareas/
├── index.html
├── styles.css
├── app.js
├── README.md
└── .gitignore
```

## Plan de tareas (8 unidades, work-unit commits)

1. **Bootstrap** — `git init`, `.gitignore`, archivos vacíos, README inicial.
2. **HTML + CSS shell** — estructura semántica y estilos mobile-first (sin lógica).
3. **Modelo + persistencia** — capa `Store` (load/save/add/update/remove) sobre `localStorage`.
4. **Render + crear** — pintar lista, agregar tarea, estado vacío.
5. **Toggle + editar + eliminar** — interacciones de mutación con confirmación de borrado.
6. **Filtros + contadores** — tabs todas/pendientes/completadas y contadores vivos.
7. **Pulido + accesibilidad** — foco, labels, mensajes de error, contraste, prevención de XSS.
8. **Verificación + commit de cierre** — abrir en navegador, validar los 10 criterios, commit final.

## Validación por tarea

- Cada tarea cierra con un commit work-unit con mensaje Conventional Commits.
- Tareas 2-7 incluyen verificación manual descrita en el commit (`how to verify`).
- Tarea 8 ejecuta la verificación manual completa y reporta el resultado en el feature doc.

## Riesgos

- `localStorage` tiene cuota (~5-10 MB); suficiente para miles de tareas pero no ilimitada.
- Sin tests automatizados en v1 (validación manual); los criterios de aceptación son la red de seguridad.
- Versionado del modelo: si cambia el schema en v2, hará falta una migración; v1 deja el cimiento.

## Evidence / commits

Los commits se registran en este documento al cerrar cada tarea. Una tarea
puede producir 1-2 commits: el commit work-unit de la tarea y, cuando aplica,
un commit de evidencia para reflejar este bloque en el repo.

- **Tarea 1 / Bootstrap** — commit work-unit `6673680` (`chore: bootstrap initial project structure`) + commit de evidencia `a7f7a93` (`docs(odd): record task 1 bootstrap commit evidence`) + `d8e4a48` (clarificación). Archivos: `.gitignore`, `README.md`, `app.js`, `index.html`, `odd/tasks/app-tareas-mvp.md`, `styles.css`. A partir de la tarea 2 la evidencia se incluye en el propio commit work-unit para mantener 1 commit por tarea cuando sea posible.

- **Tarea 2 / HTML + CSS shell** — commit work-unit `8799512` (`feat(ui): build semantic HTML shell and mobile-first CSS`) + commit de evidencia `ffa7bb1`. Cambios: `index.html` ahora contiene la estructura semántica completa (header, form, filtros, lista vacía, empty state, footer, skip-link de accesibilidad). `styles.css` añade reset, tokens completos, layout mobile-first, estilos de formulario, filtros (tabs con `data-filter`), empty state y un breakpoint para ≥768px. Validación previa: parser HTML confirma estructura balanceada y manejo correcto de void elements; CSS con llaves balanceadas (36 abiertas / 36 cerradas). Sin lógica JS todavía.

- **Tarea 3 / Modelo + persistencia** — commit work-unit `115fd05` (`feat(store): add Store layer over localStorage with validation`) + commit de evidencia `43458be`. Cambios: `app.js` ahora implementa la capa `Store` con `createStore()` que devuelve `{ getAll, getById, add, update, toggle, remove }`. Validación estricta de title (1-200 chars) y description (0-2000 chars). IDs via `crypto.randomUUID()` con fallback. Timestamps ISO 8601. Persistencia en `localStorage` clave `app-tareas:v1` con payload versionado (`version: 1`). Manejo robusto: storage ausente (modo privado), JSON corrupto (reset con warning), version mismatch (reset con warning), copia defensiva en `getAll()` para evitar mutación externa. Verificación: `node --check` OK + 19/19 tests unitarios contra un localStorage simulado cubren CRUD, toggle, reload, validación, JSON corrupto, version mismatch y copia defensiva.

- **Tarea 4 / Render + crear** — commit work-unit `7424ba6` (`feat(ui): render task list from store and wire create-task form`) + commit de evidencia `a5d5f5b`. Cambios: `app.js` añade `createTaskElement()`, `render()` y `setupForm()`. `render()` reconstruye la lista desde `store.getAll()` con `replaceChildren` sobre un fragment (evita reflows por tarea) y muestra/oculta el `#empty-state` según el conteo. `createTaskElement` usa exclusivamente `textContent` y `setAttribute` (nunca `innerHTML`) para que title y description del usuario no puedan inyectar markup; clase `is-completed` aplicada cuando `task.completed === true`; el checkbox y los botones Editar/Eliminar se renderizan pero están `disabled` hasta la tarea 5. `setupForm` intercepta el submit, llama a `store.add()`, limpia el input y re-renderiza; marca `aria-invalid` en el input si la validación falla. `init()` corre cuando el DOM está listo (carga diferida con `DOMContentLoaded` si aplica). Estilos nuevos en `styles.css`: `.task`, `.task__toggle`, `.task__content`, `.task__title`, `.task__description`, `.task__actions`, `.task__action`, `.task__action--danger`, `.is-completed` (tachado), estado `[aria-invalid="true"]` para el input del form. Verificación: `node --check app.js` OK, CSS con llaves balanceadas (53/53), 10/10 tests de Store siguen pasando tras la integración.

- **Tarea 5 / Toggle + editar + eliminar** — commit work-unit `178624c` (`feat(ui): wire toggle, inline edit, and confirm-before-delete on tasks`) + commit de evidencia `e31f6df`. Cambios: `app.js` habilita el checkbox y los botones Editar/Eliminar; añade `createTaskEdit()` (edición inline con inputs + textarea + botones Guardar/Cancelar), `enterEditMode()` (reemplaza el `<li>` por la versión editable y enfoca el título con `select()`), `handleSaveEdit()` (valida, llama `store.update()` y re-renderiza), `handleDelete()` (usa `window.confirm()` con el título de la tarea), y `setupTaskEvents()` con event delegation sobre `#task-list` para click (edit/delete/cancel-edit), change (toggle), submit (guardar) y keydown (Escape cancela la edición). Estilos nuevos en `styles.css`: `.task--editing`, `.task-edit-form`, `.task-edit-form__input`, `.task-edit-form__textarea`, `.task-edit-form__actions`, `.task-edit-form__save`, `.task-edit-form__cancel`. Verificación: `node --check app.js` OK, CSS con llaves balanceadas (66/66).

- **Tarea 6 / Filtros + contadores** — commit work-unit `c0cfb7f` (`feat(ui): add filters with live counters and contextual empty state`). Cambios: `app.js` añade `currentFilter` (módulo) + `VALID_FILTERS`, `setFilter()`, `getFilteredTasks()`, `getCounts()` (cuenta `all`, `pending`, `completed` en una sola pasada), `emptyMessageFor()` (mensaje contextual según filtro y total), y `setupFilters()` con event delegation sobre `.filters`. `render()` ahora actualiza los contadores en `.filters__count[data-counter]`, sincroniza los tabs (`is-active` + `aria-pressed`), pinta solo la lista filtrada y muestra empty state contextual ("No hay tareas pendientes. ¡Bien hecho!", "Aún no has completado ninguna tarea.", o el mensaje de "lista totalmente vacía"). El listener de `change` sobre el toggle ahora hace `render()` completo (en lugar de mutación local del li) para que los contadores se mantengan coherentes. `init()` cablea `setupFilters()`. Verificación: `node --check app.js` OK, **18/18 tests de integración con jsdom** que cubren render inicial, alta con XSS, contadores vivos, toggle, los tres filtros, empty contextual y persistencia.
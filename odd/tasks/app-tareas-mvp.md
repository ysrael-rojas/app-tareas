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

Los commits se registran en este documento al cerrar cada tarea (hash + mensaje).
Se actualizan en orden de cierre; el último commit aparece arriba.

- `6673680` — **Tarea 1 / Bootstrap** — `chore: bootstrap initial project structure` (6 archivos: .gitignore, README.md, app.js, index.html, odd/tasks/app-tareas-mvp.md, styles.css).
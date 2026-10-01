# App Tareas

Aplicación web estática para gestionar tareas personales. Frontend puro con
persistencia local en el navegador. Sin backend, sin build, sin dependencias.

## Stack

- HTML5 semántico (single page: `index.html`).
- CSS3 mobile-first con custom properties (`styles.css`).
- JavaScript ES2022 vanilla en módulos (`app.js`).
- Persistencia: `localStorage` bajo la clave `app-tareas:v1`.

## Cómo abrir

La app usa `<script type="module">`, que los navegadores bloquean cuando se abre
el archivo directamente desde el disco (`file://`) por seguridad (CORS).
**Hay que servirla con un servidor estático local.** Cualquiera de estos vale:

```bash
# Python (ya viene en macOS/Linux y suele estar en Windows)
python -m http.server 8000

# Node
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Luego abre **http://localhost:8000** en el navegador.

Para parar el servidor de Python: `Ctrl+C` en la terminal donde lo lanzaste.

## Estructura

```
app-tareas/
├── index.html       # Estructura semántica
├── styles.css       # Estilos mobile-first
├── app.js           # Lógica de la aplicación
└── README.md        # Este archivo
```

## Estado del proyecto

MVP cerrado (tarea 8/8). Plan y criterios en
`odd/tasks/app-tareas-mvp.md`. Funcionalidad implementada: crear,
editar inline, toggle completar, eliminar con confirmación, filtros
todas/pendientes/completadas con contadores vivos, persistencia
versionada en `localStorage`, accesibilidad WCAG (ARIA tabs, focus
management, announcer, errores visibles).

## Verificación

La verificación automática del MVP vive en
`/tmp/test-app-tareas/acceptance.mjs` (sandbox fuera del repo, con
`jsdom` instalado solo para el test). Cubre los 10 criterios de
aceptación del feature doc con 28 checks; resultado: **28/28 PASS**.

Para ejecutarla de nuevo:

```bash
mkdir -p /tmp/test-app-tareas
cd /tmp/test-app-tareas
npm init -y
npm install jsdom
# copiar acceptance.mjs a este directorio y ejecutarlo
node acceptance.mjs
```

El script lee `index.html` y `app.js` desde este repo, monta JSDOM,
dispara los eventos esperados y verifica el resultado esperado.

## Cómo contribuir

El flujo ODD sigue siendo: implementar tarea → commit work-unit →
actualizar `odd/tasks/app-tareas-mvp.md` con el hash del commit. Si
añades tareas, replica el patrón: actualiza el feature doc dentro del
mismo commit cuando puedas, o con un commit de evidencia aparte si ya
hiciste el commit work-unit.

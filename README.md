# App Tareas

Aplicación web estática para gestionar tareas personales. Frontend puro con
persistencia local en el navegador. Sin backend, sin build, sin dependencias.

## Stack

- HTML5 semántico (single page: `index.html`).
- CSS3 mobile-first con custom properties (`styles.css`).
- JavaScript ES2022 vanilla en módulos (`app.js`).
- Persistencia: `localStorage` bajo la clave `app-tareas:v1`.

## Cómo abrir

Opción 1 — abrir el archivo directamente:

```bash
# Doble click en index.html, o:
xdg-open index.html        # Linux
open index.html            # macOS
start index.html           # Windows
```

Opción 2 — servir local (recomendado para desarrollo):

```bash
python -m http.server 8000
# luego abre http://localhost:8000
```

## Estructura

```
app-tareas/
├── index.html       # Estructura semántica
├── styles.css       # Estilos mobile-first
├── app.js           # Lógica de la aplicación
└── README.md        # Este archivo
```

## Estado del proyecto

Este proyecto sigue el flujo ODD. Las tareas viven en
`odd/tasks/app-tareas-mvp.md` y registran los commits work-unit que cierran
cada unidad de trabajo. Consulta ese archivo para el plan completo, los
criterios de aceptación y el progreso.

## Cómo contribuir

Por ahora el flujo es: implementar tarea → commit work-unit → actualizar
`odd/tasks/app-tareas-mvp.md` con el hash del commit. No hay tests
automatizados en v1; la verificación es manual contra los 10 criterios
de aceptación listados en el feature doc.

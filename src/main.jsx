import React from 'react'
import ReactDOM from 'react-dom/client'
import '../styles.css'

function App() {
  return (
    <header className="app-header">
      <h1 className="app-header__title">App Tareas</h1>
      <p className="app-header__subtitle">
        Gestiona tus tareas. Se guardan en este navegador.
      </p>
    </header>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

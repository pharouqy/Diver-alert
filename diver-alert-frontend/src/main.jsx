import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// CSS Leaflet — doit être importé avant tout composant utilisant react-leaflet
// Sans cet import, la carte s'affiche vide ou les tuiles sont mal positionnées
import 'leaflet/dist/leaflet.css'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
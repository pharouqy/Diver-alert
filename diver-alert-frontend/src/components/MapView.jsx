/**
 * src/components/MapView.jsx
 *
 * Carte Leaflet interactive — affiche :
 *  — La position de l'utilisateur courant (marqueur bleu + cercle de rayon)
 *  — Les autres plongeurs connectés (marqueurs colorés par rôle)
 *  — Une alerte SOS active (marqueur rouge + cercle danger)
 *
 * ── Fix Leaflet + Vite ────────────────────────────────────────────────────
 * Leaflet référence ses icônes PNG via __webpack_require__ qui n'existe pas
 * dans Vite. On supprime la résolution automatique et on injecte les URLs
 * correctement résolues par Vite à la compilation.
 *
 * ── Props ─────────────────────────────────────────────────────────────────
 * currentPosition  { latitude, longitude, accuracy } | null — position GPS du user
 * userId           string — ID de l'utilisateur courant (pour l'exclure des autres)
 * divers           Array<{ userId, name, role, position }> — plongeurs connectés
 * alertRadius      number (km) — rayon du cercle affiché autour du user
 * activeAlert      { emitter, position, radius } | null — alerte SOS en cours
 */

import { useEffect } from 'react'
import {
  MapContainer, TileLayer, Marker,
  Popup, Circle, useMap,
} from 'react-leaflet'
import L from 'leaflet'

// ── Fix icônes Leaflet / Vite ────────────────────────────────────────────────
import iconUrl       from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl     from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

// ── Centre par défaut (Méditerranée — Baie d'Alger) ─────────────────────────
const DEFAULT_CENTER = [36.7375, 3.0864]
const DEFAULT_ZOOM   = 13

// ── Usine d'icônes personnalisées ────────────────────────────────────────────
/**
 * Crée un DivIcon circulaire avec emoji selon le contexte du plongeur.
 * @param {'diver'|'rescuer'} role
 * @param {boolean} isMe    - true si c'est l'utilisateur courant
 * @param {boolean} isSOS   - true si ce plongeur émet une alerte active
 */
const createDiverIcon = (role = 'diver', isMe = false, isSOS = false) => {
  const color = isSOS    ? '#ff3b3b'
              : isMe     ? '#00bfff'
              : role === 'rescuer' ? '#00c851'
              : '#ffa500'

  const emoji = isSOS    ? '🆘'
              : isMe     ? '📍'
              : role === 'rescuer' ? '🚨'
              : '🤿'

  return L.divIcon({
    html: `<div style="
      background:${color};border-radius:50%;
      width:38px;height:38px;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;border:2px solid rgba(255,255,255,0.9);
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      cursor:pointer;
    ">${emoji}</div>`,
    iconSize:   [38, 38],
    iconAnchor: [19, 19],
    popupAnchor:[0, -22],
    className:  '',  // Supprime la classe par défaut qui ajoute un fond blanc
  })
}

// ── Sous-composant : re-centrage automatique ──────────────────────────────────
/**
 * Écoute les changements de position et recentre la carte.
 * Doit être rendu DANS <MapContainer> pour accéder à useMap().
 */
function AutoCenter({ position }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView(
        [position.latitude, position.longitude],
        map.getZoom(),
        { animate: true, duration: 0.5 }
      )
    }
  }, [position, map])

  return null
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function MapView({
  currentPosition = null,
  userId          = null,
  divers          = [],
  alertRadius     = 5,
  activeAlert     = null,
}) {
  const center = currentPosition
    ? [currentPosition.latitude, currentPosition.longitude]
    : DEFAULT_CENTER

  return (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      {/* ── Fond de carte OpenStreetMap (gratuit, sans clé API) ─────────── */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      {/* ── Auto-centrage sur la position de l'utilisateur ──────────────── */}
      {currentPosition && <AutoCenter position={currentPosition} />}

      {/* ── Utilisateur courant ─────────────────────────────────────────── */}
      {currentPosition && (
        <>
          <Marker
            position={[currentPosition.latitude, currentPosition.longitude]}
            icon={createDiverIcon('diver', true)}
          >
            <Popup>
              <div style={{ minWidth: '140px' }}>
                <strong>📍 Vous</strong>
                <br />
                <span style={{ fontSize: '0.8em', color: '#666' }}>
                  Précision : {currentPosition.accuracy}m
                </span>
              </div>
            </Popup>
          </Marker>

          {/* Cercle de rayon d'alerte — pointillé bleu */}
          <Circle
            center={[currentPosition.latitude, currentPosition.longitude]}
            radius={alertRadius * 1000}   // km → mètres
            pathOptions={{
              color:       'var(--color-accent, #00bfff)',
              fillColor:   'var(--color-accent, #00bfff)',
              fillOpacity: 0.05,
              dashArray:   '8, 6',
              weight:      2,
            }}
          />
        </>
      )}

      {/* ── Autres plongeurs connectés ───────────────────────────────────── */}
      {divers
        .filter((d) => d.userId !== userId && d.position !== null)
        .map((diver) => (
          <Marker
            key={diver.userId}
            position={[diver.position.latitude, diver.position.longitude]}
            icon={createDiverIcon(diver.role)}
          >
            <Popup>
              <div style={{ minWidth: '140px' }}>
                <strong>
                  {diver.role === 'rescuer' ? '🚨' : '🤿'} {diver.name}
                </strong>
                <br />
                <span style={{ fontSize: '0.8em', color: '#666' }}>
                  {diver.role === 'rescuer' ? 'Sauveteur' : 'Plongeur'}
                </span>
              </div>
            </Popup>
          </Marker>
        ))
      }

      {/* ── Alerte SOS active ────────────────────────────────────────────── */}
      {activeAlert?.position && (
        <>
          <Marker
            position={[activeAlert.position.latitude, activeAlert.position.longitude]}
            icon={createDiverIcon('diver', false, true)}
          >
            <Popup>
              <div style={{ minWidth: '160px' }}>
                <strong style={{ color: '#ff3b3b' }}>🆘 ALERTE SOS</strong>
                <br />
                <span style={{ fontSize: '0.85em' }}>
                  {activeAlert.emitter?.name}
                </span>
                <br />
                <span style={{ fontSize: '0.75em', color: '#888' }}>
                  Rayon : {activeAlert.radius} km
                </span>
              </div>
            </Popup>
          </Marker>

          {/* Zone de danger — rouge semi-transparent */}
          <Circle
            center={[activeAlert.position.latitude, activeAlert.position.longitude]}
            radius={activeAlert.radius * 1000}
            pathOptions={{
              color:       '#ff3b3b',
              fillColor:   '#ff3b3b',
              fillOpacity: 0.12,
              weight:      2,
            }}
          />
        </>
      )}
    </MapContainer>
  )
}
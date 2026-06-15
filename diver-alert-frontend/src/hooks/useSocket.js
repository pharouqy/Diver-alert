/**
 * src/hooks/useSocket.js
 *
 * Re-exporte useSocket depuis le contexte.
 * Ajoute usePositionEmitter : émet la position GPS au socket de façon throttlée.
 *
 * Séparation intentionnelle de la fréquence navigateur vs réseau :
 *  — navigator.geolocation.watchPosition() → update à chaque changement GPS
 *  — Socket emission → toutes les VITE_POSITION_UPDATE_INTERVAL_MS (défaut 5s)
 *
 * Cette throttling réduit :
 *  — La consommation réseau
 *  — La charge serveur (Map updates + broadcast)
 *  — La consommation batterie (radio WiFi/4G)
 */

import { useEffect, useRef } from 'react'
import { useSocket as useSocketCtx } from '../context/SocketContext'

// Re-export direct pour import simplifié
export { useSocket } from '../context/SocketContext'

const DEFAULT_INTERVAL_MS = parseInt(
    import.meta.env.VITE_POSITION_UPDATE_INTERVAL_MS
) || 5_000

/**
 * Émet la position GPS courante au socket toutes les `intervalMs` millisecondes.
 * Utilise une ref pour toujours avoir la position la plus récente sans
 * relancer l'intervalle à chaque update GPS.
 *
 * @param {{ latitude, longitude, accuracy, timestamp } | null} position
 * @param {number} intervalMs - Fréquence d'émission en ms (défaut : 5000)
 */
export function usePositionEmitter(position, intervalMs = DEFAULT_INTERVAL_MS) {
    const { emitPosition, isConnected } = useSocketCtx()

    // Ref toujours synchronisée avec la position la plus récente
    const positionRef = useRef(position)
    useEffect(() => {
        positionRef.current = position
    }, [position])

    useEffect(() => {
        if (!isConnected) return

        // Émettre immédiatement à la (re)connexion si une position est disponible
        if (positionRef.current) {
            emitPosition(positionRef.current)
        }

        // Puis émettre à intervalle régulier
        const interval = setInterval(() => {
            if (positionRef.current) {
                emitPosition(positionRef.current)
            }
        }, intervalMs)

        return () => clearInterval(interval)

        // N'inclure que isConnected et intervalMs — pas emitPosition (useCallback stable)
        // ni positionRef (ref stable par définition)
    }, [isConnected, intervalMs, emitPosition])
}
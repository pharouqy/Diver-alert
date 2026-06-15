/**
 * src/hooks/useGeolocation.js
 *
 * Hook de géolocalisation continue via watchPosition().
 *
 * Gestion des cas couverts :
 *  — Géolocalisation non supportée (navigateur trop ancien)
 *  — Permission refusée (code 1) — message explicite + bouton retry
 *  — GPS indisponible (code 2) — pas de signal ou hors zone
 *  — Timeout (code 3) — délai dépassé sans fix GPS
 *  — Précision insuffisante — indicateur hasGoodAccuracy
 *  — Redémarrage forcé — via retry()
 *
 * ── Paramètres watchPosition ─────────────────────────────────────────────────
 * enableHighAccuracy: true → active le GPS matériel (précision ~5-15m en mer)
 *                          → consomme plus de batterie — acceptable pour usage actif
 * timeout: 15s             → abandonne après 15s sans position (onError code 3)
 * maximumAge: 10s          → accepte une position en cache de moins de 10s
 *
 * ── Précision GPS acceptable ────────────────────────────────────────────────
 * ACCURACY_WARN_THRESHOLD_M = 100m
 * En dessous → hasGoodAccuracy = true (qualité suffisante pour une alerte SOS)
 * Au dessus  → hasGoodAccuracy = false (position approximative — à signaler au plongeur)
 */

import { useState, useEffect, useCallback } from 'react'

// Options fixes — pas de paramètre externe pour éviter les re-renders infinis
const GEO_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 15_000,
    maximumAge: 10_000,
}

/** Seuil de précision acceptable en mètres */
const ACCURACY_WARN_THRESHOLD_M = 100

/** Messages d'erreur lisibles selon le code GeolocationPositionError */
const ERROR_MESSAGES = {
    0: 'La géolocalisation n\'est pas supportée par ce navigateur',
    1: 'Accès GPS refusé — activez la localisation dans les paramètres du navigateur',
    2: 'Signal GPS indisponible — déplacez-vous vers un endroit dégagé',
    3: 'Délai d\'attente GPS dépassé — réessayez dans un endroit dégagé',
}

/**
 * @returns {{
 *   position: { latitude: number, longitude: number, accuracy: number, timestamp: number } | null,
 *   error: { code: number, message: string } | null,
 *   isLoading: boolean,
 *   isSupported: boolean,
 *   hasGoodAccuracy: boolean,
 *   retry: () => void,
 * }}
 */
export function useGeolocation() {
    const [position, setPosition] = useState(null)
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    // Incrémenter watchKey force le redémarrage de l'effet (= nouveau watchPosition)
    const [watchKey, setWatchKey] = useState(0)

    const isSupported = 'geolocation' in navigator

    useEffect(() => {
        // Cas : navigateur sans API géolocalisation
        if (!isSupported) {
            setError({ code: 0, message: ERROR_MESSAGES[0] })
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)

        // ── Succès : nouvelle position disponible ─────────────────────────────────
        const onSuccess = (pos) => {
            setPosition({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: Math.round(pos.coords.accuracy), // Arrondi en mètres
                timestamp: pos.timestamp,
            })
            setIsLoading(false)
        }

        // ── Erreur GPS ────────────────────────────────────────────────────────────
        const onError = (err) => {
            setError({
                code: err.code,
                message: ERROR_MESSAGES[err.code] ?? err.message,
            })
            // Position gardée si on en avait une — permet de continuer à afficher la carte
            setIsLoading(false)
        }

        const watchId = navigator.geolocation.watchPosition(onSuccess, onError, GEO_OPTIONS)

        // Nettoyage : arrêter le suivi quand le composant est démonté ou watchKey change
        return () => {
            navigator.geolocation.clearWatch(watchId)
        }
    }, [isSupported, watchKey]) // watchKey change → l'effet repart depuis zéro

    /**
     * Force un nouveau départ du watchPosition.
     * Utile après un refus temporaire ou un timeout.
     */
    const retry = useCallback(() => {
        setPosition(null)
        setError(null)
        setIsLoading(true)
        setWatchKey((k) => k + 1)
    }, [])

    /** true si la précision GPS est en dessous du seuil acceptable */
    const hasGoodAccuracy = position !== null && position.accuracy <= ACCURACY_WARN_THRESHOLD_M

    return { position, error, isLoading, isSupported, hasGoodAccuracy, retry }
}
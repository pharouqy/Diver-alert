/**
 * src/components/AlertNotification.jsx
 *
 * Overlay plein écran affiché quand un plongeur reçoit une alerte SOS.
 *
 * ── Comportement ────────────────────────────────────────────────────────────
 *  — Apparaît automatiquement quand activeAlert passe de null à un objet
 *  — Joue 3 bips via Web Audio API à l'affichage (sans fichier audio externe)
 *  — Se réinitialise automatiquement si une NOUVELLE alerte arrive (alertId différent)
 *  — "Compris — voir sur la carte" : ferme le modal, l'alerte reste visible sur la carte
 *  — Se ferme seul quand alert:cancelled est reçu (activeAlert → null)
 *
 * ── Props ────────────────────────────────────────────────────────────────────
 *  alert       Object | null  — l'alerte SOS reçue (depuis SocketContext.activeAlert)
 *  myPosition  Object | null  — position GPS de l'utilisateur courant
 *  onDismiss   () => void     — appelé à la fermeture du modal
 */

import { useState, useEffect, useRef } from "react";
import { haversineDistance } from "../utils/haversine";

// ── Son d'alerte (Web Audio API — aucun fichier externe requis) ───────────────
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // 3 bips courts à 880 Hz — signal d'urgence universel
    [0, 0.35, 0.7].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + 0.28,
      );
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.28);
    });
  } catch (e) {
    console.warn("Son d'alerte indisponible :", e.message);
  }
}

// ── Composant ────────────────────────────────────────────────────────────────
export default function AlertNotification({ alert, myPosition, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);
  const playedRef = useRef(null); // ID de la dernière alerte pour laquelle on a joué le son

  // Réinitialiser quand UNE NOUVELLE alerte arrive (nouvel alertId)
  useEffect(() => {
    if (alert?.alertId && alert.alertId !== playedRef.current) {
      setDismissed(false);
      playedRef.current = alert.alertId;
      playAlertSound();
    }
  }, [alert?.alertId]);

  // Fermeture automatique quand l'alerte est annulée côté socket
  useEffect(() => {
    if (!alert) setDismissed(false);
  }, [alert]);

  if (!alert || dismissed) return null;

  const distance =
    myPosition && alert.position
      ? haversineDistance(myPosition, {
          latitude: alert.position.latitude,
          longitude: alert.position.longitude,
        })
      : null;

  const isVeryClose = distance !== null && distance < 1; // < 1 km

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      style={S.overlay}
      role="alertdialog"
      aria-modal="true"
      aria-label="Alerte SOS reçue"
    >
      <div style={S.modal}>
        {/* ── En-tête ────────────────────────────────────────────────────── */}
        <div style={S.header}>
          <span
            className="sos-pulse"
            style={{ fontSize: "3.5rem", lineHeight: 1 }}
          >
            🆘
          </span>
          <div>
            <h2 style={S.title}>ALERTE SOS REÇUE</h2>
            <p style={S.sub}>Un plongeur est en situation de détresse</p>
          </div>
        </div>

        {/* ── Grille d'informations ──────────────────────────────────────── */}
        <div style={S.grid}>
          <Row icon="👤" label="Plongeur en détresse">
            <strong>{alert.emitter?.name ?? "Inconnu"}</strong>
          </Row>
          <Row icon="🏷️" label="Rôle">
            {alert.emitter?.role === "rescuer" ? "🚨 Sauveteur" : "🤿 Plongeur"}
          </Row>
          <Row icon="📍" label="Position">
            <code style={{ fontSize: "0.8rem" }}>
              {alert.position?.latitude.toFixed(5)}°,&nbsp;
              {alert.position?.longitude.toFixed(5)}°
            </code>
          </Row>
          <Row icon="📏" label="Distance de vous">
            {distance !== null ? (
              <span
                style={{
                  color: isVeryClose
                    ? "var(--color-danger)"
                    : "var(--color-accent)",
                  fontWeight: 700,
                }}
              >
                {distance} km {isVeryClose && "⚠️ Très proche !"}
              </span>
            ) : (
              <span style={{ color: "var(--color-text-muted)" }}>
                GPS indisponible
              </span>
            )}
          </Row>
          <Row icon="⭕" label="Rayon d'alerte">
            {alert.radius} km
          </Row>
          <Row icon="🕐" label="Heure">
            {alert.createdAt
              ? new Date(alert.createdAt).toLocaleTimeString("fr-FR")
              : "—"}
          </Row>
        </div>

        {/* ── Avertissement précision GPS faible ────────────────────────── */}
        {alert.position?.accuracy != null && alert.position.accuracy > 500 && (
          <div style={S.warnBox}>
            ⚠️ Précision GPS de l'émetteur :{" "}
            <strong>{alert.position.accuracy}m</strong> — la position indiquée
            est approximative
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div style={S.actions}>
          <button onClick={handleDismiss} style={S.dismissBtn}>
            ✓ Compris — voir sur la carte
          </button>
          <button
            onClick={playAlertSound}
            style={S.replayBtn}
            title="Rejouer le son d'alerte"
          >
            🔔
          </button>
        </div>

        {/* ── Disclaimer ────────────────────────────────────────────────── */}
        <p style={S.disclaimer}>
          ⚠️ Ce MVP est un prototype d'assistance — il ne remplace pas les
          secours officiels. En cas d'urgence maritime réelle, contactez les
          autorités compétentes.
        </p>
      </div>
    </div>
  );
}

// ── Sous-composant ligne d'info ────────────────────────────────────────────
function Row({ icon, label, children }) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>
        {icon} {label}
      </span>
      <span style={S.rowValue}>{children}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.88)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  },
  modal: {
    background: "var(--color-ocean-mid)",
    border: "2px solid var(--color-danger)",
    borderRadius: "var(--radius-lg)",
    padding: "1.5rem",
    maxWidth: "500px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 0 40px rgba(255,59,59,0.3)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.25rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid var(--color-border)",
  },
  title: {
    color: "var(--color-danger)",
    fontSize: "1.25rem",
    fontWeight: 700,
    margin: 0,
    letterSpacing: "0.5px",
  },
  sub: {
    color: "var(--color-text-muted)",
    fontSize: "0.875rem",
    margin: "0.25rem 0 0",
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0.75rem",
    background: "var(--color-ocean-deep)",
    borderRadius: "var(--radius-sm)",
    gap: "1rem",
  },
  rowLabel: {
    fontSize: "0.8rem",
    color: "var(--color-text-muted)",
    whiteSpace: "nowrap",
  },
  rowValue: {
    fontSize: "0.875rem",
    color: "var(--color-accent)",
    textAlign: "right",
  },
  warnBox: {
    background: "#2a1a00",
    border: "1px solid var(--color-warning)",
    borderRadius: "var(--radius-sm)",
    padding: "0.625rem 0.75rem",
    fontSize: "0.8rem",
    color: "var(--color-warning)",
    marginBottom: "1rem",
  },
  actions: { display: "flex", gap: "0.5rem", marginBottom: "1rem" },
  dismissBtn: {
    flex: 1,
    background: "var(--color-ocean-light)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "0.75rem",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  replayBtn: {
    background: "transparent",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "0.75rem 0.875rem",
    fontSize: "1rem",
    cursor: "pointer",
  },
  disclaimer: {
    fontSize: "0.7rem",
    color: "var(--color-text-muted)",
    textAlign: "center",
    lineHeight: 1.5,
    fontStyle: "italic",
    borderTop: "1px solid var(--color-border)",
    paddingTop: "0.75rem",
    margin: 0,
  },
};

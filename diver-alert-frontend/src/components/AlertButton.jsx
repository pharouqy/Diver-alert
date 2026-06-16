/**
 * src/components/AlertButton.jsx
 *
 * Bouton SOS à double confirmation.
 *
 * ── Cycle de vie ──────────────────────────────────────────────────────────
 *  idle
 *   ↓ [clic SOS]
 *  confirming  ← countdown 5s affiché + barre de progression
 *   ↓ [clic "CONFIRMER" OU countdown à 0]   ↘ [clic "Annuler" / timeout]
 *  active      ← timer temps écoulé affiché  →  idle
 *   ↓ [clic "Annuler l'alerte"]
 *  idle
 *
 * ── Props ─────────────────────────────────────────────────────────────────
 * position      { latitude, longitude, accuracy } | null
 * isConnected   boolean
 * alertRadius   number (km)
 * onRadiusChange (km: number) => void
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "../hooks/useSocket";

const CONFIRM_SECS = 5; // Secondes de countdown avant confirmation automatique

export default function AlertButton({
  position,
  isConnected,
  alertRadius = 5,
  onRadiusChange = () => {},
}) {
  const { emitSOS, cancelAlert, myAlertId } = useSocket();

  const [phase, setPhase] = useState("idle"); // 'idle' | 'confirming' | 'active'
  const [countdown, setCountdown] = useState(CONFIRM_SECS);
  const [elapsed, setElapsed] = useState(0);

  const confirmRef = useRef(null); // Intervalle countdown confirmation
  const elapsedRef = useRef(null); // Intervalle timer actif

  const canSend = Boolean(position && isConnected);

  // ── Sync avec myAlertId (confirmation serveur) ────────────────────────────
  useEffect(() => {
    if (myAlertId && phase !== "active") {
      setPhase("active");
      setElapsed(0);
      // Démarrer le timer temps écoulé
      clearInterval(elapsedRef.current);
      let s = 0;
      elapsedRef.current = setInterval(() => {
        s += 1;
        setElapsed(s);
      }, 1000);
    }
  }, [myAlertId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync avec annulation distante (alert:cancelled reçu) ─────────────────
  useEffect(() => {
    if (!myAlertId && phase === "active") {
      clearInterval(elapsedRef.current);
      setPhase("idle");
      setElapsed(0);
    }
  }, [myAlertId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup global ────────────────────────────────────────────────────────
  useEffect(
    () => () => {
      clearInterval(confirmRef.current);
      clearInterval(elapsedRef.current);
    },
    [],
  );

  // ── Démarrer la phase de confirmation ─────────────────────────────────────
  const startConfirming = () => {
    if (!canSend) return;
    setPhase("confirming");
    setCountdown(CONFIRM_SECS);
    let remaining = CONFIRM_SECS;
    confirmRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(confirmRef.current);
        doEmitSOS();
      }
    }, 1000);
  };

  // ── Annuler la phase de confirmation ──────────────────────────────────────
  const abortConfirming = useCallback(() => {
    clearInterval(confirmRef.current);
    setPhase("idle");
    setCountdown(CONFIRM_SECS);
  }, []);

  // ── Émettre le SOS ────────────────────────────────────────────────────────
  const doEmitSOS = useCallback(() => {
    clearInterval(confirmRef.current);
    if (!position) return;
    emitSOS(position, alertRadius);
    // La phase 'active' sera déclenchée par myAlertId dans le useEffect
  }, [position, alertRadius, emitSOS]);

  // ── Annuler l'alerte active ───────────────────────────────────────────────
  const handleCancelAlert = () => {
    if (myAlertId) cancelAlert(myAlertId);
    clearInterval(elapsedRef.current);
    setPhase("idle");
    setElapsed(0);
  };

  // ── Formatage heure ───────────────────────────────────────────────────────
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ════════════════════════════════════════════════════════════════════
  //  RENDU : phase IDLE
  // ════════════════════════════════════════════════════════════════════
  if (phase === "idle") {
    return (
      <div style={S.wrap}>
        <button
          onClick={startConfirming}
          disabled={!canSend}
          style={{ ...S.mainBtn, opacity: canSend ? 1 : 0.45 }}
        >
          🆘 ENVOYER UNE ALERTE SOS
        </button>

        {/* ── Rayon configurable ──────────────────────────────────────────── */}
        <div style={S.radiusRow}>
          <span style={S.radiusLbl}>Rayon :</span>
          <input
            type="range"
            min="0.5"
            max="30"
            step="0.5"
            value={alertRadius}
            onChange={(e) => onRadiusChange(parseFloat(e.target.value))}
          />
          <span style={S.radiusVal}>{alertRadius} km</span>
        </div>

        <p style={S.hint}>
          {!isConnected
            ? "🔴 Non connecté au serveur"
            : !position
              ? "⏳ En attente du signal GPS..."
              : "⚡ Appuie deux fois pour déclencher une alerte"}
        </p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  //  RENDU : phase CONFIRMING
  // ════════════════════════════════════════════════════════════════════
  if (phase === "confirming") {
    const progress = ((CONFIRM_SECS - countdown) / CONFIRM_SECS) * 100;

    return (
      <div style={S.wrap}>
        <p style={S.confirmMsg}>
          ⚠️ Alerte dans <strong>{countdown}s</strong> — ou confirme maintenant
        </p>

        {/* Barre de progression */}
        <div style={S.track}>
          <div
            style={{
              ...S.bar,
              width: `${progress}%`,
              transition: "width 0.95s linear",
            }}
          />
        </div>

        <div style={S.confirmBtns}>
          <button onClick={abortConfirming} style={S.abortBtn}>
            ✕ Annuler
          </button>
          <button onClick={doEmitSOS} style={S.confirmBtn}>
            🆘 CONFIRMER MAINTENANT
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  //  RENDU : phase ACTIVE
  // ════════════════════════════════════════════════════════════════════
  return (
    <div style={S.wrap}>
      <div style={S.activeBox}>
        <span className="sos-pulse" style={{ fontSize: "2rem" }}>
          🆘
        </span>
        <div>
          <div style={S.activeTitle}>ALERTE SOS ACTIVE</div>
          <div style={S.activeTimer}>Durée : {fmt(elapsed)}</div>
        </div>
        <span style={S.alertIdBadge}>#{myAlertId?.slice(-6) ?? "------"}</span>
      </div>

      <button onClick={handleCancelAlert} style={S.cancelSosBtn}>
        ✓ Annuler l'alerte — faux positif
      </button>

      <p style={{ ...S.hint, color: "var(--color-danger)" }}>
        Appuie sur Annuler uniquement si la situation est résolue
      </p>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "0.75rem 1rem",
  },
  mainBtn: {
    background: "var(--color-danger)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-md)",
    padding: "0.875rem 2.5rem",
    fontSize: "1.125rem",
    fontWeight: 700,
    width: "100%",
    maxWidth: "480px",
    transition: "opacity 0.2s",
    letterSpacing: "0.5px",
  },
  radiusRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    width: "100%",
    maxWidth: "480px",
  },
  radiusLbl: {
    fontSize: "0.8rem",
    color: "var(--color-text-muted)",
    whiteSpace: "nowrap",
  },
  radiusVal: {
    fontSize: "0.875rem",
    color: "var(--color-accent)",
    fontWeight: 600,
    minWidth: "48px",
    textAlign: "right",
  },
  hint: {
    fontSize: "0.75rem",
    color: "var(--color-text-muted)",
    textAlign: "center",
  },
  // Confirming
  confirmMsg: {
    textAlign: "center",
    color: "var(--color-warning)",
    fontSize: "1rem",
  },
  track: {
    width: "100%",
    maxWidth: "480px",
    height: "6px",
    background: "var(--color-ocean-light)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    background: "var(--color-danger)",
    borderRadius: "3px",
  },
  confirmBtns: {
    display: "flex",
    gap: "0.75rem",
    width: "100%",
    maxWidth: "480px",
  },
  abortBtn: {
    flex: 1,
    background: "var(--color-ocean-light)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "0.625rem",
    fontSize: "0.9rem",
  },
  confirmBtn: {
    flex: 2,
    background: "var(--color-danger)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "0.625rem",
    fontSize: "0.9rem",
    fontWeight: 700,
  },
  // Active
  activeBox: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    background: "#3b0808",
    border: "2px solid var(--color-danger)",
    borderRadius: "var(--radius-md)",
    padding: "0.875rem 1.25rem",
    width: "100%",
    maxWidth: "480px",
  },
  activeTitle: {
    color: "var(--color-danger)",
    fontWeight: 700,
    fontSize: "0.9rem",
    letterSpacing: "0.5px",
  },
  activeTimer: {
    color: "var(--color-text-muted)",
    fontSize: "0.8rem",
    marginTop: "0.2rem",
  },
  alertIdBadge: {
    marginLeft: "auto",
    fontSize: "0.7rem",
    color: "var(--color-text-muted)",
    fontFamily: "var(--font-mono)",
  },
  cancelSosBtn: {
    background: "transparent",
    color: "var(--color-text-muted)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "0.5rem 1.5rem",
    fontSize: "0.875rem",
    width: "100%",
    maxWidth: "480px",
  },
};

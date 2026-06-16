import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSocket } from "../hooks/useSocket";
import { usePositionEmitter } from "../hooks/useSocket";
import MapView from "../components/MapView";

import AlertButton from "../components/AlertButton";
import AlertNotification from "../components/AlertNotification";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    position,
    error,
    isLoading: gpsLoading,
    hasGoodAccuracy,
    retry,
  } = useGeolocation();
  const { isConnected, divers, activeAlert } = useSocket();

  const [alertRadius, setAlertRadius] = useState(5); // km

  // Émettre la position GPS au socket toutes les 5s (configurable via .env)
  usePositionEmitter(position);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Plongeurs autres que soi-même (pour l'affichage carte)
  const otherDivers = divers.filter(
    (d) => d.userId !== (user?._id || user?.id),
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <header style={S.header}>
        <div style={S.identity}>
          <span style={S.name}>{user?.name}</span>
          <span style={S.roleTag}>
            {user?.role === "rescuer" ? "🚨 Sauveteur" : "🤿 Plongeur"}
          </span>
        </div>

        <div style={S.statusGroup}>
          {/* Statut Socket */}
          <span
            style={{
              color: isConnected
                ? "var(--color-success)"
                : "var(--color-text-muted)",
              fontSize: "0.8rem",
            }}
          >
            {isConnected ? "🟢 En ligne" : "🔴 Hors ligne"}
          </span>

          {/* Statut GPS */}
          <span
            style={{
              fontSize: "0.8rem",
              color: gpsLoading
                ? "var(--color-warning)"
                : error
                  ? "var(--color-danger)"
                  : hasGoodAccuracy
                    ? "var(--color-success)"
                    : "var(--color-warning)",
            }}
          >
            {gpsLoading
              ? "⏳ GPS..."
              : error
                ? "❌ GPS"
                : `${hasGoodAccuracy ? "✅" : "⚠️"} ${position?.accuracy}m`}
          </span>
        </div>

        <button onClick={handleLogout} style={S.btnLogout}>
          ↩ Quitter
        </button>
      </header>

      {/* ── Bandeau GPS erreur ───────────────────────────────────────────── */}
      {error && (
        <div style={S.errorBar}>
          {error.message}
          {error.code !== 0 && (
            <button onClick={retry} style={S.retryBtn}>
              Réessayer
            </button>
          )}
        </div>
      )}

      {/* ── Alerte SOS reçue ────────────────────────────────────────────── */}
      {activeAlert && (
        <div style={S.alertBanner}>
          🆘 ALERTE SOS de <strong>{activeAlert.emitter?.name}</strong> — Rayon{" "}
          {activeAlert.radius}km
        </div>
      )}

      {/* ── Carte ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapView
          currentPosition={position}
          userId={user?._id || user?.id}
          divers={otherDivers}
          alertRadius={alertRadius}
          activeAlert={activeAlert}
        />

        {/* Overlay : compteur de plongeurs + statut connexion */}
        <div style={S.overlay}>
          <span>
            🤿 {otherDivers.length} plongeur
            {otherDivers.length !== 1 ? "s" : ""} en ligne
          </span>
          {!isConnected && (
            <span
              style={{ color: "var(--color-warning)", fontSize: "0.75rem" }}
            >
              Reconnexion...
            </span>
          )}
        </div>
      </div>

      {/* ── Bouton SOS ───────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--color-ocean-mid)",
          borderTop: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <AlertButton
          position={position}
          isConnected={isConnected}
          alertRadius={alertRadius}
          onRadiusChange={setAlertRadius}
        />
      </div>
      {/* ── Notification alerte reçue ────────────────────────────────── */}
      <AlertNotification
        alert={activeAlert}
        myPosition={position}
        onDismiss={() => {}} // Le dismiss est géré en interne par AlertNotification
      />
    </div>
  );
}

const S = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.625rem 1rem",
    background: "var(--color-ocean-mid)",
    borderBottom: "1px solid var(--color-border)",
    gap: "0.75rem",
    flexShrink: 0,
  },
  identity: { display: "flex", alignItems: "center", gap: "0.5rem" },
  name: { fontWeight: 600 },
  roleTag: {
    fontSize: "0.75rem",
    background: "var(--color-ocean-light)",
    color: "var(--color-text-muted)",
    padding: "0.2rem 0.5rem",
    borderRadius: "var(--radius-sm)",
  },
  statusGroup: { display: "flex", gap: "1rem", alignItems: "center" },
  btnLogout: {
    background: "var(--color-ocean-light)",
    color: "var(--color-text-muted)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "0.375rem 0.75rem",
    fontSize: "0.8rem",
  },
  errorBar: {
    background: "#3b1010",
    color: "var(--color-danger)",
    padding: "0.5rem 1rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    fontSize: "0.875rem",
    flexShrink: 0,
  },
  retryBtn: {
    background: "var(--color-danger)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "0.25rem 0.75rem",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  alertBanner: {
    background: "#3b0808",
    color: "var(--color-danger)",
    borderTop: "2px solid var(--color-danger)",
    padding: "0.75rem 1rem",
    textAlign: "center",
    fontSize: "1rem",
    flexShrink: 0,
    animation: "none",
  },
  overlay: {
    position: "absolute",
    top: "0.75rem",
    right: "0.75rem",
    zIndex: 1000,
    background: "rgba(13,33,55,0.9)",
    color: "var(--color-text)",
    padding: "0.375rem 0.75rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    border: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    alignItems: "flex-end",
  },
  sosBar: {
    background: "var(--color-ocean-mid)",
    borderTop: "1px solid var(--color-border)",
    padding: "0.875rem 1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.375rem",
    flexShrink: 0,
  },
  sosBtn: {
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
  },
  sosHint: { fontSize: "0.75rem", color: "var(--color-text-muted)" },
};

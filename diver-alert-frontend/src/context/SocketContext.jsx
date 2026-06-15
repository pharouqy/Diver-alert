/**
 * src/context/SocketContext.jsx
 *
 * Gestion complète de la connexion Socket.io côté client.
 *
 * ── Cycle de vie ──────────────────────────────────────────────────────────
 *  — Connexion automatique quand l'utilisateur est authentifié (user != null)
 *  — Déconnexion automatique quand l'utilisateur se déconnecte (user == null)
 *  — Reconnexion automatique (5 tentatives, délai exponentiel)
 *
 * ── Événements reçus ──────────────────────────────────────────────────────
 *  divers:list       → liste initiale à la connexion
 *  diver:joined      → nouveau plongeur arrivé
 *  diver:disconnected→ plongeur parti
 *  diver:position    → mise à jour de position
 *  alert:received    → alerte SOS reçue (étape 24)
 *  alert:cancelled   → alerte annulée (étape 24)
 *  alert:confirmed   → confirmation de notre propre SOS (étape 24)
 *
 * ── Événements émis ───────────────────────────────────────────────────────
 *  diver:position    → position GPS throttlée (via usePositionEmitter)
 *  alert:sos         → alerte SOS (via emitSOS — étape 23)
 *  alert:cancel      → annulation alerte (via cancelAlert — étape 23)
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [divers, setDivers] = useState([]); // Plongeurs connectés
  const [activeAlert, setActiveAlert] = useState(null); // Alerte SOS reçue en cours

  // ── Connexion / déconnexion selon l'état auth ──────────────────────────────
  useEffect(() => {
    if (!user) {
      // Logout → déconnecter le socket et vider l'état
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setDivers([]);
      setActiveAlert(null);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    // ── Créer la connexion Socket.io ─────────────────────────────────────────
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      transports: ["websocket"], // WebSocket direct — pas de fallback polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2_000, // 2s avant le 1er retry
      reconnectionDelayMax: 10_000, // Max 10s entre retries
    });

    socketRef.current = socket;

    // ── Événements de connexion ───────────────────────────────────────────────
    socket.on("connect", () => {
      console.log("✅ Socket connecté :", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("👋 Socket déconnecté :", reason);
      setIsConnected(false);
      // Ne pas vider divers ici — les plongeurs restent visibles
      // jusqu'à la reconnexion qui enverra un nouveau divers:list
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connect_error :", err.message);
      setIsConnected(false);
    });

    socket.on("reconnect", (attempt) => {
      console.log(`🔄 Reconnecté après ${attempt} tentative(s)`);
    });

    // ── Gestion des plongeurs ─────────────────────────────────────────────────
    socket.on("divers:list", (list) => {
      setDivers(list);
    });

    socket.on("diver:joined", (diver) => {
      setDivers((prev) => {
        const filtered = prev.filter((d) => d.userId !== diver.userId);
        return [...filtered, diver];
      });
    });

    socket.on("diver:disconnected", ({ userId }) => {
      setDivers((prev) => prev.filter((d) => d.userId !== userId));
    });

    socket.on("diver:position", ({ userId, name, position, radius }) => {
      setDivers((prev) =>
        prev.map((d) =>
          d.userId === userId ? { ...d, name, position, radius } : d,
        ),
      );
    });

    // ── Gestion des alertes (handlers complets à l'étape 24) ─────────────────
    socket.on("alert:received", (alertData) => {
      console.log("🆘 Alerte SOS reçue :", alertData);
      setActiveAlert(alertData);
    });

    socket.on("alert:cancelled", ({ alertId }) => {
      setActiveAlert((prev) => (prev?.alertId === alertId ? null : prev));
    });

    socket.on("alert:confirmed", (data) => {
      console.log("✅ SOS confirmé :", data);
    });

    socket.on("error", (err) => {
      console.error("Erreur socket :", err);
    });

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setDivers([]);
    };
  }, [user]);

  // ── Fonctions d'émission exposées ──────────────────────────────────────────

  /** Émet une mise à jour de position GPS */
  const emitPosition = useCallback((position) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("diver:position", position);
    }
  }, []);

  /** Émet une alerte SOS — utilisé par AlertButton (étape 23) */
  const emitSOS = useCallback((position, radius) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("alert:sos", { ...position, radius });
    }
  }, []);

  /** Annule une alerte active — utilisé par AlertButton (étape 23) */
  const cancelAlert = useCallback((alertId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("alert:cancel", { alertId });
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        divers,
        activeAlert,
        emitPosition,
        emitSOS,
        cancelAlert,
        setActiveAlert,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx)
    throw new Error("useSocket doit être utilisé dans <SocketProvider>");
  return ctx;
}

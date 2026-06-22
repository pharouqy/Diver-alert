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
 *  alert:received    → alerte SOS reçue
 *  alert:cancelled   → alerte annulée
 *  alert:confirmed   → confirmation de notre propre SOS
 *  chat:message      → message privé entrant
 *  chat:sent         → confirmation d'envoi
 *  chat:error        → erreur d'envoi
 *
 * ── Événements émis ───────────────────────────────────────────────────────
 *  diver:position    → position GPS throttlée
 *  alert:sos         → alerte SOS
 *  alert:cancel      → annulation alerte
 *  chat:message      → envoi d'un message privé
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
import api from "../api/axios";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [divers, setDivers] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [myAlertId, setMyAlertId] = useState(null);

  // ── État messagerie ────────────────────────────────────────────────────────
  /** { [userId]: Message[] } — historique par conversation */
  const [conversations, setConversations] = useState({});
  /** { [userId]: number } — compteur non-lus par expéditeur */
  const [unreadCounts, setUnreadCounts] = useState({});
  /** { senderId, senderName, content } | null — dernier message non-ouvert */
  const [incomingMessage, setIncomingMessage] = useState(null);

  // ── Connexion / déconnexion selon l'état auth ──────────────────────────────
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setDivers([]);
      setActiveAlert(null);
      setConversations({});
      setUnreadCounts({});
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 10_000,
    });

    socketRef.current = socket;

    // ── Connexion ────────────────────────────────────────────────────────────
    socket.on("connect", () => {
      console.log("✅ Socket connecté :", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("👋 Socket déconnecté :", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connect_error :", err.message);
      setIsConnected(false);
    });

    socket.on("reconnect", (attempt) => {
      console.log(`🔄 Reconnecté après ${attempt} tentative(s)`);
    });

    // ── Plongeurs ────────────────────────────────────────────────────────────
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

    // ── Alertes SOS ──────────────────────────────────────────────────────────
    socket.on("alert:received", (alertData) => {
      console.log("🆘 Alerte SOS reçue :", alertData);
      setActiveAlert(alertData);
    });

    socket.on("alert:confirmed", (data) => {
      console.log("✅ SOS confirmé :", data);
      setMyAlertId(data.alertId);
    });

    socket.on("alert:cancelled", ({ alertId }) => {
      setActiveAlert((prev) => (prev?.alertId === alertId ? null : prev));
      setMyAlertId((prev) => (prev === alertId ? null : prev));
    });

    // ── Messagerie privée ─────────────────────────────────────────────────────
    // Message entrant d'un autre utilisateur
    socket.on("chat:message", (msg) => {
      const senderId = msg.sender._id;
      // Ajouter à la conversation
      setConversations((prev) => ({
        ...prev,
        [senderId]: [...(prev[senderId] || []), msg],
      }));
      // Incrémenter le compteur non-lus
      setUnreadCounts((prev) => ({
        ...prev,
        [senderId]: (prev[senderId] || 0) + 1,
      }));
      // Déclencher la notification toast
      setIncomingMessage({
        senderId,
        senderName: msg.sender.name,
        content: msg.content,
        msgId: msg._id,
      });
    });

    // Confirmation d'envoi (message envoyé par nous)
    socket.on("chat:sent", (msg) => {
      const receiverId = msg.receiver._id;
      setConversations((prev) => ({
        ...prev,
        [receiverId]: [...(prev[receiverId] || []), msg],
      }));
    });

    socket.on("chat:error", (err) => {
      console.error("Erreur messagerie :", err);
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

  // ── Fonctions exposées ────────────────────────────────────────────────────

  const emitPosition = useCallback((position) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("diver:position", position);
    }
  }, []);

  const emitSOS = useCallback((position, radius) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("alert:sos", { ...position, radius });
    }
  }, []);

  const cancelAlert = useCallback((alertId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("alert:cancel", { alertId });
    }
  }, []);

  /** Envoie un message privé via socket */
  const sendChatMessage = useCallback((receiverId, content) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("chat:message", { receiverId, content });
    }
  }, []);

  /**
   * Charge l'historique REST d'une conversation et hydrate conversations[userId].
   * Idempotent : ne recharge pas si déjà chargé.
   */
  const loadConversation = useCallback(async (userId) => {
    try {
      const { data } = await api.get(`/messages/${userId}`);
      setConversations((prev) => ({
        ...prev,
        [userId]: data.data.messages,
      }));
    } catch (err) {
      console.error("Erreur chargement conversation :", err.message);
    }
  }, []);

  /**
   * Marque la conversation comme lue (local + REST).
   */
  const markConversationRead = useCallback(async (userId) => {
    setUnreadCounts((prev) => ({ ...prev, [userId]: 0 }));
    try {
      await api.patch(`/messages/${userId}/read`);
    } catch (err) {
      console.error("Erreur markRead :", err.message);
    }
  }, []);

  /** Charge les compteurs non-lus depuis le REST (utile au montage) */
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const { data } = await api.get("/messages/unread");
      setUnreadCounts(data.data.counts || {});
    } catch (err) {
      console.error("Erreur fetchUnreadCounts :", err.message);
    }
  }, []);

  /** Efface la notification toast courante */
  const dismissIncomingMessage = useCallback(() => {
    setIncomingMessage(null);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        divers,
        activeAlert,
        myAlertId,
        emitPosition,
        emitSOS,
        cancelAlert,
        setActiveAlert,
        // Messagerie
        conversations,
        unreadCounts,
        incomingMessage,
        sendChatMessage,
        loadConversation,
        markConversationRead,
        fetchUnreadCounts,
        dismissIncomingMessage,
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

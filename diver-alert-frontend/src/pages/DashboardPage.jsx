import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSocket } from "../hooks/useSocket";
import { usePositionEmitter } from "../hooks/useSocket";
import { useWindowSize } from "../hooks/useWindowSize";
import MapView from "../components/MapView";
import AlertButton from "../components/AlertButton";
import AlertNotification from "../components/AlertNotification";
import ProductList from "../components/ProductList";
import MessagingPanel from "../components/MessagingPanel";
import ChatWindow from "../components/ChatWindow";
import ChatNotification from "../components/ChatNotification";

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
  const {
    isConnected,
    divers,
    activeAlert,
    unreadCounts,
    incomingMessage,
    dismissIncomingMessage,
    fetchUnreadCounts,
  } = useSocket();

  const [alertRadius, setAlertRadius] = useState(5);
  const [activeTab, setActiveTab] = useState('map');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ── Messagerie ──────────────────────────────────────────────────────────────
  const [msgPanelOpen, setMsgPanelOpen] = useState(false);
  const [chatPeer, setChatPeer] = useState(null); // { userId, name, role }
  const [chatDraft, setChatDraft] = useState('');

  // Charger les compteurs non-lus au montage
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Badge global = somme de tous les non-lus
  const totalUnread = Object.values(unreadCounts).reduce((acc, n) => acc + n, 0);

  const openChat = (peer, draft = '') => {
    setChatPeer(peer);
    setChatDraft(draft);
    setMsgPanelOpen(false);
  };

  // Ouvrir le chat depuis la notification toast (on a senderId + senderName)
  const openChatFromNotif = (senderId, senderName) => {
    // Chercher le diver complet dans la liste, sinon construire un objet minimal
    const diver = divers.find((d) => d.userId === senderId);
    openChat(diver || { userId: senderId, name: senderName, role: 'diver' });
  };

  const openProductContactChat = (product) => {
    const owner = product?.owner;
    const ownerId = owner?._id || owner?.id || (typeof owner === 'string' ? owner : null);

    if (!ownerId) return;

    const sellerName = owner?.name || 'Vendeur';
    const productTitle = product?.title ? ` "${product.title}"` : '';
    const draft = `Bonjour, je suis interesse par votre annonce${productTitle}. Est-elle toujours disponible ?`;

    openChat(
      {
        userId: ownerId.toString(),
        name: sellerName,
        role: owner?.role || 'diver',
      },
      draft,
    );
    setMsgPanelOpen(false);
  };

  // ── Responsive ────────────────────────────────────────────────────────────
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const [menuOpen, setMenuOpen] = useState(false);

  // Fermer le menu mobile quand on passe en desktop
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  // Émettre la position GPS
  usePositionEmitter(position);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const otherDivers = divers.filter(
    (d) => d.userId !== (user?._id || user?.id),
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── En-tête responsive ──────────────────────────────────────────── */}
      <header style={isMobile ? S.headerMobile : isTablet ? S.headerTablet : S.header}>
        {/* Rangée 1 : Identité + menu toggle (mobile) / tout (desktop) */}
        <div style={S.headerRow1}>
          <div style={S.identity}>
            <span style={isMobile ? S.nameMobile : S.name}>{user?.name}</span>
            <span style={isMobile ? S.roleTagMobile : S.roleTag}>
              {user?.role === "rescuer" ? "🚨 Sauveteur" : "🤿 Plongeur"}
            </span>
          </div>

          {/* Onglets – visibles sur toutes les tailles */}
          <div style={isMobile ? S.tabsMobile : isTablet ? S.tabsTablet : S.tabs}>
            <button
              style={activeTab === 'map' ? S.tabActive : isMobile ? S.tabMobile : S.tab}
              onClick={() => setActiveTab('map')}
            >
              🗺️{!isMobile && " SOS & Carte"}
            </button>
            <button
              style={activeTab === 'marketplace' ? S.tabActive : isMobile ? S.tabMobile : S.tab}
              onClick={() => setActiveTab('marketplace')}
            >
              🛒{!isMobile && " Marketplace"}
            </button>
          </div>

          {/* Desktop : status + logout */}
          {!isMobile && (
            <div style={S.statusGroup}>
              <span style={S.statusDot(isConnected ? "var(--color-success)" : "var(--color-text-muted)")}>
                {isConnected ? "🟢" : "🔴"}
                {!isTablet && (isConnected ? " En ligne" : " Hors ligne")}
              </span>
              <span style={S.statusDot(
                gpsLoading ? "var(--color-warning)" :
                error ? "var(--color-danger)" :
                hasGoodAccuracy ? "var(--color-success)" : "var(--color-warning)"
              )}>
                {gpsLoading ? "⏳" : error ? "❌" : hasGoodAccuracy ? "✅" : "⚠️"}
                {!isTablet && (gpsLoading ? " GPS..." : error ? " GPS" : ` ${position?.accuracy}m`)}
              </span>
            </div>
          )}

          {/* Desktop : logout + mobile : toggle */}
          {!isMobile ? (
            <button onClick={handleLogout} style={S.btnLogout}>
              ↩{!isTablet && " Quitter"}
            </button>
          ) : (
            <button style={S.btnMenuToggle(menuOpen)} onClick={() => setMenuOpen((p) => !p)}>
              {menuOpen ? "✕" : "☰"}
            </button>
          )}
        </div>

        {/* Mobile : panneau déroulant (status + logout) */}
        {isMobile && menuOpen && (
          <div style={S.mobilePanel}>
            <div style={S.mobileStatusRow}>
              <span style={S.statusDot(isConnected ? "var(--color-success)" : "var(--color-text-muted)")}>
                {isConnected ? "🟢 En ligne" : "🔴 Hors ligne"}
              </span>
              <span style={S.statusDot(
                gpsLoading ? "var(--color-warning)" :
                error ? "var(--color-danger)" :
                hasGoodAccuracy ? "var(--color-success)" : "var(--color-warning)"
              )}>
                {gpsLoading ? "⏳ GPS..." : error ? "❌ GPS" : `${hasGoodAccuracy ? "✅" : "⚠️"} ${position?.accuracy}m`}
              </span>
            </div>
            <button onClick={handleLogout} style={S.btnLogoutMobile}>
              ↩ Quitter
            </button>
          </div>
        )}
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

      {/* ── Corps principal ────────────────────────────────────────────────── */}
      {activeTab === 'map' ? (
        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Carte */}
          <div style={{ flex: 1, position: "relative" }}>
            <MapView
              currentPosition={position}
              userId={user?._id || user?.id}
              divers={otherDivers}
              alertRadius={alertRadius}
              activeAlert={activeAlert}
            />

            {/* Overlay : compteur de plongeurs */}
            <div style={S.overlay}>
              <span>
                🤿 {otherDivers.length} plongeur{otherDivers.length !== 1 ? "s" : ""} en ligne
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

          {/* Bouton SOS */}
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
        </div>
      ) : (
        <ProductList
          onCreateClick={() => {}}
          onContactSeller={openProductContactChat}
          refreshTrigger={refreshTrigger}
        />
      )}

      {/* ── Notification alerte SOS ──────────────────────────────────── */}
      <AlertNotification
        alert={activeAlert}
        myPosition={position}
        onDismiss={() => {}}
      />

      {/* ── Bouton flottant messagerie ───────────────────────────────────── */}
      <button
        style={S.fabChat}
        onClick={() => {
          setChatPeer(null);
          setMsgPanelOpen((prev) => !prev);
        }}
        title="Messagerie"
      >
        💬
        {totalUnread > 0 && (
          <span style={S.fabBadge}>{totalUnread > 99 ? '99+' : totalUnread}</span>
        )}
      </button>

      {/* ── Panel liste plongeurs ────────────────────────────────────────── */}
      {msgPanelOpen && !chatPeer && (
        <MessagingPanel
          onSelectPeer={openChat}
          onClose={() => setMsgPanelOpen(false)}
        />
      )}

      {/* ── Fenêtre de chat ──────────────────────────────────────────────── */}
      {chatPeer && (
        <ChatWindow
          peer={chatPeer}
          initialDraft={chatDraft}
          onClose={() => setChatPeer(null)}
        />
      )}

      {/* ── Toast notification message entrant ──────────────────────────── */}
      {incomingMessage && !chatPeer && (
        <ChatNotification
          notification={incomingMessage}
          onOpen={openChatFromNotif}
          onDismiss={dismissIncomingMessage}
        />
      )}
    </div>
  );
}

const S = {
  // ── Header : Desktop (>1024px) ──────────────────────────────────────────
  header: {
    display: "flex",
    flexDirection: "column",
    padding: "0.625rem 1rem",
    background: "var(--color-ocean-mid)",
    borderBottom: "1px solid var(--color-border)",
    flexShrink: 0,
  },
  headerRow1: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },

  // ── Header : Tablet (768-1024px) ────────────────────────────────────────
  headerTablet: {
    display: "flex",
    flexDirection: "column",
    padding: "0.5rem 0.75rem",
    background: "var(--color-ocean-mid)",
    borderBottom: "1px solid var(--color-border)",
    flexShrink: 0,
  },

  // ── Header : Mobile (<768px) ────────────────────────────────────────────
  headerMobile: {
    display: "flex",
    flexDirection: "column",
    padding: "0.375rem 0.625rem",
    background: "var(--color-ocean-mid)",
    borderBottom: "1px solid var(--color-border)",
    flexShrink: 0,
  },

  // ── Tabs : Desktop ──────────────────────────────────────────────────────
  tabs: {
    display: "flex",
    background: "var(--color-ocean-deep)",
    padding: "0.25rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
  },
  tabsTablet: {
    display: "flex",
    background: "var(--color-ocean-deep)",
    padding: "0.2rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
  },
  tabsMobile: {
    display: "flex",
    background: "var(--color-ocean-deep)",
    padding: "0.15rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
  },

  // ── Tab ─────────────────────────────────────────────────────────────────
  tab: {
    background: "none",
    border: "none",
    color: "var(--color-text-muted)",
    padding: "0.375rem 0.75rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  tabMobile: {
    background: "none",
    border: "none",
    color: "var(--color-text-muted)",
    padding: "0.25rem 0.5rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  tabActive: {
    background: "var(--color-accent)",
    color: "var(--color-ocean-deep)",
    border: "none",
    padding: "0.375rem 0.75rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },

  // ── Identité ────────────────────────────────────────────────────────────
  identity: { display: "flex", alignItems: "center", gap: "0.5rem" },
  name: { fontWeight: 600, fontSize: "0.95rem" },
  nameMobile: { fontWeight: 600, fontSize: "0.85rem" },
  roleTag: {
    fontSize: "0.75rem",
    background: "var(--color-ocean-light)",
    color: "var(--color-text-muted)",
    padding: "0.2rem 0.5rem",
    borderRadius: "var(--radius-sm)",
  },
  roleTagMobile: {
    fontSize: "0.65rem",
    background: "var(--color-ocean-light)",
    color: "var(--color-text-muted)",
    padding: "0.15rem 0.4rem",
    borderRadius: "var(--radius-sm)",
  },

  // ── Status ──────────────────────────────────────────────────────────────
  statusGroup: { display: "flex", gap: "1rem", alignItems: "center" },
  statusDot: (color) => ({
    fontSize: "0.8rem",
    color,
  }),

  // ── Bouton déconnexion ──────────────────────────────────────────────────
  btnLogout: {
    background: "var(--color-ocean-light)",
    color: "var(--color-text-muted)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "0.375rem 0.75rem",
    fontSize: "0.8rem",
    whiteSpace: "nowrap",
  },
  btnLogoutMobile: {
    background: "var(--color-ocean-light)",
    color: "var(--color-text-muted)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "0.5rem 1rem",
    fontSize: "0.8rem",
    width: "100%",
    textAlign: "center",
  },

  // ── Menu toggle mobile ──────────────────────────────────────────────────
  btnMenuToggle: (open) => ({
    background: open ? "var(--color-accent)" : "var(--color-ocean-light)",
    color: open ? "var(--color-ocean-deep)" : "var(--color-text-muted)",
    border: `1px solid ${open ? "var(--color-accent)" : "var(--color-border)"}`,
    borderRadius: "var(--radius-sm)",
    width: "2.25rem",
    height: "2.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    flexShrink: 0,
  }),

  // ── Panneau mobile déroulant ────────────────────────────────────────────
  mobilePanel: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: "0.5rem 0.25rem 0.25rem",
    borderTop: "1px solid var(--color-border)",
    marginTop: "0.375rem",
    animation: "slideDown 0.2s ease-out",
    overflow: "hidden",
  },
  mobileStatusRow: {
    display: "flex",
    justifyContent: "space-around",
    gap: "0.75rem",
    fontSize: "0.8rem",
  },

  // ── Erreur ──────────────────────────────────────────────────────────────
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

  // ── Bannière SOS ────────────────────────────────────────────────────────
  alertBanner: {
    background: "#3b0808",
    color: "var(--color-danger)",
    borderTop: "2px solid var(--color-danger)",
    padding: "0.75rem 1rem",
    textAlign: "center",
    fontSize: "1rem",
    flexShrink: 0,
  },

  // ── Overlay carte ───────────────────────────────────────────────────────
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

  // ── Bouton flottant messagerie ──────────────────────────────────────────
  fabChat: {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'var(--color-accent)',
    color: 'var(--color-ocean-deep)',
    border: 'none',
    fontSize: '1.4rem',
    boxShadow: '0 4px 20px rgba(0, 191, 255, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2800,
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  fabBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    background: 'var(--color-danger)',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '0.1rem 0.35rem',
    borderRadius: '999px',
    minWidth: '18px',
    textAlign: 'center',
    lineHeight: '1.4',
  },

  // ── Barre SOS ───────────────────────────────────────────────────────────
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
  sosHint: { fontSize: "0.75rem", color: "var(--color-text-muted)" },
};

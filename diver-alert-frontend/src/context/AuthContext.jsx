/**
 * src/context/AuthContext.jsx
 *
 * Fournit l'état d'authentification à toute l'application.
 * — Vérifie la session existante au montage (appel GET /auth/me)
 * — Expose : user, isLoading, login(), register(), logout()
 */

import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true le temps de vérifier la session

  // Vérifier au démarrage si un token en localStorage est encore valide
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data.data.user);
      } catch {
        // Token invalide ou expiré — le supprimer silencieusement
        // L'intercepteur 401 s'occupe déjà du nettoyage
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  /** Connexion : appel REST + stockage token + mise à jour état */
  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    const { user: u, token } = data.data;
    localStorage.setItem("token", token);
    setUser(u);
    return u;
  };

  /** Inscription : appel REST + stockage token + mise à jour état */
  const register = async (name, email, password, role = "diver") => {
    const { data } = await api.post("/auth/register", {
      name,
      email,
      password,
      role,
    });
    const { user: u, token } = data.data;
    localStorage.setItem("token", token);
    setUser(u);
    return u;
  };

  /** Déconnexion : nettoyage local uniquement — la navigation est gérée par le composant appelant */
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook utilitaire — lance une erreur si utilisé hors AuthProvider */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error(
      "useAuth doit être utilisé à l'intérieur de <AuthProvider>",
    );
  return ctx;
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "diver",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [apiErrors, setApiErrors] = useState([]); // Erreurs de validation backend
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2)
      e.name = "Le nom doit contenir au moins 2 caractères";
    if (!form.email) e.email = "L'email est obligatoire";
    if (!form.password || form.password.length < 8)
      e.password = "Le mot de passe doit contenir au moins 8 caractères";
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setApiError("");
    setApiErrors([]);
    try {
      await register(form.name, form.email, form.password, form.role);
      navigate("/dashboard");
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.errors) setApiErrors(resp.errors);
      else setApiError(resp?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.logo}>🤿 Diver Alert</h1>
        <h2 style={S.sub}>Créer un compte</h2>

        {apiError && <div style={S.banner}>{apiError}</div>}
        {apiErrors.length > 0 && (
          <div style={S.banner}>
            {apiErrors.map((e, i) => (
              <div key={i}>• {e.message}</div>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} style={S.form} noValidate>
          <Field label="Nom complet" error={errors.name}>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={onChange}
              placeholder="Jacques Cousteau"
              style={{ ...S.input, ...(errors.name ? S.inputErr : {}) }}
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="vous@exemple.com"
              autoComplete="email"
              style={{ ...S.input, ...(errors.email ? S.inputErr : {}) }}
            />
          </Field>

          <Field label="Mot de passe" error={errors.password}>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Min. 8 car. avec majuscule et chiffre"
              autoComplete="new-password"
              style={{ ...S.input, ...(errors.password ? S.inputErr : {}) }}
            />
          </Field>

          <Field label="Rôle">
            <select
              name="role"
              value={form.role}
              onChange={onChange}
              style={S.select}
            >
              <option value="diver">🤿 Plongeur</option>
              <option value="rescuer">🚨 Sauveteur</option>
            </select>
          </Field>

          <button
            type="submit"
            style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Inscription..." : "Créer le compte"}
          </button>
        </form>

        <p style={S.foot}>
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <label style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
        {label}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: "0.75rem", color: "var(--color-danger)" }}>
          {error}
        </span>
      )}
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  },
  card: {
    background: "var(--color-ocean-mid)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "2rem",
    width: "100%",
    maxWidth: "420px",
  },
  logo: {
    textAlign: "center",
    color: "var(--color-accent)",
    marginBottom: "0.25rem",
  },
  sub: {
    textAlign: "center",
    color: "var(--color-text-muted)",
    fontSize: "1rem",
    fontWeight: 400,
    marginBottom: "1.5rem",
  },
  banner: {
    background: "#3b1010",
    color: "var(--color-danger)",
    border: "1px solid var(--color-danger)",
    borderRadius: "var(--radius-sm)",
    padding: "0.75rem",
    marginBottom: "1rem",
    fontSize: "0.875rem",
  },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  input: {
    background: "var(--color-ocean-deep)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "0.625rem 0.875rem",
    color: "var(--color-text)",
    fontSize: "1rem",
    outline: "none",
    width: "100%",
  },
  inputErr: { borderColor: "var(--color-danger)" },
  select: {
    background: "var(--color-ocean-deep)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "0.625rem 0.875rem",
    color: "var(--color-text)",
    fontSize: "1rem",
    width: "100%",
  },
  btn: {
    background: "var(--color-accent)",
    color: "#000",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "0.75rem",
    fontWeight: 600,
    fontSize: "1rem",
    marginTop: "0.5rem",
  },
  foot: {
    textAlign: "center",
    marginTop: "1.5rem",
    fontSize: "0.875rem",
    color: "var(--color-text-muted)",
  },
};

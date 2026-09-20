import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { validateEmail, validatePassword } from "../lib/auth";
import "../styles/auth.css";

function Login() {
  const { user, ready, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/discover";
  const [mode, setMode] = useState("signin");

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  if (ready && user) return <Navigate to={from} replace />;

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: null });
  };

  const submit = async (e) => {
    e.preventDefault();

    const next = {};
    next.email = validateEmail(form.email);
    next.password =
      mode === "signup"
        ? validatePassword(form.password)
        : form.password
          ? null
          : "Enter your password.";

    const clean = Object.fromEntries(
      Object.entries(next).filter(([, v]) => v)
    );

    if (Object.keys(clean).length) {
      setErrors(clean);
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const result = await signUp(form);
        if (result?.confirmationRequired) {
          setConfirmSent(true);
          return;
        }
      } else {
        await signIn(form);
      }

      navigate(from, { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  };

  const swap = (next) => {
    setMode(next);
    setErrors({});
  };

  return (
    <main className="auth-page">
      <div className="auth-glow" aria-hidden="true"></div>

      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <div className="logo-mark"><span></span><span></span></div>
          devpulse
        </Link>

        <h1>{mode === "signin" ? "Sign in" : "Create your account"}</h1>
        <p className="auth-sub">
          {location.state?.from
            ? "You need an account to open that page."
            : "Save repositories, follow domains and keep your feed."}
        </p>

        {confirmSent ? (
          <div className="auth-confirm-sent">
            <p>
              We sent a confirmation link to <strong>{form.email}</strong>. Click it, then come
              back and sign in.
            </p>
            <button
              type="button"
              className="auth-submit"
              onClick={() => {
                setConfirmSent(false);
                swap("signin");
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={mode === "signin"}
                className={mode === "signin" ? "is-active" : ""}
                onClick={() => swap("signin")}
              >
                Sign in
              </button>
              <button
                role="tab"
                aria-selected={mode === "signup"}
                className={mode === "signup" ? "is-active" : ""}
                onClick={() => swap("signup")}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={submit} noValidate>
              {mode === "signup" && (
                <Field label="Display name" hint="Optional">
                  <input
                    type="text"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                  />
                </Field>
              )}

              <Field label="Email" error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                />
              </Field>

              <Field
                label="Password"
                error={errors.password}
                hint={mode === "signup" ? "At least 8 characters, with a number" : null}
              >
                <input
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  aria-invalid={!!errors.password}
                />
              </Field>

              {errors.form && <p className="auth-error-banner">{errors.form}</p>}

              <button type="submit" className="auth-submit" disabled={busy}>
                {busy
                  ? "Working"
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            <p className="auth-note">
              Accounts are real, shared sign-ins backed by Supabase — not stored only
              in this browser.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className="auth-field">
      <span className="auth-label">
        {label}
        {hint && <em>{hint}</em>}
      </span>
      {children}
      {error && <span className="auth-error">{error}</span>}
    </label>
  );
}

export default Login;

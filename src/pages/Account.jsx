import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { validateEmail, validatePassword } from "../lib/auth";
import { store as projectsStore } from "../lib/projectsStore";
import "../styles/auth.css";

function ProjectStats({ userId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    projectsStore.userStats().then(setStats).catch(() => setStats(null));
  }, [userId]);

  if (!stats) return null;

  return (
    <section className="account-panel">
      <h2>Projects activity</h2>
      <p className="account-hint">
        Updates the moment you start a project or submit a solution.
      </p>
      <div className="account-stat-grid">
        <div className="account-stat">
          <strong>{stats.started}</strong>
          <span>Projects started</span>
        </div>
        <div className="account-stat">
          <strong>{stats.submitted}</strong>
          <span>Solutions submitted</span>
        </div>
        <div className="account-stat">
          <strong>{stats.upvotesReceived}</strong>
          <span>Upvotes received</span>
        </div>
      </div>
    </section>
  );
}

function Account() {
  const { user, updateAccount, deleteAccount, signOut } = useAuth();
  const navigate = useNavigate();

  const [flash, setFlash] = useState(null);

  const say = (type, text) => {
    setFlash({ type, text });
    window.clearTimeout(say._t);
    say._t = window.setTimeout(() => setFlash(null), 4000);
  };

  return (
    <main className="account-page">
      <div className="auth-glow" aria-hidden="true"></div>

      <header className="account-head">
        <div className="account-avatar" aria-hidden="true">
          {(user.name || user.email)[0].toUpperCase()}
        </div>
        <div>
          <h1>{user.name || user.email.split("@")[0]}</h1>
          <p>{user.email}</p>
          <span className="account-since">
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </span>
        </div>
      </header>

      {flash && (
        <p className={flash.type === "error" ? "auth-error-banner" : "auth-ok-banner"}>
          {flash.text}
        </p>
      )}

      <div className="account-sections">
        <ProjectStats userId={user.id} />
        <ProfileSection user={user} onSave={updateAccount} say={say} />
        <EmailSection user={user} onSave={updateAccount} say={say} />
        <PasswordSection onSave={updateAccount} say={say} />

        <section className="account-panel">
          <h2>Session</h2>
          <p className="account-hint">
            Signs you out in this browser. Your account and saved data stay.
          </p>
          <button
            className="account-secondary"
            onClick={() => {
              signOut();
              navigate("/");
            }}
          >
            Log out
          </button>
        </section>

        <DangerSection onDelete={deleteAccount} say={say} navigate={navigate} />
      </div>
    </main>
  );
}

/* ---------------- profile ---------------- */

function ProfileSection({ user, onSave, say }) {
  const [name, setName] = useState(user.name || "");
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({ name });
      say("ok", "Display name updated.");
    } catch (err) {
      say("error", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="account-panel">
      <h2>Profile</h2>
      <form onSubmit={save}>
        <label className="auth-field">
          <span className="auth-label">Display name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="account-primary" disabled={busy || name === user.name}>
          {busy ? "Saving" : "Save changes"}
        </button>
      </form>
    </section>
  );
}

/* ---------------- email ---------------- */

function EmailSection({ user, onSave, say }) {
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();

    const bad = validateEmail(email);
    if (bad) return setError(bad);
    if (!currentPassword) return setError("Confirm with your current password.");

    setBusy(true);
    setError(null);
    try {
      const result = await onSave({ email, currentPassword });
      setPassword("");
      say(
        "ok",
        result.pendingEmailConfirmation
          ? "Check the new address for a confirmation link — the change applies once you click it."
          : "Email updated."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="account-panel">
      <h2>Email address</h2>
      <p className="account-hint">
        Changing this changes the address you sign in with.
      </p>

      <form onSubmit={save}>
        <label className="auth-field">
          <span className="auth-label">New email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">Current password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        {error && <span className="auth-error">{error}</span>}

        <button
          className="account-primary"
          disabled={busy || email === user.email}
        >
          {busy ? "Saving" : "Update email"}
        </button>
      </form>
    </section>
  );
}

/* ---------------- password ---------------- */

function PasswordSection({ onSave, say }) {
  const [form, setForm] = useState({ currentPassword: "", password: "", confirm: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setError(null);
  };

  const save = async (e) => {
    e.preventDefault();

    if (!form.currentPassword) return setError("Enter your current password.");

    const bad = validatePassword(form.password);
    if (bad) return setError(bad);
    if (form.password !== form.confirm) return setError("The new passwords don't match.");

    setBusy(true);
    try {
      await onSave({
        password: form.password,
        currentPassword: form.currentPassword,
      });
      setForm({ currentPassword: "", password: "", confirm: "" });
      say("ok", "Password changed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="account-panel">
      <h2>Password</h2>

      <form onSubmit={save}>
        <label className="auth-field">
          <span className="auth-label">Current password</span>
          <input
            type="password"
            value={form.currentPassword}
            onChange={set("currentPassword")}
            autoComplete="current-password"
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">
            New password <em>8+ characters, with a number</em>
          </span>
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">Confirm new password</span>
          <input
            type="password"
            value={form.confirm}
            onChange={set("confirm")}
            autoComplete="new-password"
          />
        </label>

        {error && <span className="auth-error">{error}</span>}

        <button className="account-primary" disabled={busy}>
          {busy ? "Saving" : "Change password"}
        </button>
      </form>
    </section>
  );
}

/* ---------------- delete ---------------- */

function DangerSection({ onDelete, say, navigate }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const remove = async (e) => {
    e.preventDefault();

    if (confirm !== "DELETE") return setError('Type DELETE to confirm.');

    setBusy(true);
    try {
      await onDelete(password);
      navigate("/");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <section className="account-panel account-danger">
      <h2>Delete account</h2>
      <p className="account-hint">
        Permanently removes your account and everything tied to it — projects
        started, solutions submitted. This can't be undone.
      </p>

      {!open ? (
        <button className="account-destructive" onClick={() => setOpen(true)}>
          Delete account
        </button>
      ) : (
        <form onSubmit={remove}>
          <label className="auth-field">
            <span className="auth-label">Current password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoComplete="current-password"
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">
              Type <strong>DELETE</strong> to confirm
            </span>
            <input
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              placeholder="DELETE"
            />
          </label>

          {error && <span className="auth-error">{error}</span>}

          <div className="account-actions">
            <button className="account-destructive" disabled={busy}>
              {busy ? "Deleting" : "Permanently delete"}
            </button>
            <button
              type="button"
              className="account-secondary"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default Account;

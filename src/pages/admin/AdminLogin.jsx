import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAdmin } from "../../context/AdminContext";
import "../../styles/admin.css";

function AdminLogin() {
  const { signIn } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const from = location.state?.from || "/admin";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-auth-page">
      <form className="admin-auth-card" onSubmit={handleSubmit}>
        <h1>Admin workspace</h1>
        <p className="admin-auth-sub">
          This area is separate from customer accounts and isn't linked from the
          site — sign in with an admin email and password.
        </p>

        <label>
          Admin email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="pj-form-error">{error}</p>}

        <button type="submit" className="pj-btn-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="admin-auth-hint">
          No admin account yet? Create one from your Supabase dashboard —
          see README.md → Projects → Supabase setup.
        </p>
      </form>
    </div>
  );
}

export default AdminLogin;

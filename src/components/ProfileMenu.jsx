import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  // Close on outside click and on Escape, the two things people
  // instinctively try with an open dropdown.
  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <div className="nav-actions">
        <Link to="/login" className="login-btn">Log in</Link>
        <Link to="/login" className="get-started-small">
          Get started <span>→</span>
        </Link>
      </div>
    );
  }

  const initial = (user.name || user.email)[0].toUpperCase();

  return (
    <div className="nav-actions profile-wrap" ref={wrap}>
      <button
        className="profile-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="profile-avatar">{initial}</span>
        <span className="profile-name">{user.name || user.email.split("@")[0]}</span>
        <span className="profile-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="profile-menu" role="menu">
          <div className="profile-head">
            <span className="profile-avatar profile-avatar-lg">{initial}</span>
            <div>
              <strong>{user.name || user.email.split("@")[0]}</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <div className="profile-group">
            <Link to="/account" role="menuitem" onClick={() => setOpen(false)}>
              <span aria-hidden="true"></span> Account settings
            </Link>
    
          </div>

       

          <div className="profile-group">
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut();
                navigate("/");
              }}
            >
              <span aria-hidden="true">↩</span> Log out
            </button>
            <Link
              to="/account"
              role="menuitem"
              className="profile-danger"
              onClick={() => setOpen(false)}
            >
              <span aria-hidden="true">🗑</span> Delete account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;

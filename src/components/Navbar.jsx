import { Link, useLocation } from "react-router-dom";

import ProfileMenu from "./ProfileMenu";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const onHome = pathname === "/";

  return (
    <header className={onHome ? "navbar" : "navbar navbar-solid"}>
      <Link to="/" className="logo">
        <div className="logo-mark"><span></span><span></span></div>
        <span>devpulse</span>
      </Link>

      <nav className="nav-links">
        <Link to="/discover" className={pathname === "/discover" ? "nav-active" : undefined}>
          Discover
        </Link>
        <Link
          to="/projects"
          className={pathname.startsWith("/projects") ? "nav-active" : undefined}
        >
          Projects
        </Link>

        <Link
          to="/technews"
          className={pathname.startsWith("/technews") ? "nav-active" : undefined}
        >
          TechNews
        </Link>
        <Link
          to="/github"
          className={pathname.startsWith("/github") ? "nav-active" : undefined}
          title={user ? undefined : "Sign in to browse repositories"}
        >
          GitHub
          {!user && <span className="nav-lock" aria-label="requires an account">🔒</span>}
        </Link>
        <Link to="/#learn">Learn</Link>
      </nav>

      <ProfileMenu />
    </header>
  );
}

export default Navbar;

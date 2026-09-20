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

        {/* API MEGA MENU */}
        <div className="nav-dropdown">

          <button className="nav-dropdown-trigger">
            APIs
          </button>

          <div className="api-mega-menu">

            <div className="api-menu-header">
              <div>
                <span className="api-menu-label">
                  API DIRECTORY
                </span>

                <h3>Find the right API</h3>

                <p>
                  Explore free, freemium and paid APIs
                  for your next project.
                </p>
              </div>
            </div>

            <div className="api-columns">

              {/* LEFT COLUMN */}

              <div className="api-column">
                <ApiMenuItem title="AI & Machine Learning" count="AI APIs" />
                <ApiMenuItem title="Weather" count="Weather APIs" />
                <ApiMenuItem title="Movies & TV" count="Entertainment APIs" />
                <ApiMenuItem title="Books" count="Books & Literature" />
                <ApiMenuItem title="Currency" count="Exchange Rate APIs" />
                <ApiMenuItem title="Images" count="Image APIs" />
                <ApiMenuItem title="Animals" count="Animal APIs" />
                <ApiMenuItem title="Social Media" count="Social APIs" />
                <ApiMenuItem title="Authentication" count="Auth & Identity" />
              </div>

              {/* RIGHT COLUMN */}

              <div className="api-column">
                <ApiMenuItem title="Maps & Location" count="Maps & Geocoding" />
                <ApiMenuItem title="News" count="News APIs" />
                <ApiMenuItem title="Games" count="Gaming APIs" />
                <ApiMenuItem title="Finance" count="Finance APIs" />
                <ApiMenuItem title="Sports" count="Sports APIs" />
                <ApiMenuItem title="Email & Communication" count="Communication APIs" />
                <ApiMenuItem title="Cloud & Infrastructure" count="Cloud APIs" />
                <ApiMenuItem title="Food" count="Food & Restaurant APIs" />
                <ApiMenuItem title="Developer Tools" count="Developer APIs" />
              </div>

            </div>

            {/* FOOTER */}

            <div className="api-menu-footer">

              <div>
                <strong>
                  Looking for something specific?
                </strong>

                <span>
                  Search through our complete API collection.
                </span>
              </div>

              <a href="#all-apis">
                View all APIs
                <span>→</span>
              </a>

            </div>

          </div>

        </div>

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

function ApiMenuItem({ title, count }) {
  return (
    <a
      href={`#${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      className="api-menu-item"
    >
      <div className="api-item-content">
        <strong>{title}</strong>
        <span>{count}</span>
      </div>

      <span className="api-item-arrow">→</span>
    </a>
  );
}

export default Navbar;

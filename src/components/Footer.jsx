import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <div className="logo">
          <div className="logo-mark"><span></span><span></span></div>
          <span>devpulse</span>
        </div>
        <p>Discover what's next in technology.</p>
      </div>

      <div className="footer-links">
        <div>
          <strong>Explore</strong>
          <Link to="/discover">Trending</Link>
          <Link to="/projects">Projects</Link>
          <a href="#apis">APIs</a>
        </div>
        <div>
          <strong>Developers</strong>
          <Link to="/github">GitHub</Link>
          <Link to="/#learn">Learn</Link>
          <a href="#tools">New Tools</a>
        </div>
        <div>
          <strong>Company</strong>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <a href="#privacy">Privacy</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

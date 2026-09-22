import { Link } from "react-router-dom";
import {
  TrendingLogo,
  ProjectsLogo,
  ApiLogo,
  GithubLogo,
  LearnLogo,
  NewToolsLogo,
} from "../components/icons/FeatureLogos";

function Home() {
  return (
    <main>
      <section className="hero" id="discover">
        <div className="glow glow-one"></div>
        <div className="glow glow-two"></div>
        <div className="glow glow-three"></div>

        <div className="hero-content">
          <div className="eyebrow">
            <span className="pulse-dot"></span>
            THE DEVELOPER DISCOVERY PLATFORM
          </div>

          <h1>Where developers<br />discover what's next.</h1>

          <p className="hero-description">
            Discover what's trending, what to build, what to learn,
            useful APIs, GitHub projects and the newest developer tools —
            all in one place.
          </p>

          <button className="hero-button">
            <span className="browser-icon">◉</span>
            Get started — Free forever
            <span className="arrow">→</span>
          </button>
        </div>

        <div className="hero-image-wrapper">
          <div className="hero-image-placeholder">
            <div className="placeholder-content">
              <div className="image-icon">＋</div>
              <h3>Your Hero Image</h3>
              <p>Replace this area with your own image, animation, product screenshot or video.</p>
              <span className="placeholder-label">IMAGE / VIDEO PLACEHOLDER</span>
            </div>
          </div>
        </div>
      </section>

      <section className="discovery-section">
        <div className="section-heading">
          <div>
            <span className="section-label">DISCOVER</span>
            <h2>Everything worth<br />knowing, in one place.</h2>
          </div>
          <p>
            Stop jumping between dozens of websites. Find projects, APIs,
            repositories, tools and learning resources from one
            developer-focused dashboard.
          </p>
        </div>

        <div className="category-tabs">
          <button className="active">Trending</button>
          <button>Projects</button>
          <button>APIs</button>
          <button>GitHub</button>
          <button>Learn</button>
          <button>New Tools</button>
        </div>

        <div className="dashboard-preview">
          <div className="preview-browser">
            <div className="browser-top">
              <div className="browser-dots"><span></span><span></span><span></span></div>
              <div className="browser-address">devpulse.dev/discover</div>
              <div className="browser-actions">☆</div>
            </div>

            <aside className="preview-sidebar">
              <div className="preview-logo">◈ devpulse</div>
              <div className="side-menu-title">DISCOVER</div>
              <div className="side-item active">🔥 Trending</div>
              <div className="side-item">🚀 Projects</div>
              <div className="side-item">🧩 APIs</div>
              <div className="side-item">⭐ GitHub</div>
              <div className="side-item">📚 Learn</div>
              <div className="side-menu-title">COLLECTION</div>
              <div className="side-item">❤️ Saved</div>
            </aside>

            <div className="preview-main">
              <div className="preview-header">
                <div>
                  <span>GOOD MORNING</span>
                  <h3>What's happening in tech?</h3>
                </div>
                <div className="preview-search">🔍 Search</div>
              </div>

              <div className="mini-section-title">🔥 Trending today</div>

              <div className="trend-row">
                <div className="trend-card"><span>01</span><strong>AI Agents</strong><small>+42%</small></div>
                <div className="trend-card"><span>02</span><strong>MCP</strong><small>+31%</small></div>
                <div className="trend-card"><span>03</span><strong>WebGPU</strong><small>+24%</small></div>
              </div>

              <div className="preview-grid">
                <div className="preview-card large-card">
                  <div className="card-top"><span>🚀 PROJECT</span><span>↗</span></div>
                  <div className="card-image-placeholder"><span>YOUR IMAGE</span></div>
                  <h4>AI Developer Workspace</h4>
                  <p>Explore a modern open-source project and try the live demo.</p>
                  <div className="card-footer"><span>⭐ 12.4K</span><span>React · Python</span></div>
                </div>

                <div className="preview-card">
                  <div className="card-top"><span>🧩 API</span><span className="free">FREE</span></div>
                  <div className="api-icon">☁</div>
                  <h4>Weather API</h4>
                  <p>Free weather data for your next project.</p>
                  <button className="preview-link">Documentation →</button>
                </div>

                <div className="preview-card">
                  <div className="card-top"><span>📚 LEARN</span></div>
                  <div className="video-placeholder">▶</div>
                  <h4>Learn AI Agents</h4>
                  <p>2 hour developer tutorial.</p>
                  <button className="preview-link">Watch →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="section-label">BUILT FOR DEVELOPERS</div>
        <h2>One place.<br />Infinite things to discover.</h2>

         <div className="feature-grid">
          <FeatureCard number="01" icon={<TrendingLogo />} title="Trending" text="Know what technologies, topics and projects are gaining momentum." to="/discover" />
          <FeatureCard number="02" icon={<ProjectsLogo />} title="Projects" text="Discover interesting projects and open their live deployments directly." to="/projects" />
          <FeatureCard number="03" icon={<ApiLogo />} title="APIs" text="Find free, freemium and paid APIs for your next project." to="/apis" />
          <FeatureCard number="04" icon={<GithubLogo />} title="GitHub" text="Explore highly rated repositories using domain and tech-stack filters." to="/github" />
          <FeatureCard number="05" icon={<LearnLogo />} title="Learn" text="Find the best videos, tutorials and resources for modern technologies." />
          <FeatureCard number="06" icon={<NewToolsLogo />} title="New Tools" text="Discover newly launched developer tools before they become mainstream." />
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-glow"></div>
        <span className="section-label">YOUR NEXT DISCOVERY STARTS HERE</span>
        <h2>Stop searching.<br />Start discovering.</h2>
        <p>Projects, APIs, GitHub repositories, learning resources and developer tools — brought together for you.</p>
        <button className="hero-button">Start exploring <span className="arrow">→</span></button>
      </section>
    </main>
  );
}

function FeatureCard({ number, icon, title, text, to }) {
  const inner = (
    <>
      <div className="feature-number">{number}</div>
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="feature-arrow">→</div>
    </>
  );

  if (to) {
    return <Link to={to} className="feature-card">{inner}</Link>;
  }

  return <div className="feature-card">{inner}</div>;
}

export default Home;

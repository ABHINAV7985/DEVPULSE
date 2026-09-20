import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { store } from "../lib/projectsStore";
import "../styles/projects.css";

function SubmitSolutionForm({ slug, onSubmitted, onCancel }) {
  const [language, setLanguage] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [liveLink, setLiveLink] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await store.submitSolution(slug, { language, githubLink, liveLink, note });
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="pj-solution-form" onSubmit={handleSubmit}>
      <h3>Submit your solution</h3>

      <label>
        Language / stack
        <input
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="e.g. Python, Go, React"
        />
      </label>

      <label>
        GitHub link
        <input
          type="url"
          value={githubLink}
          onChange={(e) => setGithubLink(e.target.value)}
          placeholder="https://github.com/you/your-solution"
        />
      </label>

      <label>
        Live link <span className="pj-optional">(optional)</span>
        <input
          type="url"
          value={liveLink}
          onChange={(e) => setLiveLink(e.target.value)}
          placeholder="https://your-deployed-app.example.com"
        />
      </label>

      <label>
        Notes <span className="pj-optional">(optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Anything worth mentioning about your approach"
        />
      </label>

      {error && <p className="pj-form-error">{error}</p>}

      <div className="pj-form-actions">
        <button type="button" className="pj-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="pj-btn-primary" disabled={busy}>
          {busy ? "Submitting…" : "Submit solution"}
        </button>
      </div>
    </form>
  );
}

function ProjectDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [started, setStarted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const load = async () => {
    try {
      const p = await store.getProject(slug);
      if (!p) {
        setNotFound(true);
        return;
      }
      setProject(p);
      if (user) setStarted(await store.hasStarted(slug));
    } catch (err) {
      setLoadError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user]);

  if (loadError) {
    return (
      <div className="pj-page pj-page-narrow">
        <p className="pj-form-error">Couldn't load this project: {loadError}</p>
        <Link to="/projects">← Back to Projects</Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="pj-page pj-page-narrow">
        <p>That project doesn't exist.</p>
        <Link to="/projects">← Back to Projects</Link>
      </div>
    );
  }

  if (!project) return <div className="route-loading">Loading</div>;

  const startWorking = async () => {
    if (!user) {
      navigate("/login", { state: { from: `/projects/${slug}` } });
      return;
    }
    try {
      await store.startProject(slug);
      setStarted(true);
      load();
    } catch (err) {
      setLoadError(err.message);
    }
  };

  const stage = project.solutionCount > 0 && started ? 2 : started ? 1 : 0;

  return (
    <div className="pj-page pj-page-narrow">
      <div className="pj-tabbar">
        <Link to="/projects" className="pj-tabbar-back">
          ← Back to Projects
        </Link>
        <span className="pj-tabbar-item pj-tabbar-active">Project Detail</span>
        <Link to={`/projects/${slug}/solutions`} className="pj-tabbar-item">
          Community Solutions
        </Link>
      </div>

      <article className="pj-detail-card">
        <div className="pj-card-top">
          {project.tags?.map((t) => (
            <span key={t} className="pj-tag">
              {t}
            </span>
          ))}
          <span
            className={`pj-difficulty pj-difficulty-${project.difficulty.toLowerCase()} pj-difficulty-pinned`}
          >
            {project.difficulty}
          </span>
        </div>

        <h1>{project.title}</h1>
        <p className="pj-detail-sub">{project.shortDescription}</p>

        <div className="pj-stepper">
          <button
            className={started ? "pj-step pj-step-done" : "pj-step"}
            onClick={startWorking}
            disabled={started}
          >
            {started ? "✓ Started" : "▶ Start Working"}
          </button>
          <span className="pj-step-line" />
          <button
            className={stage >= 1 ? "pj-step pj-step-active" : "pj-step"}
            onClick={() => (started ? setShowForm(true) : startWorking())}
          >
            Submit Solution
          </button>
          <span className="pj-step-line" />
          <span className="pj-step pj-step-static">
            {project.startedCount} started
          </span>
          <span className="pj-step-line" />
          <Link to={`/projects/${slug}/solutions`} className="pj-step pj-step-static">
            {project.solutionCount} solutions
          </Link>
        </div>

        <p className="pj-detail-body">{project.fullDescription}</p>

        <h2>Requirements</h2>
        <ul className="pj-list">
          {project.requirements?.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        {project.constraints?.length > 0 && (
          <>
            <h2>Here are some constraints to guide the implementation:</h2>
            <ul className="pj-list">
              {project.constraints.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        )}

        {showForm && (
          <SubmitSolutionForm
            slug={slug}
            onCancel={() => setShowForm(false)}
            onSubmitted={() => {
              setShowForm(false);
              load();
              navigate(`/projects/${slug}/solutions`);
            }}
          />
        )}
      </article>
    </div>
  );
}

export default ProjectDetail;

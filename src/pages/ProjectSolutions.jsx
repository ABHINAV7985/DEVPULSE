import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { store } from "../lib/projectsStore";
import Dropdown from "../components/Dropdown";
import "../styles/projects.css";

function ago(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ProjectSolutions() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [sort, setSort] = useState("top");
  const [language, setLanguage] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    store.getProject(slug).then(setProject).catch((err) => setError(err.message));
  }, [slug]);

  useEffect(() => {
    store
      .listSolutions(slug, { sort })
      .then(setSolutions)
      .catch((err) => setError(err.message));
  }, [slug, sort]);

  const languages = useMemo(
    () => [...new Set(solutions.map((s) => s.language))].sort(),
    [solutions]
  );

  const visible = language ? solutions.filter((s) => s.language === language) : solutions;

  const vote = async (id, dir) => {
    try {
      await store.voteSolution(id, dir);
      setSolutions(await store.listSolutions(slug, { sort }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="pj-page pj-page-narrow">
      <div className="pj-tabbar">
        <Link to="/projects" className="pj-tabbar-back">
          ← Back to Projects
        </Link>
        <Link to={`/projects/${slug}`} className="pj-tabbar-item">
          Project Detail
        </Link>
        <span className="pj-tabbar-item pj-tabbar-active">Community Solutions</span>
      </div>

      <div className="pj-solutions-head">
        <div>
          <h1>{project?.title || "Project"} Solutions</h1>
          <p className="pj-detail-sub">Solutions submitted by the community</p>
        </div>

        <div className="pj-solutions-controls">
          <Dropdown
            value={sort}
            onChange={setSort}
            options={[
              { value: "top", label: "Highest Rating" },
              { value: "recent", label: "Most Recent" },
            ]}
          />

          <Dropdown
            value={language}
            onChange={setLanguage}
            options={[
              { value: "", label: "All Languages" },
              ...languages.map((l) => ({ value: l, label: l })),
            ]}
          />
        </div>
      </div>

      {error ? (
        <div className="pj-empty">Couldn't load solutions: {error}</div>
      ) : visible.length === 0 ? (
        <div className="pj-empty">
          No solutions yet — be the first to submit one from the project page.
        </div>
      ) : (
        <ul className="pj-solution-list">
          {visible.map((s) => (
            <li key={s.id} className="pj-solution-row">
              <div className="pj-solution-avatar">{initials(s.userName)}</div>

              <div className="pj-solution-main">
                <p>
                  <strong>{s.userName}</strong> submitted their solution · {ago(s.createdAt)}
                </p>
                <div className="pj-solution-actions">
                  <button onClick={() => vote(s.id, "up")}>▲ {s.upvotes}</button>
                  <button onClick={() => vote(s.id, "down")}>▼ {s.downvotes}</button>
                  {s.githubLink && (
                    <a href={s.githubLink} target="_blank" rel="noreferrer">
                      ↗ Visit Solution
                    </a>
                  )}
                  {s.liveLink && (
                    <a href={s.liveLink} target="_blank" rel="noreferrer">
                      ↗ Live Demo
                    </a>
                  )}
                </div>
                {s.note && <p className="pj-solution-note">{s.note}</p>}
              </div>

              <span className="pj-tag">{s.language}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProjectSolutions;

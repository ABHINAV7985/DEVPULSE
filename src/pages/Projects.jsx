import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import ProjectCard from "../components/ProjectCard";
import { store } from "../lib/projectsStore";
import "../styles/projects.css";

const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];

function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get("role") || "";
  const difficulty = searchParams.get("difficulty") || "All";
  const query = searchParams.get("q") || "";

  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    store
      .listProjects({ role: role || undefined, difficulty, query })
      .then((list) => {
        if (!cancelled) {
          setProjects(list);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [role, difficulty, query]);

  useEffect(() => {
    let cancelled = false;
    store.listRoles().then((r) => {
      if (!cancelled) setRoles(r);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projects.length]);

  const totalCount = useMemo(
    () => roles.reduce((sum, r) => sum + r.count, 0),
    [roles]
  );

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="pj-page">
      <aside className="pj-sidebar">
        <h2>Projects</h2>
        <p className="pj-sidebar-sub">
          Practical, roadmap-style projects to build real skills.
        </p>

        <input
          className="pj-search"
          type="search"
          placeholder="Search projects"
          value={query}
          onChange={(e) => updateParam("q", e.target.value)}
        />

        <div className="pj-role-list">
          <button
            className={role === "" ? "pj-role-item pj-role-active" : "pj-role-item"}
            onClick={() => updateParam("role", "")}
          >
            <span>All Projects</span>
            <span className="pj-role-count">{totalCount}</span>
          </button>

          {roles.map((r) => (
            <button
              key={r.role}
              className={role === r.role ? "pj-role-item pj-role-active" : "pj-role-item"}
              onClick={() => updateParam("role", r.role)}
            >
              <span>{r.role}</span>
              <span className="pj-role-count">{r.count}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="pj-main">
        <div className="pj-tabs">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={difficulty === d ? "pj-tab pj-tab-active" : "pj-tab"}
              onClick={() => updateParam("difficulty", d === "All" ? "" : d)}
            >
              {d}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="route-loading">Loading</div>
        ) : error ? (
          <div className="pj-empty">Couldn't load projects: {error}</div>
        ) : projects.length === 0 ? (
          <div className="pj-empty">
            No projects match those filters yet — try a different role or difficulty.
          </div>
        ) : (
          <div className="pj-grid">
            {projects.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Projects;

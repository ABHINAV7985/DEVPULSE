import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getRepo,
  getLanguages,
  getContributors,
  getReadme,
  getRelated,
  getReleases,
  starsPerDay,
} from "../lib/github";
import { formatStars, timeAgo } from "../components/RepoCard";
import "../styles/github.css";

/* Turn the top of a README into readable plain text. */
function readmeExcerpt(md, limit = 900) {
  if (!md) return "";

  const text = md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^[#>\-*=|]+\s?/gm, "")
    .replace(/[`*_~]/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 40)
    .join("\n\n");

  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

function GithubProject() {
  const { owner, name } = useParams();

  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    window.scrollTo(0, 0);

    getRepo(owner, name)
      .then(async (repo) => {
        if (!live) return;
        setState({ status: "ready", repo });

        const [languages, contributors, readme, release, related] =
          await Promise.all([
            getLanguages(owner, name),
            getContributors(owner, name),
            getReadme(owner, name),
            getReleases(owner, name),
            getRelated(repo),
          ]);

        if (!live) return;
        setState({
          status: "ready",
          repo,
          languages,
          contributors,
          readme,
          release,
          related,
        });
      })
      .catch((err) => {
        if (live) setState({ status: "error", error: err.message });
      });

    return () => {
      live = false;
    };
  }, [owner, name]);

  if (state.status === "loading") {
    return (
      <main className="gh-page gh-detail">
        <div className="gh-detail-loading">Loading {owner}/{name}</div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="gh-page gh-detail">
        <div className="gh-state">
          <h3>Could not load this repository</h3>
          <p>{state.error}</p>
          <Link to="/github" className="gh-back-link">Back to GitHub</Link>
        </div>
      </main>
    );
  }

  const { repo, languages = {}, contributors = [], readme, release, related = [] } = state;

  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
  const langList = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([lang, bytes]) => ({
      lang,
      share: Math.round((bytes / totalBytes) * 100),
    }));

  const stackLine = [repo.language, ...(repo.topics || []).slice(0, 2)]
    .filter(Boolean)
    .join(" • ");

  const perDay = starsPerDay(repo);

  const signals = [
    { label: "Stars per day since launch", value: perDay.toFixed(1) },
    { label: "Last commit pushed", value: timeAgo(repo.pushed_at) },
    { label: "Forks", value: formatStars(repo.forks_count) },
    { label: "Open issues", value: formatStars(repo.open_issues_count) },
    { label: "Watchers", value: formatStars(repo.subscribers_count ?? repo.watchers_count) },
    { label: "Created", value: new Date(repo.created_at).getFullYear() },
  ];

  const demo = repo.homepage && /^https?:\/\//.test(repo.homepage) ? repo.homepage : null;

  return (
    <main className="gh-page gh-detail">
      <div className="gh-glow" aria-hidden="true"></div>

      <Link to="/github" className="gh-back-link">← Back to GitHub</Link>

      <header className="gh-detail-head">
        <h1>{repo.name}</h1>

        <div className="gh-detail-meta">
          <span className="gh-detail-stars">
            ⭐ {repo.stargazers_count.toLocaleString()} stars
          </span>
          {stackLine && <span className="gh-detail-stack">{stackLine}</span>}
          {repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" && (
            <span className="gh-detail-stack">{repo.license.spdx_id}</span>
          )}
        </div>

        <div className="gh-detail-owner">
          {repo.owner?.avatar_url && (
            <img src={repo.owner.avatar_url} alt="" width="22" height="22" />
          )}
          <span>Maintained by {repo.owner?.login}</span>
        </div>
      </header>

      <div className="gh-detail-body">
        <div className="gh-detail-main">
          <Block title="Description">
            <p className="gh-lead">{repo.description || "No description provided."}</p>
            {readme && <p className="gh-readme">{readmeExcerpt(readme)}</p>}
          </Block>

          <Block title="Why is this trending?">
            <div className="gh-signals">
              {signals.map((s) => (
                <div key={s.label} className="gh-signal">
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Tech stack">
            {langList.length ? (
              <ul className="gh-stack">
                {langList.map((l) => (
                  <li key={l.lang}>
                    <span>{l.lang}</span>
                    <div className="gh-bar">
                      <i style={{ width: `${l.share}%` }}></i>
                    </div>
                    <em>{l.share}%</em>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="gh-muted">GitHub reports no language breakdown for this repository.</p>
            )}

            {!!(repo.topics || []).length && (
              <div className="gh-card-topics gh-topics-wide">
                {repo.topics.slice(0, 12).map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            )}
          </Block>

          {related.length > 0 && (
            <Block title="Related repositories">
              <div className="gh-related">
                {related.map((r) => {
                  const [o, n] = r.full_name.split("/");
                  return (
                    <Link key={r.id} to={`/github/${o}/${n}`} className="gh-related-item">
                      <div>
                        <strong>{r.name}</strong>
                        <span>{r.description || "No description provided."}</span>
                      </div>
                      <em>⭐ {formatStars(r.stargazers_count)}</em>
                    </Link>
                  );
                })}
              </div>
            </Block>
          )}
        </div>

        <aside className="gh-detail-side">
          {demo && (
            <div className="gh-panel">
              <h4>Live demo</h4>
              <a className="gh-primary-btn" href={demo} target="_blank" rel="noreferrer">
                Try project <span>↗</span>
              </a>
              <p className="gh-muted gh-url">{demo.replace(/^https?:\/\//, "")}</p>
            </div>
          )}

          <div className="gh-panel">
            <h4>Links</h4>
            <a className="gh-side-link" href={repo.html_url} target="_blank" rel="noreferrer">
              GitHub repository <span>↗</span>
            </a>
            <a
              className="gh-side-link"
              href={`${repo.html_url}#readme`}
              target="_blank"
              rel="noreferrer"
            >
              Documentation <span>↗</span>
            </a>
            <a
              className="gh-side-link"
              href={`${repo.html_url}/issues`}
              target="_blank"
              rel="noreferrer"
            >
              Issues <span>↗</span>
            </a>
            {release?.html_url && (
              <a className="gh-side-link" href={release.html_url} target="_blank" rel="noreferrer">
                Latest release {release.tag_name} <span>↗</span>
              </a>
            )}
          </div>

          {contributors.length > 0 && (
            <div className="gh-panel">
              <h4>Top contributors</h4>
              <div className="gh-contribs">
                {contributors.slice(0, 8).map((c) => (
                  <a key={c.id} href={c.html_url} target="_blank" rel="noreferrer" title={c.login}>
                    <img src={c.avatar_url} alt={c.login} width="32" height="32" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function Block({ title, children }) {
  return (
    <section className="gh-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default GithubProject;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DOMAINS, TECHNOLOGIES, SORTS } from "../data/filters";
import { searchRepos } from "../lib/github";
import RepoCard from "../components/RepoCard";
import "../styles/github.css";

const listParam = (value) => (value ? value.split(",").filter(Boolean) : []);

function Github() {
  const [params, setParams] = useSearchParams();

  const domains = useMemo(() => listParam(params.get("domain")), [params]);
  const techs = useMemo(() => listParam(params.get("tech")), [params]);
  const sort = params.get("sort") || "trending";
  const query = params.get("q") || "";

  const [draft, setDraft] = useState(query);
  const [repos, setRepos] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [retry, setRetry] = useState(0);

  const requestId = useRef(0);

  useEffect(() => setDraft(query), [query]);

  const update = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);

      Object.entries(patch).forEach(([key, value]) => {
        if (!value || (Array.isArray(value) && !value.length)) next.delete(key);
        else next.set(key, Array.isArray(value) ? value.join(",") : value);
      });

      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const toggle = (key, current, id) => {
    const next = current.includes(id)
      ? current.filter((v) => v !== id)
      : [...current, id];
    update({ [key]: next });
  };

  /* ---------------- data ---------------- */

  useEffect(() => {
    const id = ++requestId.current;
    setStatus("loading");
    setError("");
    setPage(1);

    searchRepos({ domains, techs, text: query, sort, page: 1 })
      .then((res) => {
        if (id !== requestId.current) return;
        setRepos(res.items);
        setHasMore(res.hasMore);
        setStatus(res.items.length ? "ready" : "empty");
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setError(err.message);
        setStatus("error");
      });
  }, [domains.join(","), techs.join(","), sort, query, retry]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await searchRepos({
        domains,
        techs,
        text: query,
        sort,
        page: page + 1,
      });

      const known = new Set(repos.map((r) => r.id));
      setRepos([...repos, ...res.items.filter((r) => !known.has(r.id))]);
      setPage(page + 1);
      setHasMore(res.hasMore && page + 1 < 5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const activeCount = domains.length + techs.length + (query ? 1 : 0);

  const clearAll = () => setParams(new URLSearchParams({ sort }), { replace: true });

  /* ---------------- render ---------------- */

  return (
    <main className="gh-page">
      <div className="gh-glow" aria-hidden="true"></div>

      <header className="gh-head">
        <span className="section-label">GITHUB</span>
        <h1>Top repositories, filtered the way you work.</h1>
        <p>
          Search public repositories by domain, tech stack and how they rank.
          Data comes live from the GitHub API.
        </p>
      </header>

      <div className="gh-toolbar">
        <form
          className="gh-search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: draft.trim() });
          }}
        >
          <span className="gh-search-icon"></span>
          <input
            type="search"
            value={draft}
            placeholder="Search repositories"
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Search repositories"
          />
          {draft && (
            <button
              type="button"
              className="gh-search-clear"
              onClick={() => {
                setDraft("");
                update({ q: "" });
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </form>

        <div className="gh-sort" role="group" aria-label="Sort by">
          {SORTS.map((s) => (
            <button
              key={s.id}
              className={sort === s.id ? "gh-sort-btn is-active" : "gh-sort-btn"}
              onClick={() => update({ sort: s.id })}
              aria-pressed={sort === s.id}
            >
              <span aria-hidden="true">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="gh-layout">
        <button
          className="gh-filter-toggle"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          Filters {activeCount > 0 && <em>{activeCount}</em>}
        </button>

        <aside className={filtersOpen ? "gh-filters is-open" : "gh-filters"}>
          <div className="gh-filters-top">
            <strong>Filters</strong>
            {activeCount > 0 && (
              <button className="gh-clear" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>

          <FilterGroup
            title="Domain"
            options={DOMAINS}
            selected={domains}
            onToggle={(id) => toggle("domain", domains, id)}
          />

          <FilterGroup
            title="Technology"
            options={TECHNOLOGIES}
            selected={techs}
            onToggle={(id) => toggle("tech", techs, id)}
          />

          <p className="gh-filter-note">
            Picking two domains widens the search. Mixing a domain with a
            technology narrows it.
          </p>
        </aside>

        <section className="gh-results">
          <div className="gh-results-top">
            <span>
              {status === "loading"
                ? "Loading repositories"
                : `${repos.length} repositor${repos.length === 1 ? "y" : "ies"}`}
            </span>

            {activeCount > 0 && (
              <div className="gh-chips">
                {domains.map((id) => (
                  <Chip
                    key={id}
                    label={DOMAINS.find((d) => d.id === id)?.label}
                    onRemove={() => toggle("domain", domains, id)}
                  />
                ))}
                {techs.map((id) => (
                  <Chip
                    key={id}
                    label={TECHNOLOGIES.find((t) => t.id === id)?.label}
                    onRemove={() => toggle("tech", techs, id)}
                  />
                ))}
                {query && (
                  <Chip label={`"${query}"`} onRemove={() => update({ q: "" })} />
                )}
              </div>
            )}
          </div>

          {status === "loading" && (
            <div className="gh-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="gh-card gh-skeleton" />
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="gh-state">
              <h3>Search failed</h3>
              <p>{error}</p>
              <button onClick={() => setRetry((n) => n + 1)}>Try again</button>
            </div>
          )}

          {status === "empty" && (
            <div className="gh-state">
              <h3>No repositories match these filters</h3>
              <p>Remove a technology filter or switch the ranking to Most Stars.</p>
              <button onClick={clearAll}>Clear filters</button>
            </div>
          )}

          {status === "ready" && (
            <>
              <div className="gh-grid">
                {repos.map((repo, i) => (
                  <RepoCard key={repo.id} repo={repo} rank={i + 1} sort={sort} />
                ))}
              </div>

              {error && <p className="gh-inline-error">{error}</p>}

              {hasMore && !error && (
                <div className="gh-more">
                  <button onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function FilterGroup({ title, options, selected, onToggle }) {
  return (
    <fieldset className="gh-group">
      <legend>{title}</legend>

      {options.map((o) => {
        const checked = selected.includes(o.id);
        return (
          <label
            key={o.id}
            className={checked ? "gh-check is-checked" : "gh-check"}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(o.id)}
            />
            <span className="gh-box" aria-hidden="true"></span>
            {o.label}
          </label>
        );
      })}
    </fieldset>
  );
}

function Chip({ label, onRemove }) {
  return (
    <button className="gh-chip" onClick={onRemove}>
      {label}
      <span aria-hidden="true">✕</span>
      <span className="sr-only">Remove filter</span>
    </button>
  );
}

export default Github;

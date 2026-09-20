import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DOMAINS, KINDS, RANGES } from "../data/discoverFilters";
import { loadFeed, loadCommunity } from "../lib/discover";
import DiscoverCard from "../components/DiscoverCard";
import "../styles/discover.css";

const list = (v) => (v ? v.split(",").filter(Boolean) : []);

function Discover() {
  const [params, setParams] = useSearchParams();

  const domains = useMemo(() => list(params.get("domain")), [params]);
  const kinds = useMemo(() => list(params.get("kind")), [params]);
  const days = params.get("days") || "7";

  const [feed, setFeed] = useState([]);
  const [community, setCommunity] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(18);

  const reqId = useRef(0);

  const update = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => {
        if (!v || (Array.isArray(v) && !v.length)) next.delete(k);
        else next.set(k, Array.isArray(v) ? v.join(",") : v);
      });
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const toggle = (key, current, id) =>
    update({
      [key]: current.includes(id)
        ? current.filter((v) => v !== id)
        : [...current, id],
    });

  useEffect(() => {
    const id = ++reqId.current;
    setStatus("loading");
    setError("");
    setVisible(18);

    loadFeed({ domains, kinds, days })
      .then((items) => {
        if (id !== reqId.current) return;
        setFeed(items);
        setStatus(items.length ? "ready" : "empty");
      })
      .catch((err) => {
        if (id !== reqId.current) return;
        setError(err.message);
        setStatus("error");
      });

    loadCommunity({ domains })
      .then((c) => id === reqId.current && setCommunity(c))
      .catch(() => {});
  }, [domains.join(","), kinds.join(","), days]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = feed.slice(0, visible);
  const [lead, ...rest] = shown;

  return (
    <main className="dv-page">
      <div className="dv-glow" aria-hidden="true"></div>

      <header className="dv-head">
        <span className="section-label">DISCOVER</span>
        <h1>What's happening in tech?</h1>
        <p>
          Live from Hacker News, DEV Community and GitHub, filtered down to
          developer topics. No editor picks — ranking comes from what people
          are actually upvoting, commenting on and starring right now.
        </p>
      </header>

      <div className="dv-controls">
        <div className="dv-domains">
          {DOMAINS.map((d) => (
            <button
              key={d.id}
              className={domains.includes(d.id) ? "dv-pill is-on" : "dv-pill"}
              onClick={() => toggle("domain", domains, d.id)}
              aria-pressed={domains.includes(d.id)}
            >
              <span aria-hidden="true">{d.icon}</span>
              {d.label}
            </button>
          ))}
        </div>

        <div className="dv-row">
          <div className="dv-kinds">
            {KINDS.map((k) => (
              <button
                key={k.id}
                className={kinds.includes(k.id) ? "dv-chip is-on" : "dv-chip"}
                onClick={() => toggle("kind", kinds, k.id)}
                aria-pressed={kinds.includes(k.id)}
              >
                <span aria-hidden="true">{k.icon}</span>
                {k.label}
              </button>
            ))}
          </div>

          <div className="dv-range" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.id}
                className={days === r.id ? "dv-range-btn is-on" : "dv-range-btn"}
                onClick={() => update({ days: r.id })}
                aria-pressed={days === r.id}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {(domains.length || kinds.length) > 0 && (
          <button
            className="dv-reset"
            onClick={() => setParams(new URLSearchParams({ days }), { replace: true })}
          >
            Reset filters
          </button>
        )}
      </div>

      <div className="dv-layout">
        <section className="dv-feed">
          {status === "loading" && (
            <div className="dv-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="dc-card dv-skeleton" />
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="dv-state">
              <h3>Couldn't load the feed</h3>
              <p>{error}</p>
              <button onClick={() => update({ days })}>Try again</button>
            </div>
          )}

          {status === "empty" && (
            <div className="dv-state">
              <h3>Nothing matches those filters</h3>
              <p>Try a wider time range, or clear a content type.</p>
            </div>
          )}

          {status === "ready" && (
            <>
              {lead && <DiscoverCard item={lead} featured />}

              <div className="dv-grid">
                {rest.map((item) => (
                  <DiscoverCard key={item.id} item={item} />
                ))}
              </div>

              {visible < feed.length && (
                <div className="dv-more">
                  <button onClick={() => setVisible(visible + 18)}>
                    Show more ({feed.length - visible} left)
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="dv-side">
          <div className="dv-panel">
            <h3>What are developers talking about?</h3>
            <p className="dv-panel-sub">
              {community?.domainLabel} threads with the most active comment
              sections in the last 3 days.
            </p>

            {!community && <p className="dv-muted">Loading threads</p>}

            {community?.threads.length === 0 && (
              <p className="dv-muted">No busy threads right now.</p>
            )}

            <ol className="dv-threads">
              {community?.threads.map((t, i) => (
                <li key={t.id}>
                  <span className="dv-thread-rank">{i + 1}</span>
                  <a href={t.url} target="_blank" rel="noreferrer">
                    <strong>{t.title}</strong>
                    <span>
                      {t.comments} comments · {t.points} points
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </div>

          <div className="dv-panel">
            <h3>Where the conversation happens</h3>
            <div className="dv-places">
              {community?.places.map((p) => (
                <a key={p.name} href={p.url} target="_blank" rel="noreferrer">
                  <strong>{p.name}</strong>
                  <span>{p.blurb}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="dv-panel dv-sources">
            <h3>Sources</h3>
            <p className="dv-muted">
              Hacker News and DEV Community are read directly from their free
              public APIs. GitHub data goes through this project's own
              endpoint. Nothing here is generated or editorialised.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default Discover;

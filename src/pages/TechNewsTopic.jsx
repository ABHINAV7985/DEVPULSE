import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import "../styles/technews.css";
import ArticleImage from "../components/technews/ArticleImage";
import { fetchTopicArticles, formatRelativeTime, TechNewsError } from "../lib/technews";
import { getGroundedSummary, buildFallbackSummary } from "../lib/summarize";

function TechNewsTopic() {
  const { topic } = useParams();
  let topicName = topic || "";
  try {
    topicName = decodeURIComponent(topicName);
  } catch {
    // topic already decoded (or not valid percent-encoding) — use as-is
  }

  const [state, setState] = useState({ status: "loading", articles: [], summary: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", articles: [], summary: null, error: null });

    async function run() {
      try {
        const articles = await fetchTopicArticles(topicName);
        if (cancelled) return;

        if (articles.length === 0) {
          setState({ status: "empty", articles: [], summary: null, error: null });
          return;
        }

        // Build a free summary entirely from the real article text — never invented content.
        const summary = await getGroundedSummary(topicName, articles) || buildFallbackSummary(articles, topicName);

        if (!cancelled) setState({ status: "ready", articles, summary, error: null });
      } catch (err) {
        if (!cancelled) setState({ status: "error", articles: [], summary: null, error: err });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [topicName]);

  const leadArticle = state.articles[0];
  const sources = [...new Set(state.articles.map((a) => a.source?.name).filter(Boolean))];

  return (
    <main className="tn-page tn-topic-page">
      <Link to="/technews" className="tn-back-link">
        ← Back to TechNews
      </Link>

      <h1 className="tn-topic-title">{topicName}</h1>
      <div className="tn-topic-tags">
        <span className="tn-pill">Trending</span>
        {state.articles.length > 0 && (
          <span className="tn-topic-count">{state.articles.length} recent articles</span>
        )}
      </div>

      {state.status === "loading" && <p className="tn-status">Retrieving and reading real source articles…</p>}

      {state.status === "error" && (
        <p className="tn-status tn-status-error">
          {state.error instanceof TechNewsError && state.error.configMissing
            ? "TechNews isn't connected to a live news source yet — see .env.example."
            : "Couldn't retrieve source articles for this topic right now."}
        </p>
      )}

      {state.status === "empty" && (
        <p className="tn-status">
          We couldn't find reliable, recent source articles for this topic, so no summary is shown — we never
          generate one without real sources.
        </p>
      )}

      {state.status === "ready" && (
        <>
          <section className="tn-topic-section">
            <h2>What Happened?</h2>
            <p>{state.summary.whatHappened || "No confirmed summary could be extracted from current sources."}</p>
            {!state.summary.aiGenerated && (
              <p className="tn-topic-note">
                Generated locally from the fetched source text — no AI API or API key required.
              </p>
            )}
          </section>

          {state.summary.disagreements && (
            <section className="tn-topic-section tn-topic-disagreement">
              <h2>Sources Disagree</h2>
              <p>{state.summary.disagreements}</p>
            </section>
          )}

          {state.summary.keyDevelopments.length > 0 && (
            <section className="tn-topic-section">
              <h2>Key Developments</h2>
              <ul className="tn-key-developments">
                {state.summary.keyDevelopments.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="tn-topic-section">
            <h2>Latest Coverage</h2>
            <div className="tn-coverage-list">
              {state.articles.map((a) => (
                <Link
                  key={a.id}
                  to={`/technews/article?q=${encodeURIComponent(a.title.slice(0, 180))}`}
                  state={{ article: a }}
                  className="tn-coverage-item"
                >
                  <ArticleImage
                    src={a.image}
                    alt={a.title}
                    sourceName={a.source?.name}
                    className="tn-coverage-img"
                  />
                  <div className="tn-coverage-copy">
                    <p className="tn-coverage-title">{a.title}</p>
                    <span className="tn-coverage-meta">
                      {a.source?.name} • {formatRelativeTime(a.publishedAt)}
                    </span>
                  </div>
                  <span className="tn-coverage-arrow">›</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="tn-topic-section">
            <h2>Sources</h2>
            <div className="tn-sources-list">
              {sources.map((s) => (
                <span key={s} className="tn-source-chip">
                  {s}
                </span>
              ))}
            </div>
          </section>

          {leadArticle && (
            <a href={leadArticle.url} target="_blank" rel="noopener noreferrer" className="tn-read-original">
              Read Original Article →
            </a>
          )}
        </>
      )}
    </main>
  );
}

export default TechNewsTopic;

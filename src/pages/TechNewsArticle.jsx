import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import "../styles/technews.css";
import ArticleImage from "../components/technews/ArticleImage";
import {
  fetchArticleByTitle,
  formatRelativeTime,
  TechNewsError,
} from "../lib/technews";
import { buildFallbackSummary, getGroundedSummary } from "../lib/summarize";

function TechNewsArticle() {
  const location = useLocation();
  const [params] = useSearchParams();
  const routedArticle = location.state?.article || null;
  const queryTitle = params.get("q") || routedArticle?.title || "";

  const [state, setState] = useState({
    status: routedArticle ? "loading" : "loading-article",
    article: routedArticle,
    summary: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const article = routedArticle || (await fetchArticleByTitle(queryTitle));
        if (cancelled) return;

        if (!article) {
          setState({ status: "empty", article: null, summary: null, error: null });
          return;
        }

        setState((current) => ({ ...current, status: "summarizing", article }));

        const summary = await getGroundedSummary(article.title, [article]) || buildFallbackSummary([article], article.title);

        if (!cancelled) {
          setState({ status: "ready", article, summary, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ status: "error", article: null, summary: null, error });
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [queryTitle, routedArticle]);

  const article = state.article;

  return (
    <main className="tn-page tn-topic-page tn-article-page">
      <Link to="/technews" className="tn-back-link">
        ← Back to TechNews
      </Link>

      {state.status === "loading-article" && (
        <div className="tn-summary-loading">
          <span className="tn-summary-spinner" />
          Finding the original source article…
        </div>
      )}

      {state.status === "summarizing" && article && (
        <>
          <article className="tn-summary-hero">
            <ArticleImage
              src={article.image}
              alt={article.title}
              sourceName={article.source?.name}
              className="tn-summary-image"
            />
            <div className="tn-summary-source-row">
              <span className="tn-pill">{article.source?.name || "News source"}</span>
              <span>{formatRelativeTime(article.publishedAt)}</span>
            </div>
            <h1 className="tn-summary-title">{article.title}</h1>
            <p className="tn-summary-loading-text">Reading the fetched source text and preparing a free source summary…</p>
          </article>
        </>
      )}

      {state.status === "error" && (
        <div className="tn-status tn-status-error">
          {state.error instanceof TechNewsError && state.error.configMissing
            ? "Live news isn't configured on the server yet."
            : state.error?.message || "Couldn't prepare this news summary."}
        </div>
      )}

      {state.status === "empty" && (
        <div className="tn-status">
          The source article could not be matched from the current news feed.
        </div>
      )}

      {state.status === "ready" && article && state.summary && (
        <>
          <article className="tn-summary-hero">
            <ArticleImage
              src={article.image}
              alt={article.title}
              sourceName={article.source?.name}
              className="tn-summary-image"
            />

            <div className="tn-summary-source-row">
              <span className="tn-pill">{article.source?.name || "News source"}</span>
              <span>{formatRelativeTime(article.publishedAt)}</span>
            </div>

            <h1 className="tn-summary-title">{article.title}</h1>

            {article.description && (
              <p className="tn-summary-description">{article.description}</p>
            )}
          </article>

          <section className="tn-topic-section tn-summary-section">
            <div className="tn-summary-heading-row">
              <h2>Summary</h2>
              <span className={state.summary.aiGenerated ? "tn-summary-badge tn-summary-badge-ai" : "tn-summary-badge"}>
                {"Free source summary"}
              </span>
            </div>
            <p>{state.summary.whatHappened || "No confirmed summary could be extracted from the fetched source."}</p>
          </section>

          {state.summary.keyDevelopments.length > 0 && (
            <section className="tn-topic-section">
              <h2>Key Points</h2>
              <ul className="tn-key-developments">
                {state.summary.keyDevelopments.map((point, index) => (
                  <li key={`${point}-${index}`}>{point}</li>
                ))}
              </ul>
            </section>
          )}

          {state.summary.disagreements && (
            <section className="tn-topic-section tn-topic-disagreement">
              <h2>Source Note</h2>
              <p>{state.summary.disagreements}</p>
            </section>
          )}

          <section className="tn-topic-section tn-original-source">
            <div>
              <span className="tn-original-kicker">Original source</span>
              <strong>{article.source?.name || "Publisher"}</strong>
            </div>
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="tn-read-original">
              Read Original Article →
            </a>
          </section>
        </>
      )}
    </main>
  );
}

export default TechNewsArticle;

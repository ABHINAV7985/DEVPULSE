import { Link } from "react-router-dom";
import ArticleImage from "./ArticleImage";
import { formatRelativeTime } from "../../lib/technews";

function ArticleCard({ article, variant = "list", categoryLabel }) {
  return (
    <Link
      to={`/technews/article?q=${encodeURIComponent(article.title.slice(0, 180))}`}
      state={{ article }}
      className={`tn-article tn-article-${variant}`}
      aria-label={`Open summary for ${article.title}`}
    >
      <ArticleImage
        src={article.image}
        alt={article.title}
        sourceName={article.source?.name}
        className="tn-article-media"
      />

      <div className="tn-article-body">
        <div className="tn-article-meta-top">
          {(categoryLabel || article.tag) && (
            <span className="tn-pill">{categoryLabel || article.tag}</span>
          )}
        </div>

        <h3 className="tn-article-title">{article.title}</h3>

        {variant !== "list" && article.description && (
          <p className="tn-article-desc">{article.description}</p>
        )}

        <div className="tn-article-meta">
          <span className="tn-source">{article.source?.name}</span>
          <span className="tn-dot">•</span>
          <span className="tn-time">{formatRelativeTime(article.publishedAt)}</span>
        </div>

        <span className="tn-summary-link">Open summary →</span>
      </div>
    </Link>
  );
}

export default ArticleCard;

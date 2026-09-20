import { Link } from "react-router-dom";
import { starsPerDay } from "../lib/github";

export const formatStars = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
};

export const timeAgo = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

function RepoCard({ repo, rank, sort }) {
  const [owner, name] = repo.full_name.split("/");

  const signal =
    sort === "growth"
      ? `${starsPerDay(repo).toFixed(1)} stars/day`
      : sort === "new"
        ? `created ${timeAgo(repo.created_at)}`
        : `pushed ${timeAgo(repo.pushed_at)}`;

  return (
    <Link to={`/github/${owner}/${name}`} className="gh-card">
      <div className="gh-card-top">
        <span className="gh-rank">{String(rank).padStart(2, "0")}</span>
        <span className="gh-stars">⭐ {formatStars(repo.stargazers_count)}</span>
      </div>

      <h3 className="gh-card-name">
        <span>{owner}/</span>
        {name}
      </h3>

      <p className="gh-card-desc">
        {repo.description || "No description provided."}
      </p>

      <div className="gh-card-topics">
        {(repo.topics || []).slice(0, 3).map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>

      <div className="gh-card-foot">
        <span className="gh-lang">
          {repo.language && <i className="gh-dot" aria-hidden="true"></i>}
          {repo.language || "Mixed"}
        </span>
        <span style={{ color: "rgb(0 255 195)" }}>{signal}</span>
      </div>
    </Link>
  );
}

export default RepoCard;

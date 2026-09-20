import { useState } from "react";
import { Link } from "react-router-dom";

import { KINDS } from "../data/discoverFilters";

const kindMeta = (id) => KINDS.find((k) => k.id === id) || KINDS[0];

const compact = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);

function ago(iso) {
  const hours = Math.floor((Date.now() - new Date(iso)) / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Deterministic tint so cards without an image still look distinct
// rather than all sharing one grey placeholder.
function tint(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

function DiscoverCard({ item, featured = false }) {
  const [broken, setBroken] = useState(false);
  const meta = kindMeta(item.kind);
  const hue = tint(item.id);

  const showImage = item.image && !broken;

  return (
    <article className={featured ? "dc-card dc-featured" : "dc-card"}>
      <a
        className="dc-media"
        href={item.url}
        target="_blank"
        rel="noreferrer"
        aria-label={item.title}
      >
        {showImage ? (
          <img
            src={item.image}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <div
            className="dc-fallback"
            style={{
              background: `linear-gradient(135deg,
                hsl(${hue} 70% 22%), hsl(${(hue + 40) % 360} 65% 12%))`,
            }}
          >
            <span>{meta.icon}</span>
          </div>
        )}

        <span className="dc-kind">
          {meta.icon} {meta.label.replace(/s$/, "")}
        </span>
      </a>

      <div className="dc-body">
        <div className="dc-source">
          <span>{item.source}</span>
          {item.author && <span className="dc-author">· {item.author}</span>}
          <span className="dc-time">{ago(item.createdAt)}</span>
        </div>

        <h3 className="dc-title">
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.title}
          </a>
        </h3>

        {item.summary && <p className="dc-summary">{item.summary}</p>}

        {item.reason && (
          <div className="dc-reason">
            <strong>Why is it trending?</strong>
            <span>{item.reason}</span>
          </div>
        )}

        {!!item.tags.length && (
          <div className="dc-tags">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
        )}

        <div className="dc-foot">
          <div className="dc-metrics">
            {item.metrics.map((m) => (
              <span key={m.label}>
                <strong>{compact(m.value)}</strong> {m.label}
              </span>
            ))}
          </div>

          <div className="dc-links">
            {item.internalPath && (
              <Link to={item.internalPath} className="dc-detail">
                Details
              </Link>
            )}
            {item.discussionUrl && (
              <a href={item.discussionUrl} target="_blank" rel="noreferrer">
                Discussion
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default DiscoverCard;

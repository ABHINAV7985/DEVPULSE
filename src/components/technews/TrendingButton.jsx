import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { TrendingFlameIcon } from "../icons/FeatureLogos";
import { deriveTrending } from "../../lib/technews";

// Small, unobtrusive floating trigger + popup — spec explicitly asks
// for no permanent trending panel on the page itself.
function TrendingButton({ articles }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const trending = deriveTrending(articles, { limit: showAll ? 10 : 5 });

  function goToTopic(topic) {
    setOpen(false);
    navigate(`/technews/topic/${encodeURIComponent(topic.name)}`);
  }

  return (
    <div className="tn-trending" ref={ref}>
      <button
        className="tn-trending-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Trending now"
      >
        <TrendingFlameIcon />
      </button>

      {open && (
        <div className="tn-trending-popup" role="menu">
          <div className="tn-trending-header">
            <span className="tn-trending-header-icon">
              <TrendingFlameIcon />
            </span>
            <strong>Trending Now</strong>
          </div>

          {trending.length === 0 ? (
            <p className="tn-trending-empty">Nothing standing out in the latest headlines yet.</p>
          ) : (
            <ol className="tn-trending-list">
              {trending.map((item, i) => (
                <li key={item.id}>
                  <button className="tn-trending-item" onClick={() => goToTopic(item)}>
                    <span className="tn-trending-rank">{i + 1}</span>
                    <span className="tn-trending-item-body">
                      <strong>{item.name}</strong>
                      <span className="tn-trending-item-desc">
                        {item.latest?.description || item.latest?.title || "Recent coverage available"}
                      </span>
                      <span className="tn-trending-item-count">
                        {item.count} article{item.count === 1 ? "" : "s"} today
                      </span>
                    </span>
                    <span className="tn-trending-arrow">→</span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {!showAll && trending.length >= 5 && (
            <button className="tn-trending-viewall" onClick={() => setShowAll(true)}>
              View All Trending →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TrendingButton;

import { useState } from "react";

function ArticleImage({ src, alt, sourceName, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const letter = (sourceName || "?").trim().charAt(0).toUpperCase();
    return (
      <div className={`tn-img-fallback ${className}`} aria-hidden="true">
        <span>{letter}</span>
      </div>
    );
  }

  return (
    <div className={`tn-image-frame ${className}`}>
      <img
        src={src}
        alt={alt || ""}
        className="tn-article-img"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default ArticleImage;

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Jumps to a #section when the URL carries a hash, otherwise
// returns to the top when the route changes.
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export default ScrollManager;

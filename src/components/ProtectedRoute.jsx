import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

// Wraps a route that needs an account. Remembers where the user was
// heading so login can send them back there instead of to the home page.
function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  // Wait for the stored session to load, or a refresh on a guarded
  // route would flash the login screen before restoring the user.
  if (!ready) return <div className="route-loading">Loading</div>;

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    );
  }

  return children;
}

export default ProtectedRoute;

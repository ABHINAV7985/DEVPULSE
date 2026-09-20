import { Navigate, useLocation } from "react-router-dom";

import { useAdmin } from "../context/AdminContext";

// Guards /admin/*. Unlike ProtectedRoute (customer accounts), there is
// no public sign-up path here — an unauthenticated visitor is sent to
// /admin/login, which is not linked from anywhere in the public nav.
function AdminProtectedRoute({ children }) {
  const { admin, ready } = useAdmin();
  const location = useLocation();

  if (!ready) return <div className="route-loading">Loading</div>;

  if (!admin) {
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  }

  return children;
}

export default AdminProtectedRoute;

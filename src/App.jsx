import { Route, Routes, useLocation } from "react-router-dom";

import "./App.css";
import "./styles/auth.css";

import { AuthProvider } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollManager from "./components/ScrollManager";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

import Home from "./pages/Home";
import Discover from "./pages/Discover";
import TechNews from "./pages/TechNews";
import TechNewsTopic from "./pages/TechNewsTopic";
import TechNewsArticle from "./pages/TechNewsArticle";
import Github from "./pages/Github";
import GithubProject from "./pages/GithubProject";
import Login from "./pages/Login";
import Account from "./pages/Account";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectSolutions from "./pages/ProjectSolutions";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  const { pathname } = useLocation();
  // The admin workspace is a separate area — it gets no public navbar,
  // footer, or customer session, so it never looks like part of the
  // site a signed-out visitor is browsing.
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <AdminProvider>
      <AuthProvider>
        <div className="app">
          <ScrollManager />
          {!isAdminRoute && <Navbar />}

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/technews" element={<TechNews />} />
            <Route path="/technews/topic/:topic" element={<TechNewsTopic />} />
            <Route path="/technews/article" element={<TechNewsArticle />} />
            <Route path="/login" element={<Login />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:slug" element={<ProjectDetail />} />
            <Route path="/projects/:slug/solutions" element={<ProjectSolutions />} />

            {/* Everything below needs an account. */}
            <Route
              path="/github"
              element={
                <ProtectedRoute>
                  <Github />
                </ProtectedRoute>
              }
            />
            <Route
              path="/github/:owner/:name"
              element={
                <ProtectedRoute>
                  <GithubProject />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />

            {/* Admin workspace — separate auth, not linked from the nav. */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
          </Routes>

          {!isAdminRoute && <Footer />}
        </div>
      </AuthProvider>
    </AdminProvider>
  );
}

export default App;

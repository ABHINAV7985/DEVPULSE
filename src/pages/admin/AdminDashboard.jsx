import { useEffect, useState } from "react";

import { useAdmin } from "../../context/AdminContext";
import { store } from "../../lib/projectsStore";
import Dropdown from "../../components/Dropdown";
import "../../styles/admin.css";

const CATEGORIES = ["CLI", "Web App", "API", "DevOps", "Mobile App", "Database"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const ROLE_OPTIONS = [
  "Frontend",
  "Backend",
  "DevOps",
  "Data Analyst",
  "AI Engineer",
  "Data Engineer",
  "Machine Learning",
  "PostgreSQL",
  "iOS",
  "Android",
  "QA",
  "Software Architect",
  "UX Design",
  "Technical Writer",
];

const emptyForm = {
  slug: null, // set when editing
  title: "",
  category: CATEGORIES[0],
  difficulty: DIFFICULTIES[0],
  roles: [],
  tags: "",
  shortDescription: "",
  fullDescription: "",
  requirements: "",
  constraints: "",
};

function toLines(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function fromProject(p) {
  return {
    slug: p.slug,
    title: p.title,
    category: p.category,
    difficulty: p.difficulty,
    roles: p.roles || [],
    tags: (p.tags || []).join(", "),
    shortDescription: p.shortDescription,
    fullDescription: p.fullDescription,
    requirements: (p.requirements || []).join("\n"),
    constraints: (p.constraints || []).join("\n"),
  };
}

function AdminDashboard() {
  const { admin, signOut } = useAdmin();
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    store
      .listProjects()
      .then(setProjects)
      .catch((err) => setStatus({ type: "error", text: err.message }));

  useEffect(() => {
    load();
  }, []);

  const toggleRole = (role) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }));
  };

  const startEdit = (p) => {
    setForm(fromProject(p));
    setStatus(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setBusy(true);

    const payload = {
      title: form.title,
      category: form.category,
      difficulty: form.difficulty,
      roles: form.roles,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      shortDescription: form.shortDescription,
      fullDescription: form.fullDescription,
      requirements: toLines(form.requirements),
      constraints: toLines(form.constraints),
    };

    try {
      if (form.slug) {
        await store.updateProject(form.slug, payload);
        setStatus({ type: "ok", text: `Updated "${payload.title}".` });
      } else {
        await store.addProject(payload);
        setStatus({ type: "ok", text: `Published "${payload.title}" to the Projects page.` });
      }
      resetForm();
      await load();
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (slug, title) => {
    if (!window.confirm(`Delete "${title}"? This also removes its community solutions.`)) return;
    try {
      await store.deleteProject(slug);
      await load();
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <div>
          <h1>Admin workspace</h1>
          <p>Signed in as {admin.email}</p>
        </div>
        <button className="pj-btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </header>

      <div className="admin-layout">
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{form.slug ? "Edit project" : "Push a new project"}</h2>

          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>

          <div className="admin-form-row">
            <label>
              Category
              <Dropdown
                value={form.category}
                options={CATEGORIES}
                onChange={(v) => setForm({ ...form, category: v })}
              />
            </label>

            <label>
              Difficulty
              <Dropdown
                value={form.difficulty}
                options={DIFFICULTIES}
                onChange={(v) => setForm({ ...form, difficulty: v })}
              />
            </label>
          </div>

          <label>
            Tags <span className="pj-optional">(comma separated)</span>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Programming Language, CLI, Filesystem"
            />
          </label>

          <fieldset className="admin-roles">
            <legend>Roadmap roles this project fits under</legend>
            {ROLE_OPTIONS.map((role) => (
              <label key={role} className="admin-role-chip">
                <input
                  type="checkbox"
                  checked={form.roles.includes(role)}
                  onChange={() => toggleRole(role)}
                />
                {role}
              </label>
            ))}
          </fieldset>

          <label>
            Short description <span className="pj-optional">(shown on the project card)</span>
            <input
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              required
            />
          </label>

          <label>
            Full description
            <textarea
              rows={4}
              value={form.fullDescription}
              onChange={(e) => setForm({ ...form, fullDescription: e.target.value })}
              required
            />
          </label>

          <label>
            Requirements <span className="pj-optional">(one per line)</span>
            <textarea
              rows={5}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            />
          </label>

          <label>
            Constraints <span className="pj-optional">(one per line)</span>
            <textarea
              rows={5}
              value={form.constraints}
              onChange={(e) => setForm({ ...form, constraints: e.target.value })}
            />
          </label>

          {status && (
            <p className={status.type === "error" ? "pj-form-error" : "admin-form-ok"}>
              {status.text}
            </p>
          )}

          <div className="pj-form-actions">
            {form.slug && (
              <button type="button" className="pj-btn-ghost" onClick={resetForm}>
                Cancel edit
              </button>
            )}
            <button type="submit" className="pj-btn-primary" disabled={busy}>
              {busy ? "Saving…" : form.slug ? "Save changes" : "Publish project"}
            </button>
          </div>
        </form>

        <div className="admin-list">
          <h2>Live projects ({projects.length})</h2>
          <ul>
            {projects.map((p) => (
              <li key={p.slug} className="admin-list-row">
                <div>
                  <strong>{p.title}</strong>
                  <span className="admin-list-meta">
                    {p.category} · {p.difficulty} · {p.startedCount} started ·{" "}
                    {p.solutionCount} solutions
                  </span>
                </div>
                <div className="admin-list-actions">
                  <button className="pj-btn-ghost" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button className="pj-btn-danger" onClick={() => handleDelete(p.slug, p.title)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

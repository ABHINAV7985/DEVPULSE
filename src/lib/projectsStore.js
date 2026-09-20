// Projects data layer — Supabase-backed.
//
// This is the swap the README earlier pointed at: every function here
// used to read and write localStorage; now they all talk to the
// `projects`, `project_participants`, and `project_solutions` tables
// in Supabase (see supabase/schema.sql for the DDL and the Row Level
// Security policies that actually enforce who can write what).
//
// Every page and component still calls only the functions in `store`
// below, so nothing outside this file needed to change.
//
// Participation and solutions are now tied to the real, signed-in
// Supabase user (src/lib/auth.js), not a free-typed email — the
// insert/upsert calls below never send an identity field the server
// trusts blindly. The database itself checks `user_id = auth.uid()`
// on every write (see supabase/schema.sql), so this can only ever
// record the actual signed-in account, never one a client claims to
// be.

import { supabase, assertSupabaseConfigured } from "./supabaseClient";

const slugify = (text) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/* ---------------------------------------------------------
   Row <-> app-shape mapping (DB is snake_case, the UI is camelCase)
--------------------------------------------------------- */

function fromProjectRow(row, counts = {}) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    difficulty: row.difficulty,
    roles: row.roles || [],
    tags: row.tags || [],
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    requirements: row.requirements || [],
    constraints: row.constraints || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedCount: counts.started_count || 0,
    solutionCount: counts.solution_count || 0,
  };
}

function toProjectRow(input) {
  const row = {};
  if (input.title !== undefined) row.title = input.title.trim();
  if (input.category !== undefined) row.category = input.category;
  if (input.difficulty !== undefined) row.difficulty = input.difficulty;
  if (input.roles !== undefined) row.roles = input.roles;
  if (input.tags !== undefined) row.tags = input.tags;
  if (input.shortDescription !== undefined) row.short_description = input.shortDescription.trim();
  if (input.fullDescription !== undefined) row.full_description = input.fullDescription.trim();
  if (input.requirements !== undefined) row.requirements = input.requirements;
  if (input.constraints !== undefined) row.constraints = input.constraints;
  return row;
}

function fromSolutionRow(row) {
  return {
    id: row.id,
    projectSlug: row.project_slug, // joined in, see listSolutions/submitSolution
    userName: row.user_name,
    language: row.language,
    githubLink: row.github_link || "",
    liveLink: row.live_link || "",
    note: row.note || "",
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    createdAt: row.created_at,
  };
}

async function countsByProjectId() {
  const { data, error } = await supabase.from("project_counts").select("*");
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.project_id, r]));
}

async function getProjectRow(slug) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function currentAuthUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user || null;
}

/* ---------------------------------------------------------
   Public API
--------------------------------------------------------- */

export const store = {
  /* ---------- Projects (read) ---------- */

  async listProjects({ role, difficulty, query } = {}) {
    assertSupabaseConfigured();

    let q = supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (role) q = q.contains("roles", [role]);
    if (difficulty && difficulty !== "All") q = q.eq("difficulty", difficulty);
    if (query?.trim()) {
      const term = query.trim().replace(/[%_]/g, "");
      q = q.or(`title.ilike.%${term}%,short_description.ilike.%${term}%`);
    }

    const [{ data: rows, error }, counts] = await Promise.all([q, countsByProjectId()]);
    if (error) throw error;

    return rows.map((row) => fromProjectRow(row, counts[row.id]));
  },

  async getProject(slug) {
    assertSupabaseConfigured();

    const row = await getProjectRow(slug);
    if (!row) return null;

    const counts = await countsByProjectId();
    return fromProjectRow(row, counts[row.id]);
  },

  async listRoles() {
    assertSupabaseConfigured();

    const { data, error } = await supabase.from("projects").select("roles");
    if (error) throw error;

    const tally = {};
    for (const { roles } of data) {
      for (const role of roles || []) tally[role] = (tally[role] || 0) + 1;
    }
    return Object.entries(tally)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  },

  /* ---------- Projects (admin write) ---------- */

  async addProject(input) {
    assertSupabaseConfigured();

    const baseSlug = slugify(input.title);
    let slug = baseSlug;

    for (let attempt = 1; attempt <= 20; attempt++) {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...toProjectRow(input), slug })
        .select()
        .single();

      if (!error) return fromProjectRow(data, {});

      // 23505 = unique_violation (the slug is already taken) — try the next suffix.
      if (error.code === "23505") {
        slug = `${baseSlug}-${attempt + 1}`;
        continue;
      }
      throw error;
    }
    throw new Error("Couldn't find a free slug for this title — try renaming it slightly.");
  },

  async updateProject(slug, changes) {
    assertSupabaseConfigured();

    const { data, error } = await supabase
      .from("projects")
      .update(toProjectRow(changes))
      .eq("slug", slug)
      .select()
      .single();

    if (error) throw error;
    return fromProjectRow(data, {});
  },

  async deleteProject(slug) {
    assertSupabaseConfigured();

    // ON DELETE CASCADE on project_participants/project_solutions
    // handles cleanup on the database side — see supabase/schema.sql.
    const { error } = await supabase.from("projects").delete().eq("slug", slug);
    if (error) throw error;
  },

  /* ---------- Participation ("N people started") ---------- */

  // Both of these act on the currently signed-in Supabase user — there
  // is no email/id parameter to pass, and none to spoof. The insert
  // below is checked server-side by a policy requiring
  // `user_id = auth.uid()` (see supabase/schema.sql), so this can only
  // ever record the real signed-in account, never someone else's.

  async startProject(slug) {
    assertSupabaseConfigured();

    const authUser = await currentAuthUser();
    if (!authUser) throw new Error("Sign in to start this project.");

    const project = await getProjectRow(slug);
    if (!project) throw new Error("Project not found.");

    const { error } = await supabase
      .from("project_participants")
      .upsert(
        { project_id: project.id, user_id: authUser.id },
        { onConflict: "project_id,user_id", ignoreDuplicates: true }
      );
    if (error) throw error;
  },

  async hasStarted(slug) {
    assertSupabaseConfigured();

    const authUser = await currentAuthUser();
    if (!authUser) return false;

    const project = await getProjectRow(slug);
    if (!project) return false;

    const { count, error } = await supabase
      .from("project_participants")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id)
      .eq("user_id", authUser.id);

    if (error) throw error;
    return (count || 0) > 0;
  },

  /* ---------- Community solutions ---------- */

  async listSolutions(slug, { sort = "top" } = {}) {
    assertSupabaseConfigured();

    const project = await getProjectRow(slug);
    if (!project) return [];

    const { data, error } = await supabase
      .from("project_solutions")
      .select("*")
      .eq("project_id", project.id);
    if (error) throw error;

    const solutions = data.map((row) => fromSolutionRow({ ...row, project_slug: slug }));

    if (sort === "recent") {
      return solutions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return solutions.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));
  },

  async submitSolution(slug, { language, githubLink, liveLink, note }) {
    assertSupabaseConfigured();

    if (!githubLink?.trim() && !liveLink?.trim()) {
      throw new Error("Add at least a GitHub link or a live link.");
    }

    const authUser = await currentAuthUser();
    if (!authUser) throw new Error("Sign in to submit a solution.");

    const project = await getProjectRow(slug);
    if (!project) throw new Error("Project not found.");

    const userName = authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Someone";

    const { data, error } = await supabase
      .from("project_solutions")
      .insert({
        project_id: project.id,
        user_id: authUser.id,
        user_name: userName,
        language: language?.trim() || "Other",
        github_link: githubLink?.trim() || "",
        live_link: liveLink?.trim() || "",
        note: note?.trim() || "",
      })
      .select()
      .single();

    if (error) throw error;

    // Submitting a solution implies the project was started.
    await store.startProject(slug);

    return fromSolutionRow({ ...data, project_slug: slug });
  },

  async voteSolution(id, direction) {
    assertSupabaseConfigured();

    // Goes through a SECURITY DEFINER function (see schema.sql) rather
    // than a direct table UPDATE, so a visitor can bump a vote counter
    // without also being able to overwrite the rest of the row.
    const { error } = await supabase.rpc("increment_solution_vote", {
      p_solution_id: id,
      p_direction: direction,
    });
    if (error) throw error;
  },

  /* ---------- Per-user stats, shown on the Account page ---------- */

  async userStats() {
    assertSupabaseConfigured();

    const authUser = await currentAuthUser();
    if (!authUser) return { started: 0, submitted: 0, upvotesReceived: 0 };

    const [{ count: started, error: startedError }, { data: solutions, error: solutionsError }] =
      await Promise.all([
        supabase
          .from("project_participants")
          .select("*", { count: "exact", head: true })
          .eq("user_id", authUser.id),
        supabase.from("project_solutions").select("upvotes").eq("user_id", authUser.id),
      ]);

    if (startedError) throw startedError;
    if (solutionsError) throw solutionsError;

    return {
      started: started || 0,
      submitted: solutions.length,
      upvotesReceived: solutions.reduce((sum, s) => sum + s.upvotes, 0),
    };
  },
};

export { slugify };

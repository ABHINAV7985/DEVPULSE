// Admin workspace auth — Supabase-backed.
//
// Unlike customer accounts (src/lib/auth.js, still local to the
// browser), the admin workspace uses a real Supabase Auth session.
// Signing in checks a password against Supabase's own auth system,
// then confirms the signed-in user has a row in `admin_users` — a
// table with no public read/write access at all (see
// supabase/schema.sql), so a normal Supabase Auth account with no
// row there simply isn't treated as an admin here.
//
// There's no self-service sign-up for admins on purpose. To create
// the first admin (or add another one later):
//   1. Supabase dashboard → Authentication → Users → Add user
//      (set an email + password there)
//   2. Supabase dashboard → Table Editor → admin_users → Insert row,
//      with `id` set to that user's UID (copy it from the Users list)
//      and `email` matching their email.
// See README.md → Projects → Supabase setup for the full walkthrough.

import { supabase, isSupabaseConfigured, assertSupabaseConfigured } from "./supabaseClient";

async function lookupAdminRow(userId) {
  const { data, error } = await supabase
    .from("admin_users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export const adminStore = {
  async verifyAdmin({ email, password }) {
    assertSupabaseConfigured();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Admin email or password is incorrect.");

    const adminRow = await lookupAdminRow(data.user.id);
    if (!adminRow) {
      await supabase.auth.signOut();
      throw new Error(
        "This account can sign in, but isn't set up as an admin yet — add it to " +
          "the admin_users table (see README.md → Projects → Supabase setup)."
      );
    }

    return { email: data.user.email };
  },

  async signOut() {
    if (isSupabaseConfigured) await supabase.auth.signOut();
  },

  // Called on load and whenever the Supabase auth session changes, to
  // figure out whether there's a currently signed-in admin.
  async currentAdmin() {
    if (!isSupabaseConfigured) return null;

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;

    const adminRow = await lookupAdminRow(user.id);
    return adminRow ? { email: user.email } : null;
  },
};

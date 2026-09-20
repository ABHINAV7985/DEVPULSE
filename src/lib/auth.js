// Customer account auth — Supabase-backed.
//
// ─────────────────────────────────────────────────────────────
// This used to be a hand-rolled localStorage store (hashing
// passwords client-side and keeping a "session" record a user could
// edit in devtools). It's now real Supabase Auth: signing in gets you
// a session Supabase itself issued and cryptographically verifies on
// every request, and every write this session can make — starting a
// project, submitting a solution — is checked server-side against
// that session via Row Level Security (see supabase/schema.sql).
// There's no client-editable flag anywhere that fakes "signed in".
//
// A few behaviors below come from Supabase itself rather than
// anything written here — see README.md → Accounts for the full
// explanation of each:
//   · New accounts may need to confirm their email before they can
//     sign in, depending on your project's Authentication →
//     Providers → Email → "Confirm email" setting.
//   · Changing your email sends a confirmation link to the NEW
//     address; the change only takes effect once that's clicked.
//   · Deleting your own account calls a small Edge Function
//     (supabase/functions/delete-account) because deleting a user is
//     a privileged operation the public anon key can't do by itself.
// ─────────────────────────────────────────────────────────────

import { supabase, assertSupabaseConfigured } from "./supabaseClient";

/* ---------------------------------------------------------
   Validation — unchanged: still useful for instant feedback
   before a network round trip.
--------------------------------------------------------- */

export function validateEmail(email) {
  if (!email?.trim()) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
    return "That doesn't look like a valid email address.";
  return null;
}

export function validatePassword(password) {
  if (!password) return "Enter a password.";
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return "Include at least one letter and one number.";
  return null;
}

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

// What the rest of the app is allowed to see, shaped like the old
// localStorage user record so components didn't need to change.
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.user_metadata?.name || user.email?.split("@")[0],
  createdAt: user.created_at,
});

/* ---------------------------------------------------------
   The swappable part — now calling Supabase Auth directly
--------------------------------------------------------- */

export const store = {
  // Returns the public user if Supabase started a session right away,
  // or { confirmationRequired: true } if it needs the person to click
  // a confirmation link first (see the "Confirm email" note above).
  async createUser({ email, password, name }) {
    assertSupabaseConfigured();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name?.trim() || undefined } },
    });

    if (error) {
      if (/already registered|already exists/i.test(error.message)) {
        throw new Error("An account with that email already exists.");
      }
      throw new Error(error.message);
    }

    if (!data.session) return { confirmationRequired: true };
    return publicUser(data.user);
  },

  async verifyUser({ email, password }) {
    assertSupabaseConfigured();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Email or password is incorrect.");
    return publicUser(data.user);
  },

  // Re-checks a password against the currently signed-in account,
  // without changing anything. Used before any destructive or
  // identity-changing action, so a left-open browser can't be used to
  // take the account over.
  async verifyCurrentPassword(password) {
    assertSupabaseConfigured();

    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user?.email;
    if (!email) throw new Error("Not signed in.");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Current password is incorrect.");
  },

  async updateUser(_currentEmail, changes) {
    assertSupabaseConfigured();

    if (changes.currentPassword !== undefined) {
      await store.verifyCurrentPassword(changes.currentPassword);
    }

    const payload = {};
    if (changes.password) payload.password = changes.password;
    if (changes.email) payload.email = changes.email;
    if (changes.name !== undefined) payload.data = { name: changes.name.trim() };

    const { data, error } = await supabase.auth.updateUser(payload);
    if (error) throw new Error(error.message);

    // Supabase sends a confirmation link to the NEW address and keeps
    // the old one active until it's clicked — so right after this
    // call, data.user.email is often still the old address.
    const pendingEmailConfirmation = Boolean(changes.email) && data.user.email !== changes.email;

    return { ...publicUser(data.user), pendingEmailConfirmation };
  },

  async deleteUser() {
    assertSupabaseConfigured();

    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      throw new Error(
        "Couldn't delete the account — the delete-account Edge Function may not " +
          "be deployed yet. See README.md → Accounts → Deleting an account."
      );
    }
    await supabase.auth.signOut();
  },
};

/* ---------------------------------------------------------
   Session — a thin read of Supabase's own session. There's no
   write/clear here anymore: sign-in, sign-out, and refresh are all
   handled by supabase-js itself, which is exactly the point.
--------------------------------------------------------- */

export const session = {
  async read() {
    const { data } = await supabase.auth.getSession();
    return data.session ? publicUser(data.session.user) : null;
  },
};

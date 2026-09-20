// Edge Function: delete-account
//
// Deleting a Supabase Auth user requires the "service_role" key,
// which must never reach the browser — so this small server-side
// function is the only place that key is used. The app calls it via
// supabase.functions.invoke("delete-account"), which automatically
// attaches the caller's own access token as the Authorization header;
// this function verifies that token, finds out who it belongs to, and
// deletes exactly that account — nobody else's.
//
// Deploy once (requires the Supabase CLI: https://supabase.com/docs/guides/cli):
//   supabase login
//   supabase link --project-ref YOUR_PROJECT_REF
//   supabase functions deploy delete-account
//
// No manual secrets to set: Supabase automatically provides
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY as
// environment variables inside every deployed Edge Function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Bound to the caller's own JWT — used only to find out who's
    // asking. This client has no elevated privileges.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) return json({ error: "Not authenticated." }, 401);

    // Only this admin client, built with the service role key, can
    // actually delete a user — and it only ever deletes `user.id`,
    // the id that came from verifying the caller's own token above.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) return json({ error: deleteError.message }, 400);

    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error." }, 500);
  }
});

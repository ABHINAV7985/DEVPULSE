import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { adminStore } from "../lib/adminAuth";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    adminStore
      .currentAdmin()
      .then((a) => {
        if (mounted) setAdmin(a);
      })
      .catch(() => {
        if (mounted) setAdmin(null);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });

    if (!isSupabaseConfigured) return undefined;

    // Keeps `admin` in sync if the Supabase session changes in another
    // tab, or expires and silently refreshes.
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        if (mounted) setAdmin(null);
        return;
      }
      const a = await adminStore.currentAdmin();
      if (mounted) setAdmin(a);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (details) => {
    const next = await adminStore.verifyAdmin(details);
    setAdmin(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    await adminStore.signOut();
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, ready, signIn, signOut }),
    [admin, ready, signIn, signOut]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>.");
  return ctx;
}

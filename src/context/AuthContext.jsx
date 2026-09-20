import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { store, session } from "../lib/auth";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore the session before the first paint of any guarded route,
  // otherwise a refresh on /github would bounce to login.
  useEffect(() => {
    let mounted = true;

    session
      .read()
      .then((u) => {
        if (mounted) setUser(u);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });

    if (!isSupabaseConfigured) return undefined;

    // Supabase's own auth listener — fires on sign-in, sign-out, token
    // refresh, and (via its internal storage listener) when the
    // session changes in another tab. Replaces the hand-rolled
    // "storage" event listener the old localStorage version needed.
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, authSession) => {
      if (!mounted) return;
      if (!authSession) {
        setUser(null);
        return;
      }
      setUser(await session.read());
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (details) => {
    const result = await store.createUser(details);
    if (result?.confirmationRequired) return result;
    setUser(result);
    return result;
  }, []);

  const signIn = useCallback(async (details) => {
    const next = await store.verifyUser(details);
    setUser(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setUser(null);
  }, []);

  const updateAccount = useCallback(
    async (changes) => {
      if (!user) throw new Error("Not signed in.");
      const next = await store.updateUser(user.email, changes);
      setUser(next);
      return next;
    },
    [user]
  );

  const deleteAccount = useCallback(
    async (currentPassword) => {
      if (!user) throw new Error("Not signed in.");

      await store.verifyCurrentPassword(currentPassword);
      await store.deleteUser();
      setUser(null);
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, ready, signUp, signIn, signOut, updateAccount, deleteAccount }),
    [user, ready, signUp, signIn, signOut, updateAccount, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}

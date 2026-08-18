import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import { sendMagicLink, signInWithGoogle, signOutGroupAccount } from './groupAuthApi';

interface GroupAuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: typeof signInWithGoogle;
  sendMagicLink: typeof sendMagicLink;
  signOut: typeof signOutGroupAccount;
}

const GroupAuthContext = createContext<GroupAuthContextValue | null>(null);

export function GroupAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    let alive = true;
    client.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<GroupAuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    signInWithGoogle,
    sendMagicLink,
    signOut: signOutGroupAccount,
  }), [session, loading]);

  return <GroupAuthContext.Provider value={value}>{children}</GroupAuthContext.Provider>;
}

export function useGroupAuth() {
  const value = useContext(GroupAuthContext);
  if (!value) throw new Error('useGroupAuth must be used within GroupAuthProvider');
  return value;
}

import { getSupabaseClient } from '../lib/supabaseClient';

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('SUPABASE_UNAVAILABLE');
  return client;
}

export async function signInWithGoogle() {
  const client = requireClient();
  return client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  });
}

export async function sendMagicLink(email: string) {
  const client = requireClient();
  return client.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
}

export async function signOutGroupAccount() {
  const client = requireClient();
  return client.auth.signOut();
}

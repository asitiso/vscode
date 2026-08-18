// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { GroupAuthProvider, useGroupAuth } from './GroupAuthContext';
import { getSupabaseClient } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({ getSupabaseClient: vi.fn() }));

function Probe() {
  const { user, loading } = useGroupAuth();
  return <div>{loading ? 'loading' : user?.id ?? 'signed-out'}</div>;
}

function Wrapper({ children }: { children: ReactNode }) { return <GroupAuthProvider>{children}</GroupAuthProvider>; }

describe('GroupAuthProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders signed out when there is no session', async () => {
    const unsubscribe = vi.fn();
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe } } }),
      },
    } as any);
    render(<Probe />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
  });

  it('updates when Supabase emits a session', async () => {
    let callback: ((event: string, session: any) => void) | undefined;
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockImplementation((cb) => {
          callback = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
      },
    } as any);
    render(<Probe />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
    callback?.('SIGNED_IN', { user: { id: 'user-1' } });
    await waitFor(() => expect(screen.getByText('user-1')).toBeTruthy());
  });
});

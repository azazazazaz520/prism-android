import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSignInAnonymously = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      signInAnonymously: mockSignInAnonymously,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-key',
    },
  },
});

describe('useAuth', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module-level state by re-importing the module
    vi.resetModules();
  });

  async function freshUseAuth() {
    const mod = await import('../useAuth');
    return mod.useAuth();
  }

  it('should auto sign-in anonymously when no session exists', async () => {
    const mockUser = { id: 'anon-1', is_anonymous: true } as any;
    const mockSession = { user: mockUser, access_token: 'token' } as any;

    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValue({
      data: { session: mockSession, user: mockUser },
      error: null,
    });

    const auth = await freshUseAuth();
    await auth.initAuth();

    expect(auth.isLoggedIn.value).toBe(true);
    expect(auth.user.value?.id).toBe('anon-1');
    expect(mockSignInAnonymously).toHaveBeenCalledOnce();
  });

  it('should restore existing session without re-signing', async () => {
    const mockUser = { id: 'existing', is_anonymous: true } as any;
    const mockSession = { user: mockUser, access_token: 'existing-token' } as any;

    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const auth = await freshUseAuth();
    await auth.initAuth();

    expect(auth.isLoggedIn.value).toBe(true);
    expect(auth.user.value?.id).toBe('existing');
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  it('should handle anonymous sign-in failure gracefully', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInAnonymously.mockRejectedValue(new Error('Network error'));

    const auth = await freshUseAuth();
    await auth.initAuth();

    // Should not crash, remain not logged in
    expect(auth.isLoggedIn.value).toBe(false);
    expect(auth.error.value).toBe('Network error');
  });

  it('should register auth state change listener', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValue({ data: { session: null }, error: null });

    const auth = await freshUseAuth();
    await auth.initAuth();

    expect(mockOnAuthStateChange).toHaveBeenCalledOnce();
  });
});

(window as any).__TAURI_INTERNALS__ = {};

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, args?: any) => {
    if (cmd === 'get_sync_code') {
      return Promise.resolve((window as any).__mockSyncCode || null);
    }
    if (cmd === 'set_sync_code') {
      (window as any).__mockSyncCode = args?.code;
      return Promise.resolve(undefined);
    }
    if (cmd === 'get_tasks') return Promise.resolve([]);
    return Promise.resolve(undefined);
  },
}));

const mockInvoke = vi.fn();
const mockSupabaseClient = {
  functions: { invoke: mockInvoke },
};
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}));

let mockUser: any = { id: 'test-user-id' };
let mockIsLoggedIn = true;
vi.mock('../useAuth', () => ({
  useAuth: () => ({ user: { value: mockUser }, isLoggedIn: { value: mockIsLoggedIn } }),
  getSupabaseClient: () => mockSupabaseClient,
}));

let mockProfileId: string | null = null;
vi.mock('../useSync', () => ({
  useSync: () => ({
    getProfileId: () => mockProfileId,
    setProfileId: (id: string | null) => {
      mockProfileId = id;
    },
  }),
}));

vi.stubGlobal('import', {
  meta: {
    env: { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-key' },
  },
});

import { useSyncCode } from '../useSyncCode';

describe('useSyncCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfileId = null;
    mockUser = { id: 'test-user-id' };
    mockIsLoggedIn = true;
    (window as any).__mockSyncCode = null;

    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({ data: { profile_id: 'profile-123' }, error: null });
  });

  it('should generate sync code and set profile', async () => {
    const sync = useSyncCode();
    const code = await sync.generateSyncCode();

    expect(code).toBeTruthy();
    expect(mockProfileId).toBe('profile-123');
    expect(mockInvoke).toHaveBeenCalledWith('pair-profile', {
      body: expect.objectContaining({ action: 'create', sync_code: code }),
    });
  });

  it('should join profile and set profile', async () => {
    const sync = useSyncCode();
    await sync.joinProfile('existing-code');

    expect(mockProfileId).toBe('profile-123');
    expect(mockInvoke).toHaveBeenCalledWith('pair-profile', {
      body: { action: 'join', sync_code: 'existing-code' },
    });
  });

  it('should throw on invalid sync code', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const sync = useSyncCode();
    await expect(sync.joinProfile('bad-code')).rejects.toThrow('同步码无效');
    expect(mockProfileId).toBeNull();
  });

  it('should restore profile through the protected pairing endpoint', async () => {
    (window as any).__mockSyncCode = 'existing-code';

    const sync = useSyncCode();
    await expect(sync.restoreProfile()).resolves.toBe(true);

    expect(mockProfileId).toBe('profile-123');
    expect(mockInvoke).toHaveBeenCalledWith('pair-profile', {
      body: { action: 'join', sync_code: 'existing-code' },
    });
  });

  it('should update sync code through the protected pairing endpoint', async () => {
    const sync = useSyncCode();
    await sync.updateSyncCode(' new-code ');

    expect(mockProfileId).toBe('profile-123');
    expect(mockInvoke).toHaveBeenCalledWith('pair-profile', {
      body: { action: 'join', sync_code: 'new-code' },
    });
  });

  it('should detect when no profile exists', async () => {
    const sync = useSyncCode();
    expect(await sync.hasProfile()).toBe(false);
  });

  it('should handle missing auth gracefully', async () => {
    mockIsLoggedIn = false;
    mockUser = null;
    const sync = useSyncCode();
    await expect(sync.generateSyncCode()).rejects.toThrow('匿名登录');
  });
});

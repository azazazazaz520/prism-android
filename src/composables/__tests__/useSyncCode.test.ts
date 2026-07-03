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

function createQueryBuilder(returns: any = null) {
  const eq = vi.fn(function (this: any) {
    return this;
  });
  const single = vi.fn().mockResolvedValue(returns);
  const maybeSingle = vi.fn().mockResolvedValue(returns);
  const select = vi.fn(function (this: any) {
    return this;
  });
  const insert = vi.fn(function (this: any) {
    return this;
  });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const builder: any = { eq, single, maybeSingle, select, insert, upsert };
  [eq, select, insert].forEach((fn) => {
    fn.mockReturnValue(builder);
  });
  return builder;
}

let mockBuilder = createQueryBuilder({ data: { id: 'profile-123' }, error: null });
const mockSupabaseFrom = vi.fn().mockReturnValue(mockBuilder);
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockSupabaseFrom }),
}));

let mockUser: any = { id: 'test-user-id' };
let mockIsLoggedIn = true;
vi.mock('../useAuth', () => ({
  useAuth: () => ({ user: { value: mockUser }, isLoggedIn: { value: mockIsLoggedIn } }),
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

    mockBuilder = createQueryBuilder({ data: { id: 'profile-123' }, error: null });
    mockSupabaseFrom.mockReturnValue(mockBuilder);
  });

  it('should generate sync code and set profile', async () => {
    const sync = useSyncCode();
    const code = await sync.generateSyncCode();

    expect(code).toBeTruthy();
    expect(mockProfileId).toBe('profile-123');
  });

  it('should join profile and set profile', async () => {
    const sync = useSyncCode();
    await sync.joinProfile('existing-code');

    expect(mockProfileId).toBe('profile-123');
  });

  it('should throw on invalid sync code', async () => {
    const badBuilder = createQueryBuilder({ data: null, error: { message: 'Not found' } });
    mockSupabaseFrom.mockReturnValue(badBuilder);

    const sync = useSyncCode();
    await expect(sync.joinProfile('bad-code')).rejects.toThrow('同步码无效');
    expect(mockProfileId).toBeNull();
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

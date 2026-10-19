import { computed, ref } from 'vue';
import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import { isNetworkError, withTimeout } from './syncUtils';

/** 全局单例 Supabase 客户端，所有 composable 共享 */
let supabase: SupabaseClient | null = null;

/** 全局单例状态：所有 useAuth() 调用者共享同一组 ref */
const session = ref<Session | null>(null);
const user = ref<User | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

/** 初始化去重与监听注册状态 */
let authPromise: Promise<void> | null = null;
let authListenerRegistered = false;
let onlineListenerRegistered = false;

/** 获取共享的 Supabase 客户端（懒初始化） */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY 未配置');
    }
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return supabase;
}

/**
 * 认证 composable：Supabase Anonymous Sign-In
 *
 * 启动时自动执行匿名登录，无需用户输入任何信息。
 * JWT 由 Supabase 自动管理和刷新。
 * Session 通过 persistSession 跨应用重启持久化。
 *
 * 与桌面端一致：请求带超时、初始化去重、离线时跳过登录，
 * 网络恢复后自动重试；失败只影响同步，不影响本地任务。
 */
export function useAuth() {
  const isLoggedIn = computed(() => !!session.value);

  /** 面向界面的提示：网络类失败给可操作的中文说明 */
  const errorHint = computed(() => {
    if (!error.value) return null;
    return isNetworkError(error.value) ? '当前网络无法连接同步服务，请切换网络后重试' : error.value;
  });

  /**
   * 初始化认证：恢复已有会话 → 若无则执行匿名登录
   * 并发调用会复用同一个 Promise
   */
  function initAuth(): Promise<void> {
    if (authPromise) return authPromise;

    authPromise = initAuthInternal().finally(() => {
      authPromise = null;
    });
    return authPromise;
  }

  async function initAuthInternal(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const client = getSupabaseClient();

      if (!authListenerRegistered) {
        client.auth.onAuthStateChange((_event, newSession) => {
          session.value = newSession;
          user.value = newSession?.user ?? null;
        });
        authListenerRegistered = true;
      }

      if (!onlineListenerRegistered) {
        window.addEventListener('online', () => {
          error.value = null;
          if (!session.value && !isLoading.value) void initAuth();
        });
        onlineListenerRegistered = true;
      }

      // 尝试恢复已有会话
      const { data: sessionData } = await withTimeout(client.auth.getSession());
      if (sessionData.session) {
        session.value = sessionData.session;
        user.value = sessionData.session.user;
        return;
      }

      // 无会话 → 自动匿名登录（离线时跳过，等网络恢复后在 online 事件中重试）
      if (!navigator.onLine) return;

      const { data, error: signInError } = await withTimeout(client.auth.signInAnonymously());
      if (signInError) throw signInError;

      session.value = data.session;
      user.value = data.session?.user ?? null;
    } catch (e) {
      const message = e instanceof Error ? e.message : '匿名登录失败';
      error.value = message;
      console.warn('[auth] anonymous sign-in failed:', message);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    session,
    user,
    isLoggedIn,
    isLoading,
    error,
    errorHint,
    initAuth,
  };
}

import { ref, computed } from 'vue';
import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';

/** 全局单例状态：所有 useAuth() 调用者共享同一组 ref */
const session = ref<Session | null>(null);
const user = ref<User | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

let supabase: SupabaseClient | null = null;

/**
 * 认证 composable：Supabase Anonymous Sign-In
 *
 * 启动时自动执行匿名登录，无需用户输入任何信息。
 * JWT 由 Supabase 自动管理和刷新。
 * Session 通过 persistSession 跨应用重启持久化。
 *
 * 参考: https://supabase.com/docs/guides/auth/auth-anonymous
 */
export function useAuth() {
  const isLoggedIn = computed(() => !!session.value);

  /** 懒初始化 Supabase 客户端 */
  function getClient(): SupabaseClient {
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
      });
    }
    return supabase;
  }

  /**
   * 初始化认证：恢复已有会话 → 若无则执行匿名登录
   * 在应用启动时调用一次
   */
  async function initAuth(): Promise<void> {
    const client = getClient();
    isLoading.value = true;
    error.value = null;

    try {
      // 尝试恢复已有会话
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData.session) {
        session.value = sessionData.session;
        user.value = sessionData.session.user;
        isLoading.value = false;
        return;
      }

      // 无会话 → 自动匿名登录
      const { data, error: signInError } = await client.auth.signInAnonymously();
      if (signInError) throw signInError;

      session.value = data.session;
      user.value = data.session?.user ?? null;
    } catch (e) {
      const message = e instanceof Error ? e.message : '匿名登录失败';
      error.value = message;
      console.warn('[auth] anonymous sign-in failed:', message);
      // 不抛出异常，允许离线使用
    } finally {
      isLoading.value = false;
    }

    // 监听后续状态变化（token 刷新、登出等）
    client.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession;
      user.value = newSession?.user ?? null;
    });
  }

  return {
    session,
    user,
    isLoggedIn,
    isLoading,
    error,
    initAuth,
  };
}

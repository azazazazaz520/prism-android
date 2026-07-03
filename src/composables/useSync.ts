import { ref, watch } from 'vue';
import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './useAuth';
import type { Task, DailyCompletion } from '../types';

/** Supabase 客户端单例 */
let supabase: SupabaseClient | null = null;

/** initClient 的进行中 Promise，防止竞态 */
let initClientPromise: Promise<void> | null = null;

/** 离线变更队列 */
const offlineQueue: { type: 'upsert'; table: string; data: Record<string, unknown> }[] = [];
const isOnline = ref(navigator.onLine);

/** 同步状态 */
const syncStatus = ref<'idle' | 'syncing' | 'error' | 'offline'>('idle');
const lastSyncAt = ref<string | null>(null);

export function useSync() {
  const { token, isConfigured, getJwt } = useAuth();

  // 监听网络状态
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      isOnline.value = true;
      flushOfflineQueue();
    });
    window.addEventListener('offline', () => {
      isOnline.value = false;
      syncStatus.value = 'offline';
    });
  }

  /** 初始化 Supabase 客户端并注入自定义 JWT */
  async function initClient() {
    if (!isConfigured.value) return;
    if (supabase) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[sync] Supabase 未配置：缺少 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
      return;
    }

    // 获取已签名的 JWT
    const jwt = getJwt();

    // 通过 global.headers 直接注入 JWT，绕过 setSession 对 auth.users 表的检查
    // setSession 要求用户在 auth.users 中存在，而本项目的"零注册"架构不会创建 Auth 用户
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      },
    });

    if (jwt) {
      // 同时设置 Realtime 的 access token，确保 WebSocket 连接也经过认证
      await supabase.realtime.setAuth(jwt);
      console.log('[sync] client initialized with custom JWT header');
    } else {
      console.warn('[sync] client initialized but no JWT found in localStorage');
    }
  }

  /** 确保 Supabase 客户端已初始化（消除竞态条件） */
  async function ensureClient(): Promise<boolean> {
    if (supabase) return true;
    if (!isConfigured.value) {
      console.warn('[sync] ensureClient skipped: sync token not configured');
      return false;
    }
    if (!initClientPromise) {
      initClientPromise = initClient();
    }
    try {
      await initClientPromise;
    } catch (e) {
      console.error('[sync] client init failed:', e);
      supabase = null;
    } finally {
      initClientPromise = null;
    }
    return supabase !== null;
  }

  /** 监听 token 变化，自动初始化客户端 */
  watch(
    isConfigured,
    (val) => {
      if (val) {
        initClient();
      } else {
        supabase = null;
        initClientPromise = null;
      }
    },
    { immediate: true },
  );

  // ── 上行同步 ──────────────────────────────

  /** 将本地任务推送到 Supabase */
  async function pushTask(task: Task): Promise<void> {
    const clientReady = await ensureClient();
    if (!clientReady || !isOnline.value) {
      if (!clientReady) {
        console.warn('[sync] pushTask queued: client not ready (configure token in Settings)');
      }
      offlineQueue.push({
        type: 'upsert',
        table: 'tasks',
        data: task as unknown as Record<string, unknown>,
      });
      return;
    }
    // TypeScript narrow: ensureClient() returned true, supabase is non-null
    if (!supabase) return;

    try {
      syncStatus.value = 'syncing';
      const { error } = await supabase.from('tasks').upsert({
        id: task.id,
        title: task.title,
        completed: task.completed,
        created_at: task.created_at,
        completed_at: task.completed_at,
        due_date: task.due_date,
        tags: task.tags,
        important: task.important,
        pinned: task.pinned,
        is_daily: task.is_daily,
        parent_id: task.parent_id,
        updated_at: task.updated_at,
        is_deleted: task.is_deleted,
        user_id: token.value,
      });

      if (error) throw error;
      lastSyncAt.value = new Date().toISOString();
      syncStatus.value = 'idle';
    } catch (e) {
      console.error('同步任务失败:', e);
      syncStatus.value = 'error';
      // 离线队列暂存
      offlineQueue.push({
        type: 'upsert',
        table: 'tasks',
        data: task as unknown as Record<string, unknown>,
      });
    }
  }

  /** 将每日完成记录推送到 Supabase */
  async function pushDailyCompletion(dc: DailyCompletion): Promise<void> {
    const clientReady = await ensureClient();
    if (!clientReady || !isOnline.value) {
      offlineQueue.push({
        type: 'upsert',
        table: 'daily_completions',
        data: dc as unknown as Record<string, unknown>,
      });
      return;
    }
    if (!supabase) return;

    try {
      const { error } = await supabase.from('daily_completions').upsert({
        task_id: dc.task_id,
        date: dc.date,
        user_id: token.value,
      });

      if (error) throw error;
    } catch (e) {
      console.error('同步每日完成记录失败:', e);
    }
  }

  // ── 下行同步 ──────────────────────────────

  /** 拉取远程任务（增量：updated_at > 上次同步时间） */
  async function pullTasks(): Promise<Task[]> {
    const clientReady = await ensureClient();
    if (!clientReady) {
      console.warn('[sync] pullTasks skipped: client not ready');
      return [];
    }
    if (!supabase) return [];

    try {
      let query = supabase.from('tasks').select('*').eq('user_id', token.value);

      if (lastSyncAt.value) {
        query = query.gt('updated_at', lastSyncAt.value);
      }

      const { data, error } = await query;
      if (error) throw error;

      lastSyncAt.value = new Date().toISOString();
      return (data || []) as Task[];
    } catch (e) {
      console.error('拉取远程任务失败:', e);
      return [];
    }
  }

  /** 订阅 Supabase Realtime 变更 */
  async function subscribeToChanges(
    onTaskChange: (task: Task) => void,
    onDailyCompletionChange: (dc: DailyCompletion) => void,
  ): Promise<RealtimeChannel | null> {
    const clientReady = await ensureClient();
    if (!clientReady) {
      console.warn('[sync] subscribeToChanges skipped: client not ready');
      return null;
    }
    if (!supabase) return null;

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${token.value}` },
        (payload) => {
          const task = payload.new as Task;
          if (task) {
            onTaskChange(task);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_completions',
          filter: `user_id=eq.${token.value}`,
        },
        (payload) => {
          const dc = payload.new as DailyCompletion;
          if (dc) {
            onDailyCompletionChange(dc);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          syncStatus.value = 'idle';
        } else if (status === 'CHANNEL_ERROR') {
          syncStatus.value = 'error';
          // 指数退避重连
          setTimeout(() => subscribeToChanges(onTaskChange, onDailyCompletionChange), 5000);
        }
      });

    return channel;
  }

  // ── 离线队列 ──────────────────────────────

  /** 清空离线队列 */
  async function flushOfflineQueue(): Promise<void> {
    const clientReady = await ensureClient();
    if (!clientReady || !isOnline.value || offlineQueue.length === 0) return;
    if (!supabase) return;

    syncStatus.value = 'syncing';
    const queue = [...offlineQueue];
    offlineQueue.length = 0;

    for (const item of queue) {
      try {
        await supabase.from(item.table).upsert(item.data);
      } catch (e) {
        offlineQueue.push(item);
        console.error('离线队列推送失败:', e);
      }
    }

    syncStatus.value = 'idle';
  }

  return {
    syncStatus,
    lastSyncAt,
    initClient,
    pushTask,
    pushDailyCompletion,
    pullTasks,
    subscribeToChanges,
    flushOfflineQueue,
  };
}

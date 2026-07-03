import { ref, watch } from 'vue';
import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './useAuth';
import type { Task, DailyCompletion } from '../types';

let supabase: SupabaseClient | null = null;
let initClientPromise: Promise<void> | null = null;

const OFFLINE_QUEUE_KEY = 'prism_offline_queue';

interface OfflineQueueItem {
  type: 'upsert';
  table: string;
  data: Record<string, unknown>;
}

function loadOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistOfflineQueue(queue: OfflineQueueItem[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

const offlineQueue: OfflineQueueItem[] = loadOfflineQueue();
const isOnline = ref(navigator.onLine);
const syncStatus = ref<'idle' | 'syncing' | 'error' | 'offline' | 'unauthorized'>('idle');
const lastSyncAt = ref<string | null>(null);

/** 当前设备所属的 profile_id，由 useSyncCode 设置 */
const currentProfileId = ref<string | null>(null);

/** 分页大小 */
const PAGE_SIZE = 500;

export function useSync() {
  const { user, isLoggedIn } = useAuth();

  // 网络状态监听
  window.addEventListener('online', () => {
    isOnline.value = true;
    flushOfflineQueue();
  });
  window.addEventListener('offline', () => {
    isOnline.value = false;
    syncStatus.value = 'offline';
  });

  /**
   * 初始化 Supabase 客户端。
   * JWT 由 Supabase Auth 自动管理，无需手动注入。
   */
  async function initClient() {
    if (!isLoggedIn.value || supabase) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }

  /** 确保客户端已初始化，消除竞态 */
  async function ensureClient(): Promise<boolean> {
    if (supabase) return true;
    if (!isLoggedIn.value) {
      syncStatus.value = 'unauthorized';
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

  /** 获取当前认证用户 ID */
  function userId(): string | undefined {
    return user.value?.id;
  }

  /** 获取/设置当前 profile_id，供 useSyncCode 调用 */
  function getProfileId(): string | null {
    return currentProfileId.value;
  }

  function setProfileId(id: string | null) {
    currentProfileId.value = id;
  }

  /** 监听登录状态变化，自动初始化或销毁客户端 */
  watch(isLoggedIn, (val) => {
    if (val) {
      initClient();
      flushOfflineQueue();
    } else {
      supabase = null;
      initClientPromise = null;
      currentProfileId.value = null;
      syncStatus.value = 'idle';
    }
  });

  // ── 上行同步 ──

  /** 推送任务到 Supabase，离线时入队并持久化 */
  async function pushTask(task: Task): Promise<void> {
    const uid = userId();
    if (!uid) return;
    const profileId = getProfileId();

    const clientReady = await ensureClient();
    if (!clientReady || !isOnline.value) {
      offlineQueue.push({
        type: 'upsert',
        table: 'tasks',
        data: {
          ...(task as unknown as Record<string, unknown>),
          profile_id: profileId,
          user_id: uid,
        },
      });
      persistOfflineQueue(offlineQueue);
      return;
    }
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
        user_id: uid,
        profile_id: profileId,
      });

      if (error) throw error;
      lastSyncAt.value = new Date().toISOString();
      syncStatus.value = 'idle';
    } catch (e) {
      console.error('同步任务失败:', e);
      syncStatus.value = 'error';
      offlineQueue.push({
        type: 'upsert',
        table: 'tasks',
        data: {
          ...(task as unknown as Record<string, unknown>),
          profile_id: profileId,
          user_id: uid,
        },
      });
      persistOfflineQueue(offlineQueue);
    }
  }

  /** 推送每日完成记录到 Supabase */
  async function pushDailyCompletion(dc: DailyCompletion): Promise<void> {
    const uid = userId();
    if (!uid) return;
    const profileId = getProfileId();

    const clientReady = await ensureClient();
    if (!clientReady || !isOnline.value) {
      offlineQueue.push({
        type: 'upsert',
        table: 'daily_completions',
        data: {
          ...(dc as unknown as Record<string, unknown>),
          profile_id: profileId,
          user_id: uid,
        },
      });
      persistOfflineQueue(offlineQueue);
      return;
    }
    if (!supabase) return;

    try {
      const { error } = await supabase.from('daily_completions').upsert({
        task_id: dc.task_id,
        date: dc.date,
        user_id: uid,
        profile_id: profileId,
      });

      if (error) throw error;
    } catch (e) {
      console.error('同步每日完成记录失败:', e);
    }
  }

  // ── 下行同步 ──

  /**
   * 分页拉取远端任务。
   * forceFull 时忽略增量窗口，全量拉取。
   * 返回所有任务（内部自动循环分页）。
   */
  async function pullTasks(forceFull = false): Promise<Task[]> {
    const profileId = getProfileId();
    if (!profileId) return [];

    const clientReady = await ensureClient();
    if (!clientReady || !supabase) return [];

    const allTasks: Task[] = [];
    let cursor: string | undefined;

    try {
      do {
        let query = supabase
          .from('tasks')
          .select('*')
          .eq('profile_id', profileId)
          .order('updated_at', { ascending: true })
          .limit(PAGE_SIZE);

        if (!forceFull && lastSyncAt.value && !cursor) {
          query = query.gt('updated_at', lastSyncAt.value);
        }
        if (cursor) {
          query = query.gt('updated_at', cursor);
        }

        const { data, error } = await query;
        if (error) throw error;

        const page = (data || []) as Task[];
        allTasks.push(...page);

        // 下一页游标：本页最后一条的 updated_at
        cursor = page.length === PAGE_SIZE ? page[page.length - 1].updated_at : undefined;
      } while (cursor);

      lastSyncAt.value = new Date().toISOString();
      return allTasks;
    } catch (e) {
      console.error('拉取远程任务失败:', e);
      return allTasks.length > 0 ? allTasks : [];
    }
  }

  /** 订阅 Supabase Realtime 数据库变更 */
  async function subscribeToChanges(
    onTaskChange: (task: Task) => void,
    onDailyCompletionChange: (dc: DailyCompletion) => void,
  ): Promise<RealtimeChannel | null> {
    const profileId = getProfileId();
    if (!profileId) return null;

    const clientReady = await ensureClient();
    if (!clientReady || !supabase) return null;

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `profile_id=eq.${profileId}` },
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
          filter: `profile_id=eq.${profileId}`,
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

  // ── 离线队列 ──

  /** 联网后清空离线队列 */
  async function flushOfflineQueue(): Promise<void> {
    const clientReady = await ensureClient();
    if (!clientReady || !isOnline.value || offlineQueue.length === 0) return;
    if (!supabase) return;

    syncStatus.value = 'syncing';
    const queue = [...offlineQueue];
    offlineQueue.length = 0;
    persistOfflineQueue(offlineQueue);

    for (const item of queue) {
      try {
        await supabase.from(item.table).upsert(item.data);
      } catch (e) {
        offlineQueue.push(item);
        persistOfflineQueue(offlineQueue);
        console.error('离线队列推送失败:', e);
      }
    }

    syncStatus.value = 'idle';
  }

  return {
    syncStatus,
    lastSyncAt,
    currentProfileId,
    initClient,
    getProfileId,
    setProfileId,
    pushTask,
    pushDailyCompletion,
    pullTasks,
    subscribeToChanges,
    flushOfflineQueue,
  };
}

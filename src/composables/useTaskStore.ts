import { ref, computed } from 'vue';
import type { Task } from '../types';
import { todayStr } from '../utils/date';
import { useSync } from './useSync';
import { useAuth } from './useAuth';
import { useSyncCode } from './useSyncCode';

/** 检测是否在 Tauri 环境 */
const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

// ── 浏览器 Mock 层（localStorage 模拟 Rust 后端）──

const STORAGE_KEY = 'prism_mock_tasks';
const DC_KEY = 'prism_mock_daily';

function loadMockTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Task[];
      return parsed.map((t) => ({ ...t, tags: Array.isArray(t.tags) ? t.tags : [] }));
    }
  } catch {
    /* ignore */
  }
  const seed: Task[] = [
    {
      id: crypto.randomUUID(),
      title: '欢迎使用 Prism — 点击 + 添加任务',
      completed: false,
      created_at: new Date().toISOString(),
      completed_at: null,
      due_date: todayStr(),
      tags: ['入门'],
      important: false,
      pinned: false,
      is_daily: false,
      parent_id: null,
      updated_at: new Date().toISOString(),
      is_deleted: false,
    },
    {
      id: crypto.randomUUID(),
      title: '试试点击圆圈完成任务',
      completed: false,
      created_at: new Date().toISOString(),
      completed_at: null,
      due_date: null,
      tags: ['入门'],
      important: false,
      pinned: false,
      is_daily: false,
      parent_id: null,
      updated_at: new Date().toISOString(),
      is_deleted: false,
    },
  ];
  saveMockTasks(seed);
  return seed;
}

function saveMockTasks(list: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadMockDaily(date: string): string[] {
  try {
    const raw = localStorage.getItem(DC_KEY + '_' + date);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMockDaily(date: string, ids: string[]) {
  localStorage.setItem(DC_KEY + '_' + date, JSON.stringify(ids));
}

/** 统一调用接口：Tauri 环境走原生 invoke，浏览器走 localStorage 模拟层 */
async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  return mockInvoke<T>(cmd, args);
}

/** 浏览器端命令模拟层：用于开发调试，无需 Rust 后端即可运行 UI */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockInvoke<T>(cmd: string, args?: Record<string, unknown>): T {
  const mockTasks = loadMockTasks();
  switch (cmd) {
    case 'get_tasks':
      return mockTasks.filter((t) => !t.is_deleted) as T;
    case 'get_all_tags': {
      const tags = [...new Set(mockTasks.filter((t) => !t.is_deleted).flatMap((t) => t.tags))];
      tags.sort();
      return tags as T;
    }
    case 'get_daily_completions':
      return loadMockDaily((args?.date as string) || todayStr()) as T;
    case 'add_task': {
      const a = args?.args as Record<string, unknown> | undefined;
      const now = new Date().toISOString();
      const task: Task = {
        id: crypto.randomUUID(),
        title: (a?.title as string) || '',
        completed: false,
        created_at: now,
        completed_at: null,
        due_date: (a?.dueDate as string) || null,
        tags: (a?.tags as string[]) || [],
        important: (a?.important as boolean) || false,
        pinned: (a?.pinned as boolean) || false,
        is_daily: (a?.isDaily as boolean) || false,
        parent_id: (a?.parentId as string) || null,
        updated_at: now,
        is_deleted: false,
      };
      mockTasks.push(task);
      saveMockTasks(mockTasks);
      return task as T;
    }
    case 'toggle_task': {
      const t = mockTasks.find((x) => x.id === (args?.id as string));
      if (t) {
        t.completed = !t.completed;
        t.completed_at = t.completed ? new Date().toISOString() : null;
        t.updated_at = new Date().toISOString();
      }
      saveMockTasks(mockTasks);
      return undefined as T;
    }
    case 'toggle_daily_task': {
      const tid = args?.id as string,
        date = args?.date as string;
      const dc = loadMockDaily(date);
      const idx = dc.indexOf(tid);
      if (idx >= 0) dc.splice(idx, 1);
      else dc.push(tid);
      saveMockDaily(date, dc);
      return undefined as T;
    }
    case 'update_task': {
      const ua = args?.args as Record<string, unknown> | undefined;
      const t = mockTasks.find((x) => x.id === (ua?.id as string));
      if (t) {
        t.title = (ua?.title as string) || t.title;
        t.due_date = (ua?.dueDate as string) || null;
        t.tags = (ua?.tags as string[]) || [];
        t.important = (ua?.important as boolean) || false;
        t.pinned = (ua?.pinned as boolean) || false;
        t.is_daily = (ua?.isDaily as boolean) || false;
        t.updated_at = new Date().toISOString();
      }
      saveMockTasks(mockTasks);
      return undefined as T;
    }
    case 'delete_task': {
      const t = mockTasks.find((x) => x.id === (args?.id as string));
      if (t) {
        t.is_deleted = true;
        t.updated_at = new Date().toISOString();
      }
      saveMockTasks(mockTasks);
      return undefined as T;
    }
    case 'clear_completed':
      mockTasks.length = 0;
      mockTasks.push(...mockTasks.filter((t) => !t.completed));
      saveMockTasks(mockTasks);
      return undefined as T;
    default:
      return undefined as T;
  }
}

/** 任务数据（全局单例 ref，确保跨组件共享） */
const tasks = ref<Task[]>([]);
const allTags = ref<string[]>([]);
const dailyCompletedIds = ref<string[]>([]);
const filterDate = ref<string | null>(null);
const selectedTags = ref<string[]>([]);

/** LWW 合并纯函数：将远端任务合并到本地任务列表。
 *  返回合并后的新数组，不修改原数组。
 *  >= 而非 >：手动同步时远端优先，防止 DB 直接修改后 updated_at 未变导致漏更新。 */
export function mergeTasksLWW(local: Task[], remote: Task[]): Task[] {
  if (remote.length === 0) return local;

  const merged = new Map(local.map((t) => [t.id, t]));

  for (const rt of remote) {
    const lt = merged.get(rt.id);
    if (!lt || new Date(rt.updated_at) >= new Date(lt.updated_at)) {
      merged.set(rt.id, rt);
    }
  }

  return [...merged.values()].filter((t) => !t.is_deleted);
}

/** 任务看板 composable：核心数据 + 筛选 + CRUD + 同步 */
export function useTaskStore() {
  const { isLoggedIn } = useAuth();
  const { pushTask, pullTasks, subscribeToChanges } = useSync();
  const syncCode = useSyncCode();

  const dailyCompletionsMap = computed(() => {
    const map: Record<string, boolean> = {};
    for (const id of dailyCompletedIds.value) {
      map[id] = true;
    }
    return map;
  });

  /** 根据日期和标签筛选后的任务列表 */
  const filteredTasks = computed(() => {
    let result = tasks.value;
    if (filterDate.value) {
      result = result.filter((t) => t.due_date === filterDate.value);
    }
    if (selectedTags.value.length > 0) {
      result = result.filter((t) => selectedTags.value.some((tag) => t.tags.includes(tag)));
    }
    // 确保 Vue 检测到变化
    return [...result];
  });

  // ── 数据加载与同步 ──

  /** 加载本地数据，若已配对则从远端合并 */
  async function loadAll() {
    const [localTasks, _allTags] = await Promise.all([
      call<Task[]>('get_tasks'),
      call<string[]>('get_all_tags'),
    ]);
    allTags.value = _allTags;
    await refreshDailyCompletions();

    // 先展示本地数据，防止远端慢/失败时黑屏
    tasks.value = localTasks.filter((t) => !t.is_deleted);

    // 恢复已配对的 profile，并尝试远端合并
    if (isLoggedIn.value) {
      try {
        await syncCode.restoreProfile();
        const remoteTasks = await pullTasks(true);
        if (remoteTasks.length > 0) {
          tasks.value = mergeTasksLWW(tasks.value, remoteTasks);
        }
      } catch (e) {
        console.warn('[sync] loadAll pull failed:', e);
      }
    }
  }

  /**
   * 重新进入时刷新任务：后台合并本地+远端，替换前不重置列表。
   * 保持当前数据可见，避免"先闪本地再出远端"的闪烁。
   */
  async function refreshTasks() {
    const [localTasks, _allTags] = await Promise.all([
      call<Task[]>('get_tasks'),
      call<string[]>('get_all_tags'),
    ]);
    allTags.value = _allTags;
    await refreshDailyCompletions();

    let merged = localTasks.filter((t) => !t.is_deleted);

    if (isLoggedIn.value) {
      try {
        const remoteTasks = await pullTasks(true);
        if (remoteTasks.length > 0) {
          merged = mergeTasksLWW(merged, remoteTasks);
        }
      } catch (e) {
        console.warn('[sync] refreshTasks pull failed:', e);
      }
    }

    // 仅在结果有变化时替换，避免无关更新触发重渲染
    if (
      merged.length !== tasks.value.length ||
      !merged.every(
        (t, i) => t.id === tasks.value[i]?.id && t.updated_at === tasks.value[i]?.updated_at,
      )
    ) {
      tasks.value = merged;
    }
  }

  /** 初始化 Realtime 订阅（仅已配对时生效） */
  async function initSync() {
    if (!isLoggedIn.value) return;
    const hasProfile = await syncCode.hasProfile();
    if (!hasProfile) return;

    subscribeToChanges(
      (remoteTask) => {
        const idx = tasks.value.findIndex((t) => t.id === remoteTask.id);
        if (idx >= 0) {
          if (new Date(remoteTask.updated_at) >= new Date(tasks.value[idx].updated_at)) {
            tasks.value = tasks.value
              .map((t) => (t.id === remoteTask.id ? remoteTask : t))
              .filter((t) => !t.is_deleted);
          }
        } else if (!remoteTask.is_deleted) {
          tasks.value = [...tasks.value, remoteTask];
        }
        allTags.value = [...new Set(tasks.value.flatMap((t) => t.tags))].sort();
      },
      (_dc) => {
        // 远端每日完成变更：刷新本地
        refreshDailyCompletions();
      },
    );
  }

  async function refreshDailyCompletions() {
    dailyCompletedIds.value = await call<string[]>('get_daily_completions', {
      date: todayStr(),
    });
  }

  // ── 任务 CRUD ──

  /** 同步推送辅助：若已配置则推送到 Supabase */
  function syncPush(task: Task) {
    if (!isLoggedIn.value) return;
    pushTask(task).catch((e) => console.warn('[sync] pushTask:', e));
  }

  async function addTask(
    title: string,
    due_date: string | null,
    tags: string[],
    important: boolean,
    pinned: boolean,
    is_daily: boolean,
  ) {
    try {
      const task = await call<Task>('add_task', {
        args: {
          title,
          dueDate: due_date,
          tags,
          important,
          pinned,
          isDaily: is_daily,
        },
      });
      // 替换数组引用以确保 Android WebView 响应式更新
      tasks.value = [...tasks.value, task];
      if (tags.length > 0) {
        allTags.value = await call<string[]>('get_all_tags');
      }
      syncPush(task);
    } catch (e) {
      console.error('[addTask] invoke failed, falling back to reload:', e);
      // invoke 失败时回退到全量重载，保证数据一致性
      await loadAll();
    }
  }

  async function toggleTask(id: string) {
    try {
      await call('toggle_task', { id });
      // 替换数组引用以确保 Android WebView 响应式更新
      tasks.value = tasks.value.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completed_at: !t.completed ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            }
          : t,
      );
      const updated = tasks.value.find((t) => t.id === id);
      if (updated) syncPush(updated);
    } catch (e) {
      console.error('[toggleTask] invoke failed, falling back to reload:', e);
      await loadAll();
    }
  }

  async function toggleDailyTask(id: string, date: string) {
    try {
      await call('toggle_daily_task', { id, date });
      await refreshDailyCompletions();
    } catch (e) {
      console.error('[toggleDailyTask] invoke failed, falling back to reload:', e);
      await loadAll();
    }
  }

  async function updateTask(id: string, title: string) {
    if (!tasks.value.find((t) => t.id === id)) return;
    try {
      const task = tasks.value.find((t) => t.id === id)!;
      await call('update_task', {
        args: {
          id,
          title,
          dueDate: task.due_date,
          tags: task.tags,
          important: task.important,
          pinned: task.pinned,
          isDaily: task.is_daily,
        },
      });
      tasks.value = tasks.value.map((t) =>
        t.id === id ? { ...t, title, updated_at: new Date().toISOString() } : t,
      );
      const updated = tasks.value.find((t) => t.id === id);
      if (updated) syncPush(updated);
    } catch (e) {
      console.error('[updateTask] invoke failed, falling back to reload:', e);
      await loadAll();
    }
  }

  async function updateTaskMeta(id: string, tags: string[], important: boolean, pinned: boolean) {
    if (!tasks.value.find((t) => t.id === id)) return;
    try {
      const task = tasks.value.find((t) => t.id === id)!;
      await call('update_task', {
        args: {
          id,
          title: task.title,
          dueDate: task.due_date,
          tags,
          important,
          pinned,
          isDaily: task.is_daily,
        },
      });
      tasks.value = tasks.value.map((t) =>
        t.id === id ? { ...t, tags, important, pinned, updated_at: new Date().toISOString() } : t,
      );
      allTags.value = await call<string[]>('get_all_tags');
      const updated = tasks.value.find((t) => t.id === id);
      if (updated) syncPush(updated);
    } catch (e) {
      console.error('[updateTaskMeta] invoke failed, falling back to reload:', e);
      await loadAll();
    }
  }

  async function deleteTask(id: string) {
    try {
      await call('delete_task', { id });
      // 软删除并推送后从列表移除
      tasks.value = tasks.value.map((t) =>
        t.id === id ? { ...t, is_deleted: true, updated_at: new Date().toISOString() } : t,
      );
      const deleted = tasks.value.find((t) => t.id === id);
      if (deleted) syncPush(deleted);
      tasks.value = tasks.value.filter((t) => t.id !== id);
      allTags.value = await call<string[]>('get_all_tags');
    } catch (e) {
      console.error('[deleteTask] invoke failed, falling back to reload:', e);
      await loadAll();
    }
  }

  async function clearCompleted() {
    try {
      await call('clear_completed');
      const now = new Date().toISOString();
      // 本地标记为软删除
      tasks.value = tasks.value.map((t) =>
        t.completed && !t.is_deleted ? { ...t, is_deleted: true, updated_at: now } : t,
      );
      // 推送每个被清除的任务到 Supabase
      const cleared = tasks.value.filter((t) => t.completed && t.is_deleted);
      for (const task of cleared) {
        syncPush(task);
      }
      tasks.value = tasks.value.filter((t) => !t.is_deleted);
    } catch (e) {
      console.error('[clearCompleted] invoke failed, falling back to reload:', e);
      await loadAll();
    }
  }

  // ── 筛选操作 ──

  function selectDate(date: string | null) {
    filterDate.value = date;
  }

  function toggleTag(tag: string) {
    if (!tag) {
      selectedTags.value = [];
      return;
    }
    const idx = selectedTags.value.indexOf(tag);
    if (idx >= 0) {
      selectedTags.value.splice(idx, 1);
    } else {
      selectedTags.value.push(tag);
    }
  }

  function addTag(tag: string) {
    if (!allTags.value.includes(tag)) {
      allTags.value = [...allTags.value, tag].sort();
    }
  }

  return {
    tasks,
    allTags,
    dailyCompletedIds,
    filterDate,
    selectedTags,
    filteredTasks,
    dailyCompletionsMap,
    loadAll,
    refreshTasks,
    initSync,
    addTask,
    toggleTask,
    toggleDailyTask,
    updateTask,
    updateTaskMeta,
    deleteTask,
    clearCompleted,
    selectDate,
    toggleTag,
    addTag,
  };
}

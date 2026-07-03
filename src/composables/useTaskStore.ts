import { ref, computed } from 'vue';
import type { Task } from '../types';
import { useSync } from './useSync';
import { useAuth } from './useAuth';

/** 检测是否在 Tauri 环境 */
const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

/** 浏览器 mock：localStorage 读写 */
const STORAGE_KEY = 'prism_mock_tasks';
const DC_KEY = 'prism_mock_daily';

function loadMockTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  // 首次加载插入示例数据
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

/** 封装 invoke：Tauri 环境走原生，浏览器走 localStorage */
async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  return mockInvoke<T>(cmd, args);
}

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
      const id = args?.id as string;
      const t = mockTasks.find((x) => x.id === id);
      if (t) {
        t.completed = !t.completed;
        t.completed_at = t.completed ? new Date().toISOString() : null;
        t.updated_at = new Date().toISOString();
      }
      saveMockTasks(mockTasks);
      return undefined as T;
    }
    case 'toggle_daily_task': {
      const tid = args?.id as string;
      const date = args?.date as string;
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
      const did = args?.id as string;
      const t = mockTasks.find((x) => x.id === did);
      if (t) {
        t.is_deleted = true;
        t.updated_at = new Date().toISOString();
      }
      saveMockTasks(mockTasks);
      return undefined as T;
    }
    case 'clear_completed': {
      const remaining = mockTasks.filter((t) => !t.completed);
      mockTasks.length = 0;
      mockTasks.push(...remaining);
      saveMockTasks(mockTasks);
      return undefined as T;
    }
    default:
      return undefined as T;
  }
}

/** 任务数据（全局单例 ref，确保跨组件共享） */
const tasks = ref<Task[]>([]);
const allTags = ref<string[]>([]);
const dailyCompletedIds = ref<string[]>([]);

/** 筛选状态 */
const filterDate = ref<string | null>(null);
const selectedTags = ref<string[]>([]);

/** 任务看板 composable：核心数据 + 筛选 + CRUD 操作 + 同步 */
export function useTaskStore() {
  const { isConfigured } = useAuth();
  const { pushTask, pullTasks, subscribeToChanges } = useSync();
  // ── 计算属性 ──────────────────────────────

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
    // 始终返回新数组引用，确保 Vue computed 检测到变化并触发下游更新
    return [...result];
  });

  const overdueCount = computed(() => {
    const ts = todayStr();
    return tasks.value.filter((t) => t.due_date && t.due_date < ts && !t.completed).length;
  });

  const pendingCount = computed(() => {
    return tasks.value.filter((t) => !t.completed).length;
  });

  // ── 数据加载 ──────────────────────────────

  /** 加载所有任务和标签数据，若已配置同步则从远端合并 */
  async function loadAll() {
    tasks.value = await call<Task[]>('get_tasks');
    allTags.value = await call<string[]>('get_all_tags');
    await refreshDailyCompletions();

    // 从 Supabase 拉取远端任务并按 LWW 合并到本地
    if (isConfigured.value) {
      try {
        await pullAndMerge();
      } catch (e) {
        console.warn('[sync] pullAndMerge failed, using local data:', e);
      }
    }
  }

  /** LWW 合并远端任务到本地：remote.updated_at > local.updated_at 时覆盖 */
  async function pullAndMerge() {
    const remoteTasks = await pullTasks();
    if (remoteTasks.length === 0) return;

    const localMap = new Map(tasks.value.map((t) => [t.id, t]));
    let changed = false;

    for (const rt of remoteTasks) {
      const local = localMap.get(rt.id);
      if (!local || new Date(rt.updated_at) > new Date(local.updated_at)) {
        localMap.set(rt.id, rt);
        changed = true;
      }
    }

    if (changed) {
      tasks.value = [...localMap.values()].filter((t) => !t.is_deleted);
    }
  }

  /** 初始化 Realtime 订阅，远端变更自动合并到本地 */
  function initSync() {
    if (!isConfigured.value) return;

    subscribeToChanges(
      (remoteTask) => {
        // 远端任务变更：LWW 合并
        const idx = tasks.value.findIndex((t) => t.id === remoteTask.id);
        if (idx >= 0) {
          if (new Date(remoteTask.updated_at) > new Date(tasks.value[idx].updated_at)) {
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

  // ── 任务 CRUD（集中双写：call 成功后更新 ref） ──────

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
      // 替换整个数组引用而非 push，确保 Android WebView 中可靠触发响应式更新
      tasks.value = [...tasks.value, task];
      if (tags.length > 0) {
        allTags.value = await call<string[]>('get_all_tags');
      }
      // 推送到 Supabase
      if (isConfigured.value) pushTask(task).catch((e) => console.warn('[sync] pushTask:', e));
    } catch (e) {
      console.error('[addTask] invoke failed, falling back to reload:', e);
      // invoke 失败时回退到全量重载，保证数据一致性
      await loadAll();
    }
  }

  async function toggleTask(id: string) {
    try {
      await call('toggle_task', { id });
      // 通过 map 创建新对象和新数组引用，确保 Android WebView 响应式更新
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
      // 推送到 Supabase
      if (isConfigured.value) {
        const updated = tasks.value.find((t) => t.id === id);
        if (updated) pushTask(updated).catch((e) => console.warn('[sync] pushTask:', e));
      }
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
      // 推送到 Supabase
      if (isConfigured.value) {
        const updated = tasks.value.find((t) => t.id === id);
        if (updated) pushTask(updated).catch((e) => console.warn('[sync] pushTask:', e));
      }
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
      // 推送到 Supabase
      if (isConfigured.value) {
        const updated = tasks.value.find((t) => t.id === id);
        if (updated) pushTask(updated).catch((e) => console.warn('[sync] pushTask:', e));
      }
    } catch (e) {
      console.error('[updateTaskMeta] invoke failed, falling back to reload:', e);
      await loadAll();
    }
  }

  async function deleteTask(id: string) {
    try {
      await call('delete_task', { id });
      // 软删除本地 ref：标记 is_deleted 并推送到远端
      tasks.value = tasks.value.map((t) =>
        t.id === id ? { ...t, is_deleted: true, updated_at: new Date().toISOString() } : t,
      );
      if (isConfigured.value) {
        const deleted = tasks.value.find((t) => t.id === id);
        if (deleted) pushTask(deleted).catch((e) => console.warn('[sync] pushTask:', e));
      }
      // 从显示列表中移除已软删除的任务
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
      tasks.value = tasks.value.filter((t) => !t.completed);
    } catch (e) {
      console.error('[clearCompleted] invoke failed, falling back to reload:', e);
      await loadAll();
    }
  }

  // ── 筛选操作 ──────────────────────────────

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
      allTags.value.push(tag);
    }
    selectedTags.value = [tag];
  }

  return {
    // 数据
    tasks,
    allTags,
    dailyCompletedIds,
    filterDate,
    selectedTags,
    // 计算属性
    filteredTasks,
    dailyCompletionsMap,
    overdueCount,
    pendingCount,
    // 数据加载
    loadAll,
    initSync,
    // CRUD
    addTask,
    toggleTask,
    toggleDailyTask,
    updateTask,
    updateTaskMeta,
    deleteTask,
    clearCompleted,
    // 筛选
    selectDate,
    toggleTag,
    addTag,
  };
}

function todayStr(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

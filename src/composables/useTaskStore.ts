import { ref, computed } from 'vue';
import type { Task } from '../types';
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
    if (raw) return JSON.parse(raw);
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
      if (idx >= 0) {
        dc.splice(idx, 1);
        // 若当天无其他完成记录，重置 task.completed
        if (!dc.includes(tid)) {
          const task = mockTasks.find((t) => t.id === tid);
          if (task) {
            task.completed = false;
            task.completed_at = null;
            task.updated_at = new Date().toISOString();
          }
        }
      } else {
        dc.push(tid);
        const task = mockTasks.find((t) => t.id === tid);
        if (task && !task.completed) {
          task.completed = true;
          task.completed_at = new Date().toISOString();
          task.updated_at = new Date().toISOString();
        }
      }
      saveMockDaily(date, dc);
      saveMockTasks(mockTasks);
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
    case 'sync_remote_daily_completions': {
      const remoteCompletions =
        (args?.remoteCompletions as Array<{ task_id: string; date: string }>) || [];
      for (const rc of remoteCompletions) {
        const dc = loadMockDaily(rc.date);
        if (!dc.includes(rc.task_id)) {
          dc.push(rc.task_id);
          saveMockDaily(rc.date, dc);
        }
      }
      return undefined as T;
    }
    case 'delete_daily_completion': {
      const delTaskId = args?.taskId as string;
      const delDate = args?.date as string;
      const dc = loadMockDaily(delDate);
      const delIdx = dc.indexOf(delTaskId);
      if (delIdx >= 0) {
        dc.splice(delIdx, 1);
        saveMockDaily(delDate, dc);
      }
      return undefined as T;
    }
    case 'reset_daily_tasks': {
      // 浏览器 mock：跨天清零每日任务的 completed 状态
      const today = (args?.today as string) || todayStr();
      const todayCompletions = loadMockDaily(today);
      const changed: Task[] = [];
      for (const task of mockTasks) {
        if (!task.is_daily || task.is_deleted) continue;
        const shouldComplete = todayCompletions.includes(task.id);
        if (task.completed !== shouldComplete) {
          task.completed = shouldComplete;
          task.completed_at = shouldComplete ? new Date().toISOString() : null;
          task.updated_at = new Date().toISOString();
          changed.push({ ...task });
        }
      }
      if (changed.length > 0) saveMockTasks(mockTasks);
      return changed as T;
    }
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
  const {
    pushTask,
    pushDailyCompletion,
    pushDeleteDailyCompletion,
    pullTasks,
    pullDailyCompletions,
    subscribeToChanges,
  } = useSync();
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

  const overdueCount = computed(() => {
    const ts = todayStr();
    return tasks.value.filter((t) => t.due_date && t.due_date < ts && !t.completed).length;
  });

  const pendingCount = computed(() => {
    return tasks.value.filter((t) => !t.completed).length;
  });

  // ── 数据加载与同步 ──

  /**
   * 清理远端已删除但本地残留的每日完成记录。
   * 对比本地与远端的 daily_completions，按日期逐个清理本地有但远端无的记录。
   * 解决 sync_remote_daily_completions（只增不删）在 pull 路径下导致的对钩残留问题。
   */
  async function cleanStaleDailyCompletions(remoteDCs: Array<{ task_id: string; date: string }>) {
    // 收集远端涉及的所有日期
    const remoteDates = [...new Set(remoteDCs.map((dc) => dc.date))];
    for (const date of remoteDates) {
      const remoteIds = remoteDCs.filter((dc) => dc.date === date).map((dc) => dc.task_id);
      const localIds = await call<string[]>('get_daily_completions', { date });
      for (const taskId of localIds) {
        if (!remoteIds.includes(taskId)) {
          await call('delete_daily_completion', { taskId, date });
        }
      }
    }
  }

  /** 加载本地数据，若已配对则从远端合并 */
  async function loadAll() {
    // 跨天重置每日任务的 completed 状态，被修改的任务同步到 Supabase
    const changedTasks = await call<Task[]>('reset_daily_tasks', { today: todayStr() });
    if (isLoggedIn.value && changedTasks.length > 0) {
      for (const t of changedTasks) {
        pushTask(t).catch((e) => console.warn('[sync] push reset_daily:', e));
      }
    }

    const [localTasks, _allTags] = await Promise.all([
      call<Task[]>('get_tasks'),
      call<string[]>('get_all_tags'),
    ]);
    allTags.value = _allTags;
    await refreshDailyCompletions();

    let merged = localTasks.filter((t) => !t.is_deleted);

    // 恢复已配对的 profile，并尝试远端合并
    if (isLoggedIn.value) {
      try {
        await syncCode.restoreProfile();
        const [remoteTasks, remoteDCs] = await Promise.all([
          pullTasks(true),
          pullDailyCompletions(),
        ]);
        if (remoteTasks.length > 0) {
          merged = mergeTasksLWW(merged, remoteTasks);
        }
        if (remoteDCs.length > 0) {
          // 清理远端已删除但本地残留的每日完成记录
          await cleanStaleDailyCompletions(remoteDCs);
          await call('sync_remote_daily_completions', {
            remoteCompletions: remoteDCs.map((dc: { task_id: string; date: string }) => ({
              task_id: dc.task_id,
              date: dc.date,
            })),
          });
          await refreshDailyCompletions();
        }
      } catch (e) {
        console.warn('[sync] loadAll pull failed:', e);
      }
    }

    tasks.value = merged;
  }

  /**
   * 重新进入时刷新任务：后台合并本地+远端，替换前不重置列表。
   * 保持当前数据可见，避免"先闪本地再出远端"的闪烁。
   */
  async function refreshTasks() {
    // 跨天重置每日任务的 completed 状态，被修改的任务同步到 Supabase
    const changedTasks = await call<Task[]>('reset_daily_tasks', { today: todayStr() });
    if (isLoggedIn.value && changedTasks.length > 0) {
      for (const t of changedTasks) {
        pushTask(t).catch((e) => console.warn('[sync] push reset_daily:', e));
      }
    }

    const [localTasks, _allTags] = await Promise.all([
      call<Task[]>('get_tasks'),
      call<string[]>('get_all_tags'),
    ]);
    allTags.value = _allTags;
    await refreshDailyCompletions();

    let merged = localTasks.filter((t) => !t.is_deleted);

    if (isLoggedIn.value) {
      try {
        const [remoteTasks, remoteDCs] = await Promise.all([
          pullTasks(true),
          pullDailyCompletions(),
        ]);
        if (remoteTasks.length > 0) {
          merged = mergeTasksLWW(merged, remoteTasks);
        }
        if (remoteDCs.length > 0) {
          // 清理远端已删除但本地残留的每日完成记录
          await cleanStaleDailyCompletions(remoteDCs);
          await call('sync_remote_daily_completions', {
            remoteCompletions: remoteDCs.map((dc: { task_id: string; date: string }) => ({
              task_id: dc.task_id,
              date: dc.date,
            })),
          });
          await refreshDailyCompletions();
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
            // 安全网：当每日任务的 completed 被远端置为 false 时，
            // 同步清理 dailyCompletedIds 和本地磁盘，防止 Realtime DELETE
            // 事件因 REPLICA IDENTITY DEFAULT 丢失字段而被过滤掉
            if (remoteTask.is_daily && !remoteTask.completed) {
              dailyCompletedIds.value = dailyCompletedIds.value.filter(
                (tid) => tid !== remoteTask.id,
              );
              // 同时清理本地磁盘，否则 refresh 会从磁盘读回旧数据
              call('delete_daily_completion', { taskId: remoteTask.id, date: todayStr() });
            }
            // 正向安全网：当每日任务的 completed 被远端置为 true 时，
            // 同步更新 dailyCompletedIds，防止 Realtime DC INSERT 事件延迟/丢失
            if (remoteTask.is_daily && remoteTask.completed) {
              if (!dailyCompletedIds.value.includes(remoteTask.id)) {
                dailyCompletedIds.value = [...dailyCompletedIds.value, remoteTask.id];
              }
            }
          }
        } else if (!remoteTask.is_deleted) {
          tasks.value = [...tasks.value, remoteTask];
        }
        allTags.value = [...new Set(tasks.value.flatMap((t) => t.tags))].sort();
      },
      (dc, eventType) => {
        // 乐观更新 UI：直接操作 dailyCompletedIds，不依赖 data.json 回读
        // Rust 命令负责持久化，UI 不等待
        if (eventType === 'DELETE') {
          call('delete_daily_completion', { taskId: dc.task_id, date: dc.date });
          if (dc.date === todayStr()) {
            dailyCompletedIds.value = dailyCompletedIds.value.filter((tid) => tid !== dc.task_id);
          }
        } else {
          call('sync_remote_daily_completions', {
            remoteCompletions: [{ task_id: dc.task_id, date: dc.date }],
          });
          if (dc.date === todayStr() && !dailyCompletedIds.value.includes(dc.task_id)) {
            // 竞态防护：若任务 completed 已为 false，说明取消完成的任务更新
            // 已先于本 INSERT 到达，不应再将此任务加入 dailyCompletedIds
            const task = tasks.value.find((t) => t.id === dc.task_id);
            if (!task || task.completed) {
              dailyCompletedIds.value = [...dailyCompletedIds.value, dc.task_id];
            }
          }
        }
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
      // 在 invoke 前捕获当前完成状态，判断操作类型
      const wasCompleted = dailyCompletedIds.value.includes(id);
      await call('toggle_daily_task', { id, date });
      // 乐观更新 dailyCompletedIds，确保 UI 即时响应
      if (wasCompleted) {
        dailyCompletedIds.value = dailyCompletedIds.value.filter((tid) => tid !== id);
      } else {
        if (!dailyCompletedIds.value.includes(id)) {
          dailyCompletedIds.value = [...dailyCompletedIds.value, id];
        }
      }

      // 同步更新本地 task.completed 以匹配每日完成状态
      const task = tasks.value.find((t) => t.id === id);
      if (task) {
        const newlyCompleted = !wasCompleted;
        tasks.value = tasks.value.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: newlyCompleted,
                completed_at: newlyCompleted ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
              }
            : t,
        );
        const updated = tasks.value.find((t) => t.id === id);
        if (updated) syncPush(updated);
      }

      // 推送/删除远端 DailyCompletion
      if (wasCompleted) {
        pushDeleteDailyCompletion(id, date).catch((e) =>
          console.warn('[sync] pushDeleteDailyCompletion:', e),
        );
      } else {
        pushDailyCompletion({ task_id: id, date }).catch((e) =>
          console.warn('[sync] pushDailyCompletion:', e),
        );
      }
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
      allTags.value.push(tag);
    }
    selectedTags.value = [tag];
  }

  return {
    tasks,
    allTags,
    dailyCompletedIds,
    filterDate,
    selectedTags,
    filteredTasks,
    dailyCompletionsMap,
    overdueCount,
    pendingCount,
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

function todayStr(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

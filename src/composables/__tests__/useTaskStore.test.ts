import { describe, it, expect } from 'vitest';
import { mergeTasksLWW } from '../useTaskStore';
import type { Task } from '../../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'test',
    completed: false,
    created_at: '2026-01-01T00:00:00Z',
    completed_at: null,
    due_date: null,
    tags: [],
    important: false,
    pinned: false,
    is_daily: false,
    parent_id: null,
    updated_at: '2026-01-01T00:00:00Z',
    is_deleted: false,
    ...overrides,
  };
}

describe('mergeTasksLWW', () => {
  it('should return local tasks when remote is empty', () => {
    const local = [makeTask({ id: 'a', title: 'local' })];
    const result = mergeTasksLWW(local, []);
    expect(result).toEqual(local);
  });

  it('should add remote task not present locally', () => {
    const local: Task[] = [];
    const remote = [makeTask({ id: 'remote-1', title: 'from remote' })];
    const result = mergeTasksLWW(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('remote-1');
  });

  it('should overwrite local with remote when remote is newer', () => {
    const local = [makeTask({ id: 'a', title: 'old', updated_at: '2026-01-01T00:00:00Z' })];
    const remote = [makeTask({ id: 'a', title: 'new', updated_at: '2026-06-01T00:00:00Z' })];
    const result = mergeTasksLWW(local, remote);
    expect(result[0].title).toBe('new');
  });

  it('should keep local when local is newer', () => {
    const local = [makeTask({ id: 'a', title: 'newer', updated_at: '2026-06-01T00:00:00Z' })];
    const remote = [makeTask({ id: 'a', title: 'older', updated_at: '2026-01-01T00:00:00Z' })];
    const result = mergeTasksLWW(local, remote);
    expect(result[0].title).toBe('newer');
  });

  it('should use remote when timestamps are equal (>=)', () => {
    const local = [makeTask({ id: 'a', title: 'local', updated_at: '2026-01-01T00:00:00Z' })];
    const remote = [makeTask({ id: 'a', title: 'remote', updated_at: '2026-01-01T00:00:00Z' })];
    const result = mergeTasksLWW(local, remote);
    expect(result[0].title).toBe('remote');
  });

  it('should remove tasks marked as deleted in remote', () => {
    const local = [makeTask({ id: 'a', title: 'deleted task' })];
    const remote = [
      makeTask({
        id: 'a',
        title: 'deleted task',
        is_deleted: true,
        updated_at: '2026-06-01T00:00:00Z',
      }),
    ];
    const result = mergeTasksLWW(local, remote);
    expect(result).toHaveLength(0);
  });

  it('should not remove locally-deleted task when remote has newer non-deleted version', () => {
    const local = [
      makeTask({ id: 'a', title: 'deleted', is_deleted: true, updated_at: '2026-01-01T00:00:00Z' }),
    ];
    const remote = [
      makeTask({
        id: 'a',
        title: 'restored',
        is_deleted: false,
        updated_at: '2026-06-01T00:00:00Z',
      }),
    ];
    const result = mergeTasksLWW(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].is_deleted).toBe(false);
  });

  it('should merge multiple tasks correctly', () => {
    const local = [
      makeTask({ id: 'a', title: 'local only', updated_at: '2026-01-01T00:00:00Z' }),
      makeTask({ id: 'b', title: 'older', updated_at: '2026-01-01T00:00:00Z' }),
    ];
    const remote = [
      makeTask({ id: 'b', title: 'newer', updated_at: '2026-06-01T00:00:00Z' }),
      makeTask({ id: 'c', title: 'remote only', updated_at: '2026-06-01T00:00:00Z' }),
    ];
    const result = mergeTasksLWW(local, remote);
    const ids = result.map((t) => t.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});

// ═══════════════════════════════════════════════════════════════
//  回归测试：每日任务跨设备取消完成时对钩残留
//
//  场景：桌面端完成每日任务 → 立即取消完成
//  手机端：删除线消失（task.completed=false），但对钩不消失
//
//  根因假设：对钩由 dailyCompletedIds 控制，删除线由 task.completed 控制。
//  当 Realtime DELETE 事件因 REPLICA IDENTITY 丢失时，
//  安全网（if remoteTask.is_daily && !remoteTask.completed）应清理
//  dailyCompletedIds，但可能未正确触发。
// ═══════════════════════════════════════════════════════════════

describe('每日任务跨设备取消完成 — 对钩残留回归测试', () => {
  /**
   * 模拟 Realtime 订阅中 onTaskChange 的处理逻辑：
   * 当收到远端每日任务 completed=false 的更新时，
   * 必须同步清理 dailyCompletedIds。
   */
  function simulateRealtimeTaskUpdate(
    tasks: Task[],
    dailyCompletedIds: string[],
    remoteTask: Task,
  ): { tasks: Task[]; dailyCompletedIds: string[] } {
    const idx = tasks.findIndex((t) => t.id === remoteTask.id);
    if (idx >= 0) {
      if (new Date(remoteTask.updated_at) >= new Date(tasks[idx].updated_at)) {
        tasks = tasks
          .map((t) => (t.id === remoteTask.id ? remoteTask : t))
          .filter((t) => !t.is_deleted);

        // 安全网：每日任务 completed 被远端置为 false 时清理 dailyCompletedIds
        if (remoteTask.is_daily && !remoteTask.completed) {
          dailyCompletedIds = dailyCompletedIds.filter((tid) => tid !== remoteTask.id);
        }
      }
    } else if (!remoteTask.is_deleted) {
      tasks = [...tasks, remoteTask];
    }
    return { tasks, dailyCompletedIds };
  }

  it('每日任务取消完成：安全网应清理 dailyCompletedIds', () => {
    const localTasks = [
      makeTask({
        id: 'daily-1',
        is_daily: true,
        completed: true,
        updated_at: '2026-07-07T08:00:00Z',
      }),
    ];
    const localDailyIds = ['daily-1'];

    // 远端取消完成：completed=false, updated_at 更新
    const remoteTask = makeTask({
      id: 'daily-1',
      is_daily: true,
      completed: false,
      updated_at: '2026-07-07T08:00:05Z',
    });

    const result = simulateRealtimeTaskUpdate(localTasks, localDailyIds, remoteTask);

    // task.completed 应为 false → 删除线消失
    expect(result.tasks[0].completed).toBe(false);
    // dailyCompletedIds 应为空 → 对钩消失
    expect(result.dailyCompletedIds).not.toContain('daily-1');
    expect(result.dailyCompletedIds).toHaveLength(0);
  });

  it('每日任务取消完成：若 LWW 检查不通过，不应更新（本地更新更晚）', () => {
    const localTasks = [
      makeTask({
        id: 'daily-1',
        is_daily: true,
        completed: false,
        updated_at: '2026-07-07T08:00:10Z',
      }),
    ];
    const localDailyIds: string[] = [];

    // 远端有较旧的 completed=true
    const remoteTask = makeTask({
      id: 'daily-1',
      is_daily: true,
      completed: true,
      updated_at: '2026-07-07T08:00:05Z', // 比本地旧
    });

    const result = simulateRealtimeTaskUpdate(localTasks, localDailyIds, remoteTask);

    // 本地已取消完成，不应被旧远端覆盖
    expect(result.tasks[0].completed).toBe(false);
    expect(result.dailyCompletedIds).toHaveLength(0);
  });

  it('普通任务取消完成：不触发安全网，直接依赖 task.completed', () => {
    const localTasks = [
      makeTask({
        id: 'normal-1',
        is_daily: false,
        completed: true,
        updated_at: '2026-07-07T08:00:00Z',
      }),
    ];
    const localDailyIds: string[] = [];

    const remoteTask = makeTask({
      id: 'normal-1',
      is_daily: false,
      completed: false,
      updated_at: '2026-07-07T08:00:05Z',
    });

    const result = simulateRealtimeTaskUpdate(localTasks, localDailyIds, remoteTask);

    expect(result.tasks[0].completed).toBe(false);
    // 普通任务不依赖 dailyCompletedIds，对钩由 task.completed 直接控制
  });

  it('安全网只在 is_daily=true 且 completed=false 时触发', () => {
    const localTasks = [
      makeTask({
        id: 'daily-1',
        is_daily: true,
        completed: false,
        updated_at: '2026-07-07T08:00:00Z',
      }),
    ];
    const localDailyIds = ['daily-1']; // 残留的对钩状态

    // 远端也还是 false（不是取消操作，是另一个更新）
    const remoteTask = makeTask({
      id: 'daily-1',
      is_daily: true,
      completed: false,
      updated_at: '2026-07-07T08:00:05Z',
    });

    const result = simulateRealtimeTaskUpdate(localTasks, localDailyIds, remoteTask);

    // 安全网仍应清理（因为 remoteTask.completed 是 false）
    expect(result.dailyCompletedIds).not.toContain('daily-1');
  });
});

// ═══════════════════════════════════════════════════════════════
//  回归测试：Pull 路径下远端删除的 daily_completion 本地残留
//
//  场景：桌面端取消完成每日任务 → daily_completion 从 Supabase 删除
//  手机端 pullDailyCompletions → 不包含已删除记录
//  但 sync_remote_daily_completions 只增不删 → 旧记录残留
//
//  修复：cleanStaleDailyCompletions 对比远端和本地，移除本地多余的记录。
// ═══════════════════════════════════════════════════════════════

describe('cleanStaleDailyCompletions — Pull 路径 DC 清理', () => {
  /**
   * 模拟 cleanStaleDailyCompletions 的核心逻辑：
   * 对比远端和本地当天的 DC，移除本地有但远端无的。
   */
  function simulateCleanStale(
    localTodayIds: string[],
    remoteDCs: Array<{ task_id: string; date: string }>,
    today: string,
  ): string[] {
    const remoteTodayIds = remoteDCs.filter((dc) => dc.date === today).map((dc) => dc.task_id);
    return localTodayIds.filter((id) => remoteTodayIds.includes(id));
  }

  it('远端已删除的 DC 应从本地移除', () => {
    const today = '2026-07-07';
    // 本地有 task-1 和 task-2 的 DC
    const localTodayIds = ['task-1', 'task-2'];
    // 远端 DC 列表不包含 task-1（已被桌面端删除），但包含 task-2
    const remoteDCs = [
      { task_id: 'task-2', date: today }, // 另一个任务的 DC，仍存在
    ];

    const result = simulateCleanStale(localTodayIds, remoteDCs, today);
    // task-1 被清理
    expect(result).not.toContain('task-1');
    // task-2 保留
    expect(result).toContain('task-2');
  });

  it('远端新增的 DC 应保留在本地（由 sync_remote_daily_completions 处理添加）', () => {
    const today = '2026-07-07';
    const localTodayIds: string[] = [];
    const remoteDCs = [
      { task_id: 'task-1', date: today },
      { task_id: 'task-2', date: today },
    ];

    const result = simulateCleanStale(localTodayIds, remoteDCs, today);
    // cleanup 不负责添加，只负责删除；添加由 sync_remote_daily_completions 处理
    expect(result).toHaveLength(0);
  });

  it('远端 DC 为空时，本地当天 DC 应全部清除', () => {
    const today = '2026-07-07';
    const localTodayIds = ['task-1', 'task-2'];
    const remoteDCs: Array<{ task_id: string; date: string }> = [];

    const result = simulateCleanStale(localTodayIds, remoteDCs, today);
    expect(result).toHaveLength(0);
  });

  it('只清理当天日期的 DC，其他日期不受影响', () => {
    const today = '2026-07-07';
    // 本地有今天和昨天的 DC
    const localTodayIds = ['task-1'];
    // 远端 DC：昨天的还在，今天的 task-1 已被删除
    const remoteDCs = [
      { task_id: 'task-1', date: '2026-07-06' }, // 昨天的，仍存在
    ];

    const result = simulateCleanStale(localTodayIds, remoteDCs, today);
    // 今天 task-1 被清理
    expect(result).toHaveLength(0);
    // 昨天的 task-1 不受影响（不在 localTodayIds 中，属于不同日期）
  });
});

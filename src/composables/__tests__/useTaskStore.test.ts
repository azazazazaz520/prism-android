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

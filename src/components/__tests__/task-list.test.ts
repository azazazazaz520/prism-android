import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TaskList from '../TaskList.vue';
import type { Task } from '../../types';

// ═══════════════════════════════════════════════════════════════
//  测试目标：验证 TaskList 对钩图标在任务取消完成时正确隐藏
//
//  回归测试：电脑端完成任务后取消，手机端删除线消失但对钩残留。
//  根因：v-if="task.completed" 在 Android WebView 中对 SVG 元素
//        的 DOM 增删不可靠。
//  修复：对钩 SVG 始终渲染，通过 CSS .done 类控制 display:none/block。
// ═══════════════════════════════════════════════════════════════

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: '测试任务',
    completed: false,
    created_at: '2026-07-07T08:00:00Z',
    completed_at: null,
    due_date: null,
    tags: [],
    important: false,
    pinned: false,
    is_daily: false,
    parent_id: null,
    updated_at: '2026-07-07T08:00:00Z',
    is_deleted: false,
    ...overrides,
  };
}

describe('TaskList 对钩视觉一致性（Android WebView 回归）', () => {
  it('非每日任务未完成时，对钩 SVG 始终存在于 DOM 中', () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: [makeTask({ completed: false })],
        dailyCompletionsMap: {},
      },
    });

    // 修复后：对钩 SVG 始终渲染（不再依赖 v-if）
    const checkMark = wrapper.find('.check-mark');
    expect(checkMark.exists()).toBe(true);
  });

  it('非每日任务完成时，对钩 SVG 始终在 DOM 且有 .done 类控制可见', () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: [makeTask({ completed: true })],
        dailyCompletionsMap: {},
      },
    });

    const checkBtn = wrapper.find('.check-btn.done');
    expect(checkBtn.exists()).toBe(true);

    const checkMark = wrapper.find('.check-mark');
    expect(checkMark.exists()).toBe(true);
  });

  it('非每日任务：完成→取消完成时，.done 类被移除，对钩由 CSS 隐藏', async () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: [makeTask({ completed: true })],
        dailyCompletionsMap: {},
      },
    });

    // 初始状态：已完成
    expect(wrapper.find('.check-btn.done').exists()).toBe(true);
    expect(wrapper.find('.check-mark').exists()).toBe(true);

    // 取消完成（模拟跨设备同步到达）
    await wrapper.setProps({
      tasks: [makeTask({ completed: false })],
    });

    const checkBtn = wrapper.find('.check-btn');

    // .done 类应被移除（控制绿色背景+对钩可见性）
    expect(checkBtn.classes()).not.toContain('done');

    // 对钩 SVG 仍在 DOM 中（不再依赖 v-if 增删）
    const checkMark = wrapper.find('.check-mark');
    expect(checkMark.exists()).toBe(true);
  });

  it('每日任务：isDailyCompleted 切换时，.done 类正确更新', async () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: [makeTask({ is_daily: true, completed: true })],
        dailyCompletionsMap: { 'task-1': true },
      },
    });

    expect(wrapper.find('.check-btn.done').exists()).toBe(true);

    // 取消每日完成
    await wrapper.setProps({
      dailyCompletionsMap: {},
    });

    const checkBtn = wrapper.find('.check-btn');
    expect(checkBtn.classes()).not.toContain('done');
  });

  it('删除线（.completed 类）和对钩（.done 类）始终同步更新', async () => {
    const wrapper = mount(TaskList, {
      props: {
        tasks: [makeTask({ completed: true })],
        dailyCompletionsMap: {},
      },
    });

    expect(wrapper.find('.task-card.completed').exists()).toBe(true);
    expect(wrapper.find('.check-btn.done').exists()).toBe(true);

    // 取消完成
    await wrapper.setProps({
      tasks: [makeTask({ completed: false })],
    });

    // 两者应同步移除 — 回归断言
    expect(wrapper.find('.task-card.completed').exists()).toBe(false);
    expect(wrapper.find('.check-btn.done').exists()).toBe(false);
  });
});

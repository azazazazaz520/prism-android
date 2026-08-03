<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useTaskStore } from '../composables/useTaskStore';
import { todayStr } from '../utils/date';
import DateStrip from '../components/DateStrip.vue';
import TagChipBar from '../components/TagChipBar.vue';
import TaskList from '../components/TaskList.vue';
import TaskComposerSheet from '../components/TaskComposerSheet.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const {
  tasks,
  allTags,
  filterDate,
  selectedTags,
  filteredTasks,
  dailyCompletionsMap,
  loadAll,
  addTask,
  toggleTask,
  toggleDailyTask,
  updateTask,
  updateTaskMeta,
  deleteTask,
  selectDate,
  toggleTag,
  addTag,
} = useTaskStore();

const visiblePendingCount = computed(
  () => filteredTasks.value.filter((task) => !task.completed).length,
);
const visibleOverdueCount = computed(
  () =>
    filteredTasks.value.filter(
      (task) => task.due_date && task.due_date < todayStr() && !task.completed,
    ).length,
);

const todayLabel = computed(() => {
  const [, month, day] = todayStr().split('-');
  return `今天 · ${Number(month)}月${Number(day)}日`;
});

const composerOpen = ref(false);

onMounted(() => {
  loadAll();
});

// ── 删除确认 ──────────────────────────────

const showDeleteConfirm = ref(false);
const pendingDeleteId = ref<string | null>(null);

function confirmDeleteTask(id: string) {
  pendingDeleteId.value = id;
  showDeleteConfirm.value = true;
}

function handleDeleteConfirmed() {
  if (pendingDeleteId.value) {
    deleteTask(pendingDeleteId.value);
  }
  showDeleteConfirm.value = false;
  pendingDeleteId.value = null;
}

function handleDeleteCancelled() {
  showDeleteConfirm.value = false;
  pendingDeleteId.value = null;
}

// ── 下拉刷新 ──────────────────────────────

const pullDistance = ref(0);
const isPulling = ref(false);
let pullStartY = 0;

function onPullStart(e: TouchEvent) {
  // 只在滚动到顶部时触发下拉
  const el = e.currentTarget as HTMLElement;
  if (el.scrollTop > 0) return;
  pullStartY = e.touches[0].clientY;
  isPulling.value = true;
}

function onPullMove(e: TouchEvent) {
  if (!isPulling.value) return;
  const dy = e.touches[0].clientY - pullStartY;
  if (dy > 0) {
    pullDistance.value = Math.min(dy * 0.4, 80);
  }
}

function onPullEnd() {
  if (pullDistance.value > 50) {
    // 触发同步
    loadAll();
  }
  pullDistance.value = 0;
  isPulling.value = false;
}

function openComposer() {
  composerOpen.value = true;
}

function closeComposer() {
  composerOpen.value = false;
}

function handleTaskAdded(
  title: string,
  dueDate: string | null,
  tags: string[],
  important: boolean,
  pinned: boolean,
  isDaily: boolean,
) {
  addTask(title, dueDate, tags, important, pinned, isDaily);
  closeComposer();
}
</script>

<template>
  <div
    class="tasks-view"
    @touchstart.passive="onPullStart"
    @touchmove="onPullMove"
    @touchend="onPullEnd"
  >
    <!-- 下拉刷新指示器 -->
    <div
      class="pull-indicator"
      :style="{ height: pullDistance + 'px', opacity: pullDistance / 50 }"
    >
      <span v-if="pullDistance > 50" class="pull-text">松开刷新</span>
      <span v-else class="pull-text">下拉刷新</span>
    </div>

    <!-- 页面标题 -->
    <header class="task-header">
      <span class="task-eyebrow">{{ todayLabel }}</span>
      <h1 class="view-title">全部任务</h1>
      <div class="summary-row" aria-live="polite">
        <span class="summary-text">{{ visiblePendingCount }} 项待办</span>
        <span v-if="visibleOverdueCount > 0" class="summary-overdue">
          {{ visibleOverdueCount }} 项已过期
        </span>
      </div>
    </header>

    <!-- 日期条 -->
    <DateStrip :tasks="tasks" :selected-date="filterDate" @select-date="selectDate" />

    <!-- 标签筛选 -->
    <TagChipBar
      :tags="allTags"
      :selected="selectedTags"
      @toggle-tag="toggleTag"
      @add-tag="addTag"
    />

    <!-- 任务列表 -->
    <TaskList
      :tasks="filteredTasks"
      :daily-completions-map="dailyCompletionsMap"
      @toggle="toggleTask"
      @toggle-daily="toggleDailyTask"
      @update="updateTask"
      @delete="confirmDeleteTask"
      @update-meta="updateTaskMeta"
    />

    <!-- 快速新增入口：点击后打开任务面板，不在列表页常驻输入框 -->
    <button class="quick-add-button" type="button" @click="openComposer">
      <span class="quick-add-icon" aria-hidden="true">+</span>
      <span>快速添加任务</span>
    </button>

    <TaskComposerSheet
      v-if="composerOpen"
      :available-tags="allTags"
      @add="handleTaskAdded"
      @close="closeComposer"
    />

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :show="showDeleteConfirm"
      title="删除任务"
      message="确定要删除这个任务吗？此操作可在同步设备上撤销。"
      @confirm="handleDeleteConfirmed"
      @cancel="handleDeleteCancelled"
    />
  </div>
</template>

<style scoped>
.tasks-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 0 var(--space-xl);
}

.pull-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: height 0.15s ease-out;
}

.pull-text {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.task-header {
  padding: var(--space-xl) 0 var(--space-sm);
}

.task-eyebrow {
  display: block;
  color: var(--accent);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.04em;
}

.view-title {
  margin: var(--space-xs) 0 0;
  color: var(--text-primary);
  font-size: clamp(30px, 8vw, 38px);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0 0;
}

.summary-text {
  font-size: var(--text-base);
  color: var(--text-muted);
}

.summary-overdue {
  font-size: var(--text-xs);
  color: var(--danger);
  background: var(--danger-light);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
}

.quick-add-button {
  position: fixed;
  right: var(--space-xl);
  bottom: calc(var(--bottom-nav-height, 64px) + var(--space-lg));
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 56px;
  padding: 0 var(--space-lg) 0 var(--space-sm);
  border: 0;
  border-radius: var(--radius-full);
  color: #fff;
  background: var(--accent);
  box-shadow: var(--shadow-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast);
}

.quick-add-button:active {
  transform: scale(0.96);
  background: var(--accent-hover);
}

.quick-add-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 50%;
  color: var(--accent);
  background: #fff;
  font-size: 28px;
  font-weight: var(--font-weight-normal);
  line-height: 1;
}

@media (max-width: 520px) {
  .quick-add-button {
    right: var(--space-lg);
  }
}
</style>

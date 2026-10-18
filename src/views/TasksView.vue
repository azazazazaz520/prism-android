<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useTaskStore } from '../composables/useTaskStore';
import type { Task } from '../types';
import { todayStr } from '../utils/date';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import DateStrip from '../components/DateStrip.vue';
import TagChipBar from '../components/TagChipBar.vue';
import TaskComposerSheet from '../components/TaskComposerSheet.vue';
import TaskList from '../components/TaskList.vue';

type ViewMode = 'all' | 'today' | 'planned';

const {
  tasks,
  allTags,
  filterDate,
  selectedTags,
  filteredTasks,
  dailyCompletionsMap,
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

const viewMode = ref<ViewMode>('today');
const composerOpen = ref(false);

const today = computed(() => todayStr());
const todayLabel = computed(() => {
  const [, month, day] = today.value.split('-');
  return `今天 · ${Number(month)}月${Number(day)}日`;
});
const pageTitle = computed(() => {
  if (viewMode.value === 'planned') return '计划';
  if (viewMode.value === 'all') return '全部任务';
  return '今天';
});

function isComplete(task: Task): boolean {
  return task.is_daily ? !!dailyCompletionsMap.value[task.id] : task.completed;
}

const viewTasks = computed(() => {
  if (viewMode.value === 'today') {
    return filteredTasks.value.filter((task) => task.due_date === today.value || task.is_daily);
  }
  if (viewMode.value === 'planned') {
    return filteredTasks.value.filter((task) => task.due_date && task.due_date > today.value);
  }
  return filteredTasks.value;
});

const counts = computed(() => ({
  all: filteredTasks.value.length,
  today: filteredTasks.value.filter((task) => task.due_date === today.value || task.is_daily)
    .length,
  planned: filteredTasks.value.filter((task) => task.due_date && task.due_date > today.value)
    .length,
}));

const pendingCount = computed(() => viewTasks.value.filter((task) => !isComplete(task)).length);
const completedCount = computed(() => viewTasks.value.filter(isComplete).length);
const overdueCount = computed(
  () =>
    viewTasks.value.filter(
      (task) => task.due_date && task.due_date < today.value && !isComplete(task),
    ).length,
);
const progress = computed(() => {
  const total = viewTasks.value.length;
  return total === 0 ? 0 : Math.round((completedCount.value / total) * 100);
});

onMounted(() => {
  selectDate(today.value);
});

function setViewMode(mode: ViewMode) {
  viewMode.value = mode;
  selectDate(mode === 'today' ? today.value : null);
}

function handleDateSelect(date: string | null) {
  selectDate(date);
  viewMode.value = date === today.value ? 'today' : 'all';
}

function openToday() {
  setViewMode('today');
}

function openPlanned() {
  setViewMode('planned');
}

const showDeleteConfirm = ref(false);
const pendingDeleteId = ref<string | null>(null);

function confirmDeleteTask(id: string) {
  pendingDeleteId.value = id;
  showDeleteConfirm.value = true;
}

function handleDeleteConfirmed() {
  if (pendingDeleteId.value) deleteTask(pendingDeleteId.value);
  showDeleteConfirm.value = false;
  pendingDeleteId.value = null;
}

function handleDeleteCancelled() {
  showDeleteConfirm.value = false;
  pendingDeleteId.value = null;
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
  <div class="tasks-view">
    <div class="tasks-shell">
      <header class="workspace-header">
        <div class="header-copy">
          <div class="context-line">
            <span class="context-label">今天</span>
            <span class="context-divider" aria-hidden="true"></span>
            <span>{{ todayLabel }}</span>
          </div>
          <h1>{{ pageTitle }}</h1>
          <p>
            {{ pendingCount }} 项待办<span v-if="overdueCount"> · {{ overdueCount }} 项已过期</span>
          </p>
        </div>
        <button
          class="primary-button add-button"
          type="button"
          aria-label="新增任务"
          @click="openComposer"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>新增</span>
        </button>
      </header>

      <section class="progress-card" aria-labelledby="progress-title">
        <div class="progress-copy">
          <div>
            <span class="section-kicker">今日进度</span>
            <h2 id="progress-title">
              {{ completedCount }}<span>/{{ viewTasks.length }}</span> 已完成
            </h2>
          </div>
          <strong class="progress-value">{{ progress }}%</strong>
        </div>
        <div class="progress-track" aria-hidden="true">
          <span :style="{ width: progress + '%' }"></span>
        </div>
      </section>

      <div class="view-tabs" role="tablist" aria-label="任务视图">
        <button
          class="view-tab"
          :class="{ active: viewMode === 'today' }"
          role="tab"
          :aria-selected="viewMode === 'today'"
          type="button"
          @click="openToday"
        >
          今天 <span>{{ counts.today }}</span>
        </button>
        <button
          class="view-tab"
          :class="{ active: viewMode === 'planned' }"
          role="tab"
          :aria-selected="viewMode === 'planned'"
          type="button"
          @click="openPlanned"
        >
          计划 <span>{{ counts.planned }}</span>
        </button>
        <button
          class="view-tab"
          :class="{ active: viewMode === 'all' }"
          role="tab"
          :aria-selected="viewMode === 'all'"
          type="button"
          @click="setViewMode('all')"
        >
          全部 <span>{{ counts.all }}</span>
        </button>
      </div>

      <section class="date-section" aria-labelledby="date-panel-title">
        <div class="section-heading">
          <div>
            <span class="section-kicker">时间</span>
            <h2 id="date-panel-title">选择日期</h2>
          </div>
          <button class="text-button" type="button" @click="openToday">回到今天</button>
        </div>
        <DateStrip :tasks="tasks" :selected-date="filterDate" @select-date="handleDateSelect" />
      </section>

      <section class="task-section" aria-labelledby="task-panel-title">
        <div class="section-heading task-heading">
          <div>
            <span class="section-kicker">清单</span>
            <h2 id="task-panel-title">任务</h2>
          </div>
          <span class="task-count">{{ viewTasks.length }} 项</span>
        </div>
        <TagChipBar
          :tags="allTags"
          :selected="selectedTags"
          @toggle-tag="toggleTag"
          @add-tag="addTag"
        />
        <TaskList
          :tasks="viewTasks"
          :daily-completions-map="dailyCompletionsMap"
          @toggle="toggleTask"
          @toggle-daily="toggleDailyTask"
          @update="updateTask"
          @delete="confirmDeleteTask"
          @update-meta="updateTaskMeta"
        />
      </section>
    </div>

    <TaskComposerSheet
      v-if="composerOpen"
      :available-tags="allTags"
      @add="handleTaskAdded"
      @close="closeComposer"
    />

    <ConfirmDialog
      :show="showDeleteConfirm"
      title="删除任务"
      message="确定要删除这项任务吗？此操作会在同步设备上同步删除。"
      @confirm="handleDeleteConfirmed"
      @cancel="handleDeleteCancelled"
    />
  </div>
</template>

<style scoped>
.tasks-view {
  min-height: 100%;
  min-width: 0;
  width: 100%;
  padding: 0 16px 28px;
}

.tasks-shell {
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 18px 0 32px;
}

.workspace-header,
.context-line,
.progress-copy,
.section-heading {
  display: flex;
  align-items: center;
}

.workspace-header,
.progress-copy,
.section-heading {
  justify-content: space-between;
}

.workspace-header {
  gap: 16px;
  margin-bottom: 16px;
}

.header-copy {
  min-width: 0;
}

.context-line {
  gap: 8px;
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.context-label {
  color: var(--accent);
  font-weight: var(--font-weight-semibold);
}

.context-divider {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--border-default);
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  margin-top: 5px;
  color: var(--text-primary);
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.04em;
  line-height: 1.15;
}

h2 {
  margin-top: 3px;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
}

.header-copy > p {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

button {
  font: inherit;
  touch-action: manipulation;
}

button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.primary-button,
.text-button,
.view-tab {
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}

.primary-button {
  display: inline-flex;
  min-height: 48px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-full);
  color: #fff;
  background: var(--accent);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
}

.primary-button:hover,
.primary-button:focus-visible {
  background: var(--accent-hover);
}

.primary-button:active,
.view-tab:active {
  transform: scale(0.98);
}

.primary-button svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.progress-card {
  padding: 14px 16px 15px;
  border: 1px solid var(--accent-muted);
  border-radius: var(--radius-lg);
  background: var(--accent-light);
}

.progress-copy {
  gap: 12px;
}

.section-kicker {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.05em;
}

.progress-card h2 {
  margin-top: 4px;
  color: var(--text-primary);
  font-size: 18px;
}

.progress-card h2 span {
  color: var(--text-muted);
  font-weight: var(--font-weight-normal);
}

.progress-value {
  color: var(--accent);
  font-size: 15px;
}

.progress-track {
  height: 8px;
  margin-top: 13px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--bg-primary);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width 220ms var(--easing-standard);
}

.view-tabs {
  display: flex;
  gap: 4px;
  margin: 16px 0 22px;
  padding: 4px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-full);
  background: var(--bg-tertiary);
}

.view-tab {
  display: inline-flex;
  min-height: 44px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-radius: var(--radius-full);
  color: var(--text-muted);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
}

.view-tab span {
  color: var(--text-disabled);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

.view-tab.active,
.view-tab:hover,
.view-tab:focus-visible {
  color: var(--text-primary);
  background: var(--bg-primary);
  box-shadow: var(--shadow-sm);
}

.view-tab.active span {
  color: var(--accent);
}

.date-section {
  margin-bottom: 22px;
}

.section-heading {
  gap: 12px;
}

.text-button {
  min-height: 44px;
  padding: 0 4px;
  border: 0;
  color: var(--accent);
  background: transparent;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
}

.text-button:hover,
.text-button:focus-visible {
  color: var(--accent-hover);
}

.task-section {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
}

.task-heading {
  margin-bottom: 8px;
}

.task-count {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

@media (min-width: 760px) {
  .tasks-view {
    padding-right: 24px;
    padding-left: 24px;
  }

  .tasks-shell {
    padding-top: 24px;
  }
}

@media (max-width: 420px) {
  .tasks-view {
    padding-right: 12px;
    padding-left: 12px;
  }

  .tasks-shell {
    padding-top: 12px;
  }

  .workspace-header {
    gap: 10px;
  }

  .primary-button {
    padding: 0 13px;
  }

  .task-section {
    padding: 14px 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>

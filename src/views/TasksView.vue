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
  loadAll();
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

// 删除确认
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

// 下拉刷新
const pullDistance = ref(0);
const isPulling = ref(false);
let pullStartY = 0;

function onPullStart(e: TouchEvent) {
  const element = e.currentTarget as HTMLElement;
  if (element.scrollTop > 0) return;
  pullStartY = e.touches[0].clientY;
  isPulling.value = true;
}

function onPullMove(e: TouchEvent) {
  if (!isPulling.value) return;
  const distance = e.touches[0].clientY - pullStartY;
  if (distance > 0) pullDistance.value = Math.min(distance * 0.4, 80);
}

function onPullEnd() {
  if (pullDistance.value > 50) loadAll();
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
    <div
      class="pull-indicator"
      :style="{ height: pullDistance + 'px', opacity: pullDistance / 50 }"
      aria-live="polite"
    >
      <span>{{ pullDistance > 50 ? '松开刷新' : '下拉刷新' }}</span>
    </div>

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
        <button class="primary-button add-button" type="button" @click="openComposer">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>新增任务</span>
        </button>
      </header>

      <div class="view-tabs" role="tablist" aria-label="任务视图">
        <button
          class="view-tab"
          :class="{ active: viewMode === 'all' }"
          role="tab"
          :aria-selected="viewMode === 'all'"
          @click="setViewMode('all')"
        >
          全部 <span>{{ counts.all }}</span>
        </button>
        <button
          class="view-tab"
          :class="{ active: viewMode === 'today' }"
          role="tab"
          :aria-selected="viewMode === 'today'"
          @click="openToday"
        >
          今天 <span>{{ counts.today }}</span>
        </button>
        <button
          class="view-tab"
          :class="{ active: viewMode === 'planned' }"
          role="tab"
          :aria-selected="viewMode === 'planned'"
          @click="openPlanned"
        >
          计划 <span>{{ counts.planned }}</span>
        </button>
      </div>

      <div class="workspace-grid">
        <div class="main-column">
          <section class="surface-panel date-panel" aria-labelledby="date-panel-title">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">时间</span>
                <h2 id="date-panel-title">选择日期</h2>
              </div>
              <button class="text-button" type="button" @click="openToday">回到今天</button>
            </div>
            <DateStrip :tasks="tasks" :selected-date="filterDate" @select-date="handleDateSelect" />
          </section>

          <section class="surface-panel task-panel" aria-labelledby="task-panel-title">
            <div class="panel-heading task-heading">
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

        <aside class="side-column" aria-label="任务摘要">
          <section class="surface-panel summary-card">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">进度</span>
                <h2>完成情况</h2>
              </div>
              <strong class="progress-value">{{ progress }}%</strong>
            </div>
            <div class="progress-number">
              <strong>{{ completedCount }}</strong>
              <span>/ {{ viewTasks.length }} 项已完成</span>
            </div>
            <div class="progress-track" aria-hidden="true">
              <span :style="{ width: progress + '%' }"></span>
            </div>
            <p class="summary-copy">
              {{
                viewTasks.length
                  ? '完成一项，就离今天的重点更近一步。'
                  : '先添加一项任务，开始安排今天。'
              }}
            </p>
          </section>

          <section class="surface-panel quick-card">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">快捷入口</span>
                <h2>快速查看</h2>
              </div>
            </div>
            <button class="quick-action" type="button" @click="openToday">
              <span class="quick-icon today-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
              </span>
              <span
                ><strong>今天</strong><small>{{ counts.today }} 项任务</small></span
              >
              <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            <button class="quick-action" type="button" @click="openPlanned">
              <span class="quick-icon plan-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
              </span>
              <span
                ><strong>计划</strong><small>{{ counts.planned }} 项已安排</small></span
              >
              <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </section>
        </aside>
      </div>
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
  padding: 0 20px 32px;
}

.pull-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-xs);
  transition: height 150ms ease-out;
}

.tasks-shell {
  max-width: 1040px;
  min-width: 0;
  width: 100%;
  margin: 0 auto;
  padding: 20px 0 40px;
}

.workspace-header,
.context-line,
.view-tabs,
.panel-heading,
.progress-number,
.quick-action {
  display: flex;
  align-items: center;
}

.workspace-header,
.panel-heading,
.quick-action {
  justify-content: space-between;
}

.workspace-header {
  gap: 20px;
  margin-bottom: 20px;
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
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--border-default);
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  margin-top: 6px;
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
  margin-top: 6px;
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
.view-tab,
.quick-action {
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}

.primary-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  color: #fff;
  background: var(--accent);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
}

.primary-button:hover,
.primary-button:focus-visible {
  background: var(--accent-hover);
}

.primary-button:active {
  transform: scale(0.98);
}

.primary-button svg,
.quick-icon svg,
.arrow-icon {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.view-tabs {
  gap: 4px;
  margin-bottom: 16px;
  padding: 4px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
}

.view-tab {
  display: inline-flex;
  min-height: 40px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 6px;
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

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  align-items: start;
  gap: 16px;
  min-width: 0;
}

.main-column,
.side-column {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.surface-panel {
  min-width: 0;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
}

.date-panel,
.task-panel,
.summary-card,
.quick-card {
  padding: 16px;
}

.panel-heading {
  gap: 12px;
}

.section-kicker {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.05em;
}

.text-button {
  min-height: 40px;
  padding: 0 2px;
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

.task-heading {
  margin-bottom: 10px;
}

.task-count {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.summary-card,
.quick-card {
  min-width: 0;
}

.progress-value {
  color: var(--accent);
  font-size: var(--text-xs);
}

.progress-number {
  gap: 5px;
  margin-top: 20px;
}

.progress-number strong {
  color: var(--text-primary);
  font-size: 26px;
  letter-spacing: -0.04em;
}

.progress-number span {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.progress-track {
  height: 7px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--bg-tertiary);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width 220ms ease;
}

.summary-copy {
  margin-top: 12px;
  color: var(--text-muted);
  font-size: var(--text-xs);
  line-height: 1.5;
}

.quick-card .panel-heading {
  margin-bottom: 8px;
}

.quick-action {
  width: 100%;
  gap: 9px;
  min-height: 56px;
  padding: 6px 0;
  border: 0;
  color: var(--text-primary);
  background: transparent;
  text-align: left;
}

.quick-action:hover,
.quick-action:focus-visible {
  color: var(--accent);
}

.quick-action > span:nth-child(2) {
  display: grid;
  flex: 1;
  gap: 2px;
}

.quick-action strong {
  font-size: var(--text-xs);
}

.quick-action small {
  color: var(--text-muted);
  font-size: 11px;
}

.quick-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border-radius: 6px;
}

.today-icon {
  color: var(--accent);
  background: var(--accent-light);
}

.plan-icon {
  color: #756a37;
  background: #f6f0d9;
}

.quick-icon svg {
  width: 16px;
  height: 16px;
}

.arrow-icon {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  color: var(--text-disabled);
}

@media (max-width: 760px) {
  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .side-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .tasks-view {
    padding: 0 12px 20px;
  }

  .tasks-shell {
    padding: 10px 0 16px;
  }

  .workspace-header {
    align-items: flex-end;
    gap: 8px;
    margin-bottom: 12px;
  }

  .context-line {
    gap: 6px;
    font-size: 12px;
  }

  .add-button {
    flex: 0 0 auto;
    width: auto;
    min-height: 40px;
    gap: 6px;
    padding: 0 10px;
    font-size: 13px;
  }

  h1 {
    margin-top: 4px;
    font-size: 24px;
    line-height: 1.1;
  }

  .header-copy > p {
    margin-top: 4px;
    font-size: 13px;
  }

  .view-tabs {
    gap: 2px;
    margin-bottom: 12px;
    padding: 3px;
  }

  .view-tab {
    min-height: 36px;
    gap: 4px;
    font-size: 13px;
  }

  .date-panel,
  .task-panel,
  .summary-card,
  .quick-card {
    padding: 12px;
  }

  .task-panel {
    min-height: clamp(360px, calc(100dvh - 500px), 520px);
  }

  .surface-panel {
    border-radius: 12px;
  }

  .panel-heading {
    gap: 8px;
  }

  h2 {
    font-size: 16px;
  }

  .task-heading {
    margin-bottom: 8px;
  }

  .side-column {
    grid-template-columns: 1fr;
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

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useTaskStore } from '../composables/useTaskStore';
import { useSync } from '../composables/useSync';
import DateStrip from '../components/DateStrip.vue';
import TagChipBar from '../components/TagChipBar.vue';
import TaskList from '../components/TaskList.vue';
import TaskInput from '../components/TaskInput.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const {
  tasks,
  allTags,
  filterDate,
  selectedTags,
  filteredTasks,
  dailyCompletionsMap,
  overdueCount,
  pendingCount,
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

const { syncStatus } = useSync();

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
</script>

<template>
  <div
    class="tasks-view"
    @touchstart.passive="onPullStart"
    @touchmove="onPullMove"
    @touchend="onPullEnd"
  >
    <!-- 下拉刷新指示器 -->
    <div class="pull-indicator" :style="{ height: pullDistance + 'px', opacity: pullDistance / 50 }">
      <span v-if="pullDistance > 50" class="pull-text">松开刷新</span>
      <span v-else class="pull-text">下拉刷新</span>
    </div>

    <!-- 日期条 -->
    <DateStrip :tasks="tasks" :selected-date="filterDate" @select-date="selectDate" />

    <!-- 标签筛选 -->
    <TagChipBar
      :tags="allTags"
      :selected="selectedTags"
      @toggle-tag="toggleTag"
      @add-tag="addTag"
    />

    <!-- 统计摘要 -->
    <div class="summary-row">
      <span class="summary-text">{{ pendingCount }} 项待办</span>
      <span v-if="overdueCount > 0" class="summary-overdue">{{ overdueCount }} 项已过期</span>
    </div>

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

    <!-- 底部输入条 -->
    <TaskInput @add="addTask" />
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
  padding: 0 var(--space-lg);
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

.summary-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
}

.summary-text {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.summary-overdue {
  font-size: var(--text-xs);
  color: var(--danger);
  background: var(--danger-light);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
}
</style>

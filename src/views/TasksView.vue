<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useTaskStore } from '../composables/useTaskStore';
import type { Task } from '../types';
import { todayStr } from '../utils/date';
import AppIcon from '../components/AppIcon.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import DateStrip from '../components/DateStrip.vue';
import FilterSheet from '../components/FilterSheet.vue';
import PageHeader from '../components/PageHeader.vue';
import SegmentedControl from '../components/SegmentedControl.vue';
import TaskComposerSheet from '../components/TaskComposerSheet.vue';
import TaskList from '../components/TaskList.vue';

type ViewMode = 'today' | 'planned' | 'all';

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
  deleteTask,
  selectDate,
  toggleTag,
  addTag,
} = useTaskStore();

const viewMode = ref<ViewMode>('today');
const composerOpen = ref(false);
const filterOpen = ref(false);
const scrolled = ref(false);
const scrollEl = ref<HTMLElement | null>(null);
const today = todayStr();

const viewOptions = [
  { value: 'today', label: '今天' },
  { value: 'planned', label: '计划' },
  { value: 'all', label: '全部' },
];

const segmentedValue = computed({
  get: () => viewMode.value,
  set: (value: string) => setViewMode(value as ViewMode),
});

const pageTitle = computed(() => {
  if (viewMode.value === 'planned') return '计划';
  if (viewMode.value === 'all') return '全部任务';
  return '今天';
});

const todayLabel = computed(() => {
  const date = new Date();
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  return `${date.getMonth() + 1}月${date.getDate()}日 星期${weekday}`;
});

function isComplete(task: Task): boolean {
  return task.is_daily ? !!dailyCompletionsMap.value[task.id] : task.completed;
}

const viewTasks = computed(() => {
  if (viewMode.value === 'today') {
    return filteredTasks.value.filter((task) => task.due_date === today || task.is_daily);
  }
  if (viewMode.value === 'planned') {
    return filteredTasks.value.filter((task) => task.due_date && task.due_date > today);
  }
  return filteredTasks.value;
});

const pendingCount = computed(() => viewTasks.value.filter((task) => !isComplete(task)).length);

const subtitle = computed(() => {
  if (viewMode.value === 'planned') {
    return `${viewTasks.value.length} 项已安排`;
  }
  if (viewMode.value === 'all') {
    return `共 ${viewTasks.value.length} 项 · 还剩 ${pendingCount.value} 项`;
  }
  if (viewTasks.value.length === 0) {
    return `${todayLabel.value} · 暂无任务`;
  }
  return `${todayLabel.value} · ${pendingCount.value ? `还剩 ${pendingCount.value} 项` : '全部完成'}`;
});

function setViewMode(mode: ViewMode) {
  viewMode.value = mode;
  selectDate(mode === 'today' ? today : null);
}

function handleDateSelect(date: string | null) {
  selectDate(date);
  viewMode.value = date === today ? 'today' : 'all';
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

let scrollTicking = false;
function onScroll() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    scrolled.value = (scrollEl.value?.scrollTop ?? 0) > 12;
    scrollTicking = false;
  });
}

onMounted(() => {
  selectDate(today);
});
</script>

<template>
  <div class="tasks-page">
    <div ref="scrollEl" class="page-scroll" @scroll.passive="onScroll">
      <PageHeader :title="pageTitle" :subtitle="subtitle" :scrolled="scrolled">
        <template #actions>
          <button
            class="ios-icon-btn filter-btn"
            type="button"
            aria-label="筛选标签"
            @click="filterOpen = true"
          >
            <AppIcon name="filter" :size="21" :stroke-width="2" />
            <span v-if="selectedTags.length" class="filter-dot" aria-hidden="true"></span>
          </button>
          <button class="ios-icon-btn" type="button" aria-label="新建任务" @click="openComposer">
            <AppIcon name="plus" :size="22" :stroke-width="2" />
          </button>
        </template>
      </PageHeader>

      <div class="week-wrap">
        <DateStrip :tasks="tasks" :selected-date="filterDate" @select-date="handleDateSelect" />
      </div>

      <div class="seg-wrap">
        <SegmentedControl v-model="segmentedValue" :options="viewOptions" aria-label="任务视图" />
      </div>

      <div v-if="selectedTags.length" class="active-filters">
        <span class="filter-caption">筛选</span>
        <button
          v-for="tag in selectedTags"
          :key="tag"
          class="filter-chip"
          type="button"
          :aria-label="`移除标签 ${tag}`"
          @click="toggleTag(tag)"
        >
          {{ tag }}
          <AppIcon name="x" :size="10" :stroke-width="2.6" />
        </button>
        <button class="filter-clear" type="button" @click="toggleTag('')">清除</button>
      </div>

      <div class="content">
        <TaskList
          :tasks="viewTasks"
          :daily-completions-map="dailyCompletionsMap"
          @toggle="toggleTask"
          @toggle-daily="toggleDailyTask"
          @update="updateTask"
          @delete="confirmDeleteTask"
          @add="openComposer"
        />
      </div>
    </div>

    <FilterSheet
      v-if="filterOpen"
      :tags="allTags"
      :selected="selectedTags"
      @toggle-tag="toggleTag"
      @add-tag="addTag"
      @close="filterOpen = false"
    />

    <TaskComposerSheet
      v-if="composerOpen"
      :available-tags="allTags"
      @add="handleTaskAdded"
      @close="closeComposer"
    />

    <ConfirmDialog
      :show="showDeleteConfirm"
      title="删除任务"
      message="删除后会同步到其他设备，且无法恢复。"
      confirm-label="删除"
      @confirm="handleDeleteConfirmed"
      @cancel="handleDeleteCancelled"
    />
  </div>
</template>

<style scoped>
.tasks-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}

.page-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 28px;
}

.week-wrap {
  padding: 6px var(--page-x) 0;
}

.seg-wrap {
  padding: 12px var(--page-x) 0;
}

.active-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px var(--page-x) 0;
  overflow-x: auto;
}

.filter-caption {
  color: var(--label-2);
  font-size: var(--f-footnote);
}

.filter-chip {
  display: inline-flex;
  min-height: 28px;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  color: var(--tint);
  background: var(--tint-soft);
  font-size: var(--f-footnote);
  transition: opacity var(--dur-fast) var(--ease-standard);
}

.filter-chip:active {
  opacity: 0.6;
}

.filter-clear {
  flex: 0 0 auto;
  padding: 0 6px;
  color: var(--label-2);
  font-size: var(--f-footnote);
}

.content {
  padding: 20px var(--page-x) 0;
}

.filter-btn {
  position: relative;
}

.filter-dot {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tint);
  box-shadow: 0 0 0 2px var(--bg);
}
</style>

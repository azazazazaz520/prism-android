<!--
  UI prototype question: does a compact, shadcn-style task workspace make
  the next action easier to find? This route is intentionally throwaway.
  State is in memory only and must be rewritten before production adoption.
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';

type TaskFilter = 'all' | 'today' | 'planned';

interface PreviewTask {
  id: number;
  title: string;
  due: string;
  tag: string;
  important?: boolean;
  completed: boolean;
  section: 'today' | 'later';
}

const tasks = ref<PreviewTask[]>([
  {
    id: 1,
    title: '整理本周项目计划',
    due: '今天 · 09:30',
    tag: '工作',
    important: true,
    completed: false,
    section: 'today',
  },
  {
    id: 2,
    title: '给家人回复消息',
    due: '今天',
    tag: '生活',
    completed: false,
    section: 'today',
  },
  {
    id: 3,
    title: '阅读产品反馈并记录决定',
    due: '今天 · 15:00',
    tag: '工作',
    important: true,
    completed: false,
    section: 'today',
  },
  {
    id: 4,
    title: '提交周报草稿',
    due: '今天 · 17:30',
    tag: '工作',
    completed: true,
    section: 'today',
  },
  {
    id: 5,
    title: '整理桌面和下载文件',
    due: '明天',
    tag: '生活',
    completed: true,
    section: 'later',
  },
  {
    id: 6,
    title: '准备周末阅读清单',
    due: '周六',
    tag: '阅读',
    completed: false,
    section: 'later',
  },
]);

const selectedDate = ref('今天');
const selectedFilter = ref<TaskFilter>('all');
const filterOpen = ref(false);
const actionsFor = ref<number | null>(null);
const composerOpen = ref(false);
const draftTitle = ref('');
const draftDate = ref('今天');
const draftTag = ref('工作');
const draftImportant = ref(false);
const draftPinned = ref(false);
const draftDaily = ref(false);
const titleInput = ref<HTMLInputElement | null>(null);
const syncing = ref(false);
const notice = ref('');

const dateItems = [
  { day: '五', label: '07/31', value: '07/31' },
  { day: '六', label: '08/01', value: '08/01' },
  { day: '日', label: '08/02', value: '08/02' },
  { day: '一', label: '今天', value: '今天' },
  { day: '二', label: '08/04', value: '明天' },
  { day: '三', label: '08/05', value: '周三' },
  { day: '四', label: '08/06', value: '周四' },
];

const visibleTasks = computed(() => {
  return tasks.value.filter((task) => {
    if (selectedFilter.value === 'today') return task.section === 'today';
    if (selectedFilter.value === 'planned') return task.section === 'later';
    return true;
  });
});

const taskGroups = computed(() => {
  return [
    {
      key: 'today',
      label: '今天',
      hint: '优先处理',
      tasks: visibleTasks.value.filter((task) => task.section === 'today'),
    },
    {
      key: 'later',
      label: '稍后',
      hint: '留给之后',
      tasks: visibleTasks.value.filter((task) => task.section === 'later'),
    },
  ].filter((group) => group.tasks.length > 0);
});

const todayTasks = computed(() => tasks.value.filter((task) => task.section === 'today'));
const todayCompleted = computed(() => todayTasks.value.filter((task) => task.completed).length);
const pendingCount = computed(() => tasks.value.filter((task) => !task.completed).length);
const progress = computed(() => {
  if (!todayTasks.value.length) return 0;
  return Math.round((todayCompleted.value / todayTasks.value.length) * 100);
});
const filterLabel = computed(() => {
  if (selectedFilter.value === 'today') return '今天';
  if (selectedFilter.value === 'planned') return '计划';
  return '全部';
});

onMounted(() => {
  document.body.classList.add('preview-shell-mode');
});

onUnmounted(() => {
  document.body.classList.remove('preview-shell-mode');
});

function closePopovers() {
  filterOpen.value = false;
  actionsFor.value = null;
}

function setFilter(filter: TaskFilter) {
  selectedFilter.value = filter;
  filterOpen.value = false;
  if (filter === 'today') selectedDate.value = '今天';
}

function selectDate(value: string) {
  selectedDate.value = value;
  if (value === '今天') selectedFilter.value = 'today';
  else if (value === '明天' || value === '周三' || value === '周四')
    selectedFilter.value = 'planned';
  else selectedFilter.value = 'all';
}

function toggleTask(task: PreviewTask) {
  task.completed = !task.completed;
  showNotice(task.completed ? '任务已完成' : '任务已恢复');
}

function showNotice(message: string) {
  notice.value = message;
  window.setTimeout(() => {
    if (notice.value === message) notice.value = '';
  }, 2400);
}

function openComposer() {
  closePopovers();
  composerOpen.value = true;
  nextTick(() => titleInput.value?.focus());
}

function closeComposer() {
  composerOpen.value = false;
  draftTitle.value = '';
  draftDate.value = '今天';
  draftTag.value = '工作';
  draftImportant.value = false;
  draftPinned.value = false;
  draftDaily.value = false;
}

function saveTask() {
  const title = draftTitle.value.trim();
  if (!title) return;

  tasks.value.unshift({
    id: Date.now(),
    title,
    due: draftDate.value,
    tag: draftTag.value,
    important: draftImportant.value,
    completed: false,
    section: draftDate.value === '今天' ? 'today' : 'later',
  });
  showNotice('任务已添加');
  closeComposer();
}

function deleteTask(id: number) {
  tasks.value = tasks.value.filter((task) => task.id !== id);
  actionsFor.value = null;
  showNotice('任务已移除');
}

function toggleSync() {
  syncing.value = !syncing.value;
  showNotice(syncing.value ? '正在同步本地变更' : '已保存到本机');
}
</script>

<template>
  <main class="preview-page" @click="closePopovers">
    <div class="preview-shell">
      <div class="preview-note">PREVIEW · DESIGN STUDY</div>

      <header class="workspace-header">
        <div class="header-copy">
          <div class="context-line">
            <span class="context-label">任务空间</span>
            <span class="context-divider" aria-hidden="true"></span>
            <span>星期一，8 月 3 日</span>
          </div>
          <h1>今天</h1>
          <p>{{ pendingCount }} 项待办，先完成最重要的一件。</p>
        </div>
        <div class="header-actions">
          <button
            class="sync-button"
            :class="{ syncing }"
            type="button"
            :aria-label="syncing ? '停止同步预览' : '开始同步预览'"
            @click.stop="toggleSync"
          >
            <span class="status-dot" aria-hidden="true"></span>
            <span>{{ syncing ? '同步中' : '已保存' }}</span>
          </button>
          <button class="primary-button" type="button" @click.stop="openComposer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            新增任务
          </button>
        </div>
      </header>

      <nav class="view-tabs" aria-label="任务视图" role="tablist">
        <button
          class="view-tab"
          :class="{ active: selectedFilter === 'all' }"
          type="button"
          role="tab"
          :aria-selected="selectedFilter === 'all'"
          @click="setFilter('all')"
        >
          全部
          <span>{{ tasks.length }}</span>
        </button>
        <button
          class="view-tab"
          :class="{ active: selectedFilter === 'today' }"
          type="button"
          role="tab"
          :aria-selected="selectedFilter === 'today'"
          @click="setFilter('today')"
        >
          今天
          <span>{{ todayTasks.length }}</span>
        </button>
        <button
          class="view-tab"
          :class="{ active: selectedFilter === 'planned' }"
          type="button"
          role="tab"
          :aria-selected="selectedFilter === 'planned'"
          @click="setFilter('planned')"
        >
          计划
          <span>{{ tasks.filter((task) => task.section === 'later').length }}</span>
        </button>
      </nav>

      <div class="workspace-grid">
        <div class="main-column">
          <section class="date-panel" aria-labelledby="date-heading">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">安排</span>
                <h2 id="date-heading">日期</h2>
              </div>
              <button
                class="text-button"
                type="button"
                @click="
                  selectedDate = '今天';
                  selectedFilter = 'today';
                "
              >
                回到今天
              </button>
            </div>
            <div class="date-rail" role="tablist" aria-label="日期筛选">
              <button
                v-for="item in dateItems"
                :key="item.label"
                class="date-item"
                :class="{ active: selectedDate === item.value }"
                type="button"
                role="tab"
                :aria-selected="selectedDate === item.value"
                @click="selectDate(item.value)"
              >
                <span>{{ item.day }}</span>
                <strong>{{ item.label }}</strong>
              </button>
            </div>
          </section>

          <section class="task-panel" aria-labelledby="task-heading">
            <div class="panel-heading task-heading">
              <div>
                <span class="section-kicker">清单</span>
                <h2 id="task-heading">任务</h2>
              </div>
              <div class="filter-wrap" @click.stop>
                <button
                  class="outline-button"
                  type="button"
                  :aria-expanded="filterOpen"
                  @click="filterOpen = !filterOpen"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 6h16M7 12h10M10 18h4" />
                  </svg>
                  {{ filterLabel }}
                  <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m7 10 5 5 5-5" />
                  </svg>
                </button>
                <div v-if="filterOpen" class="dropdown-panel" role="menu">
                  <button type="button" role="menuitem" @click="setFilter('all')">全部任务</button>
                  <button type="button" role="menuitem" @click="setFilter('today')">
                    今天待办
                  </button>
                  <button type="button" role="menuitem" @click="setFilter('planned')">
                    之后计划
                  </button>
                </div>
              </div>
            </div>

            <div v-if="taskGroups.length" class="task-groups">
              <section v-for="group in taskGroups" :key="group.key" class="task-group">
                <div class="group-heading">
                  <span>{{ group.label }}</span>
                  <span>{{ group.hint }} · {{ group.tasks.length }}</span>
                </div>
                <div class="task-list">
                  <article
                    v-for="task in group.tasks"
                    :key="task.id"
                    class="task-row"
                    :class="{ completed: task.completed }"
                  >
                    <button
                      class="check-button"
                      :class="{ complete: task.completed }"
                      type="button"
                      :aria-label="task.completed ? '标记为未完成' : '标记为完成'"
                      @click="toggleTask(task)"
                    >
                      <svg v-if="task.completed" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m5 12 4 4L19 6" />
                      </svg>
                    </button>
                    <div class="task-copy">
                      <div class="task-title-line">
                        <h3>{{ task.title }}</h3>
                        <span v-if="task.important" class="important-badge">重要</span>
                      </div>
                      <div class="task-meta">
                        <span class="meta-item">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="3" y="4" width="18" height="17" rx="2" />
                            <path d="M16 2v4M8 2v4M3 10h18" />
                          </svg>
                          {{ task.due }}
                        </span>
                        <span class="meta-item tag">{{ task.tag }}</span>
                      </div>
                    </div>
                    <div class="action-wrap" @click.stop>
                      <button
                        class="more-button"
                        type="button"
                        aria-label="打开任务操作"
                        :aria-expanded="actionsFor === task.id"
                        @click="actionsFor = actionsFor === task.id ? null : task.id"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="5" cy="12" r="1" />
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="19" cy="12" r="1" />
                        </svg>
                      </button>
                      <div
                        v-if="actionsFor === task.id"
                        class="dropdown-panel action-panel"
                        role="menu"
                      >
                        <button type="button" role="menuitem" @click="toggleTask(task)">
                          {{ task.completed ? '标记未完成' : '标记完成' }}
                        </button>
                        <button type="button" role="menuitem" @click="deleteTask(task.id)">
                          移除任务
                        </button>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>
              <h3>这里暂时没有任务</h3>
              <p>把下一件想做的事写下来。</p>
              <button class="outline-button" type="button" @click.stop="openComposer">
                新增任务
              </button>
            </div>
          </section>
        </div>

        <aside class="side-column" aria-label="今日摘要">
          <section class="summary-card">
            <div class="summary-heading">
              <div>
                <span class="section-kicker">今日摘要</span>
                <h2>完成进度</h2>
              </div>
              <span class="progress-value">{{ progress }}%</span>
            </div>
            <div class="progress-number">
              <strong>{{ todayCompleted }}</strong>
              <span>/ {{ todayTasks.length }} 项已完成</span>
            </div>
            <div class="progress-track" aria-hidden="true">
              <span :style="{ width: progress + '%' }"></span>
            </div>
            <p class="summary-copy">
              {{ todayTasks.length - todayCompleted }} 项待处理，保持节奏就好。
            </p>
          </section>

          <section class="summary-card quick-card">
            <div class="summary-heading">
              <div>
                <span class="section-kicker">快速查看</span>
                <h2>切换清单</h2>
              </div>
            </div>
            <button class="quick-action" type="button" @click="setFilter('today')">
              <span class="quick-icon today-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h5" /></svg>
              </span>
              <span><strong>今天待办</strong><small>优先处理当前事项</small></span>
              <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </button>
            <button class="quick-action" type="button" @click="setFilter('planned')">
              <span class="quick-icon plan-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
              </span>
              <span><strong>之后计划</strong><small>把注意力留给今天</small></span>
              <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </button>
          </section>

          <p class="prototype-disclaimer">这是浏览器预览，数据只保存在当前页面。</p>
        </aside>
      </div>
    </div>

    <div v-if="composerOpen" class="modal-layer" @click.self="closeComposer">
      <section
        class="composer-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="composer-title"
      >
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-heading">
          <div>
            <span class="section-kicker">新建任务</span>
            <h2 id="composer-title">添加一项任务</h2>
          </div>
          <button
            class="icon-button"
            type="button"
            aria-label="关闭新增任务"
            @click="closeComposer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <form class="composer-form" @submit.prevent="saveTask">
          <label for="preview-task-title">任务标题</label>
          <input
            id="preview-task-title"
            ref="titleInput"
            v-model="draftTitle"
            class="text-input title-input"
            placeholder="例如：整理本周项目计划"
            autocomplete="off"
          />
          <div class="field-grid">
            <label>
              截止日期
              <select v-model="draftDate" class="text-input">
                <option>今天</option>
                <option>明天</option>
                <option>周末</option>
              </select>
            </label>
            <label>
              标签
              <select v-model="draftTag" class="text-input">
                <option>工作</option>
                <option>生活</option>
                <option>阅读</option>
              </select>
            </label>
          </div>
          <div class="switch-list">
            <label class="switch-row">
              <span><strong>重要任务</strong><small>在清单中更醒目</small></span>
              <input v-model="draftImportant" type="checkbox" />
            </label>
            <label class="switch-row">
              <span><strong>置顶</strong><small>保持在列表前面</small></span>
              <input v-model="draftPinned" type="checkbox" />
            </label>
            <label class="switch-row">
              <span><strong>每日重复</strong><small>每天自动生成一项</small></span>
              <input v-model="draftDaily" type="checkbox" />
            </label>
          </div>
          <div class="sheet-actions">
            <button class="outline-button wide-button" type="button" @click="closeComposer">
              取消
            </button>
            <button class="primary-button wide-button" type="submit" :disabled="!draftTitle.trim()">
              保存任务
            </button>
          </div>
        </form>
      </section>
    </div>

    <Transition name="notice">
      <div v-if="notice" class="notice" role="status">{{ notice }}</div>
    </Transition>
  </main>
</template>

<style scoped>
.preview-page {
  --preview-background: #f7f7f5;
  --preview-surface: #ffffff;
  --preview-surface-muted: #f4f4f1;
  --preview-ink: #242424;
  --preview-muted: #73736f;
  --preview-border: #e5e5df;
  --preview-primary: #236b5f;
  --preview-primary-soft: #e3f1ed;
  --preview-warning: #a75c20;
  min-height: 100%;
  padding: 18px 20px 96px;
  color: var(--preview-ink);
  background: var(--preview-background);
}

.preview-shell {
  max-width: 960px;
  margin: 0 auto;
}

.preview-note {
  width: fit-content;
  margin-bottom: 22px;
  padding: 4px 8px;
  border: 1px solid #b9dcd3;
  border-radius: 5px;
  color: var(--preview-primary);
  background: var(--preview-primary-soft);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.workspace-header,
.header-actions,
.context-line,
.view-tabs,
.panel-heading,
.summary-heading,
.task-title-line,
.task-meta,
.meta-item,
.quick-action,
.sheet-heading,
.sheet-actions,
.switch-row {
  display: flex;
  align-items: center;
}

.workspace-header,
.panel-heading,
.summary-heading,
.task-title-line,
.quick-action,
.sheet-heading,
.switch-row {
  justify-content: space-between;
}

.workspace-header {
  gap: 24px;
  margin-bottom: 24px;
}

.context-line {
  gap: 9px;
  color: var(--preview-muted);
  font-size: 12px;
}

.context-label {
  color: var(--preview-primary);
  font-weight: 700;
}

.context-divider {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #b7b7b1;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.15;
}

h2 {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

h3 {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.header-copy > p {
  margin-top: 6px;
  color: var(--preview-muted);
  font-size: 13px;
}

.header-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
  touch-action: manipulation;
}

button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--preview-primary);
  outline-offset: 2px;
}

.sync-button,
.outline-button,
.primary-button,
.text-button,
.view-tab,
.more-button,
.icon-button,
.quick-action {
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.sync-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--preview-border);
  border-radius: 7px;
  color: var(--preview-muted);
  background: var(--preview-surface);
  font-size: 12px;
  font-weight: 600;
}

.sync-button:hover,
.sync-button:focus-visible {
  border-color: #b9dcd3;
  color: var(--preview-primary);
  background: var(--preview-primary-soft);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--preview-primary);
}

.sync-button.syncing .status-dot {
  animation: pulse 1s ease-in-out infinite;
}

.primary-button,
.outline-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 13px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
}

.primary-button {
  border: 1px solid var(--preview-primary);
  color: #fff;
  background: var(--preview-primary);
}

.primary-button:hover,
.primary-button:focus-visible {
  background: #1b574e;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.primary-button svg,
.outline-button svg,
.meta-item svg,
.more-button svg,
.quick-action svg,
.icon-button svg,
.empty-icon svg {
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
  margin-bottom: 18px;
  padding: 4px;
  border: 1px solid var(--preview-border);
  border-radius: 8px;
  background: var(--preview-surface-muted);
}

.view-tab {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  border: 0;
  border-radius: 6px;
  color: var(--preview-muted);
  background: transparent;
  font-size: 13px;
  font-weight: 600;
}

.view-tab span {
  color: #9a9a93;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.view-tab:hover,
.view-tab.active {
  color: var(--preview-ink);
  background: var(--preview-surface);
  box-shadow: 0 1px 2px rgba(36, 36, 36, 0.05);
}

.view-tab.active span {
  color: var(--preview-primary);
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  align-items: start;
  gap: 16px;
}

.main-column,
.side-column {
  display: grid;
  gap: 16px;
}

.date-panel,
.task-panel,
.summary-card {
  border: 1px solid var(--preview-border);
  border-radius: 9px;
  background: var(--preview-surface);
}

.date-panel,
.task-panel,
.summary-card {
  padding: 18px;
}

.panel-heading,
.summary-heading {
  gap: 12px;
}

.section-kicker {
  color: var(--preview-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.text-button {
  min-height: 40px;
  padding: 0 2px;
  border: 0;
  color: var(--preview-primary);
  background: transparent;
  font-size: 12px;
  font-weight: 600;
}

.text-button:hover,
.text-button:focus-visible {
  color: #1b574e;
}

.date-rail {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-top: 15px;
}

.date-item {
  display: grid;
  min-height: 58px;
  padding: 7px 4px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 7px;
  color: var(--preview-muted);
  background: var(--preview-surface-muted);
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease;
}

.date-item span {
  font-size: 11px;
}

.date-item strong {
  margin-top: 3px;
  color: inherit;
  font-size: 12px;
  font-weight: 650;
}

.date-item:hover,
.date-item:focus-visible,
.date-item.active {
  border-color: #a9d3c9;
  color: var(--preview-primary);
  background: var(--preview-primary-soft);
}

.task-heading {
  margin-bottom: 18px;
}

.filter-wrap,
.action-wrap {
  position: relative;
}

.outline-button {
  border: 1px solid var(--preview-border);
  color: var(--preview-ink);
  background: var(--preview-surface);
}

.outline-button:hover,
.outline-button:focus-visible {
  border-color: #bdbdb5;
  background: var(--preview-surface-muted);
}

.outline-button .chevron {
  width: 14px;
  height: 14px;
  margin-left: 1px;
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 7px);
  right: 0;
  z-index: 10;
  display: grid;
  min-width: 142px;
  padding: 4px;
  border: 1px solid var(--preview-border);
  border-radius: 7px;
  background: var(--preview-surface);
  box-shadow: 0 12px 28px rgba(36, 36, 36, 0.12);
}

.dropdown-panel button {
  min-height: 38px;
  padding: 0 10px;
  border: 0;
  border-radius: 5px;
  color: var(--preview-ink);
  background: transparent;
  font-size: 12px;
  text-align: left;
}

.dropdown-panel button:hover,
.dropdown-panel button:focus-visible {
  background: var(--preview-surface-muted);
}

.task-groups {
  display: grid;
  gap: 22px;
}

.group-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--preview-muted);
  font-size: 12px;
  font-weight: 700;
}

.group-heading span:last-child {
  font-size: 11px;
  font-weight: 500;
}

.task-list {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--preview-border);
  border-radius: 7px;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 68px;
  padding: 9px 8px 9px 10px;
  background: var(--preview-surface);
  transition:
    background 160ms ease,
    opacity 160ms ease;
}

.task-row + .task-row {
  border-top: 1px solid var(--preview-border);
}

.task-row:hover {
  background: #fcfcfa;
}

.task-row.completed {
  opacity: 0.56;
}

.task-row.completed h3 {
  text-decoration: line-through;
}

.check-button {
  position: relative;
  display: inline-flex;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: transparent;
}

.check-button::before {
  width: 19px;
  height: 19px;
  border: 1.5px solid #a7a79f;
  border-radius: 50%;
  content: '';
}

.check-button.complete::before {
  border-color: var(--preview-primary);
  background: var(--preview-primary);
}

.check-button svg {
  position: absolute;
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.2;
}

.task-copy {
  min-width: 0;
  flex: 1;
}

.task-title-line {
  justify-content: flex-start;
  gap: 8px;
}

.task-title-line h3 {
  overflow-wrap: anywhere;
}

.important-badge {
  flex: 0 0 auto;
  padding: 3px 6px;
  border-radius: 4px;
  color: var(--preview-warning);
  background: #fff0df;
  font-size: 10px;
  font-weight: 700;
}

.task-meta {
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 5px;
}

.meta-item {
  gap: 4px;
  min-height: 22px;
  color: var(--preview-muted);
  font-size: 11px;
  line-height: 1;
}

.meta-item svg {
  width: 13px;
  height: 13px;
  stroke-width: 1.6;
}

.meta-item.tag {
  padding: 0 6px;
  border-radius: 4px;
  color: var(--preview-primary);
  background: var(--preview-primary-soft);
}

.more-button,
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--preview-muted);
  background: transparent;
}

.more-button {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
}

.more-button:hover,
.more-button:focus-visible {
  border-color: var(--preview-border);
  color: var(--preview-ink);
  background: var(--preview-surface-muted);
}

.action-panel {
  top: 42px;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 46px 20px;
  border: 1px dashed #cfcfc6;
  border-radius: 7px;
  color: var(--preview-muted);
  text-align: center;
}

.empty-state h3 {
  color: var(--preview-ink);
}

.empty-state p,
.summary-copy,
.prototype-disclaimer {
  font-size: 12px;
  line-height: 1.5;
}

.empty-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 7px;
  color: var(--preview-primary);
  background: var(--preview-primary-soft);
}

.summary-card {
  padding: 18px;
}

.summary-heading .progress-value {
  color: var(--preview-primary);
  font-size: 12px;
  font-weight: 700;
}

.progress-number {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 22px;
}

.progress-number strong {
  font-size: 26px;
  letter-spacing: -0.04em;
}

.progress-number span {
  color: var(--preview-muted);
  font-size: 12px;
}

.progress-track {
  height: 7px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--preview-surface-muted);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--preview-primary);
  transition: width 220ms ease;
}

.summary-copy {
  margin-top: 12px;
  color: var(--preview-muted);
}

.quick-card {
  display: grid;
  gap: 12px;
}

.quick-action {
  gap: 9px;
  min-height: 52px;
  padding: 6px 0;
  border: 0;
  color: var(--preview-ink);
  background: transparent;
  text-align: left;
}

.quick-action:hover,
.quick-action:focus-visible {
  color: var(--preview-primary);
}

.quick-action > span:nth-child(2) {
  display: grid;
  flex: 1;
  gap: 2px;
}

.quick-action strong {
  font-size: 12px;
}

.quick-action small {
  color: var(--preview-muted);
  font-size: 11px;
}

.quick-icon {
  display: grid;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 6px;
}

.today-icon {
  color: var(--preview-primary);
  background: var(--preview-primary-soft);
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
  color: #a2a29a;
}

.prototype-disclaimer {
  color: #9a9a93;
}

.modal-layer {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(36, 36, 36, 0.42);
}

.composer-sheet {
  width: min(100%, 560px);
  max-height: min(720px, calc(100dvh - 32px));
  overflow-y: auto;
  padding: 10px 20px 20px;
  border: 1px solid var(--preview-border);
  border-radius: 11px;
  background: var(--preview-surface);
  box-shadow: 0 24px 60px rgba(36, 36, 36, 0.18);
}

.sheet-handle {
  width: 40px;
  height: 4px;
  margin: 0 auto 18px;
  border-radius: 999px;
  background: #d0d0c9;
}

.sheet-heading {
  align-items: flex-start;
  margin-bottom: 22px;
}

.icon-button {
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border-color: var(--preview-border);
  background: var(--preview-surface);
}

.icon-button:hover,
.icon-button:focus-visible {
  color: var(--preview-ink);
  background: var(--preview-surface-muted);
}

.composer-form {
  display: grid;
  gap: 17px;
}

.composer-form > label,
.field-grid label {
  display: grid;
  gap: 7px;
  color: var(--preview-ink);
  font-size: 13px;
  font-weight: 600;
}

.text-input {
  width: 100%;
  min-height: 42px;
  padding: 0 11px;
  border: 1px solid var(--preview-border);
  border-radius: 7px;
  color: var(--preview-ink);
  background: var(--preview-surface);
  font-size: 15px;
}

.text-input::placeholder {
  color: #a0a099;
}

.title-input {
  min-height: 50px;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.switch-list {
  display: grid;
  border-top: 1px solid var(--preview-border);
}

.switch-row {
  gap: 12px;
  min-height: 58px;
  border-bottom: 1px solid var(--preview-border);
}

.switch-row span {
  display: grid;
  gap: 3px;
}

.switch-row small {
  color: var(--preview-muted);
  font-size: 12px;
  font-weight: 400;
}

.switch-row input {
  position: relative;
  width: 40px;
  height: 23px;
  flex: 0 0 40px;
  appearance: none;
  border-radius: 999px;
  background: #d0d0c9;
  cursor: pointer;
  transition: background 160ms ease;
}

.switch-row input::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(36, 36, 36, 0.15);
  content: '';
  transition: transform 160ms ease;
}

.switch-row input:checked {
  background: var(--preview-primary);
}

.switch-row input:checked::after {
  transform: translateX(17px);
}

.sheet-actions {
  gap: 10px;
  margin-top: 5px;
}

.wide-button {
  flex: 1;
}

.notice {
  position: fixed;
  right: 50%;
  bottom: 82px;
  z-index: 40;
  max-width: calc(100vw - 32px);
  padding: 9px 13px;
  border: 1px solid #b9dcd3;
  border-radius: 7px;
  color: #1b574e;
  background: #eff9f6;
  box-shadow: 0 10px 24px rgba(36, 36, 36, 0.12);
  font-size: 12px;
  font-weight: 600;
  transform: translateX(50%);
}

.notice-enter-active,
.notice-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.notice-enter-from,
.notice-leave-to {
  opacity: 0;
  transform: translate(50%, 8px);
}

@keyframes pulse {
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}

@media (max-width: 760px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .side-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .prototype-disclaimer {
    grid-column: 1 / -1;
  }
}

@media (max-width: 560px) {
  .preview-page {
    padding: 14px 12px 88px;
  }

  .workspace-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .header-actions > * {
    flex: 1;
  }

  .date-rail {
    margin: 15px -18px 0;
    padding: 0 18px 3px;
    overflow-x: auto;
    grid-template-columns: repeat(7, 58px);
  }

  .date-panel,
  .task-panel,
  .summary-card {
    padding: 15px;
  }

  .side-column {
    grid-template-columns: 1fr;
  }

  .field-grid {
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

/* Preview-only app chrome: the product name stays present but no longer acts
   as the page's visual headline. Remove this override when the decision is
   absorbed into the real application shell. */
:global(body.preview-shell-mode .top-bar) {
  min-height: 64px !important;
  padding: 12px 20px !important;
  padding-top: calc(12px + env(safe-area-inset-top, 0px)) !important;
  padding-bottom: 12px !important;
}

:global(body.preview-shell-mode .brand) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px !important;
  font-weight: 650 !important;
  letter-spacing: -0.01em;
}

:global(body.preview-shell-mode .brand::before) {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 6px;
  color: #fff;
  background: var(--accent);
  content: 'P';
  font-size: 12px;
  font-weight: 750;
  line-height: 1;
}

:global(body.preview-shell-mode .sync-state) {
  flex: 0 1 auto;
  max-width: 180px;
  margin-left: auto;
  font-size: 12px !important;
}

:global(body.preview-shell-mode .sync-btn) {
  min-width: 40px;
  min-height: 40px;
}

:global(body.preview-shell-mode .sync-btn svg) {
  width: 20px;
  height: 20px;
}
</style>

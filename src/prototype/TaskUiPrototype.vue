<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PrototypeTaskRows, { type PrototypeTask } from './PrototypeTaskRows.vue';
import { todayStr } from '../utils/date';

type VariantId = 'focus' | 'agenda' | 'canvas';

const variants: { id: VariantId; label: string; hint: string }[] = [
  { id: 'focus', label: '聚焦列表', hint: '标题、筛选和新增入口分层' },
  { id: 'agenda', label: '日期优先', hint: '按日期组织今天的行动' },
  { id: 'canvas', label: '留白画布', hint: '用更少的元素突出下一步' },
];

const route = useRoute();
const router = useRouter();
const showPrototypeSwitcher = import.meta.env.DEV;
const prototypeTasks = ref<PrototypeTask[]>([
  {
    id: 1,
    title: '整理本周项目计划',
    date: '今天',
    tag: '工作',
    meta: '09:30',
    important: true,
    completed: false,
  },
  { id: 2, title: '给家人回复消息', date: '今天', tag: '生活', meta: '今天', completed: false },
  {
    id: 3,
    title: '阅读产品反馈并记录决定',
    date: '明天',
    tag: '工作',
    meta: '明天',
    completed: false,
  },
  { id: 4, title: '整理桌面和下载文件', date: '周末', tag: '生活', meta: '周六', completed: true },
]);

const selectedDate = ref('今天');
const selectedTag = ref('全部');
const composerOpen = ref(false);
const datePickerOpen = ref(false);
const optionsOpen = ref(false);
const showTagOptions = ref(false);
const draftTitle = ref('');
const draftDate = ref('今天');
const draftTags = ref<string[]>([]);
const titleInput = ref<HTMLInputElement | null>(null);

const dateRail = computed(() => {
  const today = new Date();
  const todayValue = todayStr();
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  return Array.from({ length: 7 }, (_, index) => {
    const offset = index - 3;
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const value = `${year}-${month}-${day}`;
    return {
      value,
      filterValue:
        value === todayValue ? '今天' : offset === 1 ? '明天' : offset >= 2 ? '周末' : '过去',
      dayName: dayNames[date.getDay()],
      label: value === todayValue ? '今天' : `${month}/${day}`,
    };
  });
});

const selectedRailDate = ref(todayStr());

const currentVariant = computed<VariantId>(() => {
  const value = route.query.variant;
  return variants.some((variant) => variant.id === value) ? (value as VariantId) : 'focus';
});

const currentVariantInfo = computed(
  () => variants.find((variant) => variant.id === currentVariant.value) ?? variants[0],
);

const visibleTasks = computed(() =>
  prototypeTasks.value.filter((task) => {
    const dateMatches = selectedDate.value === '全部' || task.date === selectedDate.value;
    const tagMatches = selectedTag.value === '全部' || task.tag === selectedTag.value;
    return dateMatches && tagMatches;
  }),
);

const pendingCount = computed(() => prototypeTasks.value.filter((task) => !task.completed).length);

const filteredPendingCount = computed(
  () => visibleTasks.value.filter((task) => !task.completed).length,
);

function isVariant(value: unknown): value is VariantId {
  return variants.some((variant) => variant.id === value);
}

function selectVariant(id: VariantId) {
  router.replace({ query: { ...route.query, variant: id } });
}

function cycleVariant(direction: -1 | 1) {
  const currentIndex = variants.findIndex((variant) => variant.id === currentVariant.value);
  const nextIndex = (currentIndex + direction + variants.length) % variants.length;
  selectVariant(variants[nextIndex].id);
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (
    target?.matches('input, textarea, [contenteditable="true"]') ||
    (!isVariant(route.query.variant) && route.query.variant !== undefined)
  ) {
    return;
  }
  if (event.key === 'ArrowLeft') cycleVariant(-1);
  if (event.key === 'ArrowRight') cycleVariant(1);
  if (event.key === 'Escape' && datePickerOpen.value) datePickerOpen.value = false;
}

function openComposer() {
  composerOpen.value = true;
  nextTick(() => titleInput.value?.focus());
}

function closeComposer() {
  composerOpen.value = false;
  datePickerOpen.value = false;
  optionsOpen.value = false;
  draftTitle.value = '';
  draftDate.value = '今天';
  draftTags.value = [];
}

function saveDraft() {
  const title = draftTitle.value.trim();
  if (!title) {
    titleInput.value?.focus();
    return;
  }
  prototypeTasks.value.unshift({
    id: Date.now(),
    title,
    date: draftDate.value,
    tag: draftTags.value[0] ?? '未分类',
    meta: draftDate.value,
    completed: false,
  });
  closeComposer();
}

function toggleTask(task: PrototypeTask) {
  task.completed = !task.completed;
}

function selectDate(date: string) {
  selectedDate.value = date;
}

function selectRailDate(date: (typeof dateRail.value)[number]) {
  selectedRailDate.value = date.value;
  selectedDate.value = date.filterValue;
}

function selectTag(tag: string) {
  selectedTag.value = tag;
}

function toggleDraftTag(tag: string) {
  draftTags.value = draftTags.value.includes(tag)
    ? draftTags.value.filter((item) => item !== tag)
    : [...draftTags.value, tag];
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <main class="prototype-page">
    <div v-if="currentVariant !== 'focus'" class="prototype-mark" aria-label="仅供开发预览">
      PROTOTYPE · 仅供开发预览
    </div>

    <section v-if="currentVariant === 'focus'" class="variant variant-focus">
      <header class="focus-header">
        <div>
          <p class="eyebrow">今天 · 8 月 3 日</p>
          <h1>全部任务</h1>
          <p class="header-summary">{{ pendingCount }} 项待办 · 2 项已过期</p>
        </div>
        <button class="icon-button" aria-label="更多任务视图" title="更多任务视图">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
        </button>
      </header>

      <nav class="date-rail" aria-label="日期筛选">
        <button
          v-for="date in dateRail"
          :key="date.value"
          class="date-pill"
          :class="{ active: selectedRailDate === date.value }"
          @click="selectRailDate(date)"
        >
          <span>{{ date.dayName }}</span>
          <small>{{ date.label }}</small>
        </button>
      </nav>

      <div class="filter-row" aria-label="标签筛选">
        <span class="filter-label">筛选</span>
        <button
          class="filter-chip"
          :class="{ selected: selectedTag === '全部' }"
          @click="selectTag('全部')"
        >
          全部
        </button>
        <button class="filter-chip add-filter" @click="showTagOptions = !showTagOptions">
          + 标签
        </button>
        <template v-if="showTagOptions">
          <button
            v-for="tag in ['工作', '生活']"
            :key="tag"
            class="filter-chip"
            :class="{ selected: selectedTag === tag }"
            @click="selectTag(tag)"
          >
            {{ tag }}
          </button>
        </template>
      </div>

      <PrototypeTaskRows :tasks="visibleTasks" @toggle="toggleTask" />
    </section>

    <section v-else-if="currentVariant === 'agenda'" class="variant variant-agenda">
      <header class="agenda-header">
        <div>
          <p class="eyebrow">行动清单</p>
          <h1>今天</h1>
          <p class="header-summary">{{ filteredPendingCount }} 项还需要你的注意</p>
        </div>
        <div class="agenda-progress" aria-label="今日完成进度">
          <strong>1/4</strong>
          <span>完成</span>
        </div>
      </header>

      <div class="agenda-date-switcher">
        <button class="small-arrow" aria-label="前一天">←</button>
        <button class="agenda-date active" @click="selectDate('今天')">
          <strong>周一</strong><span>8 月 3 日</span>
        </button>
        <button class="agenda-date" @click="selectDate('明天')">
          <strong>周二</strong><span>8 月 4 日</span>
        </button>
        <button class="small-arrow" aria-label="后一天">→</button>
      </div>

      <div class="agenda-list">
        <div class="agenda-label"><span>上午</span><span>2 项</span></div>
        <PrototypeTaskRows :tasks="visibleTasks.slice(0, 2)" compact @toggle="toggleTask" />
        <div class="agenda-label"><span>稍后</span><span>1 项</span></div>
        <PrototypeTaskRows :tasks="visibleTasks.slice(2)" compact @toggle="toggleTask" />
      </div>
    </section>

    <section v-else class="variant variant-canvas">
      <header class="canvas-header">
        <div class="canvas-logo"><span></span><span></span><span></span></div>
        <button class="icon-button" aria-label="打开任务筛选" title="打开任务筛选">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4" /></svg>
        </button>
      </header>
      <div class="canvas-intro">
        <p class="eyebrow">{{ pendingCount }} 项还未完成</p>
        <h1>把注意力<br /><em>留给下一步。</em></h1>
        <p>清楚地写下要做的事，其他内容会保持安静。</p>
      </div>
      <div class="canvas-next-task">
        <span class="section-caption">下一步</span>
        <PrototypeTaskRows :tasks="visibleTasks.slice(0, 1)" @toggle="toggleTask" />
      </div>
    </section>

    <button class="quick-add" @click="openComposer">
      <span class="plus-icon" aria-hidden="true">+</span>
      <span>快速添加任务</span>
    </button>

    <div
      v-if="composerOpen || datePickerOpen"
      class="prototype-backdrop"
      aria-hidden="true"
      @click="closeComposer"
    ></div>

    <Transition name="sheet">
      <section v-if="composerOpen" class="composer-sheet" aria-label="新增任务" role="dialog">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-heading">
          <div>
            <p class="eyebrow">新建任务</p>
            <h2>把下一步写下来</h2>
          </div>
          <button class="icon-button" aria-label="关闭新增任务" @click="closeComposer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <form @submit.prevent="saveDraft">
          <label class="field-label" for="prototype-task-title">任务标题</label>
          <input
            id="prototype-task-title"
            ref="titleInput"
            v-model="draftTitle"
            class="title-input"
            placeholder="例如：整理本周项目计划"
            autocomplete="off"
          />

          <div class="composer-tools" aria-label="任务选项">
            <button type="button" class="tool-button" @click="datePickerOpen = true">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
              <span>{{ draftDate }}</span>
            </button>
            <button type="button" class="tool-button" @click="optionsOpen = !optionsOpen">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
                <circle cx="8" cy="7" r="2" />
                <circle cx="15" cy="12" r="2" />
                <circle cx="11" cy="17" r="2" />
              </svg>
              <span>更多</span>
            </button>
          </div>

          <div v-if="optionsOpen" class="option-panel">
            <p class="field-label">标签</p>
            <div class="option-chips">
              <button
                v-for="tag in ['工作', '生活', '阅读']"
                :key="tag"
                type="button"
                class="option-chip"
                :class="{ selected: draftTags.includes(tag) }"
                @click="toggleDraftTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
            <div class="option-toggles">
              <span>重要</span><span>置顶</span><span>每日重复</span>
            </div>
          </div>

          <div class="sheet-actions">
            <button type="button" class="secondary-button" @click="closeComposer">取消</button>
            <button type="submit" class="primary-button" :disabled="!draftTitle.trim()">
              保存任务
            </button>
          </div>
        </form>
      </section>
    </Transition>

    <Transition name="dialog">
      <section v-if="datePickerOpen" class="date-picker" aria-label="选择截止日期" role="dialog">
        <div class="sheet-heading">
          <div>
            <p class="eyebrow">截止日期</p>
            <h2>什么时候完成？</h2>
          </div>
          <button class="icon-button" aria-label="关闭日期选择" @click="datePickerOpen = false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div class="date-wheel" role="listbox" aria-label="截止日期选项">
          <button
            v-for="date in ['昨天', '今天', '明天', '周末', '下周一']"
            :key="date"
            class="wheel-item"
            :class="{ selected: draftDate === date }"
            role="option"
            :aria-selected="draftDate === date"
            @click="draftDate = date"
          >
            {{ date }}
          </button>
        </div>
        <div class="sheet-actions">
          <button class="secondary-button" @click="datePickerOpen = false">取消</button>
          <button class="primary-button" @click="datePickerOpen = false">确定</button>
        </div>
      </section>
    </Transition>

    <nav
      v-if="showPrototypeSwitcher && currentVariant !== 'focus'"
      class="prototype-switcher"
      aria-label="原型变体切换"
    >
      <button aria-label="上一个变体" @click="cycleVariant(-1)">←</button>
      <span>{{ currentVariant.toUpperCase() }} · {{ currentVariantInfo.label }}</span>
      <button aria-label="下一个变体" @click="cycleVariant(1)">→</button>
    </nav>
  </main>
</template>

<style scoped>
.prototype-page {
  --prototype-ink: #152b2a;
  --prototype-muted: #6e8580;
  --prototype-soft: #eef5f3;
  --prototype-surface: #ffffff;
  --prototype-border: #d9e8e4;
  --prototype-accent: #0d9488;
  --prototype-accent-dark: #0f766e;
  --prototype-shadow: 0 18px 60px rgba(21, 65, 60, 0.13);
  min-height: 100%;
  padding: 24px max(20px, calc((100vw - 720px) / 2)) 112px;
  color: var(--prototype-ink);
  background: #ffffff;
}

.prototype-mark {
  width: fit-content;
  margin-bottom: 30px;
  padding: 6px 10px;
  border: 1px solid #b9d8d1;
  border-radius: 999px;
  color: var(--prototype-accent-dark);
  background: #e6f5f1;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.variant {
  min-height: 560px;
}
.eyebrow {
  margin: 0 0 8px;
  color: var(--prototype-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
h1,
h2,
p {
  margin: 0;
}
h1 {
  font-size: clamp(36px, 8vw, 58px);
  letter-spacing: -0.055em;
  line-height: 0.98;
}
h2 {
  font-size: 26px;
  letter-spacing: -0.04em;
}
.header-summary {
  margin-top: 13px;
  color: var(--prototype-muted);
  font-size: 15px;
}

.focus-header,
.agenda-header,
.canvas-header,
.sheet-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.focus-header {
  margin-bottom: 24px;
}
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border: 1px solid var(--prototype-border);
  border-radius: 16px;
  color: var(--prototype-ink);
  background: transparent;
  cursor: pointer;
  transition:
    background 180ms ease,
    transform 180ms ease;
}
.icon-button:hover,
.icon-button:focus-visible {
  background: var(--prototype-soft);
}
.icon-button:active {
  transform: scale(0.95);
}
.icon-button svg,
.tool-button svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.date-rail {
  display: flex;
  gap: 7px;
  margin: 0 -4px 20px;
  overflow-x: auto;
  padding: 4px;
  scrollbar-width: none;
}
.date-rail::-webkit-scrollbar {
  display: none;
}
.date-pill,
.filter-chip,
.option-chip {
  border: 1px solid var(--prototype-border);
  border-radius: 999px;
  color: var(--prototype-muted);
  background: var(--prototype-surface);
  cursor: pointer;
}
.date-pill {
  min-width: 64px;
  min-height: 64px;
  padding: 8px 10px;
  border-radius: 18px;
  text-align: center;
}
.date-pill span,
.date-pill small {
  display: block;
}
.date-pill span {
  color: var(--prototype-ink);
  font-size: 14px;
  font-weight: 700;
}
.date-pill small {
  margin-top: 3px;
  color: var(--prototype-muted);
  font-size: 14px;
}
.date-pill.active {
  border-color: var(--prototype-accent);
  color: var(--prototype-accent-dark);
  background: #f0fdfa;
  box-shadow: none;
}
.date-pill.active span,
.date-pill.active small {
  color: var(--prototype-accent-dark);
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 25px;
  overflow-x: auto;
  scrollbar-width: none;
}
.filter-row::-webkit-scrollbar {
  display: none;
}
.filter-label {
  margin-right: 2px;
  color: var(--prototype-muted);
  font-size: 13px;
}
.filter-chip {
  min-height: 44px;
  padding: 0 15px;
  font-size: 13px;
}
.filter-chip.selected {
  border-color: #b8ded6;
  color: var(--prototype-accent-dark);
  background: #e7f6f2;
  font-weight: 700;
}
.filter-chip.add-filter {
  border-style: dashed;
}

.task-rows {
  display: grid;
  gap: 10px;
}
.task-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 60px;
  padding: 8px 6px 8px 8px;
  border: 1px solid var(--prototype-border);
  border-radius: 20px;
  background: var(--prototype-surface);
  box-shadow: 0 5px 18px rgba(21, 65, 60, 0.04);
  transition:
    border-color 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}
.task-row:hover {
  border-color: #a8d3ca;
  box-shadow: 0 10px 24px rgba(21, 65, 60, 0.08);
  transform: translateY(-1px);
}
.task-row.completed {
  opacity: 0.56;
}
.task-row.completed strong {
  text-decoration: line-through;
}
.task-check {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border: 0;
  border-radius: 50%;
  color: transparent;
  background: transparent;
  font-size: 0;
  cursor: pointer;
}
.task-check::before {
  width: 20px;
  height: 20px;
  border: 2px solid #b7cec9;
  border-radius: 50%;
  content: '';
}
.task-row.completed .task-check {
  color: white;
}
.task-row.completed .task-check::before {
  border-color: var(--prototype-accent);
  background: var(--prototype-accent);
}
.task-row.completed .task-check::after {
  position: absolute;
  color: white;
  content: '✓';
  font-size: 15px;
  font-weight: 700;
}
.task-copy {
  min-width: 0;
  flex: 1;
}
.task-copy strong {
  display: block;
  overflow: hidden;
  color: var(--prototype-ink);
  font-size: 16px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  color: var(--prototype-muted);
  font-size: 12px;
}
.task-meta span {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--prototype-soft);
}
.task-meta .task-tag {
  color: var(--prototype-accent-dark);
  background: #e3f5f1;
}
.task-meta .task-important {
  color: #a45116;
  background: #fff0df;
}
.task-more {
  width: 44px;
  height: 44px;
  border: 0;
  color: var(--prototype-muted);
  background: transparent;
  font-size: 18px;
  letter-spacing: 2px;
  cursor: pointer;
}
.prototype-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 80px 20px;
  color: var(--prototype-muted);
  text-align: center;
}
.prototype-empty strong {
  color: var(--prototype-ink);
  font-size: 17px;
}
.prototype-empty span {
  font-size: 13px;
}
.empty-mark {
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  margin-bottom: 10px;
  border: 1px solid #bddbd4;
  border-radius: 22px;
  color: var(--prototype-accent);
  background: #e7f6f2;
  font-size: 36px;
}

.variant-agenda {
  max-width: 620px;
  margin: 0 auto;
}
.agenda-header {
  align-items: end;
  margin-bottom: 28px;
}
.agenda-progress {
  display: grid;
  justify-items: end;
  color: var(--prototype-muted);
}
.agenda-progress strong {
  color: var(--prototype-accent-dark);
  font-size: 30px;
  letter-spacing: -0.05em;
}
.agenda-progress span {
  font-size: 12px;
}
.agenda-date-switcher {
  display: grid;
  grid-template-columns: 48px 1fr 1fr 48px;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 30px;
}
.small-arrow {
  border: 1px solid var(--prototype-border);
  border-radius: 16px;
  color: var(--prototype-accent-dark);
  background: var(--prototype-surface);
  font-size: 20px;
  cursor: pointer;
}
.agenda-date {
  display: grid;
  gap: 4px;
  padding: 13px;
  border: 1px solid var(--prototype-border);
  border-radius: 18px;
  color: var(--prototype-muted);
  background: var(--prototype-surface);
  text-align: left;
  cursor: pointer;
}
.agenda-date strong {
  color: var(--prototype-ink);
  font-size: 15px;
}
.agenda-date span {
  font-size: 12px;
}
.agenda-date.active {
  border-color: var(--prototype-accent);
  background: #e7f6f2;
}
.agenda-label {
  display: flex;
  justify-content: space-between;
  margin: 24px 2px 10px;
  color: var(--prototype-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.task-rows.compact .task-row {
  min-height: 64px;
  border-radius: 15px;
  box-shadow: none;
}
.task-rows.compact .task-check {
  width: 44px;
  height: 44px;
  flex-basis: 44px;
}
.task-rows.compact .task-check::before {
  width: 24px;
  height: 24px;
}

.variant-canvas {
  display: flex;
  flex-direction: column;
  min-height: 610px;
}
.canvas-header {
  align-items: center;
}
.canvas-logo {
  display: flex;
  gap: 5px;
}
.canvas-logo span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--prototype-accent);
}
.canvas-logo span:nth-child(2) {
  opacity: 0.6;
}
.canvas-logo span:nth-child(3) {
  opacity: 0.28;
}
.canvas-intro {
  max-width: 520px;
  margin: auto 0;
  padding: 50px 0;
}
.canvas-intro h1 {
  margin-bottom: 20px;
  font-size: clamp(44px, 11vw, 80px);
}
.canvas-intro h1 em {
  color: var(--prototype-accent);
  font-style: normal;
}
.canvas-intro > p:last-child {
  max-width: 300px;
  color: var(--prototype-muted);
  font-size: 16px;
  line-height: 1.6;
}
.canvas-next-task {
  max-width: 520px;
}
.section-caption {
  display: block;
  margin-bottom: 10px;
  color: var(--prototype-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.quick-add {
  position: fixed;
  z-index: 20;
  right: max(0px, calc((100vw - 720px) / 2));
  bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  left: max(0px, calc((100vw - 720px) / 2));
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 80px;
  padding: 12px 20px;
  border: 0;
  border-top: 1px solid var(--prototype-border);
  border-radius: 0;
  color: var(--prototype-muted);
  background: var(--prototype-surface);
  box-shadow: none;
  font-size: 16px;
  font-weight: 400;
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease;
}
.quick-add:hover {
  background: var(--prototype-surface);
}
.quick-add:active {
  transform: scale(0.96);
}
.plus-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  border-radius: 50%;
  color: white;
  background: var(--prototype-accent);
  font-size: 32px;
  font-weight: 400;
  line-height: 1;
}

.quick-add > span:last-child {
  flex: 1;
  min-height: 56px;
  padding: 16px 20px;
  border: 1px solid var(--prototype-border);
  border-radius: 999px;
  background: #f8fbfa;
  text-align: left;
}

.prototype-backdrop {
  position: fixed;
  z-index: 40;
  inset: 0;
  background: rgba(12, 27, 26, 0.5);
  backdrop-filter: blur(2px);
}
.composer-sheet,
.date-picker {
  position: fixed;
  z-index: 50;
  right: 0;
  bottom: 0;
  left: 0;
  max-width: 720px;
  margin: 0 auto;
  padding: 12px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  border: 1px solid rgba(217, 232, 228, 0.7);
  border-bottom: 0;
  border-radius: 28px 28px 0 0;
  color: var(--prototype-ink);
  background: var(--prototype-surface);
  box-shadow: var(--prototype-shadow);
}
.sheet-handle {
  width: 42px;
  height: 4px;
  margin: 0 auto 22px;
  border-radius: 99px;
  background: #c5d7d3;
}
.sheet-heading {
  align-items: center;
  margin-bottom: 24px;
}
.field-label {
  display: block;
  margin-bottom: 8px;
  color: var(--prototype-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.title-input {
  width: 100%;
  min-height: 58px;
  padding: 0 17px;
  border: 1px solid var(--prototype-border);
  border-radius: 17px;
  outline: none;
  color: var(--prototype-ink);
  background: #f7fbfa;
  font: inherit;
  font-size: 16px;
}
.title-input:focus {
  border-color: var(--prototype-accent);
  box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.12);
}
.title-input::placeholder {
  color: #94aaa5;
}
.composer-tools {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}
.tool-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--prototype-border);
  border-radius: 14px;
  color: var(--prototype-accent-dark);
  background: var(--prototype-surface);
  cursor: pointer;
}
.option-panel {
  margin-top: 14px;
  padding: 15px;
  border-radius: 18px;
  background: var(--prototype-soft);
}
.option-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.option-chip {
  min-height: 42px;
  padding: 0 13px;
}
.option-chip.selected {
  border-color: var(--prototype-accent);
  color: white;
  background: var(--prototype-accent);
}
.option-toggles {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  color: var(--prototype-muted);
  font-size: 12px;
}
.option-toggles span {
  padding: 6px 9px;
  border-radius: 9px;
  background: white;
}
.sheet-actions {
  display: flex;
  gap: 10px;
  margin-top: 26px;
}
.secondary-button,
.primary-button {
  min-height: 52px;
  border-radius: 15px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.secondary-button {
  flex: 0 0 96px;
  border: 1px solid var(--prototype-border);
  color: var(--prototype-muted);
  background: var(--prototype-surface);
}
.primary-button {
  flex: 1;
  border: 1px solid var(--prototype-accent);
  color: white;
  background: var(--prototype-accent);
}
.primary-button:disabled {
  border-color: #c7d7d3;
  color: #91a6a1;
  background: #e5eeec;
  cursor: not-allowed;
}
.date-picker {
  max-width: 520px;
  bottom: 16px;
  padding: 24px 20px;
  border-bottom: 1px solid rgba(217, 232, 228, 0.7);
  border-radius: 28px;
}
.date-wheel {
  display: grid;
  gap: 3px;
  margin: 10px 0;
  padding: 5px 0;
  border-top: 1px solid var(--prototype-border);
  border-bottom: 1px solid var(--prototype-border);
}
.wheel-item {
  min-height: 48px;
  border: 0;
  border-radius: 12px;
  color: var(--prototype-muted);
  background: transparent;
  font: inherit;
  font-size: 16px;
  cursor: pointer;
}
.wheel-item.selected {
  color: var(--prototype-accent-dark);
  background: #e7f6f2;
  font-size: 18px;
  font-weight: 700;
}

.prototype-switcher {
  position: fixed;
  z-index: 80;
  bottom: 18px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 44px;
  padding: 4px 7px;
  border: 1px solid #315b55;
  border-radius: 999px;
  color: white;
  background: #173b37;
  box-shadow: 0 8px 24px rgba(11, 37, 34, 0.25);
  transform: translateX(-50%);
}
.prototype-switcher button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  color: white;
  background: rgba(255, 255, 255, 0.12);
  font-size: 17px;
  cursor: pointer;
}
.prototype-switcher span {
  min-width: 116px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.sheet-enter-active,
.sheet-leave-active,
.dialog-enter-active,
.dialog-leave-active {
  transition:
    opacity 220ms ease,
    transform 260ms cubic-bezier(0.2, 0, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

@media (max-width: 520px) {
  .prototype-page {
    padding-right: 16px;
    padding-left: 16px;
  }
  .prototype-mark {
    margin-bottom: 24px;
  }
  .agenda-date-switcher {
    grid-template-columns: 40px 1fr 1fr 40px;
    gap: 5px;
  }
  .agenda-date {
    padding: 11px 9px;
  }
  .quick-add {
    right: 0;
    left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .icon-button,
  .task-row,
  .quick-add,
  .sheet-enter-active,
  .sheet-leave-active,
  .dialog-enter-active,
  .dialog-leave-active {
    transition: none;
  }
}
</style>

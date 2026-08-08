<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { formatDueDate, todayStr } from '../utils/date';

const props = defineProps<{
  availableTags: string[];
}>();

const emit = defineEmits<{
  close: [];
  add: [
    title: string,
    dueDate: string | null,
    tags: string[],
    important: boolean,
    pinned: boolean,
    isDaily: boolean,
  ];
}>();

const title = ref('');
const dueDate = ref<string | null>(todayStr());
const selectedTags = ref<string[]>([]);
const important = ref(false);
const pinned = ref(false);
const isDaily = ref(false);
const showDetails = ref(false);
const showDateOptions = ref(false);
const titleInput = ref<HTMLInputElement | null>(null);
const sheetRef = ref<HTMLElement | null>(null);
const monthCursor = ref(startOfMonth(todayStr()));
let focusTimer: number | undefined;

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];

function startOfMonth(date: string): Date {
  const [year, month] = date.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const monthLabel = computed(
  () => `${monthCursor.value.getFullYear()}年${monthCursor.value.getMonth() + 1}月`,
);

const calendarDays = computed(() => {
  const first = startOfMonth(dateKey(monthCursor.value));
  const mondayOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(
    monthCursor.value.getFullYear(),
    monthCursor.value.getMonth() + 1,
    0,
  ).getDate();
  const cellCount = mondayOffset + daysInMonth > 35 ? 42 : 35;
  const firstVisible = new Date(first);
  firstVisible.setDate(first.getDate() - mondayOffset);

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(firstVisible);
    date.setDate(firstVisible.getDate() + index);
    const key = dateKey(date);
    return {
      date: key,
      day: date.getDate(),
      currentMonth:
        date.getFullYear() === monthCursor.value.getFullYear() &&
        date.getMonth() === monthCursor.value.getMonth(),
      today: key === todayStr(),
    };
  });
});

const dateLabel = computed(() => (dueDate.value ? formatDueDate(dueDate.value) : '未设置日期'));

function closeSheet() {
  emit('close');
}

function selectDate(date: string | null) {
  dueDate.value = date;
  showDateOptions.value = false;
  if (date) monthCursor.value = startOfMonth(date);
}

function changeMonth(offset: number) {
  const next = new Date(monthCursor.value);
  next.setMonth(next.getMonth() + offset);
  monthCursor.value = next;
}

function toggleTag(tag: string) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((item) => item !== tag)
    : [...selectedTags.value, tag];
}

function saveTask() {
  const taskTitle = title.value.trim();
  if (!taskTitle) {
    titleInput.value?.focus();
    return;
  }

  emit(
    'add',
    taskTitle,
    dueDate.value,
    selectedTags.value,
    important.value,
    pinned.value,
    isDaily.value,
  );
}

function ensureTitleVisible(smooth = false) {
  window.clearTimeout(focusTimer);
  focusTimer = window.setTimeout(() => {
    const input = titleInput.value;
    const sheet = sheetRef.value;
    if (!input || !sheet || document.activeElement !== input) return;

    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
    const safePadding = 16;
    const inputRect = input.getBoundingClientRect();
    let scrollDelta = 0;

    if (inputRect.bottom > viewportBottom - safePadding) {
      scrollDelta = inputRect.bottom - (viewportBottom - safePadding);
    } else if (inputRect.top < viewportTop + safePadding) {
      scrollDelta = inputRect.top - (viewportTop + safePadding);
    }

    if (scrollDelta !== 0) {
      sheet.scrollBy({
        top: scrollDelta,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, 80);
}

function handleViewportChange() {
  ensureTitleVisible();
}

function handleTitleFocus() {
  ensureTitleVisible();
}

onMounted(() => {
  nextTick(() => {
    titleInput.value?.focus({ preventScroll: true });
    ensureTitleVisible(true);
  });
  window.visualViewport?.addEventListener('resize', handleViewportChange);
  window.visualViewport?.addEventListener('scroll', handleViewportChange);
  window.addEventListener('resize', handleViewportChange);
});

onUnmounted(() => {
  window.clearTimeout(focusTimer);
  window.visualViewport?.removeEventListener('resize', handleViewportChange);
  window.visualViewport?.removeEventListener('scroll', handleViewportChange);
  window.removeEventListener('resize', handleViewportChange);
});
</script>

<template>
  <div class="composer-layer" @keydown.esc="closeSheet">
    <button class="composer-backdrop" type="button" aria-label="关闭新增任务" @click="closeSheet" />

    <section
      ref="sheetRef"
      class="composer-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-title"
    >
      <div class="sheet-handle" aria-hidden="true"></div>

      <header class="composer-header">
        <div>
          <p class="composer-eyebrow">新建任务</p>
          <h2 id="composer-title">把下一步写下来</h2>
        </div>
        <button class="close-button" type="button" aria-label="关闭新增任务" @click="closeSheet">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <form class="composer-form" @submit.prevent="saveTask">
        <label class="field-label" for="composer-task-title">任务标题</label>
        <input
          id="composer-task-title"
          ref="titleInput"
          v-model="title"
          class="title-input"
          @focus="handleTitleFocus"
          placeholder="例如：整理本周项目计划"
          maxlength="200"
          autocomplete="off"
        />

        <div class="composer-tools" aria-label="任务设置">
          <button
            class="tool-button"
            type="button"
            :aria-expanded="showDateOptions"
            @click="showDateOptions = !showDateOptions"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
            <span>{{ dateLabel }}</span>
          </button>
          <button
            class="tool-button"
            type="button"
            :aria-expanded="showDetails"
            @click="showDetails = !showDetails"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
              <circle cx="8" cy="7" r="2" />
              <circle cx="15" cy="12" r="2" />
              <circle cx="11" cy="17" r="2" />
            </svg>
            <span>{{ showDetails ? '收起' : '更多' }}</span>
          </button>
        </div>

        <div v-if="showDateOptions" class="date-options" aria-label="截止日期选项">
          <div class="calendar-header">
            <button class="month-nav" type="button" aria-label="上个月" @click="changeMonth(-1)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <strong class="month-label">{{ monthLabel }}</strong>
            <button class="month-nav" type="button" aria-label="下个月" @click="changeMonth(1)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div class="weekday-row" role="row">
            <span v-for="weekday in weekdayLabels" :key="weekday" role="columnheader">
              {{ weekday }}
            </span>
          </div>

          <div class="calendar-grid" role="grid" aria-label="选择日期">
            <button
              v-for="day in calendarDays"
              :key="day.date"
              class="calendar-day"
              :class="{
                muted: !day.currentMonth,
                today: day.today,
                selected: dueDate === day.date,
              }"
              type="button"
              role="gridcell"
              :aria-label="day.date"
              :aria-selected="dueDate === day.date"
              @click="selectDate(day.date)"
            >
              {{ day.day }}
            </button>
          </div>

          <div class="calendar-footer">
            <button class="clear-date" type="button" @click="selectDate(null)">清除日期</button>
            <button class="today-date" type="button" @click="selectDate(todayStr())">今天</button>
          </div>
        </div>

        <div v-if="showDetails" class="details-panel">
          <div v-if="props.availableTags.length > 0" class="detail-section">
            <span class="detail-label">标签</span>
            <div class="option-row">
              <button
                v-for="tag in props.availableTags"
                :key="tag"
                class="option-chip"
                type="button"
                :class="{ selected: selectedTags.includes(tag) }"
                @click="toggleTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
          </div>

          <div class="detail-section">
            <span class="detail-label">属性</span>
            <div class="option-row">
              <label class="toggle-option" :class="{ selected: important }">
                <input v-model="important" type="checkbox" />
                <span>重要</span>
              </label>
              <label class="toggle-option" :class="{ selected: pinned }">
                <input v-model="pinned" type="checkbox" />
                <span>置顶</span>
              </label>
              <label class="toggle-option" :class="{ selected: isDaily }">
                <input v-model="isDaily" type="checkbox" />
                <span>每日重复</span>
              </label>
            </div>
          </div>
        </div>

        <footer class="composer-actions">
          <button class="cancel-button" type="button" @click="closeSheet">取消</button>
          <button class="save-button" type="submit" :disabled="!title.trim()">保存任务</button>
        </footer>
      </form>
    </section>
  </div>
</template>

<style scoped>
.composer-layer {
  position: fixed;
  z-index: 100;
  top: 0;
  right: 0;
  left: 0;
  height: max(0px, calc(var(--viewport-height, 100dvh) - var(--native-keyboard-inset, 0px)));
  max-height: 100%;
  pointer-events: none;
  transition: height 180ms ease-out;
}

.composer-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: rgba(15, 23, 42, 0.46);
  pointer-events: auto;
}

.composer-sheet {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  max-width: 720px;
  max-height: calc(100% - var(--space-xl));
  margin: 0 auto;
  padding: var(--space-sm) max(var(--space-xl), env(safe-area-inset-right, 0px))
    calc(var(--space-xl) + env(safe-area-inset-bottom, 0px))
    max(var(--space-xl), env(safe-area-inset-left, 0px));
  overflow-y: auto;
  scroll-padding-top: var(--space-xl);
  scroll-padding-bottom: var(--space-xl);
  border: 1px solid var(--border-light);
  border-bottom: 0;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  background: var(--bg-primary);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
}

.sheet-handle {
  width: 52px;
  height: 4px;
  margin: 0 auto var(--space-xl);
  border-radius: var(--radius-full);
  background: var(--accent-muted);
}

.composer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.composer-eyebrow,
.field-label,
.detail-label {
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
}

.composer-eyebrow {
  margin-bottom: var(--space-xs);
  color: var(--accent);
}

.composer-header h2 {
  color: var(--text-primary);
  font-size: clamp(24px, 6vw, 32px);
  letter-spacing: -0.04em;
  line-height: 1.15;
}

.close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  background: transparent;
  cursor: pointer;
}

.close-button svg,
.tool-button svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.composer-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}

.title-input {
  width: 100%;
  min-height: 64px;
  padding: 0 var(--space-lg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  background: var(--bg-secondary);
  font-size: var(--text-base);
  outline: none;
}

.title-input:focus {
  border-color: var(--accent);
}

.title-input::placeholder {
  color: var(--text-muted);
}

.composer-tools,
.option-row,
.composer-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.composer-tools {
  flex-wrap: wrap;
}

.tool-button,
.option-chip,
.toggle-option,
.clear-date {
  min-height: 48px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  color: var(--accent);
  background: var(--bg-primary);
  cursor: pointer;
}

.tool-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0 var(--space-md);
  font-size: var(--text-sm);
}

.option-row {
  flex-wrap: wrap;
}

.details-panel {
  padding: var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
}

.option-chip,
.toggle-option,
.clear-date {
  padding: 0 var(--space-md);
  font-size: var(--text-sm);
}

.date-option.selected,
.option-chip.selected,
.toggle-option.selected {
  border-color: var(--accent);
  color: var(--accent-hover);
  background: var(--accent-light);
}

.date-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
}

.calendar-header,
.weekday-row,
.calendar-grid,
.calendar-footer {
  grid-column: 1 / -1;
}

.calendar-header,
.calendar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.calendar-header {
  min-height: 44px;
}

.month-label {
  color: var(--text-primary);
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
}

.month-nav {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
}

.month-nav:hover,
.month-nav:focus-visible {
  color: var(--accent);
  background: var(--accent-light);
}

.month-nav svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.weekday-row,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}

.weekday-row {
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-align: center;
}

.weekday-row span {
  display: grid;
  min-height: 28px;
  place-items: center;
}

.calendar-day {
  display: grid;
  min-height: 44px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  background: transparent;
  font-size: var(--text-sm);
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.calendar-day:hover,
.calendar-day:focus-visible {
  border-color: var(--accent-muted);
  color: var(--accent);
  background: var(--accent-light);
}

.calendar-day.muted {
  color: var(--text-disabled);
}

.calendar-day.today {
  border-color: var(--accent-muted);
  color: var(--accent);
  font-weight: var(--font-weight-semibold);
}

.calendar-day.selected {
  border-color: var(--accent);
  color: #fff;
  background: var(--accent);
  font-weight: var(--font-weight-semibold);
}

.calendar-day.selected.today {
  color: #fff;
}

.calendar-footer {
  margin-top: var(--space-xs);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-light);
}

.clear-date {
  border: 0;
  color: var(--text-muted);
  background: transparent;
}

.clear-date,
.today-date {
  min-height: 44px;
  padding: 0 var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  cursor: pointer;
}

.clear-date:hover,
.clear-date:focus-visible {
  color: var(--danger);
  background: var(--danger-light);
}

.today-date {
  border: 1px solid var(--accent-muted);
  color: var(--accent);
  background: var(--accent-light);
  font-weight: var(--font-weight-semibold);
}

.details-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.toggle-option {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.toggle-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.toggle-option:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.composer-actions {
  margin-top: var(--space-sm);
}

.cancel-button,
.save-button {
  min-height: 56px;
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.cancel-button {
  min-width: 112px;
  padding: 0 var(--space-lg);
  border: 1px solid var(--border-light);
  color: var(--text-secondary);
  background: var(--bg-primary);
}

.save-button {
  flex: 1;
  border: 1px solid var(--accent);
  color: #fff;
  background: var(--accent);
}

.save-button:disabled {
  border-color: var(--border-light);
  color: var(--text-disabled);
  background: var(--bg-tertiary);
  cursor: not-allowed;
}

@media (max-width: 520px) {
  .composer-sheet {
    padding-right: max(var(--space-lg), env(safe-area-inset-right, 0px));
    padding-left: max(var(--space-lg), env(safe-area-inset-left, 0px));
  }

  .composer-header h2 {
    font-size: 26px;
  }
}
</style>

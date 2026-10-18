<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import AppIcon from './AppIcon.vue';
import IosSwitch from './IosSwitch.vue';
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
const showDateOptions = ref(false);
const showTags = ref(false);
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

const dateLabel = computed(() => (dueDate.value ? formatDueDate(dueDate.value) : '无'));
const tagLabel = computed(() => (selectedTags.value.length ? selectedTags.value.join('、') : '无'));

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
    <button class="backdrop" type="button" aria-label="关闭新增任务" @click="closeSheet" />

    <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="composer-title">
      <div class="grabber" aria-hidden="true"></div>

      <header class="sheet-nav">
        <button class="ios-link" type="button" @click="closeSheet">取消</button>
        <span id="composer-title" class="sheet-title">新建任务</span>
        <button class="ios-link strong" type="button" :disabled="!title.trim()" @click="saveTask">
          添加
        </button>
      </header>

      <div ref="sheetRef" class="sheet-body">
        <div class="ios-card title-card">
          <input
            id="composer-task-title"
            ref="titleInput"
            v-model="title"
            class="title-input"
            type="text"
            inputmode="text"
            enterkeyhint="done"
            placeholder="标题"
            maxlength="200"
            autocomplete="off"
            aria-label="任务标题"
            @focus="handleTitleFocus"
            @keyup.enter="saveTask"
          />
        </div>

        <div class="ios-group">
          <div class="ios-card">
            <button
              class="ios-row"
              type="button"
              :aria-expanded="showDateOptions"
              @click="showDateOptions = !showDateOptions"
            >
              <span class="ios-icon"><AppIcon name="calendar" :size="17" /></span>
              <span class="ios-row-main">日期</span>
              <span class="ios-value">{{ dateLabel }}</span>
              <AppIcon
                class="ios-chevron"
                name="chevron"
                :size="13"
                :class="{ rotated: showDateOptions }"
              />
            </button>

            <div v-if="showDateOptions" class="date-panel">
              <div class="calendar-header">
                <button
                  class="month-nav"
                  type="button"
                  aria-label="上个月"
                  @click="changeMonth(-1)"
                >
                  <AppIcon name="chevron" :size="16" :stroke-width="2.2" class="flip" />
                </button>
                <strong class="month-label">{{ monthLabel }}</strong>
                <button class="month-nav" type="button" aria-label="下个月" @click="changeMonth(1)">
                  <AppIcon name="chevron" :size="16" :stroke-width="2.2" />
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
                <button class="ios-link" type="button" @click="selectDate(null)">不限日期</button>
                <button class="ios-link" type="button" @click="selectDate(todayStr())">今天</button>
              </div>
            </div>

            <div class="ios-sep inset"></div>

            <button
              class="ios-row"
              type="button"
              :aria-expanded="showTags"
              @click="showTags = !showTags"
            >
              <span class="ios-icon"><AppIcon name="tag" :size="17" /></span>
              <span class="ios-row-main">标签</span>
              <span class="ios-value">{{ tagLabel }}</span>
              <AppIcon
                class="ios-chevron"
                name="chevron"
                :size="13"
                :class="{ rotated: showTags }"
              />
            </button>

            <div v-if="showTags" class="tag-panel">
              <button
                v-for="tag in props.availableTags"
                :key="tag"
                class="ios-row tag-option"
                type="button"
                :aria-pressed="selectedTags.includes(tag)"
                @click="toggleTag(tag)"
              >
                <span class="ios-row-main">{{ tag }}</span>
                <AppIcon
                  v-if="selectedTags.includes(tag)"
                  class="tag-check"
                  name="check"
                  :size="17"
                  :stroke-width="2.3"
                />
              </button>
              <p v-if="props.availableTags.length === 0" class="ios-row empty-row">暂无标签</p>
            </div>

            <div class="ios-sep inset"></div>

            <div class="ios-row">
              <span class="ios-icon warm"><AppIcon name="flag" :size="17" /></span>
              <span class="ios-row-main">重要</span>
              <IosSwitch v-model="important" label="重要" />
            </div>
          </div>
        </div>

        <div class="ios-group">
          <div class="ios-card">
            <div class="ios-row">
              <span class="ios-icon"><AppIcon name="repeat" :size="17" /></span>
              <span class="ios-row-main">每日重复</span>
              <IosSwitch v-model="isDaily" label="每日重复" />
            </div>
            <div class="ios-sep inset"></div>
            <div class="ios-row">
              <span class="ios-icon"><AppIcon name="pin" :size="17" /></span>
              <span class="ios-row-main">置顶</span>
              <IosSwitch v-model="pinned" label="置顶" />
            </div>
          </div>
          <p class="ios-group-foot">保存后会自动出现在「今天」，并同步到已配对的设备。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.composer-layer {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  animation: fade-in var(--dur-base) var(--ease-standard);
}

.sheet {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 720px;
  max-height: calc(var(--viewport-height, 100dvh) - 96px);
  flex-direction: column;
  border-radius: var(--r-sheet) var(--r-sheet) 0 0;
  background: var(--bg);
  box-shadow: var(--shadow-sheet);
  animation: slide-up var(--dur-sheet) var(--ease-standard);
}

.grabber {
  flex: 0 0 auto;
  width: 36px;
  height: 5px;
  margin: 6px auto 0;
  border-radius: 3px;
  background: var(--label-3);
}

.sheet-nav {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 52px;
  padding: 0 16px;
}

.sheet-nav .ios-link {
  justify-self: start;
}

.sheet-nav .ios-link.strong {
  justify-self: end;
  font-weight: 600;
}

.sheet-nav .ios-link:disabled {
  opacity: 0.36;
}

.sheet-title {
  color: var(--label);
  font-size: var(--f-headline);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.sheet-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 16px
    calc(20px + max(env(safe-area-inset-bottom, 0px), var(--native-navbar-inset, 0px)));
  scroll-padding-top: 16px;
  scroll-padding-bottom: 16px;
  -webkit-overflow-scrolling: touch;
}

.title-card {
  margin-bottom: 22px;
}

.title-input {
  display: block;
  width: 100%;
  min-height: 56px;
  padding: 10px 16px;
  color: var(--label);
  font-size: var(--f-body);
  letter-spacing: -0.01em;
}

.sheet-body .ios-group:last-child {
  margin-bottom: 0;
}

.ios-group {
  margin-bottom: 22px;
}

.ios-row-main {
  flex: 1 1 auto;
  min-width: 0;
}

.ios-chevron {
  transition: transform var(--dur-fast) var(--ease-standard);
}

.ios-chevron.rotated {
  transform: rotate(90deg);
}

/* ── 日期面板 ─────────────────────────── */
.date-panel {
  padding: 4px 12px 10px;
  border-top: 0.5px solid var(--sep);
  animation: panel-in var(--dur-base) var(--ease-standard);
}

.calendar-header {
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
}

.month-label {
  color: var(--label);
  font-size: var(--f-subhead);
  font-weight: 600;
}

.month-nav {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 50%;
  color: var(--tint);
}

.month-nav:active {
  background: var(--fill-3);
}

.flip {
  transform: rotate(180deg);
}

.weekday-row,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}

.weekday-row {
  color: var(--label-2);
  font-size: var(--f-caption);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
}

.weekday-row span {
  display: grid;
  min-height: 24px;
  place-items: center;
}

.calendar-day {
  display: grid;
  min-height: 40px;
  place-items: center;
  border-radius: 50%;
  color: var(--label);
  font-size: var(--f-subhead);
  font-variant-numeric: tabular-nums;
  transition:
    background-color var(--dur-fast) var(--ease-standard),
    color var(--dur-fast) var(--ease-standard);
}

.calendar-day:active {
  background: var(--fill-3);
}

.calendar-day.muted {
  color: var(--label-3);
}

.calendar-day.today {
  color: var(--tint);
  font-weight: 600;
}

.calendar-day.selected {
  color: var(--on-tint);
  background: var(--tint-fill);
  font-weight: 600;
}

.calendar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 0.5px solid var(--sep);
}

/* ── 标签面板 ─────────────────────────── */
.tag-panel {
  border-top: 0.5px solid var(--sep);
  animation: panel-in var(--dur-base) var(--ease-standard);
}

.tag-option {
  min-height: 44px;
}

.tag-check {
  color: var(--tint);
}

.empty-row {
  color: var(--label-2);
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes slide-up {
  from {
    transform: translateY(16px);
    opacity: 0.6;
  }
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
</style>

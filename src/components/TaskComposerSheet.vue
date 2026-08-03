<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { addDays, formatDueDate, todayStr } from '../utils/date';

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
const dueDate = ref<string | null>(null);
const selectedTags = ref<string[]>([]);
const important = ref(false);
const pinned = ref(false);
const isDaily = ref(false);
const showDetails = ref(false);
const showDateOptions = ref(false);
const titleInput = ref<HTMLInputElement | null>(null);

const dateLabel = computed(() => (dueDate.value ? formatDueDate(dueDate.value) : '今天'));

function closeSheet() {
  emit('close');
}

function selectDate(date: string | null) {
  dueDate.value = date;
  showDateOptions.value = false;
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

onMounted(() => {
  nextTick(() => titleInput.value?.focus());
});
</script>

<template>
  <div class="composer-layer" @keydown.esc="closeSheet">
    <button class="composer-backdrop" type="button" aria-label="关闭新增任务" @click="closeSheet" />

    <section
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
          <button
            class="date-option"
            type="button"
            :class="{ selected: dueDate === todayStr() }"
            @click="selectDate(todayStr())"
          >
            今天
          </button>
          <button
            class="date-option"
            type="button"
            :class="{ selected: dueDate === addDays(1) }"
            @click="selectDate(addDays(1))"
          >
            明天
          </button>
          <input
            class="date-input"
            type="date"
            :value="dueDate ?? ''"
            aria-label="自定义截止日期"
            @input="selectDate(($event.target as HTMLInputElement).value || null)"
          />
          <button v-if="dueDate" class="clear-date" type="button" @click="selectDate(null)">
            清除
          </button>
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
  inset: 0;
  pointer-events: none;
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
.date-options,
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
.date-option,
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

.date-options,
.option-row {
  flex-wrap: wrap;
}

.date-options,
.details-panel {
  padding: var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
}

.date-option,
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

.date-input {
  min-height: 48px;
  max-width: 170px;
  padding: 0 var(--space-sm);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  background: var(--bg-primary);
  font-size: var(--text-sm);
}

.clear-date {
  border: 0;
  color: var(--text-muted);
  background: transparent;
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

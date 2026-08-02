<script setup lang="ts">
import { nextTick, ref } from 'vue';

const props = defineProps<{
  availableTags: string[];
}>();

const emit = defineEmits<{
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
const expanded = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function selectDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  dueDate.value = formatDate(date);
}

function toggleTag(tag: string) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((item) => item !== tag)
    : [...selectedTags.value, tag];
}

function openComposer() {
  expanded.value = true;
}

function focusComposer() {
  openComposer();
  nextTick(() => inputRef.value?.focus({ preventScroll: true }));
}

function closeComposer() {
  expanded.value = false;
  inputRef.value?.blur();
}

function handleSubmit() {
  const text = title.value.trim();
  if (!text) {
    focusComposer();
    return;
  }

  emit(
    'add',
    text,
    dueDate.value,
    selectedTags.value,
    important.value,
    pinned.value,
    isDaily.value,
  );
  title.value = '';
  dueDate.value = null;
  selectedTags.value = [];
  important.value = false;
  pinned.value = false;
  isDaily.value = false;
  closeComposer();
}
</script>

<template>
  <form class="task-input" :class="{ expanded }" @submit.prevent="handleSubmit">
    <div class="quick-row">
      <button type="submit" class="submit-btn" aria-label="添加任务">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <label class="sr-only" for="task-title-input">任务标题</label>
      <input
        id="task-title-input"
        ref="inputRef"
        v-model="title"
        class="input-field"
        placeholder="快速添加任务..."
        maxlength="200"
        autocomplete="off"
        aria-describedby="task-input-hint"
        @focus="openComposer"
      />
      <button
        v-if="expanded"
        type="submit"
        class="add-btn"
        :disabled="!title.trim()"
        aria-label="保存任务"
      >
        添加
      </button>
    </div>

    <div v-if="expanded" class="detail-panel" aria-label="任务选项">
      <div class="detail-header">
        <div>
          <strong>添加任务</strong>
          <span id="task-input-hint">可选设置</span>
        </div>
        <button type="button" class="close-btn" aria-label="收起任务详情" @click="closeComposer">
          ×
        </button>
      </div>

      <div class="detail-section">
        <span class="detail-label">截止日期</span>
        <div class="option-row">
          <button
            type="button"
            class="option-chip"
            :class="{ active: dueDate === formatDate(new Date()) }"
            @click="selectDate(0)"
          >
            今天
          </button>
          <button
            type="button"
            class="option-chip"
            :class="{
              active: dueDate === formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
            }"
            @click="selectDate(1)"
          >
            明天
          </button>
          <input v-model="dueDate" class="date-input" type="date" aria-label="自定义截止日期" />
          <button v-if="dueDate" type="button" class="clear-btn" @click="dueDate = null">
            清除
          </button>
        </div>
      </div>

      <div v-if="props.availableTags.length > 0" class="detail-section">
        <span class="detail-label">标签</span>
        <div class="option-row tag-options">
          <button
            v-for="tag in props.availableTags"
            :key="tag"
            type="button"
            class="option-chip"
            :class="{ active: selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <div class="toggle-row">
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
  </form>
</template>

<style scoped>
.task-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border-light);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.task-input.expanded {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: calc(var(--keyboard-bottom-offset, 0px) + 64px);
  left: 0;
  max-height: calc(var(--viewport-height, 100dvh) - 72px);
  padding: var(--space-md) max(var(--space-lg), env(safe-area-inset-left, 0px))
    calc(var(--space-md) + env(safe-area-inset-bottom, 0px))
    max(var(--space-lg), env(safe-area-inset-right, 0px));
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-lg);
}

.quick-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  min-width: 48px;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.submit-btn:active {
  transform: scale(0.95);
  background: var(--accent-hover);
}

.input-field {
  flex: 1;
  min-width: 0;
  height: 48px;
  padding: 0 var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-full);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 16px;
  outline: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.input-field:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.input-field::placeholder {
  color: var(--text-muted);
}

.add-btn,
.close-btn,
.clear-btn {
  min-height: 44px;
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: var(--text-sm);
  white-space: nowrap;
}

.add-btn {
  padding: 0 var(--space-sm);
  font-weight: var(--font-weight-semibold);
}

.add-btn:disabled {
  color: var(--text-disabled);
}

.close-btn {
  width: 44px;
  padding: 0;
  color: var(--text-muted);
  font-size: 28px;
  line-height: 1;
}

.detail-panel {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-lg);
  overflow-y: auto;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.detail-header,
.detail-section,
.toggle-row {
  display: flex;
  align-items: center;
}

.detail-header {
  justify-content: space-between;
}

.detail-header strong {
  display: block;
  color: var(--text-primary);
  font-size: var(--text-base);
}

.detail-header span,
.detail-label {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.detail-header span {
  display: block;
  margin-top: 2px;
}

.detail-section {
  align-items: flex-start;
  flex-direction: column;
  gap: var(--space-sm);
}

.option-row,
.toggle-row {
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.option-chip {
  min-height: 40px;
  padding: 0 var(--space-md);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.option-chip.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.date-input {
  min-height: 40px;
  max-width: 150px;
  padding: 0 var(--space-sm);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.clear-btn {
  padding: 0 var(--space-sm);
}

.toggle-option {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  min-height: 44px;
  padding: 0 var(--space-md);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.toggle-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.toggle-option.selected {
  border-color: var(--accent);
  background: var(--accent-bg);
  color: var(--accent-hover);
}

.toggle-option:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

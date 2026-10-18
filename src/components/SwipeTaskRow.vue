<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import AppIcon from './AppIcon.vue';
import type { Task } from '../types';
import { formatDueDate, todayStr } from '../utils/date';

const props = defineProps<{
  task: Task;
  completed: boolean;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  update: [id: string, title: string];
  delete: [id: string];
}>();

const OPEN_OFFSET = -152;
const MAX_OFFSET = OPEN_OFFSET;

const offset = ref(0);
const open = computed(() => offset.value <= MAX_OFFSET / 2);
const editing = ref(false);
const draft = ref('');
const inputEl = ref<HTMLInputElement | null>(null);

let startX = 0;
let startY = 0;
let startOffset = 0;
let axis: 'x' | 'y' | null = null;
let dragging = false;
let justDragged = false;

const overdue = computed(
  () => !!props.task.due_date && props.task.due_date < todayStr() && !props.completed,
);

const metaTags = computed(() => props.task.tags.slice(0, 2));

function onPointerDown(event: PointerEvent) {
  if (editing.value) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  dragging = true;
  axis = null;
  justDragged = false;
  startX = event.clientX;
  startY = event.clientY;
  startOffset = offset.value;
}

function onPointerMove(event: PointerEvent) {
  if (!dragging) return;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;

  if (!axis) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (axis === 'x') justDragged = true;
  }

  if (axis !== 'x') return;
  offset.value = Math.max(MAX_OFFSET, Math.min(0, startOffset + dx));
}

function onPointerUp() {
  if (!dragging) return;
  dragging = false;
  if (axis === 'x') {
    offset.value = offset.value < MAX_OFFSET / 2 ? OPEN_OFFSET : 0;
  }
  axis = null;
}

function close() {
  offset.value = 0;
}

function startEdit() {
  if (justDragged) {
    justDragged = false;
    return;
  }
  if (offset.value !== 0) {
    close();
    return;
  }
  draft.value = props.task.title;
  editing.value = true;
  nextTick(() => {
    inputEl.value?.focus();
    inputEl.value?.select();
  });
}

function commitEdit() {
  const title = draft.value.trim();
  if (title && title !== props.task.title) emit('update', props.task.id, title);
  editing.value = false;
}

function cancelEdit() {
  editing.value = false;
}

function toggle() {
  close();
  emit('toggle', props.task.id);
}

function remove() {
  close();
  emit('delete', props.task.id);
}

function onDocumentPointerDown(event: PointerEvent) {
  if (offset.value === 0) return;
  const target = event.target as Element | null;
  if (!target?.closest('.swipe-row')) close();
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown));
</script>

<template>
  <div class="swipe-row" :class="{ open }">
    <div class="actions" :aria-hidden="!open">
      <button
        class="action toggle"
        type="button"
        :aria-label="completed ? '标记未完成' : '标记完成'"
        :tabindex="open ? 0 : -1"
        @click="toggle"
      >
        <AppIcon :name="completed ? 'x' : 'check'" :size="18" />
        <span>{{ completed ? '取消' : '完成' }}</span>
      </button>
      <button
        class="action delete"
        type="button"
        aria-label="删除任务"
        :tabindex="open ? 0 : -1"
        @click="remove"
      >
        <AppIcon name="trash" :size="18" />
        <span>删除</span>
      </button>
    </div>

    <div
      class="row"
      :class="{ done: completed }"
      :style="{ transform: `translateX(${offset}px)` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <button
        class="check"
        type="button"
        :class="{ done: completed }"
        :aria-label="completed ? '标记未完成' : '标记完成'"
        @click.stop="toggle"
      >
        <span class="circle">
          <AppIcon v-if="completed" name="check" :size="13" :stroke-width="2.6" />
        </span>
      </button>

      <div v-if="editing" class="main editing" @pointerdown.stop @click.stop>
        <input
          ref="inputEl"
          v-model="draft"
          class="edit-input"
          type="text"
          enterkeyhint="done"
          maxlength="200"
          @keyup.enter="commitEdit"
          @keyup.esc="cancelEdit"
          @blur="commitEdit"
        />
      </div>
      <div
        v-else
        class="main"
        role="button"
        tabindex="0"
        :aria-label="`编辑任务：${task.title}`"
        @click="startEdit"
        @keydown.enter.prevent="startEdit"
      >
        <p class="title">{{ task.title }}</p>
        <p v-if="task.due_date || metaTags.length || task.is_daily" class="meta">
          <template v-if="task.due_date">
            <AppIcon name="calendar" :size="12" :stroke-width="1.9" />
            <span :class="{ overdue }">{{ formatDueDate(task.due_date) }}</span>
          </template>
          <template v-if="metaTags.length">
            <AppIcon name="tag" :size="12" :stroke-width="1.9" />
            <span>{{ metaTags.join(' · ') }}</span>
          </template>
          <template v-if="task.is_daily">
            <AppIcon name="repeat" :size="12" :stroke-width="1.9" />
            <span>每日</span>
          </template>
        </p>
      </div>

      <AppIcon v-if="task.pinned" class="pin" name="pin" :size="14" :stroke-width="1.7" />
      <span v-if="task.important" class="flag" aria-label="重要">
        <AppIcon name="flag" :size="16" :stroke-width="1.9" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.swipe-row {
  position: relative;
  overflow: hidden;
}

.actions {
  position: absolute;
  inset: 0 0 0 auto;
  display: flex;
  width: 152px;
}

.action {
  display: flex;
  width: 76px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: #fff;
  font-size: var(--f-caption);
  font-weight: 500;
}

.action.toggle {
  background: var(--tint-fill);
}

.action.delete {
  background: var(--red);
}

.action:active {
  filter: brightness(0.92);
}

.row {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: var(--row-h-2);
  align-items: center;
  gap: 8px;
  padding: 9px 16px 9px 6px;
  background: var(--bg-elevated);
  touch-action: pan-y;
  transition: transform var(--dur-base) var(--ease-standard);
}

.swipe-row.open .row {
  border-radius: 0;
}

.check {
  display: grid;
  flex: 0 0 var(--hit);
  width: var(--hit);
  height: var(--hit);
  place-items: center;
}

.circle {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1.5px solid var(--label-3);
  border-radius: 50%;
  color: transparent;
  transition:
    background-color var(--dur-fast) var(--ease-standard),
    border-color var(--dur-fast) var(--ease-standard),
    transform var(--dur-fast) var(--ease-spring);
}

.check:active .circle {
  transform: scale(0.9);
}

.check.done .circle {
  border-color: var(--tint-fill);
  background: var(--tint-fill);
  color: var(--on-tint);
}

.main {
  flex: 1 1 auto;
  min-width: 0;
  cursor: text;
}

.title {
  overflow: hidden;
  color: var(--label);
  font-size: var(--f-body);
  line-height: 22px;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.done .title {
  color: var(--label-2);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 5px;
  margin-top: 1px;
  color: var(--label-2);
  font-size: var(--f-footnote);
  line-height: 18px;
}

.meta svg {
  color: var(--label-3);
}

.meta .overdue {
  color: var(--red-text);
}

.done .meta {
  color: var(--label-3);
}

.pin,
.flag {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
}

.pin {
  color: var(--label-3);
}

.flag {
  color: var(--orange);
}

.edit-input {
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--r-control);
  background: var(--fill-3);
  color: var(--label);
  font-size: var(--f-body);
}

.edit-input:focus {
  outline: 2px solid var(--tint);
  outline-offset: -2px;
}
</style>

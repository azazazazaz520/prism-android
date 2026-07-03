<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  tasks: import('../types').Task[];
  dailyCompletionsMap: Record<string, boolean>;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  'toggle-daily': [id: string, date: string];
  update: [id: string, title: string];
  delete: [id: string];
  'update-meta': [id: string, tags: string[], important: boolean, pinned: boolean];
}>();

const editingId = ref<string | null>(null);
const editTitle = ref('');

function startEdit(id: string, title: string) {
  editingId.value = id;
  editTitle.value = title;
}

function confirmEdit(id: string) {
  const title = editTitle.value.trim();
  if (title) {
    emit('update', id, title);
  }
  editingId.value = null;
}

function cancelEdit() {
  editingId.value = null;
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── 左滑删除手势 ──────────────────────────

const SWIPE_THRESHOLD = -80;
const swipeState = ref<Record<string, number>>({});
const swipeStartX = ref<Record<string, number>>({});
const swipeStartY = ref<Record<string, number>>({});
const swipingId = ref<string | null>(null);

function onTouchStart(taskId: string, e: TouchEvent) {
  const touch = e.touches[0];
  // 避让 Android 系统返回手势（右边缘 20px）
  if (touch.clientX > window.innerWidth - 20) return;
  swipeStartX.value[taskId] = touch.clientX;
  swipeStartY.value[taskId] = touch.clientY;
  swipingId.value = taskId;
}

function onTouchMove(taskId: string, e: TouchEvent) {
  if (swipingId.value !== taskId) return;
  const touch = e.touches[0];
  const dx = touch.clientX - (swipeStartX.value[taskId] || 0);
  const dy = Math.abs(touch.clientY - (swipeStartY.value[taskId] || 0));
  // 水平滑动超过垂直时，阻止页面滚动
  if (Math.abs(dx) > dy && dx < 0) {
    e.preventDefault();
  }
  // 只允许左滑（负值），限制最大偏移
  swipeState.value[taskId] = Math.max(dx, -120);
}

function onTouchEnd(taskId: string) {
  const offset = swipeState.value[taskId] || 0;
  if (offset <= SWIPE_THRESHOLD) {
    // 停留在删除位置
    swipeState.value[taskId] = SWIPE_THRESHOLD;
  } else {
    // 回弹
    swipeState.value[taskId] = 0;
  }
  swipingId.value = null;
}

function resetSwipe(taskId: string) {
  swipeState.value[taskId] = 0;
}
</script>

<template>
  <div class="task-list">
    <div v-if="tasks.length === 0" class="empty-state">
      <p>暂无任务</p>
      <p class="empty-hint">点击下方输入框添加新任务</p>
    </div>

    <TransitionGroup name="task-list" tag="div" class="task-items">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-row"
      >
        <!-- 左滑露出的删除按钮 -->
        <button
          class="swipe-delete-btn"
          :class="{ visible: (swipeState[task.id] || 0) <= SWIPE_THRESHOLD }"
          @click="emit('delete', task.id); resetSwipe(task.id)"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>

        <div
          class="task-card"
          :class="{ completed: task.completed, important: task.important }"
          :style="{ transform: `translateX(${swipeState[task.id] || 0}px)` }"
          @touchstart.passive="onTouchStart(task.id, $event)"
          @touchmove="onTouchMove(task.id, $event)"
          @touchend="onTouchEnd(task.id)"
        >
        <!-- 勾选按钮 -->
        <button
          v-if="task.is_daily"
          class="check-btn"
          :class="{ done: dailyCompletionsMap[task.id] }"
          @click="emit('toggle-daily', task.id, todayStr())"
        >
          <svg
            v-if="dailyCompletionsMap[task.id]"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
        <button
          v-else
          class="check-btn"
          :class="{ done: task.completed }"
          @click="emit('toggle', task.id)"
        >
          <svg
            v-if="task.completed"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>

        <!-- 任务内容 -->
        <div class="task-content">
          <template v-if="editingId === task.id">
            <input
              v-model="editTitle"
              class="edit-input"
              @keyup.enter="confirmEdit(task.id)"
              @keyup.escape="cancelEdit"
              @blur="confirmEdit(task.id)"
            />
          </template>
          <template v-else>
            <span class="task-title" @dblclick="startEdit(task.id, task.title)">
              {{ task.title }}
            </span>
            <div class="task-meta">
              <span v-if="task.due_date" class="meta-tag due">{{ task.due_date }}</span>
              <span v-for="tag in task.tags" :key="tag" class="meta-tag">{{ tag }}</span>
              <span v-if="task.is_daily" class="meta-tag daily">每日</span>
            </div>
          </template>
        </div>

        <!-- 删除按钮 -->
        <button class="delete-btn" @click="emit('delete', task.id)">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.task-list {
  flex: 1;
  overflow-y: auto;
  padding-bottom: var(--space-sm);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
  color: var(--text-muted);
  font-size: var(--text-base);
}

.empty-hint {
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
  opacity: 0.6;
}

.task-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* ── 左滑容器 ──────────────────────────── */
.task-row {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
}

.swipe-delete-btn {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--danger);
  color: #fff;
  border: none;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--transition-fast);
  z-index: 0;
}

.swipe-delete-btn.visible {
  opacity: 1;
}

.swipe-delete-btn:active {
  background: var(--danger-hover, #dc2626);
}

.task-card {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  transition: transform 0.2s ease-out;
}

.task-card.important {
  border-left: 3px solid var(--warning);
}

.task-card.completed {
  opacity: 0.5;
}

/* 勾选按钮 */
.check-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  border: 2px solid var(--border-default);
  border-radius: 50%;
  background: transparent;
  color: var(--success);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.check-btn.done {
  background: var(--success);
  border-color: var(--success);
  color: #fff;
}

/* 任务内容 */
.task-content {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: var(--text-base);
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
}

.task-card.completed .task-title {
  text-decoration: line-through;
  color: var(--text-muted);
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.meta-tag {
  font-size: var(--text-xs);
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 1px var(--space-sm);
  border-radius: var(--radius-full);
}

.meta-tag.due {
  color: var(--accent);
  background: var(--accent-light);
}

.meta-tag.daily {
  color: var(--warning);
  background: var(--warning-light);
}

.edit-input {
  width: 100%;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--text-base);
  outline: none;
}

/* 删除按钮 */
.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.delete-btn:active {
  background: var(--danger-light);
  color: var(--danger);
}

/* 列表动画 */
.task-list-enter-active,
.task-list-leave-active {
  transition: all var(--transition-normal) var(--easing-standard);
}
.task-list-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.task-list-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import type { Task } from '../types';

const props = defineProps<{
  tasks: Task[];
  selectedDate: string | null;
}>();

const emit = defineEmits<{
  'select-date': [date: string | null];
}>();

/** 今天日期字符串 */
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 生成最近 7 天的日期列表 */
const dates = computed(() => {
  const result: { date: string; label: string; dayName: string }[] = [];
  const now = new Date();
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    const today = todayStr();
    result.push({
      date: dateStr,
      label: dateStr === today ? '今天' : `${m}/${day}`,
      dayName: dayNames[d.getDay()],
    });
  }
  return result;
});

/** 某日期有多少个任务 */
function taskCount(date: string): number {
  return props.tasks.filter((t) => t.due_date === date && !t.completed).length;
}

function handleSelect(date: string) {
  if (props.selectedDate === date) {
    emit('select-date', null);
  } else {
    emit('select-date', date);
  }
}
</script>

<template>
  <div class="date-strip">
    <button
      v-for="d in dates"
      :key="d.date"
      class="date-chip"
      :class="{ active: selectedDate === d.date, today: d.label === '今天' }"
      @click="handleSelect(d.date)"
    >
      <span class="day-name">{{ d.dayName }}</span>
      <span class="day-label">{{ d.label }}</span>
      <span v-if="taskCount(d.date) > 0" class="day-badge">{{ taskCount(d.date) }}</span>
    </button>
  </div>
</template>

<style scoped>
.date-strip {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md) 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.date-strip::-webkit-scrollbar {
  display: none;
}

.date-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 48px;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.date-chip:active {
  transform: scale(0.95);
}

.date-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.date-chip.today:not(.active) {
  border-color: var(--accent-muted);
}

.day-name {
  font-size: var(--text-xs);
  opacity: 0.7;
}

.day-label {
  font-weight: var(--font-weight-semibold);
}

.day-badge {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  border-radius: var(--radius-full);
  padding: 1px 5px;
  min-width: 16px;
  text-align: center;
}

.active .day-badge {
  background: rgba(255, 255, 255, 0.3);
}
</style>

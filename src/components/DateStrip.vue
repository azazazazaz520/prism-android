<script setup lang="ts">
import { computed } from 'vue';
import type { Task } from '../types';
import { todayStr } from '../utils/date';

const props = defineProps<{
  tasks: Task[];
  selectedDate: string | null;
}>();

const emit = defineEmits<{
  'select-date': [date: string | null];
}>();

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
    </button>
  </div>
</template>

<style scoped>
.date-strip {
  display: flex;
  gap: 7px;
  padding: var(--space-md) 0 var(--space-lg);
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
  min-width: 64px;
  min-height: 64px;
  padding: 8px 10px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.date-chip:active {
  transform: scale(0.95);
}

.date-chip.active {
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
}

.date-chip.today:not(.active) {
  border-color: var(--accent-muted);
}

.day-name {
  font-size: var(--text-sm);
  opacity: 0.7;
}

.day-label {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
}
</style>

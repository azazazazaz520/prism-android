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

const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const today = todayStr();

const days = computed(() => {
  const base = parseDate(props.selectedDate ?? today);
  const mondayOffset = (base.getDay() + 6) % 7;
  const monday = new Date(base);
  monday.setDate(base.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = dateKey(date);
    const count = props.tasks.filter((task) => !task.is_deleted && task.due_date === key).length;

    return {
      date: key,
      weekday: weekdayNames[date.getDay()],
      day: date.getDate(),
      month: date.getMonth() + 1,
      today: key === today,
      count,
    };
  });
});

function selectDay(date: string) {
  emit('select-date', props.selectedDate === date ? null : date);
}

function ariaLabel(day: (typeof days.value)[number]): string {
  const suffix = day.count ? `，${day.count} 项任务` : '';
  return `${day.month}月${day.day}日 星期${day.weekday}${suffix}`;
}
</script>

<template>
  <div class="week" role="group" aria-label="按日期筛选">
    <button
      v-for="day in days"
      :key="day.date"
      type="button"
      class="day"
      :class="{ active: selectedDate === day.date, today: day.today }"
      :aria-pressed="selectedDate === day.date"
      :aria-label="ariaLabel(day)"
      @click="selectDay(day.date)"
    >
      <span class="wd">{{ day.weekday }}</span>
      <span class="num">{{ day.day }}</span>
      <span class="dot" :class="{ show: day.count > 0 }" aria-hidden="true"></span>
    </button>
  </div>
</template>

<style scoped>
.week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  padding: 2px 8px 0;
}

.day {
  display: flex;
  min-height: 56px;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 0 5px;
  border-radius: 12px;
  color: var(--label-2);
  transition:
    color var(--dur-fast) var(--ease-standard),
    background-color var(--dur-fast) var(--ease-standard);
}

.day:active {
  background: var(--fill-3);
}

.wd {
  font-size: var(--f-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
}

.num {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  color: var(--label);
  font-size: 17px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  transition:
    color var(--dur-fast) var(--ease-standard),
    background-color var(--dur-fast) var(--ease-standard);
}

.today .num {
  color: var(--tint);
  font-weight: 600;
}

.today .wd {
  color: var(--tint);
}

.active .num {
  color: var(--on-tint);
  background: var(--tint-fill);
  font-weight: 600;
}

.active .wd {
  color: var(--tint);
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--tint);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-standard);
}

.dot.show {
  opacity: 1;
}

.active .dot {
  opacity: 0;
}
</style>

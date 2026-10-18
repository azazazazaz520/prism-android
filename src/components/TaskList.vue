<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import SwipeTaskRow from './SwipeTaskRow.vue';
import type { Task } from '../types';
import { todayStr } from '../utils/date';

const props = defineProps<{
  tasks: Task[];
  dailyCompletionsMap: Record<string, boolean>;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  'toggle-daily': [id: string, date: string];
  update: [id: string, title: string];
  delete: [id: string];
  add: [];
}>();

function isCompleted(task: Task): boolean {
  return task.is_daily ? !!props.dailyCompletionsMap[task.id] : task.completed;
}

const pending = computed(() => props.tasks.filter((task) => !isCompleted(task)));
const completed = computed(() => props.tasks.filter(isCompleted));

function toggleTask(task: Task) {
  if (task.is_daily) {
    emit('toggle-daily', task.id, todayStr());
    return;
  }
  emit('toggle', task.id);
}
</script>

<template>
  <div class="task-list">
    <div v-if="tasks.length === 0" class="empty">
      <AppIcon class="empty-icon" name="check-circle" :size="56" :stroke-width="1.2" />
      <p class="empty-title">还没有任务</p>
      <p class="empty-copy">把今天要做的事记下来，完成一项就划掉一项。</p>
      <button class="empty-action" type="button" @click="emit('add')">新建任务</button>
    </div>

    <template v-else>
      <section class="ios-group">
        <div v-if="pending.length" class="ios-group-head">
          <span>未完成</span>
          <span class="ios-count">{{ pending.length }}</span>
        </div>
        <div class="ios-card">
          <template v-for="task in pending" :key="task.id">
            <SwipeTaskRow
              :task="task"
              :completed="false"
              @toggle="toggleTask(task)"
              @update="(id, title) => emit('update', id, title)"
              @delete="emit('delete', $event)"
            />
            <div class="ios-sep inset"></div>
          </template>

          <button class="ios-row add-row" type="button" @click="emit('add')">
            <span class="plus" aria-hidden="true">
              <AppIcon name="plus" :size="13" :stroke-width="2.6" />
            </span>
            <span class="add-label">新任务</span>
          </button>
        </div>
      </section>

      <section v-if="completed.length" class="ios-group">
        <div class="ios-group-head">
          <span>已完成</span>
          <span class="ios-count">{{ completed.length }}</span>
        </div>
        <div class="ios-card">
          <template v-for="(task, index) in completed" :key="task.id">
            <SwipeTaskRow
              :task="task"
              :completed="true"
              @toggle="toggleTask(task)"
              @update="(id, title) => emit('update', id, title)"
              @delete="emit('delete', $event)"
            />
            <div v-if="index < completed.length - 1" class="ios-sep inset"></div>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.task-list {
  min-width: 0;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px 40px;
  text-align: center;
}

.empty-icon {
  color: var(--label-3);
}

.empty-title {
  margin-top: 16px;
  color: var(--label);
  font-size: var(--f-body);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.empty-copy {
  max-width: 260px;
  margin-top: 6px;
  color: var(--label-2);
  font-size: var(--f-subhead);
  line-height: 20px;
}

.empty-action {
  margin-top: 18px;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  color: var(--tint);
  background: var(--tint-soft);
  font-size: var(--f-body);
  font-weight: 500;
  transition: opacity var(--dur-fast) var(--ease-standard);
}

.empty-action:active {
  opacity: 0.6;
}

.add-row {
  gap: 12px;
  color: var(--tint);
  font-weight: 500;
}

.plus {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  color: var(--on-tint);
  background: var(--tint-fill);
}

.add-label {
  font-size: var(--f-body);
  letter-spacing: -0.01em;
}
</style>

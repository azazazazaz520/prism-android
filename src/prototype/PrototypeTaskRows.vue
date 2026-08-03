<script setup lang="ts">
export interface PrototypeTask {
  id: number;
  title: string;
  date: string;
  tag?: string;
  meta?: string;
  important?: boolean;
  completed: boolean;
}

defineProps<{
  tasks: PrototypeTask[];
  compact?: boolean;
}>();

defineEmits<{
  toggle: [task: PrototypeTask];
}>();
</script>

<template>
  <div class="task-rows" :class="{ compact }">
    <template v-if="tasks.length">
      <article
        v-for="task in tasks"
        :key="task.id"
        class="task-row"
        :class="{ completed: task.completed }"
      >
        <button
          class="task-check"
          :aria-label="task.completed ? '标记为未完成' : '标记为完成'"
          @click="$emit('toggle', task)"
        >
          {{ task.completed ? '✓' : '' }}
        </button>
        <div class="task-copy">
          <strong>{{ task.title }}</strong>
          <div class="task-meta">
            <span v-if="task.meta">{{ task.meta }}</span>
            <span v-if="task.tag" class="task-tag">{{ task.tag }}</span>
            <span v-if="task.important" class="task-important">重要</span>
          </div>
        </div>
        <button class="task-more" aria-label="任务操作">···</button>
      </article>
    </template>
    <div v-else class="prototype-empty">
      <div class="empty-mark" aria-hidden="true">○</div>
      <strong>这里暂时很安静</strong>
      <span>添加一项任务，让下一步变得清楚。</span>
    </div>
  </div>
</template>

<style scoped>
.task-rows {
  display: grid;
  gap: 10px;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 60px;
  padding: 8px 6px 8px 8px;
  border: 1px solid #d9e8e4;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 5px 18px rgba(21, 65, 60, 0.04);
  transition:
    border-color 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.task-row:hover {
  border-color: #a8d3ca;
  box-shadow: 0 10px 24px rgba(21, 65, 60, 0.08);
  transform: translateY(-1px);
}

.task-row.completed {
  opacity: 0.56;
}

.task-row.completed strong {
  text-decoration: line-through;
}

.task-check {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border: 0;
  border-radius: 50%;
  color: transparent;
  background: transparent;
  font-size: 0;
  cursor: pointer;
}

.task-check::before {
  width: 20px;
  height: 20px;
  border: 2px solid #b7cec9;
  border-radius: 50%;
  content: '';
}

.task-row.completed .task-check {
  color: white;
}

.task-row.completed .task-check::before {
  border-color: #0d9488;
  background: #0d9488;
}

.task-row.completed .task-check::after {
  position: absolute;
  color: white;
  content: '✓';
  font-size: 15px;
  font-weight: 700;
}

.task-copy {
  min-width: 0;
  flex: 1;
}

.task-copy strong {
  display: block;
  overflow: hidden;
  color: #152b2a;
  font-size: 16px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  color: #6e8580;
  font-size: 12px;
}

.task-meta span {
  padding: 3px 8px;
  border-radius: 999px;
  background: #eef5f3;
}

.task-meta .task-tag {
  color: #0f766e;
  background: #e3f5f1;
}

.task-meta .task-important {
  color: #a45116;
  background: #fff0df;
}

.task-more {
  width: 44px;
  height: 44px;
  border: 0;
  color: #6e8580;
  background: transparent;
  font-size: 18px;
  letter-spacing: 2px;
  cursor: pointer;
}

.prototype-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 80px 20px;
  color: #6e8580;
  text-align: center;
}

.prototype-empty strong {
  color: #152b2a;
  font-size: 17px;
}

.prototype-empty span {
  font-size: 13px;
}

.empty-mark {
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  margin-bottom: 10px;
  border: 1px solid #bddbd4;
  border-radius: 22px;
  color: #0d9488;
  background: #e7f6f2;
  font-size: 36px;
}

.task-rows.compact .task-row {
  min-height: 64px;
  border-radius: 15px;
  box-shadow: none;
}

.task-rows.compact .task-check {
  width: 44px;
  height: 44px;
  flex-basis: 44px;
}

.task-rows.compact .task-check::before {
  width: 20px;
  height: 20px;
}
</style>

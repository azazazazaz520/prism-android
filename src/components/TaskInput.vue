<script setup lang="ts">
import { ref } from 'vue';

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

function handleSubmit() {
  const text = title.value.trim();
  if (!text) return;
  emit('add', text, null, [], false, false, false);
  title.value = '';
}
</script>

<template>
  <form class="task-input" @submit.prevent="handleSubmit">
    <button type="submit" class="submit-btn" aria-label="添加">
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
    <input
      v-model="title"
      class="input-field"
      placeholder="快速添加任务..."
      maxlength="200"
      @keyup.enter="handleSubmit"
    />
  </form>
</template>

<style scoped>
.task-input {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) 0;
  padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border-light);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  min-width: 40px;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.submit-btn:active {
  transform: scale(0.9);
  background: var(--accent-hover);
}

.input-field {
  flex: 1;
  height: 40px;
  padding: 0 var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-full);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: var(--text-base);
  outline: none;
  transition: border-color var(--transition-fast);
}

.input-field:focus {
  border-color: var(--accent);
}

.input-field::placeholder {
  color: var(--text-muted);
}
</style>

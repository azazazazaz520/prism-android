<script setup lang="ts">
defineProps<{
  current: 'auto' | 'light' | 'dark';
}>();

const emit = defineEmits<{
  change: [theme: 'auto' | 'light' | 'dark'];
}>();

const options: { value: 'auto' | 'light' | 'dark'; label: string; icon: string }[] = [
  {
    value: 'auto',
    label: '跟随系统',
    icon: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
  },
  { value: 'light', label: '浅色', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18z' },
  { value: 'dark', label: '深色', icon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z' },
];
</script>

<template>
  <div class="theme-picker">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="theme-option"
      :class="{ active: current === opt.value }"
      @click="emit('change', opt.value)"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle v-if="opt.value === 'light'" cx="12" cy="12" r="5" />
        <path v-else-if="opt.value === 'dark'" :d="opt.icon" />
        <path v-else :d="opt.icon" />
      </svg>
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.theme-picker {
  display: flex;
  gap: var(--space-sm);
}

.theme-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 48px;
}

.theme-option:active {
  transform: scale(0.97);
}

.theme-option.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
</style>

<script setup lang="ts">
import AppIcon from './AppIcon.vue';

defineProps<{
  current: 'auto' | 'light' | 'dark';
}>();

const emit = defineEmits<{
  change: [theme: 'auto' | 'light' | 'dark'];
}>();

const options = [
  { value: 'auto', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
] as const;
</script>

<template>
  <div class="theme-picker">
    <template v-for="(option, index) in options" :key="option.value">
      <button
        class="ios-row"
        type="button"
        :aria-pressed="current === option.value"
        @click="emit('change', option.value)"
      >
        <span class="ios-icon"><AppIcon name="appearance" :size="17" /></span>
        <span class="ios-row-main">{{ option.label }}</span>
        <AppIcon
          v-if="current === option.value"
          class="check"
          name="check"
          :size="17"
          :stroke-width="2.4"
        />
      </button>
      <div v-if="index < options.length - 1" class="ios-sep inset"></div>
    </template>
  </div>
</template>

<style scoped>
.theme-picker {
  min-width: 0;
}

.ios-row-main {
  flex: 1 1 auto;
  min-width: 0;
}

.check {
  margin-left: auto;
  color: var(--tint);
}
</style>

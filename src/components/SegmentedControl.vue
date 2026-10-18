<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  options: { value: string; label: string }[];
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function select(value: string) {
  if (value !== props.modelValue) emit('update:modelValue', value);
}

function step(direction: number) {
  const index = props.options.findIndex((option) => option.value === props.modelValue);
  if (index < 0) return;
  const next = props.options[(index + direction + props.options.length) % props.options.length];
  select(next.value);
}
</script>

<template>
  <div class="segmented" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="option.value"
      class="seg"
      :class="{ active: option.value === modelValue }"
      type="button"
      role="tab"
      :aria-selected="option.value === modelValue"
      @click="select(option.value)"
      @keydown.left.prevent="step(-1)"
      @keydown.right.prevent="step(1)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: flex;
  height: 32px;
  padding: 2px;
  border-radius: 9px;
  background: var(--fill-3);
}

.seg {
  flex: 1;
  padding: 0;
  border-radius: 7px;
  color: var(--label-2);
  font-size: var(--f-footnote);
  font-weight: 600;
  letter-spacing: -0.01em;
  transition:
    color var(--dur-fast) var(--ease-standard),
    background-color var(--dur-fast) var(--ease-standard);
}

.seg.active {
  color: var(--label);
  background: var(--seg-thumb);
  box-shadow: var(--shadow-thumb);
}
</style>

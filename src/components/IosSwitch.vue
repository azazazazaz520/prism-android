<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  label: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<template>
  <button
    class="switch"
    :class="{ on: modelValue }"
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="knob" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
.switch {
  position: relative;
  flex: 0 0 51px;
  width: 51px;
  height: 31px;
  border-radius: 16px;
  background: var(--fill-1);
  transition: background-color var(--dur-base) var(--ease-standard);
}

.switch.on {
  background: var(--tint-fill);
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
  transition: transform var(--dur-base) var(--ease-spring);
}

.switch.on .knob {
  transform: translateX(20px);
}
</style>

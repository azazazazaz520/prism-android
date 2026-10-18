<script setup lang="ts">
import { useId } from 'vue';

withDefaults(
  defineProps<{
    show: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    destructive?: boolean;
  }>(),
  { confirmLabel: '确认', destructive: true },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const titleId = useId();
const messageId = useId();
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="alert-layer" @click.self="emit('cancel')" @keydown.esc="emit('cancel')">
      <div
        class="alert"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
      >
        <div class="alert-body">
          <h2 :id="titleId">{{ title }}</h2>
          <p :id="messageId">{{ message }}</p>
        </div>
        <div class="alert-actions">
          <button class="alert-btn" type="button" @click="emit('cancel')">取消</button>
          <button
            class="alert-btn confirm"
            :class="{ destructive }"
            type="button"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.alert-layer {
  position: fixed;
  z-index: 200;
  inset: 0;
  display: grid;
  padding: 24px;
  place-items: center;
  background: rgba(0, 0, 0, 0.32);
  animation: layer-in var(--dur-fast) var(--ease-standard);
}

.alert {
  width: 270px;
  overflow: hidden;
  border-radius: var(--r-alert);
  background: var(--bar-opaque);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  text-align: center;
  animation: alert-in var(--dur-base) var(--ease-spring);
}

.alert-body {
  padding: 19px 16px 17px;
}

.alert h2 {
  color: var(--label);
  font-size: var(--f-headline);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.alert p {
  margin-top: 4px;
  color: var(--label);
  font-size: var(--f-footnote);
  line-height: 18px;
}

.alert-actions {
  display: flex;
  border-top: 0.5px solid var(--sep);
}

.alert-btn {
  flex: 1;
  min-height: 44px;
  color: var(--tint);
  font-size: var(--f-headline);
  letter-spacing: -0.01em;
  transition: background-color var(--dur-fast) var(--ease-standard);
}

.alert-btn:active {
  background: var(--fill-3);
}

.alert-btn.confirm {
  border-left: 0.5px solid var(--sep);
  font-weight: 600;
}

.alert-btn.destructive {
  color: var(--red-text);
}

@keyframes layer-in {
  from {
    opacity: 0;
  }
}

@keyframes alert-in {
  from {
    opacity: 0;
    transform: scale(1.06);
  }
}
</style>

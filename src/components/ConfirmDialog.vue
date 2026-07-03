<script setup lang="ts">
defineProps<{
  show: boolean;
  title: string;
  message: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="overlay" @click.self="emit('cancel')">
      <div class="dialog">
        <h3 class="dialog-title">{{ title }}</h3>
        <p class="dialog-message">{{ message }}</p>
        <div class="dialog-actions">
          <button class="btn btn-cancel" @click="emit('cancel')">取消</button>
          <button class="btn btn-confirm" @click="emit('confirm')">确认</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-xl);
}

.dialog {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  width: 100%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.dialog-title {
  font-size: var(--text-h2);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.dialog-message {
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.dialog-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

.btn {
  padding: var(--space-sm) var(--space-xl);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 40px;
}

.btn:active {
  transform: scale(0.97);
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
}

.btn-confirm {
  background: var(--danger);
  color: #fff;
}
</style>

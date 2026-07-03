<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  token: string;
  isConfigured: boolean;
}>();

const emit = defineEmits<{
  save: [token: string];
  clear: [];
  generate: [];
}>();

const inputToken = ref('');
const showInput = ref(false);

function handleSave() {
  const t = inputToken.value.trim();
  if (t) {
    emit('save', t);
    inputToken.value = '';
    showInput.value = false;
  }
}

function handleGenerate() {
  const newToken = crypto.randomUUID();
  inputToken.value = newToken;
  emit('save', newToken);
}
</script>

<template>
  <div class="sync-setup">
    <div v-if="isConfigured" class="sync-configured">
      <div class="sync-status">
        <span class="status-dot"></span>
        <span>同步已配置</span>
      </div>
      <div class="token-display">
        <code>{{ token.slice(0, 8) }}...{{ token.slice(-4) }}</code>
      </div>
      <div class="sync-actions">
        <button class="btn btn-outline" @click="showInput = true">更换令牌</button>
        <button class="btn btn-danger" @click="emit('clear')">清除</button>
      </div>
    </div>

    <div v-else class="sync-unconfigured">
      <p class="sync-hint">输入与桌面端相同的同步令牌，或生成新令牌后在桌面端输入。</p>
      <div class="input-row">
        <input
          v-model="inputToken"
          class="token-input"
          placeholder="输入同步令牌 (UUID)"
          @keyup.enter="handleSave"
        />
      </div>
      <div class="sync-actions">
        <button class="btn btn-primary" @click="handleSave" :disabled="!inputToken.trim()">
          保存
        </button>
        <button class="btn btn-outline" @click="handleGenerate">生成新令牌</button>
      </div>
    </div>

    <!-- 更换令牌弹窗 -->
    <div v-if="showInput && isConfigured" class="overlay" @click.self="showInput = false">
      <div class="dialog">
        <h3>更换同步令牌</h3>
        <input
          v-model="inputToken"
          class="token-input"
          placeholder="输入新令牌"
          @keyup.enter="handleSave"
        />
        <div class="dialog-actions">
          <button class="btn btn-outline" @click="showInput = false">取消</button>
          <button class="btn btn-primary" @click="handleSave" :disabled="!inputToken.trim()">
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sync-setup {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
}

.sync-configured {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.sync-status {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--success);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
}

.token-display code {
  font-size: var(--text-sm);
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
}

.sync-unconfigured {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.sync-hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.5;
}

.input-row {
  display: flex;
  gap: var(--space-sm);
}

.token-input {
  flex: 1;
  height: 40px;
  padding: 0 var(--space-md);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--text-sm);
  outline: none;
}

.token-input:focus {
  border-color: var(--accent);
}

.sync-actions {
  display: flex;
  gap: var(--space-sm);
}

.btn {
  padding: var(--space-sm) var(--space-lg);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn:active {
  transform: scale(0.97);
}

.btn-primary {
  background: var(--accent);
  color: #fff;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
}

.btn-danger {
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
}

/* 弹窗 */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-xl);
}

.dialog {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.dialog h3 {
  font-size: var(--text-h2);
  color: var(--text-primary);
  margin: 0;
}

.dialog-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}
</style>

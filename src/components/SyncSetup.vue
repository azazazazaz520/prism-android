<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useSyncCode } from '../composables/useSyncCode';

const { isLoggedIn, isLoading: authLoading, error: authError } = useAuth();
const {
  isPairing,
  pairError,
  getSyncCode,
  hasProfile,
  generateSyncCode,
  joinProfile,
  restoreProfile,
} = useSyncCode();

const syncCode = ref<string | null>(null);
const paired = ref(false);
const inputCode = ref('');
const localError = ref<string | null>(null);

onMounted(async () => {
  await restoreProfile();
  syncCode.value = await getSyncCode();
  paired.value = await hasProfile();
});

async function handleGenerate() {
  localError.value = null;
  try {
    const code = await generateSyncCode();
    syncCode.value = code;
    paired.value = true;
  } catch (e) {
    localError.value = pairError.value || (e as Error).message;
  }
}

async function handleJoin() {
  const code = inputCode.value.trim();
  if (!code) return;
  localError.value = null;
  try {
    await joinProfile(code);
    syncCode.value = code;
    paired.value = true;
    inputCode.value = '';
  } catch (e) {
    localError.value = pairError.value || (e as Error).message;
  }
}
</script>

<template>
  <div class="sync-setup">
    <!-- 未登录 / 初始化中 -->
    <div v-if="!isLoggedIn" class="sync-state">
      <p class="sync-hint" v-if="authLoading">正在初始化...</p>
      <p class="sync-hint" v-else-if="authError">初始化失败：{{ authError }}</p>
    </div>

    <!-- 已登录 -->
    <template v-if="isLoggedIn">
      <!-- 已配对 -->
      <div v-if="paired" class="sync-configured">
        <div class="sync-status">
          <span class="status-dot"></span>
          <span>已配对</span>
        </div>
        <div class="token-display">
          <code>{{ syncCode }}</code>
        </div>
        <p class="sync-hint">
          在其他设备上输入此同步码即可共享任务数据。请妥善保管，丢失后无法恢复。
        </p>
      </div>

      <!-- 未配对 -->
      <div v-else class="sync-unconfigured">
        <p class="sync-hint">生成同步码后，可在其他设备输入此码完成配对，实现跨设备任务同步。</p>

        <div class="sync-actions">
          <button class="btn btn-primary" :disabled="isPairing" @click="handleGenerate">
            <span v-if="isPairing" class="spinner"></span>
            <span v-else>生成同步码</span>
          </button>
        </div>

        <div class="divider">
          <span>或</span>
        </div>

        <div class="input-row">
          <input
            v-model="inputCode"
            class="text-input"
            type="text"
            placeholder="输入已有同步码"
            @keyup.enter="handleJoin"
          />
          <button
            class="btn btn-outline"
            :disabled="!inputCode.trim() || isPairing"
            @click="handleJoin"
          >
            配对
          </button>
        </div>

        <div v-if="localError" class="error-msg">{{ localError }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sync-setup {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
}

.sync-state {
  text-align: center;
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
  font-size: var(--text-xs);
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  word-break: break-all;
  display: block;
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
  margin: 0;
}

.input-row {
  display: flex;
  gap: var(--space-sm);
}

.text-input {
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

.text-input:focus {
  border-color: var(--accent);
}

.error-msg {
  font-size: var(--text-sm);
  color: var(--danger);
  padding: var(--space-xs) var(--space-sm);
  background: var(--danger-light);
  border-radius: var(--radius-sm);
}

.sync-actions {
  display: flex;
  gap: var(--space-sm);
}

.divider {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-light);
}

.btn {
  padding: var(--space-sm) var(--space-lg);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
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

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

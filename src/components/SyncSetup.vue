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
  updateSyncCode,
  restoreProfile,
} = useSyncCode();

const syncCode = ref<string | null>(null);
const paired = ref(false);
const inputCode = ref('');
const localError = ref<string | null>(null);
const isEditing = ref(false);
const editCode = ref('');

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

function startEdit() {
  editCode.value = syncCode.value || '';
  isEditing.value = true;
  localError.value = null;
}

function cancelEdit() {
  isEditing.value = false;
  editCode.value = '';
  localError.value = null;
}

async function handleEdit() {
  const code = editCode.value.trim();
  if (!code || code === syncCode.value) {
    cancelEdit();
    return;
  }
  localError.value = null;
  try {
    await updateSyncCode(code);
    syncCode.value = code;
    isEditing.value = false;
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

        <!-- 编辑模式 -->
        <div v-if="isEditing" class="edit-row">
          <input
            v-model="editCode"
            class="text-input"
            type="text"
            placeholder="输入新同步码"
            @keyup.enter="handleEdit"
          />
          <button class="btn btn-primary btn-sm" :disabled="isPairing" @click="handleEdit">
            保存
          </button>
          <button class="btn btn-outline btn-sm" :disabled="isPairing" @click="cancelEdit">
            取消
          </button>
        </div>

        <!-- 展示模式 -->
        <div v-else class="token-display">
          <code>{{ syncCode }}</code>
          <button class="btn-icon" title="编辑同步码" @click="startEdit">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>

        <p class="sync-hint">
          在其他设备上输入此同步码即可共享任务数据。请妥善保管，丢失后无法恢复。
        </p>

        <div v-if="localError" class="error-msg">{{ localError }}</div>
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

.token-display {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.token-display code {
  flex: 1;
  font-size: var(--text-xs);
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  word-break: break-all;
}

.edit-row {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.edit-row .text-input {
  flex: 1;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.btn-icon:hover {
  color: var(--text-primary);
  border-color: var(--accent);
}

.btn-sm {
  padding: var(--space-xs) var(--space-md);
  font-size: var(--text-xs);
  height: 36px;
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

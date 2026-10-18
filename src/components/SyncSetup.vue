<script setup lang="ts">
import { onMounted, ref } from 'vue';
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
const copyState = ref<'idle' | 'copied' | 'error'>('idle');

onMounted(async () => {
  await restoreProfile();
  syncCode.value = await getSyncCode();
  paired.value = await hasProfile();
});

async function handleGenerate() {
  localError.value = null;
  copyState.value = 'idle';
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

async function copySyncCode() {
  if (!syncCode.value) return;
  try {
    if (!navigator.clipboard) throw new Error('clipboard-unavailable');
    await navigator.clipboard.writeText(syncCode.value);
    copyState.value = 'copied';
    window.setTimeout(() => {
      copyState.value = 'idle';
    }, 2400);
  } catch {
    copyState.value = 'error';
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
    copyState.value = 'idle';
  } catch (e) {
    localError.value = pairError.value || (e as Error).message;
  }
}
</script>

<template>
  <div class="sync-setup">
    <div v-if="!isLoggedIn" class="sync-state" aria-live="polite">
      <p v-if="authLoading" class="sync-hint">正在准备安全同步…</p>
      <p v-else-if="authError" class="error-msg">初始化失败：{{ authError }}</p>
      <p v-else class="sync-hint">同步服务暂不可用，请稍后重试。</p>
    </div>

    <template v-else>
      <div v-if="paired" class="sync-configured">
        <div class="sync-intro">
          <span class="status-badge"><span class="status-dot"></span>已连接</span>
          <p>使用同一同步码的设备会共享任务的新增、完成和删除状态。</p>
        </div>

        <div v-if="isEditing" class="edit-block">
          <label class="field-label" for="edit-sync-code">更换同步码</label>
          <div class="edit-row">
            <input
              id="edit-sync-code"
              v-model="editCode"
              class="text-input"
              type="text"
              inputmode="text"
              autocomplete="off"
              placeholder="输入新的同步码"
              @keyup.enter="handleEdit"
            />
            <button class="btn btn-primary" type="button" :disabled="isPairing" @click="handleEdit">
              保存
            </button>
            <button class="btn btn-outline" type="button" :disabled="isPairing" @click="cancelEdit">
              取消
            </button>
          </div>
        </div>

        <div v-else class="code-card">
          <div class="code-heading">
            <span class="field-label">同步码</span>
            <button class="text-action" type="button" @click="startEdit">更换</button>
          </div>
          <code>{{ syncCode }}</code>
          <button class="copy-button" type="button" @click="copySyncCode">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            <span>{{ copyState === 'copied' ? '已复制' : '复制同步码' }}</span>
          </button>
        </div>

        <p class="sync-hint">
          在其他设备上输入此同步码即可加入。同步码只保存在你的设备上，请妥善保管。
        </p>
        <p v-if="copyState === 'error'" class="copy-hint" aria-live="polite">
          复制失败，请长按同步码手动复制。
        </p>
        <p v-if="localError" class="error-msg" role="alert">{{ localError }}</p>
      </div>

      <div v-else class="sync-unconfigured">
        <p class="sync-hint">先在一台设备生成同步码，再在其他设备输入同一代码完成配对。</p>

        <button
          class="btn btn-primary primary-action"
          type="button"
          :disabled="isPairing"
          @click="handleGenerate"
        >
          <span v-if="isPairing" class="spinner"></span>
          <span>{{ isPairing ? '正在连接…' : '生成同步码' }}</span>
        </button>

        <div class="divider"><span>已有同步码</span></div>

        <div class="input-block">
          <label class="field-label" for="join-sync-code">输入已有同步码</label>
          <div class="input-row">
            <input
              id="join-sync-code"
              v-model="inputCode"
              class="text-input"
              type="text"
              inputmode="text"
              autocomplete="off"
              placeholder="粘贴同步码"
              @keyup.enter="handleJoin"
            />
            <button
              class="btn btn-outline"
              type="button"
              :disabled="!inputCode.trim() || isPairing"
              @click="handleJoin"
            >
              配对
            </button>
          </div>
        </div>

        <p v-if="localError" class="error-msg" role="alert">{{ localError }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sync-setup {
  min-width: 0;
}

.sync-state {
  min-height: 72px;
  display: grid;
  place-items: center;
  text-align: center;
}

.sync-configured,
.sync-unconfigured,
.sync-intro,
.edit-block,
.input-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.sync-intro {
  gap: 6px;
}

.sync-intro p,
.sync-hint,
.copy-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
  line-height: 1.55;
}

.status-badge {
  display: inline-flex;
  width: fit-content;
  min-height: 32px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  color: var(--success);
  background: var(--accent-light);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
}

.field-label {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
}

.code-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
}

.code-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.code-card code {
  display: block;
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  user-select: text;
}

.text-action {
  min-height: 40px;
  padding: 0 4px;
  border: 0;
  color: var(--accent);
  background: transparent;
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
}

.copy-button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--accent-muted);
  border-radius: var(--radius-md);
  color: var(--accent);
  background: var(--accent-light);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
}

.copy-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.copy-hint {
  color: var(--warning);
}

.error-msg {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--danger);
  background: var(--danger-light);
  font-size: var(--text-sm);
  line-height: 1.45;
}

.edit-row,
.input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--space-sm);
  align-items: center;
}

.input-row {
  grid-template-columns: minmax(0, 1fr) auto;
}

.text-input {
  width: 100%;
  min-height: 48px;
  padding: 0 13px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  background: var(--bg-primary);
  font-size: 16px;
  outline: none;
}

.text-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.btn {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}

.btn:active {
  transform: scale(0.98);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-primary {
  border: 1px solid var(--accent);
  color: #fff;
  background: var(--accent);
}

.btn-primary:hover,
.btn-primary:focus-visible {
  background: var(--accent-hover);
}

.btn-outline {
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  background: transparent;
}

.btn-outline:hover,
.btn-outline:focus-visible {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-light);
}

.primary-action {
  width: 100%;
}

.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.divider::before,
.divider::after {
  content: '';
  height: 1px;
  flex: 1;
  background: var(--border-light);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 420px) {
  .edit-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .edit-row .btn-outline {
    grid-column: 2;
  }
}
</style>

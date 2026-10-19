<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppIcon from './AppIcon.vue';
import { useAuth } from '../composables/useAuth';
import { useSyncCode } from '../composables/useSyncCode';

const { isLoggedIn, isLoading: authLoading, errorHint, initAuth } = useAuth();
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

const authDescription = computed(() => {
  if (authLoading.value) return '正在验证匿名会话';
  if (errorHint.value) return errorHint.value;
  if (!navigator.onLine) return '当前离线，任务已保存在本机';
  return '任务已保存在本机，连接恢复后会自动重试';
});

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
    <div v-if="!isLoggedIn" class="ios-card">
      <div class="ios-row auth-row" aria-live="polite">
        <span class="ios-icon warm"><AppIcon name="cloud-off" :size="17" /></span>
        <div class="ios-row-main auth-copy">
          <span class="auth-title">{{ authLoading ? '正在连接同步服务…' : '同步服务未连接' }}</span>
          <span class="auth-desc">{{ authDescription }}</span>
        </div>
        <button v-if="!authLoading" class="ios-link" type="button" @click="initAuth()">重试</button>
        <span v-else class="auth-spinner" aria-hidden="true"></span>
      </div>
    </div>

    <template v-else>
      <div v-if="paired" class="ios-card">
        <div class="ios-row">
          <span class="ios-icon"><AppIcon name="repeat" :size="17" /></span>
          <span class="ios-row-main">同步状态</span>
          <span class="ios-value status-value"
            ><span class="dot" aria-hidden="true"></span>已连接</span
          >
        </div>

        <div class="ios-sep inset"></div>

        <div class="ios-row">
          <span class="ios-icon"><AppIcon name="copy" :size="17" /></span>
          <span class="ios-row-main">同步码</span>
          <code class="code">{{ syncCode }}</code>
          <button class="ios-link copy" type="button" @click="copySyncCode">
            {{ copyState === 'copied' ? '已复制' : '复制' }}
          </button>
        </div>

        <div class="ios-sep inset"></div>

        <button class="ios-row tint-row" type="button" @click="startEdit">
          <span class="ios-icon"><AppIcon name="plus" :size="17" /></span>
          <span class="ios-row-main">更换同步码</span>
          <AppIcon class="ios-chevron" name="chevron" :size="13" />
        </button>

        <div v-if="isEditing" class="panel">
          <label class="panel-label" for="edit-sync-code">新同步码</label>
          <div class="panel-row">
            <input
              id="edit-sync-code"
              v-model="editCode"
              class="panel-input"
              type="text"
              inputmode="text"
              autocomplete="off"
              placeholder="输入新的同步码"
              @keyup.enter="handleEdit"
            />
            <button class="ios-link" type="button" :disabled="isPairing" @click="handleEdit">
              保存
            </button>
            <button class="ios-link muted" type="button" :disabled="isPairing" @click="cancelEdit">
              取消
            </button>
          </div>
        </div>

        <p v-if="copyState === 'error'" class="ios-row error-row" aria-live="polite">
          复制失败，请长按同步码手动复制。
        </p>
        <p v-if="localError" class="ios-row error-row" role="alert">{{ localError }}</p>
      </div>

      <div v-else class="ios-card">
        <button
          class="ios-row tint-row"
          type="button"
          :disabled="isPairing"
          @click="handleGenerate"
        >
          <span class="ios-icon"><AppIcon name="plus" :size="17" /></span>
          <span class="ios-row-main">{{ isPairing ? '正在连接…' : '生成同步码' }}</span>
        </button>

        <div class="ios-sep inset"></div>

        <div class="ios-row">
          <span class="ios-icon"><AppIcon name="copy" :size="17" /></span>
          <input
            v-model="inputCode"
            class="join-input"
            type="text"
            inputmode="text"
            autocomplete="off"
            placeholder="输入已有同步码"
            aria-label="已有同步码"
            @keyup.enter="handleJoin"
          />
          <button
            class="ios-link"
            type="button"
            :disabled="!inputCode.trim() || isPairing"
            @click="handleJoin"
          >
            配对
          </button>
        </div>

        <p v-if="localError" class="ios-row error-row" role="alert">{{ localError }}</p>
      </div>
    </template>

    <p class="ios-group-foot">
      <template v-if="!isLoggedIn">同步失败不影响本地任务；网络恢复后会自动重试。</template>
      <template v-else-if="paired"> 同一同步码的设备共享任务的新增、完成与删除。 </template>
      <template v-else> 先在一台设备生成同步码，再在其他设备输入同一代码完成配对。 </template>
    </p>
  </div>
</template>

<style scoped>
.sync-setup {
  min-width: 0;
}

.ios-row-main {
  flex: 1 1 auto;
  min-width: 0;
}

.auth-row {
  align-items: flex-start;
  padding-top: 12px;
  padding-bottom: 12px;
}

.auth-row .ios-link {
  flex: 0 0 auto;
  white-space: nowrap;
}

.auth-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 3px;
}

.auth-title {
  color: var(--label);
  font-size: var(--f-body);
  letter-spacing: -0.01em;
}

.auth-desc {
  color: var(--label-2);
  font-size: var(--f-footnote);
  line-height: 18px;
}

.auth-spinner {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  margin-top: 6px;
  border: 2px solid var(--fill-1);
  border-top-color: var(--tint);
  border-radius: 50%;
  animation: auth-spin 0.8s linear infinite;
}

@keyframes auth-spin {
  to {
    transform: rotate(360deg);
  }
}

.status-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
}

.code {
  overflow: hidden;
  max-width: 160px;
  color: var(--label-2);
  font-family: var(--font-mono);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy {
  flex: 0 0 auto;
  font-size: var(--f-subhead);
}

.tint-row {
  color: var(--tint);
}

.tint-row:disabled {
  opacity: 0.5;
}

.join-input {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--f-body);
}

.panel {
  padding: 10px 16px 14px;
  border-top: 0.5px solid var(--sep);
  background: var(--fill-3);
}

.panel-label {
  display: block;
  color: var(--label-2);
  font-size: var(--f-footnote);
  font-weight: 600;
}

.panel-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.panel-input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 40px;
  padding: 0 12px;
  border-radius: var(--r-control);
  background: var(--bg-elevated);
  font-size: var(--f-body);
}

.panel-input:focus {
  outline: 2px solid var(--tint);
  outline-offset: -2px;
}

.ios-link.muted {
  color: var(--label-2);
}

.ios-link:disabled {
  opacity: 0.4;
}

.error-row {
  color: var(--red-text);
  font-size: var(--f-footnote);
  line-height: 18px;
}
</style>

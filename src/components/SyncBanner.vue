<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'unauthorized';

const props = defineProps<{
  status: SyncStatus;
  count: number;
  unreachable?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
  openSettings: [];
}>();

const mode = computed<'offline' | 'error' | 'unauthorized' | 'unreachable' | 'syncing' | null>(
  () => {
    if (props.status === 'offline') return 'offline';
    if (props.status === 'unauthorized') return 'unauthorized';
    if (props.unreachable) return 'unreachable';
    if (props.status === 'error') return 'error';
    if (props.status === 'syncing' || props.count > 0) return 'syncing';
    return null;
  },
);

const title = computed(() => {
  switch (mode.value) {
    case 'offline':
      return props.count ? `离线 · ${props.count} 项更改待同步` : '离线';
    case 'error':
      return props.count ? `同步失败 · ${props.count} 项待同步` : '同步失败';
    case 'unauthorized':
      return '同步未授权';
    case 'unreachable':
      return '同步服务未连接';
    case 'syncing':
      return props.count ? `正在同步 ${props.count} 项更改` : '正在同步';
    default:
      return '';
  }
});

const description = computed(() => {
  switch (mode.value) {
    case 'offline':
      return '已保存到本机，联网后自动上传';
    case 'error':
      return '点按重试，任务仍保存在本机';
    case 'unauthorized':
      return '在设置中重新配对同步码';
    case 'unreachable':
      return '任务已保存在本机，点按重试';
    case 'syncing':
      return '请保持网络连接';
    default:
      return '';
  }
});

const icon = computed(() => {
  if (mode.value === 'offline' || mode.value === 'unreachable') return 'cloud-off';
  return mode.value === 'syncing' ? 'repeat' : 'info';
});

function activate() {
  if (!mode.value) return;
  if (mode.value === 'unauthorized') {
    emit('openSettings');
    return;
  }
  if (mode.value !== 'syncing') emit('retry');
}
</script>

<template>
  <div
    v-if="mode"
    class="sync-banner"
    :class="mode"
    role="status"
    aria-live="polite"
    :tabindex="mode === 'syncing' ? -1 : 0"
    @click="activate"
    @keydown.enter="activate"
  >
    <AppIcon class="banner-icon" :name="icon" :size="18" :stroke-width="1.9" />
    <div class="banner-copy">
      <p class="banner-title">{{ title }}</p>
      <p class="banner-desc">{{ description }}</p>
    </div>
  </div>
</template>

<style scoped>
.sync-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 14px;
  background: var(--bg-elevated);
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.16),
    0 0 0 0.5px var(--sep);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-standard);
}

.sync-banner:active {
  transform: scale(0.99);
}

.sync-banner.syncing {
  cursor: default;
}

.banner-icon {
  margin-top: 1px;
  flex: 0 0 18px;
  color: var(--orange);
}

.sync-banner.unreachable .banner-icon,
.sync-banner.error .banner-icon {
  color: var(--red-text);
}

.sync-banner.syncing .banner-icon {
  color: var(--tint);
  animation: spin 2s linear infinite;
}

.banner-copy {
  min-width: 0;
}

.banner-title {
  color: var(--label);
  font-size: var(--f-footnote);
  font-weight: 600;
  line-height: 18px;
}

.banner-desc {
  margin-top: 1px;
  color: var(--label-2);
  font-size: var(--f-footnote);
  line-height: 18px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .banner-icon {
    animation: none !important;
  }
}
</style>

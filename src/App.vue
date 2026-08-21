<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from './composables/useAuth';
import { useKeyboardViewport } from './composables/useKeyboardViewport';
import { useTaskStore } from './composables/useTaskStore';
import { lastSyncAt, offlineQueueCount, syncStatus } from './composables/useSync';
import { useTheme } from './composables/useTheme';
import { useSystemInsets } from './composables/useSystemInsets';

const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

const router = useRouter();
const route = useRoute();
const { loadAll, refreshTasks, initSync } = useTaskStore();
const { load: loadTheme } = useTheme();
const { initAuth } = useAuth();

useKeyboardViewport();
useSystemInsets();

onMounted(async () => {
  await initAuth();
  await Promise.all([loadAll(), loadTheme()]);
  initSync();
  if (isTauri) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    let lastRefresh = 0;
    await appWindow.listen('tauri://focus', () => {
      const now = Date.now();
      if (now - lastRefresh < 5000) return;
      lastRefresh = now;
      refreshTasks();
    });
  }
});

function currentTab(): string {
  const name = route.name;
  return typeof name === 'string' ? name : 'tasks';
}

function switchTab(name: string) {
  router.push({ name });
}

function syncLabel(): string {
  switch (syncStatus.value) {
    case 'syncing':
      return '正在同步';
    case 'offline':
      return offlineQueueCount.value
        ? `离线 · ${offlineQueueCount.value} 项待同步`
        : '离线，已保存到本地';
    case 'error':
      return offlineQueueCount.value
        ? `同步失败 · ${offlineQueueCount.value} 项待同步`
        : '同步失败，点击重试';
    case 'unauthorized':
      return '同步未授权';
    default:
      return lastSyncAt.value ? '已同步' : '同步';
  }
}

function syncShortLabel(): string {
  switch (syncStatus.value) {
    case 'syncing':
      return '同步中';
    case 'offline':
      return '离线';
    case 'error':
      return '重试';
    case 'unauthorized':
      return '未授权';
    default:
      return lastSyncAt.value ? '已同步' : '同步';
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="top-bar">
      <div class="brand" aria-label="Prism">
        <span class="brand-mark" aria-hidden="true">P</span>
        <span class="brand-name">Prism</span>
      </div>

      <button
        class="sync-control"
        :class="[syncStatus, { syncing: syncStatus === 'syncing', error: syncStatus === 'error' }]"
        :aria-label="syncLabel()"
        :title="syncLabel()"
        @click="refreshTasks()"
      >
        <span class="sync-dot" aria-hidden="true"></span>
        <span class="sync-label sync-label-short">{{ syncShortLabel() }}</span>
        <span class="sync-label sync-label-long">{{ syncLabel() }}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
      </button>
    </header>

    <main class="main-body">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <nav class="bottom-nav" aria-label="主导航">
      <button
        class="nav-item"
        :class="{ active: currentTab() === 'tasks' }"
        @click="switchTab('tasks')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
        <span>任务</span>
      </button>
      <button
        class="nav-item"
        :class="{ active: currentTab() === 'settings' }"
        @click="switchTab('settings')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
          />
        </svg>
        <span>设置</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  --bottom-nav-height: calc(56px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  height: var(--viewport-height, 100dvh);
  max-height: 100%;
  min-height: 0;
  min-width: 0;
  width: 100%;
  background: var(--bg-secondary);
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 12px 20px;
  padding-top: calc(12px + max(env(safe-area-inset-top, 0px), var(--native-statusbar-inset, 0px)));
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.brand,
.sync-control {
  display: flex;
  align-items: center;
}

.brand {
  gap: 8px;
  color: var(--text-primary);
}

.brand-mark {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 7px;
  color: #fff;
  background: var(--accent);
  font-size: 12px;
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.brand-name {
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
}

.sync-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: var(--success);
}

.sync-control.syncing .sync-dot {
  background: var(--accent);
  animation: sync-pulse 1s ease-in-out infinite;
}

.sync-control.error .sync-dot,
.sync-control.offline .sync-dot,
.sync-control.unauthorized .sync-dot {
  background: var(--danger);
}

.sync-control.syncing {
  color: var(--accent);
}

.sync-control.error,
.sync-control.offline,
.sync-control.unauthorized {
  color: var(--danger);
}

.sync-control {
  gap: 7px;
  min-height: 48px;
  min-width: 48px;
  padding: 0 10px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  background: var(--bg-primary);
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.sync-control svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.sync-control.syncing svg {
  animation: sync-rotate 1s linear infinite;
}

.sync-control.error {
  color: var(--danger);
  border-color: var(--danger-light);
  background: var(--danger-light);
}

.sync-control:active,
.sync-control:focus-visible {
  color: var(--accent);
  border-color: var(--accent-muted);
  background: var(--accent-light);
}

.sync-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.sync-label-short {
  display: none;
}

.main-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-secondary);
}

.bottom-nav {
  display: flex;
  border-top: 1px solid var(--border-light);
  background: var(--bg-primary);
  padding-bottom: max(env(safe-area-inset-bottom, 0px), var(--native-navbar-inset, 0px));
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  min-height: 56px;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 0;
  border: 0;
  color: var(--text-muted);
  background: transparent;
  font-size: var(--text-xs);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.nav-item svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.nav-item.active {
  color: var(--accent);
}

.nav-item:active {
  opacity: 0.7;
}

@keyframes sync-rotate {
  to {
    transform: rotate(360deg);
  }
}

@keyframes sync-pulse {
  50% {
    opacity: 0.35;
  }
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: all var(--transition-normal) var(--easing-standard);
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@media (max-width: 420px) {
  .top-bar {
    padding-right: 12px;
    padding-left: 12px;
  }

  .sync-control {
    gap: 6px;
    padding: 0 9px;
  }

  .sync-label-long {
    display: none;
  }

  .sync-label-short {
    display: inline;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>

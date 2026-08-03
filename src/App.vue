<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTaskStore } from './composables/useTaskStore';
import { useTheme } from './composables/useTheme';
import { useAuth } from './composables/useAuth';
import { useKeyboardViewport } from './composables/useKeyboardViewport';
import { lastSyncAt, syncStatus } from './composables/useSync';

/** 检测是否运行在 Tauri 原生环境中，用于条件加载平台 API */
const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

const router = useRouter();
const route = useRoute();
const { loadAll, refreshTasks, initSync } = useTaskStore();
const { load: loadTheme } = useTheme();
const { initAuth } = useAuth();

useKeyboardViewport();

/**
 * 应用启动流程：
 * 1. 匿名认证 → 2. 加载本地数据 + 主题 → 3. 初始化同步订阅
 * 同步初始化放在数据加载之后，确保本地数据就绪后再合并远端数据。
 */
onMounted(async () => {
  await initAuth();
  await Promise.all([loadAll(), loadTheme()]);
  initSync();
  if (isTauri) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    let lastRefresh = 0;
    // 窗口恢复焦点时刷新数据，确保从其他应用切回后数据为最新
    await appWindow.listen('tauri://focus', () => {
      const now = Date.now();
      if (now - lastRefresh < 5000) return;
      lastRefresh = now;
      refreshTasks();
    });
  }
});

/** 当前 Tab */
function currentTab(): string {
  const name = route.name;
  if (typeof name === 'string') return name;
  return 'tasks';
}

function switchTab(name: string) {
  router.push({ name });
}

function syncLabel(): string {
  switch (syncStatus.value) {
    case 'syncing':
      return '正在同步';
    case 'offline':
      return '离线，已保存到本机';
    case 'error':
      return '同步失败，点击重试';
    case 'unauthorized':
      return '同步未授权';
    default:
      return lastSyncAt.value ? '已同步' : '同步';
  }
}
</script>

<template>
  <div class="app-shell">
    <!-- 顶部栏 -->
    <header class="top-bar">
      <h1 class="brand">Prism</h1>
      <span class="sync-state" :class="syncStatus">
        {{ syncLabel() }}
      </span>
      <button
        class="sync-btn"
        :class="{ syncing: syncStatus === 'syncing', error: syncStatus === 'error' }"
        :aria-label="syncLabel()"
        :title="syncLabel()"
        @click="refreshTasks()"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
      </button>
    </header>

    <!-- 主内容区 -->
    <main class="main-body">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 底部 Tab 导航 -->
    <nav class="bottom-nav" aria-label="主导航">
      <button
        class="nav-item"
        :class="{ active: currentTab() === 'tasks' }"
        @click="switchTab('tasks')"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
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
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
          />
        </svg>
        <span>我的</span>
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
  background: var(--bg-primary);
}

/* ── 顶部栏 ──────────────────────────── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 96px;
  padding: var(--space-xl) var(--space-xl);
  padding-top: calc(var(--space-xl) + env(safe-area-inset-top, 0px));
  padding-bottom: var(--space-xl);
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.brand {
  font-size: 24px;
  font-weight: var(--font-weight-bold);
  color: var(--accent);
  margin: 0;
}

.sync-btn svg {
  width: 28px;
  height: 28px;
}

.sync-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sync-btn.syncing svg {
  animation: sync-rotate 1s linear infinite;
}

.sync-btn.error {
  color: var(--danger);
}

.sync-state {
  flex: 1;
  min-width: 0;
  margin-left: var(--space-sm);
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-base);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-state.syncing {
  color: var(--accent);
}

.sync-state.error,
.sync-state.offline,
.sync-state.unauthorized {
  color: var(--danger);
}

.sync-btn:active {
  background: var(--accent-light);
  color: var(--accent);
}

/* ── 主内容区 ──────────────────────────── */
.main-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

@keyframes sync-rotate {
  to {
    transform: rotate(360deg);
  }
}

/* ── 底部 Tab 导航 ────────────────────── */
.bottom-nav {
  display: flex;
  border-top: 1px solid var(--border-light);
  background: var(--bg-primary);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  flex-shrink: 0;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--space-sm) 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: color var(--transition-fast);
  min-height: 64px;
}

.nav-item svg {
  width: 28px;
  height: 28px;
}

.nav-item.active {
  color: var(--accent);
}

.nav-item:active {
  opacity: 0.7;
}

/* ── 页面切换过渡 ────────────────────── */
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
</style>

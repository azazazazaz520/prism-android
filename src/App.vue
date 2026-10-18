<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppIcon from './components/AppIcon.vue';
import SyncBanner from './components/SyncBanner.vue';
import { useAuth } from './composables/useAuth';
import { useKeyboardViewport } from './composables/useKeyboardViewport';
import { useTaskStore } from './composables/useTaskStore';
import { offlineQueueCount, syncStatus } from './composables/useSync';
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

const bannerVisible = computed(
  () =>
    syncStatus.value === 'offline' ||
    syncStatus.value === 'error' ||
    syncStatus.value === 'unauthorized' ||
    syncStatus.value === 'syncing' ||
    offlineQueueCount.value > 0,
);

function currentTab(): string {
  const name = route.name;
  return typeof name === 'string' ? name : 'tasks';
}

function switchTab(name: string) {
  router.push({ name });
}
</script>

<template>
  <div class="app-shell">
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <Transition name="banner">
      <div v-if="bannerVisible" class="banner-slot">
        <SyncBanner
          class="app-banner"
          :status="syncStatus"
          :count="offlineQueueCount"
          @retry="refreshTasks()"
          @open-settings="switchTab('settings')"
        />
      </div>
    </Transition>

    <nav class="tabbar" aria-label="主导航">
      <button
        class="tab"
        :class="{ active: currentTab() === 'tasks' }"
        type="button"
        :aria-current="currentTab() === 'tasks' ? 'page' : undefined"
        @click="switchTab('tasks')"
      >
        <AppIcon name="list" :size="25" :stroke-width="1.7" />
        <span>任务</span>
      </button>
      <button
        class="tab"
        :class="{ active: currentTab() === 'settings' }"
        type="button"
        :aria-current="currentTab() === 'settings' ? 'page' : undefined"
        @click="switchTab('settings')"
      >
        <AppIcon name="gear" :size="25" :stroke-width="1.7" />
        <span>设置</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  --tabbar-total: calc(
    var(--tabbar-h) + max(env(safe-area-inset-bottom, 0px), var(--native-navbar-inset, 0px))
  );
  display: flex;
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: var(--viewport-height, 100dvh);
  max-height: 100%;
  flex-direction: column;
  padding-top: max(env(safe-area-inset-top, 0px), var(--native-statusbar-inset, 0px));
  background: var(--bg);
  color: var(--label);
}

.app-main {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.banner-slot {
  flex: 0 0 auto;
  padding: 8px 12px 4px;
}

.app-banner {
  max-width: 520px;
  margin: 0 auto;
}

.tabbar {
  position: relative;
  z-index: 20;
  display: flex;
  flex: 0 0 auto;
  height: var(--tabbar-total);
  padding-top: 5px;
  padding-bottom: max(env(safe-area-inset-bottom, 0px), var(--native-navbar-inset, 0px));
  box-shadow: 0 -0.5px 0 var(--sep);
  background: var(--bar);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .tabbar {
    background: var(--bar-opaque);
  }
}

.tab {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--label-3);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
  transition: color var(--dur-fast) var(--ease-standard);
}

.tab:active {
  opacity: 0.7;
}

.tab.active {
  color: var(--tint);
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-standard),
    transform var(--dur-base) var(--ease-standard);
}

.page-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

.banner-enter-active,
.banner-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-standard),
    transform var(--dur-base) var(--ease-spring);
}

.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

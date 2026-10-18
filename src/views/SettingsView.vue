<script setup lang="ts">
import { ref } from 'vue';
import AppIcon from '../components/AppIcon.vue';
import PageHeader from '../components/PageHeader.vue';
import SyncSetup from '../components/SyncSetup.vue';
import ThemePicker from '../components/ThemePicker.vue';
import { useTheme } from '../composables/useTheme';

const { currentTheme, setTheme } = useTheme();

const scrolled = ref(false);
const scrollEl = ref<HTMLElement | null>(null);

let scrollTicking = false;
function onScroll() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    scrolled.value = (scrollEl.value?.scrollTop ?? 0) > 12;
    scrollTicking = false;
  });
}
</script>

<template>
  <div class="settings-page">
    <div ref="scrollEl" class="page-scroll" @scroll.passive="onScroll">
      <PageHeader title="设置" :scrolled="scrolled" />

      <div class="content">
        <section class="ios-group">
          <div class="ios-group-head">
            <span>同步</span>
            <span class="ios-count">任务数据</span>
          </div>
          <SyncSetup />
        </section>

        <section class="ios-group">
          <div class="ios-group-head"><span>外观</span></div>
          <div class="ios-card">
            <ThemePicker :current="currentTheme" @change="setTheme" />
          </div>
          <p class="ios-group-foot">跟随系统时，外观会随设备的深色模式自动切换。</p>
        </section>

        <section class="ios-group">
          <div class="ios-group-head"><span>关于</span></div>
          <div class="ios-card">
            <div class="ios-row">
              <span class="ios-icon"><AppIcon name="info" :size="17" /></span>
              <span class="ios-row-main">版本</span>
              <span class="ios-value">0.1.0</span>
            </div>
            <div class="ios-sep inset"></div>
            <div class="ios-row">
              <span class="ios-icon"><AppIcon name="copy" :size="17" /></span>
              <span class="ios-row-main">数据方式</span>
              <span class="ios-value">本地优先</span>
            </div>
          </div>
          <p class="ios-group-foot">Prism · 离线优先的任务应用</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}

.page-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 32px;
}

.content {
  padding: 24px var(--page-x) 0;
}

.ios-row-main {
  flex: 1 1 auto;
  min-width: 0;
}

.ios-group:last-child {
  margin-bottom: 0;
}
</style>

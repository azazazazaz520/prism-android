<script setup lang="ts">
import { useTheme } from '../composables/useTheme';
import { useAuth } from '../composables/useAuth';
import SyncSetup from '../components/SyncSetup.vue';
import ThemePicker from '../components/ThemePicker.vue';

const { currentTheme, setTheme } = useTheme();
const { token, isConfigured, saveToken, clearToken, generateToken } = useAuth();
</script>

<template>
  <div class="settings-view">
    <!-- 同步设置 -->
    <section class="settings-section">
      <h2 class="section-title">跨设备同步</h2>
      <SyncSetup
        :token="token"
        :is-configured="isConfigured"
        @save="saveToken"
        @clear="clearToken"
        @generate="generateToken"
      />
    </section>

    <!-- 主题 -->
    <section class="settings-section">
      <h2 class="section-title">外观</h2>
      <ThemePicker :current="currentTheme" @change="setTheme" />
    </section>

    <!-- 关于 -->
    <section class="settings-section">
      <h2 class="section-title">关于</h2>
      <div class="about-card">
        <div class="about-row">
          <span>Prism Android</span>
          <span class="about-value">v0.1.0</span>
        </div>
        <div class="about-row">
          <span>技术栈</span>
          <span class="about-value">Tauri 2 + Vue 3 + Rust</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-view {
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.about-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.about-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-base);
  color: var(--text-primary);
}

.about-value {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>

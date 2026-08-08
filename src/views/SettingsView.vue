<script setup lang="ts">
import SyncSetup from '../components/SyncSetup.vue';
import ThemePicker from '../components/ThemePicker.vue';
import { useTheme } from '../composables/useTheme';

const { currentTheme, setTheme } = useTheme();
</script>

<template>
  <div class="settings-view">
    <div class="settings-shell">
      <header class="settings-header">
        <span class="section-kicker">应用</span>
        <h1>设置</h1>
        <p>调整同步与外观，让 Prism 更适合你的工作方式。</p>
      </header>

      <div class="settings-grid">
        <section class="settings-section surface-panel">
          <div class="section-heading">
            <div>
              <span class="section-kicker">连接</span>
              <h2>跨设备同步</h2>
            </div>
          </div>
          <SyncSetup />
        </section>

        <section class="settings-section surface-panel">
          <div class="section-heading">
            <div>
              <span class="section-kicker">偏好</span>
              <h2>外观</h2>
            </div>
          </div>
          <ThemePicker :current="currentTheme" @change="setTheme" />
        </section>

        <section class="settings-section surface-panel about-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">关于</span>
              <h2>应用信息</h2>
            </div>
          </div>
          <div class="about-list">
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
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  min-height: 100%;
  padding: 20px;
}

.settings-shell {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 0 40px;
}

.settings-header {
  margin-bottom: 20px;
}

.settings-header h1 {
  margin: 6px 0 0;
  color: var(--text-primary);
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.04em;
}

.settings-header p {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.section-kicker {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.05em;
}

.settings-grid {
  display: grid;
  gap: 16px;
}

.settings-section {
  padding: 16px;
}

.surface-panel {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

h2 {
  margin: 3px 0 0;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
}

.about-list {
  display: grid;
  border-top: 1px solid var(--border-light);
}

.about-row {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.about-value {
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-align: right;
}

@media (max-width: 560px) {
  .settings-view {
    padding: 16px 12px;
  }

  .settings-section {
    padding: 14px;
  }
}
</style>

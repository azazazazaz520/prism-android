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
        <span class="section-kicker">偏好</span>
        <h1>设置</h1>
        <p>同步、外观和应用信息都在这里。</p>
      </header>

      <section class="settings-section sync-section" aria-labelledby="sync-title">
        <div class="section-heading">
          <div>
            <span class="section-kicker">连接</span>
            <h2 id="sync-title">跨设备同步</h2>
          </div>
          <span class="section-note">任务数据</span>
        </div>
        <SyncSetup />
      </section>

      <section class="settings-section" aria-labelledby="appearance-title">
        <div class="section-heading">
          <div>
            <span class="section-kicker">偏好</span>
            <h2 id="appearance-title">外观</h2>
          </div>
          <span class="section-note">跟随系统</span>
        </div>
        <ThemePicker :current="currentTheme" @change="setTheme" />
      </section>

      <section class="settings-section about-section" aria-labelledby="about-title">
        <div class="section-heading">
          <div>
            <span class="section-kicker">关于</span>
            <h2 id="about-title">应用信息</h2>
          </div>
        </div>
        <dl class="about-list">
          <div class="about-row">
            <dt>版本</dt>
            <dd>0.1.0</dd>
          </div>
          <div class="about-row">
            <dt>数据方式</dt>
            <dd>本地优先</dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  min-height: 100%;
  padding: 18px 16px 28px;
}

.settings-shell {
  width: min(100%, 760px);
  margin: 0 auto;
  padding-bottom: 24px;
}

.settings-header {
  margin-bottom: 22px;
}

.settings-header h1 {
  margin: 5px 0 0;
  color: var(--text-primary);
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.04em;
}

.settings-header p {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.section-kicker {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.05em;
}

.settings-section {
  padding: 16px 0 20px;
  border-top: 1px solid var(--border-light);
}

.settings-section:first-of-type {
  padding-top: 0;
  border-top: 0;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

h2 {
  margin: 3px 0 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
}

.section-note {
  padding-top: 14px;
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.about-list {
  display: grid;
  margin: 0;
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

.about-row dt,
.about-row dd {
  margin: 0;
}

.about-row dd {
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-align: right;
}

@media (max-width: 420px) {
  .settings-view {
    padding-right: 12px;
    padding-left: 12px;
  }
}
</style>

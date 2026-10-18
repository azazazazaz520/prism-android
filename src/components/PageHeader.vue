<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  /** 页面已滚动：显示材质背景、分隔线与居中标题 */
  scrolled?: boolean;
}>();
</script>

<template>
  <div class="nav-bar" :class="{ scrolled: !!scrolled }">
    <div class="nav-leading">
      <slot name="leading" />
    </div>
    <div class="nav-title" aria-hidden="true">{{ scrolled ? title : '' }}</div>
    <div class="nav-trailing">
      <slot name="actions" />
    </div>
  </div>

  <div class="title-block">
    <h1>{{ title }}</h1>
    <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: var(--nav-h);
  padding: 0 6px;
  background: transparent;
  transition:
    background-color var(--dur-base) var(--ease-standard),
    box-shadow var(--dur-base) var(--ease-standard);
}

.nav-bar.scrolled {
  background: var(--bar);
  box-shadow: 0 0.5px 0 var(--sep);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .nav-bar.scrolled {
    background: var(--bar-opaque);
  }
}

.nav-leading,
.nav-trailing {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.nav-leading {
  justify-self: start;
}

.nav-trailing {
  justify-self: end;
}

.nav-title {
  justify-self: center;
  max-width: 60vw;
  overflow: hidden;
  color: var(--label);
  font-size: var(--f-headline);
  font-weight: 600;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-standard);
}

.nav-bar.scrolled .nav-title {
  opacity: 1;
}

.title-block {
  padding: 2px var(--page-x) 0;
}

h1 {
  color: var(--label);
  font-size: var(--f-large-title);
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 41px;
}

.subtitle {
  margin-top: 2px;
  color: var(--label-2);
  font-size: var(--f-subhead);
  line-height: 20px;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 360px) {
  h1 {
    font-size: 30px;
    line-height: 36px;
  }
}
</style>

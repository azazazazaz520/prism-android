<script setup lang="ts">
import { ref } from 'vue';
import AppIcon from './AppIcon.vue';

const props = defineProps<{
  tags: string[];
  selected: string[];
}>();

const emit = defineEmits<{
  'toggle-tag': [tag: string];
  'add-tag': [tag: string];
  close: [];
}>();

const newTag = ref('');

function addTag() {
  const name = newTag.value.trim();
  if (!name) return;
  emit('add-tag', name);
  if (!props.selected.includes(name)) emit('toggle-tag', name);
  newTag.value = '';
}

function clear() {
  emit('toggle-tag', '');
}
</script>

<template>
  <div class="filter-layer" @keydown.esc="emit('close')">
    <button class="backdrop" type="button" aria-label="关闭筛选" @click="emit('close')" />

    <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title">
      <div class="grabber" aria-hidden="true"></div>

      <header class="sheet-nav">
        <button class="ios-link" type="button" :disabled="!selected.length" @click="clear">
          清除
        </button>
        <span id="filter-title" class="sheet-title">筛选</span>
        <button class="ios-link strong" type="button" @click="emit('close')">完成</button>
      </header>

      <div class="sheet-body">
        <div class="ios-group">
          <div class="ios-group-head">
            <span>标签</span>
            <span class="ios-count">{{ selected.length }} 已选</span>
          </div>
          <div class="ios-card">
            <template v-for="(tag, index) in tags" :key="tag">
              <button
                class="ios-row tag-row"
                type="button"
                :aria-pressed="selected.includes(tag)"
                @click="emit('toggle-tag', tag)"
              >
                <span>{{ tag }}</span>
                <AppIcon
                  v-if="selected.includes(tag)"
                  class="check"
                  name="check"
                  :size="18"
                  :stroke-width="2.4"
                />
              </button>
              <div v-if="index < tags.length - 1" class="ios-sep"></div>
            </template>
            <p v-if="!tags.length" class="ios-row empty-row">还没有标签</p>
            <div class="ios-sep"></div>
            <div class="ios-row add-tag">
              <span class="plus" aria-hidden="true">
                <AppIcon name="plus" :size="12" :stroke-width="2.6" />
              </span>
              <input
                v-model="newTag"
                type="text"
                maxlength="10"
                placeholder="新建标签"
                aria-label="新标签名称"
                enterkeyhint="done"
                @keyup.enter="addTag"
                @blur="addTag"
              />
            </div>
          </div>
          <p class="ios-group-foot">标签同时用于筛选与任务标记，最多显示两个。</p>
        </div>
      </div>

      <div class="sheet-safe"></div>
    </section>
  </div>
</template>

<style scoped>
.filter-layer {
  position: fixed;
  z-index: 90;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  animation: fade-in var(--dur-base) var(--ease-standard);
}

.sheet {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 720px;
  max-height: 82%;
  flex-direction: column;
  border-radius: var(--r-sheet) var(--r-sheet) 0 0;
  background: var(--bg);
  box-shadow: var(--shadow-sheet);
  animation: slide-up var(--dur-sheet) var(--ease-standard);
}

.grabber {
  width: 36px;
  height: 5px;
  margin: 6px auto 0;
  border-radius: 3px;
  background: var(--label-3);
}

.sheet-nav {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 52px;
  padding: 0 16px;
}

.sheet-nav .ios-link {
  justify-self: start;
}

.sheet-nav .ios-link.strong {
  justify-self: end;
  font-weight: 600;
}

.sheet-nav .ios-link:disabled {
  opacity: 0.36;
}

.sheet-title {
  color: var(--label);
  font-size: var(--f-headline);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.sheet-body {
  overflow-y: auto;
  padding: 8px 16px 0;
  -webkit-overflow-scrolling: touch;
}

.tag-row {
  justify-content: space-between;
}

.check {
  margin-left: auto;
  color: var(--tint);
}

.empty-row {
  color: var(--label-2);
}

.add-tag {
  gap: 10px;
  padding-left: 16px;
  color: var(--tint);
}

.plus {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  color: var(--on-tint);
  background: var(--tint-fill);
}

.add-tag input {
  flex: 1;
  min-width: 0;
  font-size: var(--f-body);
}

.sheet-safe {
  height: calc(20px + max(env(safe-area-inset-bottom, 0px), var(--native-navbar-inset, 0px)));
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes slide-up {
  from {
    transform: translateY(16px);
    opacity: 0.6;
  }
}
</style>

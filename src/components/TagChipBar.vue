<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  tags: string[];
  selected: string[];
}>();

const emit = defineEmits<{
  'toggle-tag': [tag: string];
  'add-tag': [tag: string];
}>();

const showAddInput = ref(false);
const showFilterPanel = ref(false);
const newTagName = ref('');

function handleAddTag() {
  const name = newTagName.value.trim();
  if (name) {
    emit('add-tag', name);
    newTagName.value = '';
    showAddInput.value = false;
    showFilterPanel.value = true;
  }
}

function selectAll() {
  emit('toggle-tag', '');
  showFilterPanel.value = false;
}

function toggleFromPanel(tag: string) {
  emit('toggle-tag', tag);
  showFilterPanel.value = false;
}
</script>

<template>
  <div class="tag-filter">
    <div class="tag-bar">
      <button
        class="filter-toggle"
        :class="{ active: selected.length > 0 }"
        :aria-expanded="showFilterPanel"
        aria-controls="tag-filter-panel"
        @click="showFilterPanel = !showFilterPanel"
      >
        筛选<span v-if="selected.length"> · {{ selected.length }}</span>
      </button>
      <button class="tag-chip" :class="{ active: selected.length === 0 }" @click="selectAll">
        全部
      </button>
      <button
        v-for="tag in selected"
        :key="tag"
        class="tag-chip active selected-chip"
        :aria-label="'移除标签 ' + tag"
        @click="emit('toggle-tag', tag)"
      >
        {{ tag }} ×
      </button>
      <!-- 添加标签 -->
      <template v-if="showAddInput">
        <input
          v-model="newTagName"
          class="tag-input"
          placeholder="新标签"
          aria-label="新标签名称"
          maxlength="10"
          @keyup.enter="handleAddTag"
          @blur="handleAddTag"
        />
      </template>
      <button v-else class="tag-chip add-chip" @click="showAddInput = true">+ 标签</button>
    </div>

    <div v-show="showFilterPanel" id="tag-filter-panel" class="tag-filter-panel">
      <button
        v-for="tag in tags"
        :key="tag"
        class="tag-chip"
        :class="{ active: selected.includes(tag) }"
        @click="toggleFromPanel(tag)"
      >
        {{ tag }}
      </button>
      <span v-if="tags.length === 0" class="no-tags">暂无标签</span>
    </div>
  </div>
</template>

<style scoped>
.tag-filter {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.tag-bar {
  display: flex;
  gap: var(--space-xs);
  padding: var(--space-sm) 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tag-bar::-webkit-scrollbar {
  display: none;
}

.tag-chip {
  min-height: 44px;
  padding: var(--space-xs) var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-full);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.filter-toggle {
  min-height: 44px;
  padding: 0 var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-full);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  white-space: nowrap;
  cursor: pointer;
}

.filter-toggle.active {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
}

.tag-chip:active {
  transform: scale(0.95);
}

.tag-chip.active {
  background: var(--accent-light);
  border-color: var(--accent-muted);
  color: var(--accent);
}

.selected-chip {
  border-color: var(--accent);
}

.tag-filter-panel {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  padding: var(--space-sm);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.no-tags {
  padding: var(--space-sm);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.add-chip {
  color: var(--text-muted);
  border-style: dashed;
}

.tag-input {
  width: 80px;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--accent);
  border-radius: var(--radius-full);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--text-sm);
  outline: none;
}
</style>

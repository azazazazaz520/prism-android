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
const newTagName = ref('');

function handleAddTag() {
  const name = newTagName.value.trim();
  if (name) {
    emit('add-tag', name);
    newTagName.value = '';
    showAddInput.value = false;
  }
}
</script>

<template>
  <div class="tag-bar">
    <button
      class="tag-chip"
      :class="{ active: selected.length === 0 }"
      @click="emit('toggle-tag', '')"
    >
      全部
    </button>
    <button
      v-for="tag in tags"
      :key="tag"
      class="tag-chip"
      :class="{ active: selected.includes(tag) }"
      @click="emit('toggle-tag', tag)"
    >
      {{ tag }}
    </button>
    <!-- 添加标签 -->
    <template v-if="showAddInput">
      <input
        v-model="newTagName"
        class="tag-input"
        placeholder="新标签"
        maxlength="10"
        @keyup.enter="handleAddTag"
        @blur="handleAddTag"
      />
    </template>
    <button v-else class="tag-chip add-chip" @click="showAddInput = true">+ 标签</button>
  </div>
</template>

<style scoped>
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

.tag-chip:active {
  transform: scale(0.95);
}

.tag-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
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

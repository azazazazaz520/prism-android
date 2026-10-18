<script lang="ts">
export type IconName =
  | 'plus'
  | 'check'
  | 'check-circle'
  | 'chevron'
  | 'filter'
  | 'calendar'
  | 'tag'
  | 'flag'
  | 'repeat'
  | 'pin'
  | 'cloud-off'
  | 'list'
  | 'gear'
  | 'appearance'
  | 'info'
  | 'copy'
  | 'x'
  | 'trash';
</script>

<script setup lang="ts">
withDefaults(
  defineProps<{
    name: IconName;
    size?: number;
    strokeWidth?: number;
  }>(),
  { size: 20, strokeWidth: 1.8 },
);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'plus'">
      <path d="M12 5.5v13M5.5 12h13" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </template>
    <template v-else-if="name === 'check-circle'">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.2 10.8 15 16.2 9.4" />
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="M9 5l7 7-7 7" :stroke-width="(strokeWidth ?? 1.8) + 0.4" />
    </template>
    <template v-else-if="name === 'filter'">
      <path d="M4 7h16M7 12h10M10 17h4" />
    </template>
    <template v-else-if="name === 'calendar'">
      <rect x="3.5" y="5.5" width="17" height="15" rx="3.5" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10.5h17" />
    </template>
    <template v-else-if="name === 'tag'">
      <path
        d="M3.6 9.2V4.6a1 1 0 0 1 1-1h4.6a2 2 0 0 1 1.4.6l10 10a1.6 1.6 0 0 1 0 2.3l-4.1 4.1a1.6 1.6 0 0 1-2.3 0l-10-10a2 2 0 0 1-.6-1.4z"
      />
      <circle cx="7.9" cy="7.9" r="1.3" />
    </template>
    <template v-else-if="name === 'flag'">
      <path d="M6 21V3.4" />
      <path
        d="M6 4.5c3.3-1.9 5.5 1.9 8.8 0 .6-.34 1.2-.48 1.7-.42v7.5c-.5-.06-1.1.08-1.7.42-3.3 1.9-5.5-1.9-8.8 0z"
        fill="currentColor"
        stroke-width="1.2"
      />
    </template>
    <template v-else-if="name === 'repeat'">
      <path d="M4 10a8 8 0 0 1 13.4-5.4L20 7" />
      <path d="M20 14a8 8 0 0 1-13.4 5.4L4 17" />
      <path d="M20 3v4h-4M4 21v-4h4" />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M9 3.5h6l-1 6.2 3 3.3v2H7v-2l3-3.3z" />
      <path d="M12 15v5.5" />
    </template>
    <template v-else-if="name === 'cloud-off'">
      <path d="M3 3l18 18" />
      <path d="M18 17H7a4.5 4.5 0 0 1-.9-8.9" />
      <path d="M8.4 5.6A5.5 5.5 0 0 1 18 9.5a3.8 3.8 0 0 1 2.4 6.5" />
    </template>
    <template v-else-if="name === 'list'">
      <path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10" />
      <path d="M3.5 6.3l1.5 1.5 2.5-2.8" />
      <path d="M3.5 11.8l1.5 1.5 2.5-2.8" />
      <path d="M3.5 17.3l1.5 1.5 2.5-2.8" />
    </template>
    <template v-else-if="name === 'gear'">
      <circle cx="12" cy="12" r="3.2" />
      <path
        d="M19.2 13.4a7.7 7.7 0 0 0 0-2.8l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.4-1.4L14 2.8h-4l-.4 2.4a7.6 7.6 0 0 0-2.4 1.4l-2.4-1-2 3.4 2 1.6a7.7 7.7 0 0 0 0 2.8l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.4 1.4l.4 2.4h4l.4-2.4a7.6 7.6 0 0 0 2.4-1.4l2.4 1 2-3.4z"
      />
    </template>
    <template v-else-if="name === 'appearance'">
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 3.6a8.4 8.4 0 0 1 0 16.8z" fill="currentColor" stroke-width="1" />
    </template>
    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.8v.4" />
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </template>
    <template v-else-if="name === 'x'">
      <path d="M6 6l12 12M18 6L6 18" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3.5 6h17M9 6V4.2a1.7 1.7 0 0 1 1.7-1.7h2.6A1.7 1.7 0 0 1 15 4.2V6" />
      <path d="M18.5 6v14a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V6" />
      <path d="M10 10.5v7M14 10.5v7" />
    </template>
  </svg>
</template>

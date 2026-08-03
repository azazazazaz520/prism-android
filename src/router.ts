import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'tasks',
      component: () => import('./views/TasksView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('./views/SettingsView.vue'),
    },
    ...(import.meta.env.DEV
      ? [
          {
            path: '/prototype/tasks-ui',
            name: 'tasks-ui-prototype',
            component: () => import('./prototype/TaskUiPrototype.vue'),
          },
          {
            path: '/prototype/shadcn-task',
            name: 'shadcn-task-prototype',
            component: () => import('./prototype/ShadcnTaskPreview.vue'),
          },
        ]
      : []),
  ],
});

export default router;

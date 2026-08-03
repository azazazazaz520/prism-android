import { ref, onMounted } from 'vue';

type Theme = 'auto' | 'light' | 'dark';

/** 检测是否在 Tauri 环境 */
const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

/** 浏览器 mock：主题存 localStorage */
function getLocalTheme(): Theme {
  return (localStorage.getItem('prism_theme') as Theme) || 'light';
}

function setLocalTheme(theme: Theme) {
  localStorage.setItem('prism_theme', theme);
}

/** 主题状态（全局单例 ref） */
const currentTheme = ref<Theme>('light');

/** 主题 composable：管理 data-theme 属性切换与持久化 */
export function useTheme() {
  /** 应用主题到 DOM */
  function applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme.value = theme;
  }

  /** 从后端加载主题设置 */
  async function load() {
    try {
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        const saved = await invoke<string>('get_theme');
        applyTheme(saved as Theme);
      } else {
        applyTheme(getLocalTheme());
      }
    } catch {
      applyTheme('light');
    }
  }

  /** 切换主题并持久化 */
  async function setTheme(theme: Theme) {
    applyTheme(theme);
    try {
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_theme', { theme });
      } else {
        setLocalTheme(theme);
      }
    } catch (e) {
      console.error('保存主题失败:', e);
    }
  }

  onMounted(load);

  return {
    currentTheme,
    load,
    setTheme,
  };
}

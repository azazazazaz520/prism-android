/** Tauri 原生注入的 insets 桥（仅 Android） */
interface PrismSystemBars {
  getInsets?: () => string;
}

interface NativeInsets {
  statusBar?: number;
  navBar?: number;
  ime?: number;
}

/**
 * 系统 insets（CSS px）写入 CSS 变量。
 * Tauri 2 Android WebView 不提供 env(safe-area-inset-*)，由原生层维护：
 * - 原生 insets 监听器在变化时推送（键盘弹出、旋转等）；
 * - 页面加载后这里主动调用 getInsets() 拉取一次，兜底「insets 事件先于页面加载」的场景，
 *   避免首次打开时状态栏与顶栏文字重叠。
 */
export function useSystemInsets() {
  function apply() {
    const bridge = (window as unknown as { PrismSystemBars?: PrismSystemBars }).PrismSystemBars;
    if (!bridge?.getInsets) return;
    try {
      const insets = JSON.parse(bridge.getInsets()) as NativeInsets;
      const root = document.documentElement;
      if (typeof insets.statusBar === 'number') {
        root.style.setProperty('--native-statusbar-inset', `${insets.statusBar}px`);
      }
      if (typeof insets.navBar === 'number') {
        root.style.setProperty('--native-navbar-inset', `${insets.navBar}px`);
      }
      if (typeof insets.ime === 'number') {
        root.style.setProperty('--native-keyboard-inset', `${insets.ime}px`);
      }
    } catch {
      // 解析失败时保持默认值，由原生推送兜底
    }
  }

  // setup 阶段 documentElement 已存在，立即拉取一次，确保首帧前 CSS 变量就位
  apply();

  return { apply };
}

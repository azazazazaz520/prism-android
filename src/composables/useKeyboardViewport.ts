import { onBeforeUnmount, onMounted } from 'vue';

/** 计算软键盘覆盖的可视区域高度，兼容 WebView 未自动 adjustResize 的情况。 */
export function getKeyboardInset(
  windowHeight: number,
  viewportHeight: number,
  viewportOffsetTop = 0,
): number {
  return Math.max(0, Math.round(windowHeight - viewportHeight - viewportOffsetTop));
}

/** 返回当前可视高度，以及仅在 WebView 未 resize 时需要的固定底部偏移。 */
export function getKeyboardLayout(
  layoutViewportHeight: number,
  visualViewportHeight: number,
  fallbackViewportHeight = layoutViewportHeight,
  viewportOffsetTop = 0,
): { viewportHeight: number; bottomOffset: number } {
  const viewportHeight = Math.max(0, Math.round(visualViewportHeight || fallbackViewportHeight));

  return {
    viewportHeight,
    bottomOffset: getKeyboardInset(layoutViewportHeight, viewportHeight, viewportOffsetTop),
  };
}

export function useKeyboardViewport() {
  let cleanup: (() => void) | undefined;

  onMounted(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const layout = getKeyboardLayout(
        window.innerHeight,
        viewport.height,
        window.innerHeight,
        viewport.offsetTop,
      );
      const root = document.documentElement;
      root.style.setProperty('--viewport-height', `${layout.viewportHeight}px`);
      root.style.setProperty('--keyboard-bottom-offset', `${layout.bottomOffset}px`);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    cleanup = () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--viewport-height');
      document.documentElement.style.removeProperty('--keyboard-bottom-offset');
      document.documentElement.style.removeProperty('--keyboard-inset');
    };
  });

  onBeforeUnmount(() => cleanup?.());
}

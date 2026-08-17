import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidRoot = path.join(projectRoot, 'src-tauri', 'gen', 'android');
const activityPath = path.join(
  androidRoot,
  'app',
  'src',
  'main',
  'java',
  'com',
  'prism',
  'android',
  'MainActivity.kt',
);

if (!fs.existsSync(activityPath)) {
  throw new Error(
    `Android project not generated at ${androidRoot}. Run "tauri android init" once, then retry.`,
  );
}

let source = fs.readFileSync(activityPath, 'utf8');

if (!source.includes('import android.webkit.WebView')) {
  source = source.replace(
    'import android.os.Bundle\n',
    [
      'import android.os.Bundle',
      'import android.webkit.WebView',
      'import androidx.core.view.ViewCompat',
      'import androidx.core.view.WindowInsetsCompat',
      '',
    ].join('\n'),
  );
}

/**
 * 状态栏（顶部）+ 键盘（底部）insets 监听器代码块。
 * Tauri 2 Android WebView 不向 CSS 提供 env(safe-area-inset-*)（见 tauri#14240），
 * 这里通过原生 insets 注入 --native-statusbar-inset / --native-keyboard-inset 两个 CSS 变量。
 */
const INSETS_LISTENER = [
  '    ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->',
  '      val density = resources.displayMetrics.density',
  '      val statusBarInsetPx = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top',
  '      val statusBarInsetCss = statusBarInsetPx / density',
  '      val imeInsetPx = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom',
  '      val imeInsetCss = imeInsetPx / density',
  '      val script =',
  "        \"document.documentElement.style.setProperty('--native-statusbar-inset', '${statusBarInsetCss}px');\" +",
  "          \"document.documentElement.style.setProperty('--native-keyboard-inset', '${imeInsetCss}px');\" +",
  '          "window.dispatchEvent(new Event(\'resize\'));"',
  '      webView.evaluateJavascript(script, null)',
  '      insets',
  '    }',
].join('\n');

const LISTENER_START = '    ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->';
const REQUEST_INSETS = '    ViewCompat.requestApplyInsets(webView)';

if (source.includes(LISTENER_START)) {
  // 已注入过：整体替换监听器块（兼容旧版本只处理键盘 insets 的情况）
  const start = source.indexOf(LISTENER_START);
  const end = source.indexOf(REQUEST_INSETS, start);
  if (end === -1) {
    throw new Error(
      'Unexpected MainActivity.kt: insets listener exists without requestApplyInsets',
    );
  }
  source = `${source.slice(0, start)}${INSETS_LISTENER}\n${source.slice(end)}`;
  console.log('Upgraded Android insets listener (status bar + keyboard)');
} else if (source.includes(REQUEST_INSETS)) {
  source = source.replace(REQUEST_INSETS, `${INSETS_LISTENER}\n${REQUEST_INSETS}`);
  console.log('Added Android insets listener (status bar + keyboard)');
} else if (!source.includes('override fun onWebViewCreate')) {
  const method = [
    '',
    '  override fun onWebViewCreate(webView: WebView) {',
    '    super.onWebViewCreate(webView)',
    INSETS_LISTENER,
    '    ViewCompat.requestApplyInsets(webView)',
    '  }',
  ].join('\n');
  source = `${source.trimEnd().replace(/}\s*$/, '')}${method}\n}\n`;
  console.log('Prepared Android insets bridge (status bar + keyboard)');
} else {
  throw new Error(
    'Unexpected MainActivity.kt: onWebViewCreate exists but no insets listener found',
  );
}

fs.writeFileSync(activityPath, source);
console.log(`Prepared Android insets bridge: ${activityPath}`);

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

/**
 * 状态栏（顶部）+ 导航栏（底部）+ 键盘（IME）insets 桥接。
 * Tauri 2 Android WebView 不向 CSS 提供 env(safe-area-inset-*)（见 tauri#14240），
 * 这里通过原生 insets 注入 --native-statusbar-inset / --native-navbar-inset /
 * --native-keyboard-inset 三个 CSS 变量：
 * - 原生监听器在 insets 变化时推送（键盘弹出、旋转等运行时变化）；
 * - 前端在页面加载后调用 PrismSystemBars.getInsets() 主动拉取，兜底"insets 事件先于
 *   页面加载"的首次打开场景，避免状态栏与顶栏文字重叠。
 */

const MAIN_ACTIVITY_SOURCE = [
  'package com.prism.android',
  '',
  'import android.os.Bundle',
  'import android.webkit.JavascriptInterface',
  'import android.webkit.WebView',
  'import androidx.activity.enableEdgeToEdge',
  'import androidx.core.view.ViewCompat',
  'import androidx.core.view.WindowCompat',
  'import androidx.core.view.WindowInsetsCompat',
  '',
  '/**',
  ' * 主 Activity。',
  ' * Tauri 2 Android WebView 不向 CSS 提供 env(safe-area-inset-*)（见 tauri#14240），',
  ' * 因此通过原生 insets 监听器推送 --native-statusbar-inset / --native-navbar-inset /',
  ' * --native-keyboard-inset 三个 CSS 变量；前端在页面加载后还会通过 getInsets() 主动拉取，',
  ' * 避免首次打开时 insets 事件先于页面加载、导致状态栏与顶栏文字重叠。',
  ' */',
  'class MainActivity : TauriActivity() {',
  '  // 最新 insets（CSS px），由 insets 监听器维护，供前端 getInsets() 拉取',
  '  private var statusBarInsetCss: Float = 0f',
  '  private var navBarInsetCss: Float = 0f',
  '  private var imeInsetCss: Float = 0f',
  '',
  '  override fun onCreate(savedInstanceState: Bundle?) {',
  '    enableEdgeToEdge()',
  '    super.onCreate(savedInstanceState)',
  '  }',
  '',
  '  override fun onWebViewCreate(webView: WebView) {',
  '    super.onWebViewCreate(webView)',
  '    webView.addJavascriptInterface(PrismSystemBars(this), "PrismSystemBars")',
  '    ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->',
  '      val density = resources.displayMetrics.density',
  '      val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())',
  '      statusBarInsetCss = systemBars.top / density',
  '      navBarInsetCss = systemBars.bottom / density',
  '      imeInsetCss = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom / density',
  '      pushInsets(webView)',
  '      insets',
  '    }',
  '    ViewCompat.requestApplyInsets(webView)',
  '  }',
  '',
  '  /** 将最新 insets 推送到 WebView；页面尚未加载时无副作用，前端加载后经 getInsets() 兜底 */',
  '  private fun pushInsets(webView: WebView) {',
  '    val script =',
  "      \"document.documentElement.style.setProperty('--native-statusbar-inset', '${statusBarInsetCss}px');\" +",
  "        \"document.documentElement.style.setProperty('--native-navbar-inset', '${navBarInsetCss}px');\" +",
  "        \"document.documentElement.style.setProperty('--native-keyboard-inset', '${imeInsetCss}px');\" +",
  '        "window.dispatchEvent(new Event(\'resize\'));"',
  '    webView.evaluateJavascript(script, null)',
  '  }',
  '',
  '  private class PrismSystemBars(private val activity: MainActivity) {',
  '    @JavascriptInterface',
  '    fun setTheme(theme: String) {',
  '      activity.runOnUiThread {',
  '        val controller = WindowCompat.getInsetsController(activity.window, activity.window.decorView)',
  '        val lightBars = theme != "dark"',
  '        controller.isAppearanceLightStatusBars = lightBars',
  '        controller.isAppearanceLightNavigationBars = lightBars',
  '      }',
  '    }',
  '',
  '    /** 前端页面加载后主动拉取 insets，避免首帧漏掉状态栏高度 */',
  '    @JavascriptInterface',
  '    fun getInsets(): String {',
  '      return "{\\"statusBar\\":${activity.statusBarInsetCss},\\"navBar\\":${activity.navBarInsetCss},\\"ime\\":${activity.imeInsetCss}}"',
  '    }',
  '  }',
  '}',
].join('\n');

fs.writeFileSync(activityPath, MAIN_ACTIVITY_SOURCE + '\n');
console.log(`Prepared Android insets bridge (status bar + nav bar + keyboard): ${activityPath}`);

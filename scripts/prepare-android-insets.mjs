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

if (!source.includes('override fun onWebViewCreate')) {
  const method = [
    '',
    '  override fun onWebViewCreate(webView: WebView) {',
    '    super.onWebViewCreate(webView)',
    '    ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->',
    '      val density = resources.displayMetrics.density',
    '      val imeInsetCss = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom / density',
    '      val script =',
    "        \"document.documentElement.style.setProperty('--native-keyboard-inset', '${imeInsetCss}px');\" +",
    '          "window.dispatchEvent(new Event(\'resize\'));"',
    '      webView.evaluateJavascript(script, null)',
    '      insets',
    '    }',
    '    ViewCompat.requestApplyInsets(webView)',
    '  }',
  ].join('\n');
  source = `${source.trimEnd().replace(/}\s*$/, '')}${method}\n}\n`;
}

fs.writeFileSync(activityPath, source);
console.log(`Prepared Android IME insets bridge: ${activityPath}`);

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function patchAfter(text, marker, insertText) {
  if (text.includes(insertText.trim())) return text;
  const idx = text.indexOf(marker);
  if (idx === -1) return text;
  return text.slice(0, idx + marker.length) + insertText + text.slice(idx + marker.length);
}

function patchBefore(text, marker, insertText) {
  if (text.includes(insertText.trim())) return text;
  const idx = text.indexOf(marker);
  if (idx === -1) return text;
  return text.slice(0, idx) + insertText + text.slice(idx);
}

function patchWorkflowHeadlessService(text) {
  let out = text;

  // Kotlin companion properties are exposed to Java via static getter/setter methods.
  // Use setter calls instead of direct field access to avoid private-field compile errors.
  out = out
    .replace(/MainActivity\.sIsHeadlessLaunch = true;/g, 'MainActivity.setSIsHeadlessLaunch(true);')
    .replace(/MainActivity\.sIsHeadlessLaunch = false;/g, 'MainActivity.setSIsHeadlessLaunch(false);');

  if (!out.includes('import android.os.Handler;')) {
    out = out.replace(
      'import android.os.Build;\n',
      'import android.os.Build;\nimport android.os.Handler;\nimport android.os.Looper;\n'
    );
  }

  if (!out.includes('HEADLESS_LAUNCH_FLAG_TIMEOUT_MS')) {
    out = out.replace(
      '    private static final String CHANNEL_ID = "workflow_execution_channel";\n',
      [
        '    private static final String CHANNEL_ID = "workflow_execution_channel";',
        '    private static final long HEADLESS_LAUNCH_FLAG_TIMEOUT_MS = 15000L;',
        '    private final Handler mainHandler = new Handler(Looper.getMainLooper());',
        '    private final Runnable clearHeadlessLaunchFlagRunnable = new Runnable() {',
        '        @Override',
        '        public void run() {',
        '            MainActivity.setSIsHeadlessLaunch(false);',
        '            Log.d(TAG, "Cleared headless launch suppression flag (timeout)");',
        '        }',
        '    };',
        '',
      ].join('\n')
    );
  }

  out = out.replace(
    '            MainActivity.sIsHeadlessLaunch = true;',
    '            markHeadlessLaunchSuppressed();'
  );
  out = out.replace(
    '            MainActivity.setSIsHeadlessLaunch(true);',
    '            markHeadlessLaunchSuppressed();'
  );

  if (!out.includes('clearHeadlessLaunchSuppressed();\n            Log.e(TAG, "Failed to warm-start ReactContext", e);')) {
    out = out.replace(
      '            Log.e(TAG, "Failed to warm-start ReactContext: " + e.getMessage());',
      '            clearHeadlessLaunchSuppressed();\n            Log.e(TAG, "Failed to warm-start ReactContext", e);'
    );
  }

  if (!out.includes('private void markHeadlessLaunchSuppressed()')) {
    out = patchBefore(
      out,
      '    /**\n     * Start as foreground service with notification.\n',
      [
        '    private void markHeadlessLaunchSuppressed() {',
        '        MainActivity.setSIsHeadlessLaunch(true);',
        '        mainHandler.removeCallbacks(clearHeadlessLaunchFlagRunnable);',
        '        mainHandler.postDelayed(clearHeadlessLaunchFlagRunnable, HEADLESS_LAUNCH_FLAG_TIMEOUT_MS);',
        '        Log.d(TAG, "Set headless launch suppression flag");',
        '    }',
        '',
        '    private void clearHeadlessLaunchSuppressed() {',
        '        mainHandler.removeCallbacks(clearHeadlessLaunchFlagRunnable);',
        '        MainActivity.setSIsHeadlessLaunch(false);',
        '    }',
        '    ',
      ].join('\n')
    );
  }

  if (!out.includes('clearHeadlessLaunchSuppressed();\n        super.onDestroy();')) {
    out = out.replace(
      '        Log.d(TAG, "Service destroyed");\n        super.onDestroy();',
      '        Log.d(TAG, "Service destroyed");\n        clearHeadlessLaunchSuppressed();\n        super.onDestroy();'
    );
  }

  return out;
}

function patchMainActivity(text) {
  let out = text;

  // Normalize the flag declaration so Java can always access static setter/getter.
  out = out.replace(
    /(?:\s*@Volatile\s*\n)?(?:\s*@JvmStatic\s*\n)?\s*(?:private\s+)?var sIsHeadlessLaunch = false/g,
    '    @Volatile\n    @JvmStatic\n    var sIsHeadlessLaunch = false'
  );

  if (!out.includes('var sIsHeadlessLaunch = false')) {
    out = patchAfter(
      out,
      'class MainActivity : ReactActivity() {\n',
      [
        '',
        '  companion object {',
        '    @Volatile',
        '    @JvmStatic',
        '    var sIsHeadlessLaunch = false',
        '  }',
        '',
      ].join('\n')
    );
  }

  if (!out.includes('if (sIsHeadlessLaunch) {')) {
    out = out.replace(
      '  override fun onCreate(savedInstanceState: Bundle?) {\n',
      [
        '  override fun onCreate(savedInstanceState: Bundle?) {',
        '    if (sIsHeadlessLaunch) {',
        '      sIsHeadlessLaunch = false',
        '      super.onCreate(null)',
        '      finish()',
        '      return',
        '    }',
        '',
      ].join('\n')
    );
  }

  return out;
}

function patchFile(filePath, patchFn) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[withWidgetHeadlessFix] Skipping missing file: ${filePath}`);
    return;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const patched = patchFn(original);

  if (patched !== original) {
    fs.writeFileSync(filePath, patched);
    console.log(`[withWidgetHeadlessFix] Patched ${path.basename(filePath)}`);
  } else {
    console.log(`[withWidgetHeadlessFix] No changes needed for ${path.basename(filePath)}`);
  }
}

const withWidgetHeadlessFix = (config) => {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const javaRoot = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'breviai',
        'app'
      );

      patchFile(path.join(javaRoot, 'WorkflowHeadlessService.java'), patchWorkflowHeadlessService);
      patchFile(path.join(javaRoot, 'MainActivity.kt'), patchMainActivity);

      return modConfig;
    },
  ]);
};

module.exports = withWidgetHeadlessFix;

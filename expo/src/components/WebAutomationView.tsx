import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { WebAutomationConfig } from '../types/workflow-types';

interface WebAutomationViewProps {
    config: WebAutomationConfig;
    onSuccess: (result: any) => void;
    onError: (error: string) => void;
}

export const WebAutomationView: React.FC<WebAutomationViewProps> = ({ config, onSuccess, onError }) => {
    const webViewRef = useRef<WebView>(null);
    const [currentUrl, setCurrentUrl] = useState(config.url);
    const [status, setStatus] = useState('Yükleniyor...');
    const [executed, setExecuted] = useState(false);
    const smartStepRef = useRef(0);
    const smartStartedAtRef = useRef<number | null>(null);
    const maxSmartSteps = Math.max(1, Number(config.maxSmartSteps || 12));
    const maxSmartDurationMs = Math.max(5000, Number(config.maxSmartDurationMs || 45000));

    // script to extract Interactable Elements (Simulated Accessibility Tree)
    const extractionScript = `
    (function() {
        try {
            function safeEscape(value) {
                if (!value) return '';
                try {
                    if (window.CSS && typeof window.CSS.escape === 'function') {
                        return window.CSS.escape(value);
                    }
                } catch (_) {}
                return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
            }

            function isVisible(el) {
                if (!el) return false;
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            }

            const interactables = [];
            const selector = 'input, button, a, select, textarea, [role="button"], [role="link"], [tabindex]';
            const elements = document.querySelectorAll(selector);

            for (let index = 0; index < elements.length && interactables.length < 30; index++) {
                const el = elements[index];
                if (!isVisible(el)) continue;

                let cssSelector = el.tagName.toLowerCase();
                if (el.id) {
                    cssSelector += '#' + safeEscape(el.id);
                } else if (typeof el.className === 'string' && el.className.trim()) {
                    const classes = el.className
                        .trim()
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 3)
                        .map(safeEscape);
                    if (classes.length > 0) {
                        cssSelector += '.' + classes.join('.');
                    }
                }

                if (cssSelector.length > 120) cssSelector = el.tagName.toLowerCase();

                interactables.push({
                    tag: el.tagName.toLowerCase(),
                    text: String(el.innerText || el.value || el.getAttribute('aria-label') || '')
                        .substring(0, 80)
                        .replace(/[\\r\\n]+/g, ' ')
                        .trim(),
                    id: el.id || '',
                    type: el.type || '',
                    href: el.href || '',
                    selector: cssSelector,
                    index: index
                });
            }

            const headers = Array.from(document.querySelectorAll('h1, h2, h3'))
                .map((el) => String(el.textContent || '').trim())
                .filter(Boolean)
                .slice(0, 5);

            const state = JSON.stringify({
                url: window.location.href,
                title: document.title || '',
                headers: headers,
                interactables: interactables
            });
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'page_state',
                state: state
            }));
        } catch (err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: 'State extraction failed: ' + (err && err.message ? err.message : String(err))
            }));
        }
    })();
    true;
    `;

    // Agent decision loop
    const runSmartLoop = async (pageStateJson: string) => {
        try {
            // ... (goal check)
            if (!config.smartGoal) return;

            if (!smartStartedAtRef.current) {
                smartStartedAtRef.current = Date.now();
            }

            const elapsedMs = Date.now() - smartStartedAtRef.current;
            if (elapsedMs > maxSmartDurationMs) {
                onError(`Smart mode zaman asimi: ${maxSmartDurationMs}ms sinirina ulasildi.`);
                return;
            }

            smartStepRef.current += 1;
            if (smartStepRef.current > maxSmartSteps) {
                onError(`Smart mode adim limiti asildi: ${maxSmartSteps}`);
                return;
            }

            setStatus(`Agent dusunuluyor... (${smartStepRef.current}/${maxSmartSteps})`);
            const { action } = await import('../services/ApiService').then(m => m.apiService.decideWebAction(config.smartGoal!, pageStateJson));

            console.log('[WebSmart] Agent decided:', action);

            if (!action || !action.type) {
                setStatus('Agent bir işlem yapamadı (Action type null).');
                return;
            }

            if (action.type === 'finish') {
                setStatus('Tamamlandı: ' + action.value);
                onSuccess({ steps: smartStepRef.current, elapsedMs, finalUrl: currentUrl, ...action });
                return;
            }

            if (action.type === 'wait') {
                const waitMs = Math.max(0, Math.min(parseInt(action.value) || 2000, 30000));
                setStatus('Bekleniyor (' + waitMs + 'ms)...');
                setTimeout(() => {
                    webViewRef.current?.injectJavaScript(extractionScript);
                }, waitMs);
            }
            else if (action.type === 'scroll') {
                setStatus('Kaydırılıyor...');
                // Scroll down by 60% of viewport height
                const scrollScript = `
                    window.scrollBy({ top: window.innerHeight * 0.6, behavior: 'smooth' });
                    true;
                `;
                webViewRef.current?.injectJavaScript(scrollScript);
                setTimeout(() => webViewRef.current?.injectJavaScript(extractionScript), 1500);
            }
            else if (action.type === 'click' || action.type === 'type') {
                setStatus('İşlem: ' + action.type + ' -> ' + (action.selector || 'element'));

                // Enhanced Execution Script
                let execScript = '';
                const selectorJson = JSON.stringify(action.selector || '');
                const valueJson = JSON.stringify(action.value || '');
                if (action.type === 'click') {
                    execScript = `
                        (function() {
                            try {
                                const selector = ${selectorJson};
                                if (!selector) return;
                                const el = document.querySelector(selector);
                                if (el) {
                                    // Visual highlight before click
                                    el.style.border = '2px solid red';
                                    el.style.backgroundColor = 'yellow';
                                    
                                    setTimeout(() => {
                                        // Robust Click Sequence
                                        const clickEvent = new MouseEvent('click', {
                                            view: window,
                                            bubbles: true,
                                            cancelable: true
                                        });
                                        const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
                                        const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
                                        
                                        el.dispatchEvent(mouseDown);
                                        el.dispatchEvent(mouseUp);
                                        el.dispatchEvent(clickEvent);
                                        
                                        // Native click fallback
                                        if (el.click) el.click();
                                    }, 200);
                                } else {
                                    console.log('Element not found:', selector);
                                }
                            } catch (err) {
                                console.error('Click error:', err);
                            }
                        })();
                    `;
                } else if (action.type === 'type') {
                    // ... same type logic ...
                    execScript = `
                        (function() {
                             const selector = ${selectorJson};
                             const value = ${valueJson};
                             if (!selector) return;
                             const el = document.querySelector(selector);
                             if (el) {
                                 el.focus();
                                 el.value = value;
                                 el.dispatchEvent(new Event('input', {bubbles:true}));
                                 el.dispatchEvent(new Event('change', {bubbles:true}));
                                 el.blur();
                             }
                        })();
                    `;
                }

                webViewRef.current?.injectJavaScript(execScript + 'true;');


                // Wait and capture again
                setTimeout(() => {
                    webViewRef.current?.injectJavaScript(extractionScript);
                }, 2000);
            }

        } catch (e) {
            console.error('[WebSmart] Loop Error:', e);
            setStatus('Hata: Agent döngüsü kırıldı.');
        }
    };

    // Standard Script (Legacy/Config mode)
    const generateAutomationScript = () => {
        const actionsJson = JSON.stringify(config.actions);

        return `
        (async function() {
            try {
                const actions = ${actionsJson};
                const results = {};
                const steps = [];
                
                const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                
                // Helper to find element
                const getEl = (selector) => document.querySelector(selector);
                
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'Script started with ' + actions.length + ' actions' }));

                for (let index = 0; index < actions.length; index++) {
                    const action = actions[index] || {};
                    const stepStartedAt = Date.now();
                    const step = {
                        id: action.id || ('a' + (index + 1)),
                        type: action.type || 'unknown',
                        status: 'ok',
                        durationMs: 0
                    };
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'Running: ' + action.type }));

                    try {
                        if (action.type === 'wait') {
                            const waitMs = Math.max(0, Math.min(parseInt(action.value) || 1000, 30000));
                            await wait(waitMs);
                            step.note = 'wait=' + waitMs + 'ms';
                        }
                        else if (action.type === 'click') {
                            const el = getEl(action.selector);
                            if (el) {
                                el.click();
                                await wait(1000);
                            } else {
                                step.status = 'skipped';
                                step.note = 'Element not found: ' + action.selector;
                                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: step.note }));
                            }
                        }
                        else if (action.type === 'type') {
                            const el = getEl(action.selector);
                            if (el) {
                                el.value = action.value;
                                el.dispatchEvent(new Event('input', { bubbles: true }));
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                            } else {
                                step.status = 'skipped';
                                step.note = 'Element not found: ' + action.selector;
                            }
                        }
                        else if (action.type === 'scrape') {
                            const selector = action.selector || 'body';
                            const elements = document.querySelectorAll(selector);
                            const extractMode = String(action.extract || action.value || 'text').toLowerCase();
                            const key = action.variableName || ('scrape_' + (index + 1));
                            step.selector = selector;
                            step.variableName = key;

                            if (elements && elements.length > 0) {
                                let extracted;
                                if (extractMode === 'html') {
                                    extracted = Array.from(elements).map(el => el.innerHTML || '').join('\\n\\n');
                                } else if (extractMode === 'list') {
                                    extracted = Array.from(elements)
                                        .map(el => String(el.innerText || el.textContent || el.value || '').trim())
                                        .filter(Boolean);
                                } else {
                                    extracted = Array.from(elements)
                                        .map(el => String(el.innerText || el.textContent || el.value || '').trim())
                                        .filter(Boolean)
                                        .join('\\n\\n');
                                }
                                results[key] = extracted;
                                step.note = 'extract=' + extractMode;
                            } else {
                                step.status = 'skipped';
                                step.note = 'Scrape found 0 items for: ' + selector;
                                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: step.note }));
                            }
                        }
                        else if (action.type === 'scroll') {
                            window.scrollBy({
                                top: window.innerHeight * 0.8,
                                behavior: 'smooth'
                            });
                            await wait(1000);
                        } else {
                            step.status = 'skipped';
                            step.note = 'Unsupported action type: ' + action.type;
                        }
                    } catch (stepError) {
                        step.status = 'error';
                        step.error = stepError && stepError.message ? stepError.message : String(stepError);
                        step.durationMs = Math.max(0, Date.now() - stepStartedAt);
                        steps.push(step);
                        throw stepError;
                    }

                    step.durationMs = Math.max(0, Date.now() - stepStartedAt);
                    steps.push(step);
                }
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'success',
                    results,
                    steps,
                    finalUrl: window.location.href
                }));
            } catch (err) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.toString() }));
            }
        })();
        true; // ensure generic return
        `;
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'page_state') {
                // Smart Loop Callback
                console.log('[WebSmart] Received Page State, length:', data.state.length);
                runSmartLoop(data.state);
            }
            else if (data.type === 'log') {
                console.log('[Web Automation Log]', data.message);
                setStatus(data.message);
            }
            else if (data.type === 'success') {
                console.log('[Web Automation Success]', data.results);
                const results = (data.results && typeof data.results === 'object') ? data.results : {};
                onSuccess({
                    ...results,
                    results,
                    steps: Array.isArray(data.steps) ? data.steps : [],
                    finalUrl: typeof data.finalUrl === 'string' ? data.finalUrl : currentUrl,
                });
            }
            else if (data.type === 'error') {
                console.error('[Web Automation Error]', data.message);
                onError(data.message);
            }
        } catch (e) {
            console.error('Failed to parse WebView message', e);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.statusText} numberOfLines={1}>{status}</Text>
                {(config.interactive || config.mode === 'interactive') && (
                    <Text
                        style={styles.doneButton}
                        onPress={() => onSuccess({ message: 'User completed interaction', finalUrl: currentUrl })}
                    >
                        Tamamlandı
                    </Text>
                )}
            </View>
            <WebView
                ref={webViewRef}
                source={{ uri: currentUrl }}
                style={styles.webview}
                onMessage={handleMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                userAgent={config.userAgent || "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"}
                onNavigationStateChange={(navState) => {
                    if (navState?.url) {
                        setCurrentUrl(navState.url);
                    }
                }}
                onLoadEnd={() => {
                    if (!executed) {
                        setExecuted(true);

                        // Mode Handling
                        const mode = config.mode || 'script';

                        if (mode === 'interactive' || config.interactive) {
                            setStatus('Sayfa yüklendi. İşiniz bitince "Tamamlandı" butonuna basın.');
                            return;
                        }

                        if (mode === 'smart') {
                            setStatus('Smart Agent başlıyor...');
                            smartStepRef.current = 0;
                            smartStartedAtRef.current = Date.now();
                            // Start Loop: Capture Initial State
                            setTimeout(() => {
                                webViewRef.current?.injectJavaScript(extractionScript);
                            }, 1000);
                            return;
                        }

                        // Default: Script Mode
                        setStatus('Sayfa yüklendi, işlemler başlıyor...');
                        const script = generateAutomationScript();
                        webViewRef.current?.injectJavaScript(script);
                    }
                }}
                onError={(e) => onError(e.nativeEvent.description)}
            />
            {/* Overlay for headless mode simulation (user can't interact but sees progress) */}
            {(!config.interactive && config.mode !== 'interactive') && <View pointerEvents="none" style={styles.blocker} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        padding: 10,
        backgroundColor: '#222',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    statusText: {
        color: '#FFF',
        fontSize: 12,
        flex: 1,
    },
    doneButton: {
        color: '#3B82F6',
        fontWeight: 'bold',
        paddingHorizontal: 10,
    },
    webview: {
        flex: 1,
        opacity: 1 // Full opacity for interaction
    },
    blocker: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        zIndex: 10
    }
});


import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
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

    // Smart Mode State
    const [isSmartRunning, setIsSmartRunning] = useState(false);

    // script to extract Interactable Elements (Simulated Accessibility Tree)
    const extractionScript = `
    (function() {
        function getPageState() {
            const interactables = [];
            
            // Helper to get visibility
            function isVisible(el) {
                if (!el) return false;
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            }

            // Find all inputs, buttons, links
            const elements = document.querySelectorAll('input, button, a, select, textarea, [role="button"]');
            
            elements.forEach((el, index) => {
                if (isVisible(el)) {
                    // Create a unique partial selector
                    let selector = el.tagName.toLowerCase();
                    if (el.id) {
                        // Escape ID just in case
                        selector += '#' + CSS.escape(el.id);
                    } else if (el.className && typeof el.className === 'string') {
                        // Compact class logic: take first 3 classes, escape them
                        const classes = el.className.split(/\s+/).filter(c => c).slice(0, 3);
                        if (classes.length > 0) {
                            selector += '.' + classes.map(c => CSS.escape(c)).join('.');
                        }
                    }
                    
                    // Fallback to simpler path if class is too long or weird
                    if (selector.length > 50) selector = el.tagName.toLowerCase();

                    interactables.push({
                        tag: el.tagName.toLowerCase(),
                        text: (el.innerText || el.value || '').substring(0, 50).replace(/\\n/g, ' '),
                        id: el.id || '',
                        type: el.type || '',
                        href: el.href || '',
                        selector: selector,
                        // Add index for fallback targeting
                        index: index 
                    });
                }
            });

            // ... (rest of headers logic)
            // ...
            return JSON.stringify({
                url: window.location.href,
                title: document.title,
                headers: headers.slice(0, 5),
                interactables: interactables.slice(0, 30)
            });
        }
        // ...
    })();
    true;
    `;

    // Agent decision loop
    const runSmartLoop = async (pageStateJson: string) => {
        try {
            // ... (goal check)
            if (!config.smartGoal) return;

            setStatus('Agent düşünülüyor...');
            const { action } = await import('../services/ApiService').then(m => m.apiService.decideWebAction(config.smartGoal!, pageStateJson));

            console.log('[WebSmart] Agent decided:', action);

            if (!action || !action.type) {
                setStatus('Agent bir işlem yapamadı (Action type null).');
                return;
            }

            if (action.type === 'finish') {
                setStatus('Tamamlandı: ' + action.value);
                onSuccess({ success: true, ...action });
                return;
            }

            if (action.type === 'wait') {
                setStatus('Bekleniyor (' + action.value + 'ms)...');
                setTimeout(() => {
                    webViewRef.current?.injectJavaScript(extractionScript);
                }, parseInt(action.value) || 2000);
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
                if (action.type === 'click') {
                    execScript = `
                        (function() {
                            try {
                                const el = document.querySelector('${action.selector}');
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
                                    console.log('Element not found: ${action.selector}');
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
                             const el = document.querySelector('${action.selector}');
                             if (el) { 
                                 el.focus();
                                 el.value = '${action.value}';
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
                
                const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                
                // Helper to find element
                const getEl = (selector) => document.querySelector(selector);
                
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'Script started with ' + actions.length + ' actions' }));

                for (const action of actions) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'Running: ' + action.type }));
                    
                    if (action.type === 'wait') {
                        await wait(parseInt(action.value) || 1000);
                    }
                    else if (action.type === 'click') {
                        const el = getEl(action.selector);
                        if (el) {
                            el.click();
                            await wait(1000);
                        } else {
                             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'Element not found: ' + action.selector }));
                        }
                    }
                    else if (action.type === 'type') {
                        const el = getEl(action.selector);
                        if (el) {
                            el.value = action.value;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                    else if (action.type === 'scrape') {
                        const elements = document.querySelectorAll(action.selector);
                        if (elements && elements.length > 0) {
                            // Collect text from all matching elements
                            const contents = Array.from(elements).map(el => el.innerText || el.textContent || el.value).filter(t => t && t.trim().length > 0);
                            
                            // Join with newlines
                            const content = contents.join('\n\n');
                            
                            if (action.variableName) {
                                results[action.variableName] = content;
                            }
                        } else {
                             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'Scrape found 0 items for: ' + action.selector }));
                        }
                    }
                    else if (action.type === 'scroll') {
                        window.scrollBy({
                            top: window.innerHeight * 0.8,
                            behavior: 'smooth'
                        });
                        await wait(1000);
                    }
                }
                
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', results }));
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
                onSuccess(data.results);
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
                        onPress={() => onSuccess({ message: 'User completed interaction' })}
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
                            setIsSmartRunning(true);
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

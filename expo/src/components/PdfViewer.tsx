
import React, { useRef, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

interface PdfViewerProps {
    uri: string;
    onClose: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ uri, onClose }) => {
    console.log('[PdfViewer] Received URI:', uri);
    const webViewRef = useRef<WebView>(null);
    const [base64, setBase64] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPdf();
    }, [uri]);

    const loadPdf = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('[PdfViewer] Loading URI:', uri);

            let b64 = '';
            // If already data URI
            if (uri.startsWith('data:application/pdf;base64,')) {
                console.log('[PdfViewer] Source is Data URI');
                b64 = uri.replace('data:application/pdf;base64,', '');
            } else {
                // Check file existence first
                if (uri.startsWith('file://')) {
                    const fileInfo = await FileSystem.getInfoAsync(uri);
                    console.log('[PdfViewer] File Info:', JSON.stringify(fileInfo));
                    if (!fileInfo.exists) {
                        throw new Error(`File not found at: ${uri}`);
                    }
                    if (fileInfo.size && fileInfo.size === 0) {
                        throw new Error(`File is empty (0 bytes): ${uri}`);
                    }
                }

                // Read file
                console.log('[PdfViewer] Reading file as Base64...');
                b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                console.log('[PdfViewer] Read success. Length:', b64.length);
            }

            setBase64(b64);
        } catch (err) {
            console.error('[PdfViewer] Failed to load PDF:', err);
            setError('PDF yüklenemedi: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#F59E0B" />
                <Text style={{ marginTop: 10, color: '#BBB' }}>PDF Hazırlanıyor...</Text>
            </View>
        );
    }

    if (error || !base64) {
        return (
            <View style={styles.center}>
                <Text style={{ color: 'red' }}>{error || 'Veri hatası'}</Text>
            </View>
        );
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <style>
            body { margin: 0; padding: 0; background-color: #525659; min-height: 100vh; }
            #container { display: flex; flex-direction: column; align-items: center; width: 100%; padding-bottom: 50px; }
            
            .page-container { position: relative; margin: 10px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.3); background-color: white; }
            canvas { display: block; width: 100%; }
            
            /* Text Layer CSS */
            .textLayer { position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; opacity: 0.2; line-height: 1.0; }
            .textLayer > span { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
            ::selection { background: rgba(0,0,255, 0.3); }

            #loading { color: white; margin-top: 20px; font-family: sans-serif; font-size: 16px; }
        </style>
        <script>
            const sendLog = (msg) => {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(msg);
                }
            };
            
            // console.log = (msg) => sendLog('LOG: ' + msg);
            window.onerror = (message, source, lineno, colno, error) => sendLog('WINDOW ERROR: ' + message);
        </script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
        <script>
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            }
        </script>
    </head>
    <body>
        <div id="container">
            <div id="loading">Belge yükleniyor...</div>
        </div>

        <script>
            const container = document.getElementById('container');
            const loading = document.getElementById('loading');

            // Listen for data injection
            window.loadPdfData = async (b64Data) => {
                // sendLog('DATA_RECEIVED');
                loading.innerText = 'PDF ve Metin katmanları hazırlanıyor...';

                if (typeof pdfjsLib === 'undefined') {
                    loading.innerText = 'PDF Kütüphanesi Yüklenemedi!';
                    return;
                }

                try {
                    const loadingTask = pdfjsLib.getDocument({ data: atob(b64Data) });
                    const pdf = await loadingTask.promise;
                    
                    let fullText = '';
                    loading.style.display = 'none';

                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        
                        // Viewport setup
                        const viewport_dummy = page.getViewport({ scale: 1.0 });
                        const clientWidth = window.innerWidth || 300;
                        const scale = (clientWidth - 20) / viewport_dummy.width;
                        const viewport = page.getViewport({ scale: scale > 2 ? 2 : scale });

                        // Create Page Container
                        const pageDiv = document.createElement('div');
                        pageDiv.className = 'page-container';
                        pageDiv.style.width = viewport.width + 'px';
                        pageDiv.style.height = viewport.height + 'px';
                        container.appendChild(pageDiv);

                        // Canvas
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        pageDiv.appendChild(canvas);

                        // Render Canvas
                        await page.render({ canvasContext: context, viewport: viewport }).promise;

                        // Text Layer
                        const textContent = await page.getTextContent();
                        
                        // Accumulate Text for AI
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += '\\n--- Page ' + pageNum + ' ---\\n' + pageText;

                        // Render Text Layer Div
                        const textLayerDiv = document.createElement('div');
                        textLayerDiv.className = 'textLayer';
                        textLayerDiv.style.width = viewport.width + 'px';
                        textLayerDiv.style.height = viewport.height + 'px';
                        pageDiv.appendChild(textLayerDiv);

                        // Render Text Items
                        pdfjsLib.renderTextLayer({
                            textContent: textContent,
                            container: textLayerDiv,
                            viewport: viewport,
                            textDivs: []
                        });
                    }
                    
                    sendLog('All pages rendered with Text Layer');
                    // Send extracted text using a special prefix
                    sendLog('EXTRACTED_TEXT_START');
                    // Send in chunks if needed, but for now try full
                    sendLog(fullText);
                    sendLog('EXTRACTED_TEXT_END');

                } catch (e) {
                    loading.style.display = 'block';
                    loading.innerText = 'Hata: ' + e.message;
                    console.error(e);
                }
            };
        </script>
    </body>
    </html>
    `;

    const checkAndInject = () => {
        if (webViewRef.current && base64) {
            console.log('[PdfViewer] Injecting Base64 data (' + base64.length + ' bytes)...');
            // Inject as a function call
            webViewRef.current.injectJavaScript(`window.loadPdfData('${base64}'); true;`);
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                key={uri}
                onMessage={(event) => {
                    console.log('[From WebView]:', event.nativeEvent.data);
                }}
                onLoadEnd={() => {
                    console.log('[WebView] Load Ended. Sending Data...');
                    // Small delay to ensure script availability
                    setTimeout(checkAndInject, 500);
                }}
                originWhitelist={['*']}
                source={{ html: htmlContent, baseUrl: 'https://breviai.app' }}
                style={{ flex: 1, backgroundColor: '#525659' }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
                mixedContentMode="always"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#525659',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

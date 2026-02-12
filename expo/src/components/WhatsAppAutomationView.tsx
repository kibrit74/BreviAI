import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const DESKTOP_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

import * as FileSystem from 'expo-file-system/legacy';

interface WhatsAppAutomationViewProps {
    phoneNumber: string;
    message: string;
    mediaPath?: string;
    onSuccess: (result?: any) => void;
    onError: (error: string) => void;
    onCancel: () => void;
}

export const WhatsAppAutomationView: React.FC<WhatsAppAutomationViewProps> = ({
    phoneNumber,
    message,
    mediaPath,
    onSuccess,
    onError,
    onCancel
}) => {
    const webViewRef = useRef<WebView>(null);
    const [status, setStatus] = useState('Yükleniyor...');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (isReady) {
            startAutomation();
        }
    }, [isReady]);

    const injectScript = (script: string) => {
        webViewRef.current?.injectJavaScript(`
            (function() {
                try {
                    ${script}
                } catch (e) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'ERROR', error: e.toString()}));
                }
            })();
            true;
        `);
    };

    const startAutomation = async () => {
        try {
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            setStatus(`Sohbet açılıyor: ${cleanPhone}`);

            // 1. Navigate to Chat
            const targetUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
            injectScript(`window.location.href = "${targetUrl}";`);

        } catch (error) {
            console.error('Automation error:', error);
            onError('Otomasyon başlatılamadı');
        }
    };

    const handleMediaUpload = async () => {
        if (!mediaPath) return;

        setStatus('Medya hazırlanıyor...');
        try {
            // Read file as Base64
            const base64 = await FileSystem.readAsStringAsync(mediaPath, {
                encoding: 'base64'
            });
            const mimeType = mediaPath.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
            const filename = mediaPath.split('/').pop() || 'file';

            setStatus('Medya yükleniyor...');

            // Inject script to create File object and simulate Drop
            injectScript(`
                const base64Data = "${base64}";
                const mimeType = "${mimeType}";
                const filename = "${filename}";

                // Helper to convert base64 to Blob
                const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
                    const byteCharacters = atob(b64Data);
                    const byteArrays = [];
                    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                        const slice = byteCharacters.slice(offset, offset + sliceSize);
                        const byteNumbers = new Array(slice.length);
                        for (let i = 0; i < slice.length; i++) {
                            byteNumbers[i] = slice.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        byteArrays.push(byteArray);
                    }
                    return new Blob(byteArrays, {type: contentType});
                }

                const blob = b64toBlob(base64Data, mimeType);
                const file = new File([blob], filename, { type: mimeType });

                // Find Drop Zone (usually the main chat area)
                const dropZone = document.querySelector('#main') || document.body;
                
                // Create DataTransfer
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);

                // Simulate Drag Events
                const dragEnterEvent = new DragEvent('dragenter', {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer: dataTransfer
                });
                
                const dragOverEvent = new DragEvent('dragover', {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer: dataTransfer
                });

                const dropEvent = new DragEvent('drop', {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer: dataTransfer
                });

                dropZone.dispatchEvent(dragEnterEvent);
                dropZone.dispatchEvent(dragOverEvent);
                dropZone.dispatchEvent(dropEvent);

                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'MEDIA_DROPPED'}));
            `);

        } catch (error) {
            console.error('Media upload error:', error);
            setStatus('Medya yükleme hatası');
        }
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('[WhatsAppWebView] Message:', data);

            if (data.type === 'LOGIN_SUCCESS') {
                setStatus('✅ Giriş Başarılı');
                setIsReady(true);
            }

            if (data.type === 'CLICK_LINK_SUCCESS') {
                setStatus('Linke tıklandı, numaranızı girin.');
            }

            if (data.type === 'READY_FOR_SEND') {
                if (mediaPath) {
                    // Chat loaded, now upload media
                    setStatus('Sohbet hazır, medya yükleniyor...');
                    // Wait a bit for UI to settle
                    setTimeout(() => {
                        handleMediaUpload();
                    }, 1500);
                } else {
                    // Text only flow
                    setStatus('Gönderiliyor...');
                    setTimeout(() => {
                        injectScript(`
                            const sendBtn = document.querySelector('span[data-icon="send"]');
                            if (sendBtn) {
                                sendBtn.click();
                                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'SUCCESS'}));
                            }
                        `);
                    }, 1000);
                }
            }

            if (data.type === 'MEDIA_DROPPED') {
                setStatus('Medya eklendi, gönderiliyor...');
                // After drop, WhatsApp shows a preview with a specific send button (large green button)
                setTimeout(() => {
                    injectScript(`
                        const sendBtn = document.querySelector('div[role="button"][aria-label="Send"]') || 
                                      document.querySelector('span[data-icon="send"]');
                        if (sendBtn) {
                            sendBtn.click();
                            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'SUCCESS'}));
                        } else {
                            // Fallback: Try hitting "Enter" in the caption input
                             const captionInput = document.querySelector('div[contenteditable="true"]'); // The caption input
                             if(captionInput) {
                                captionInput.focus();
                                // We can't easily simulate Enter press that triggers send in React web apps securely, 
                                // but often the button is the reliable way.
                                // Let's try finding the button again with a broader selector
                                const allButtons = Array.from(document.querySelectorAll('div[role="button"]'));
                                const lastButton = allButtons[allButtons.length - 1]; // Usually the send button is last in the modal
                                if(lastButton) lastButton.click();
                                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'SUCCESS'}));
                             }
                        }
                    `);
                }, 2000); // Wait for preview to render
            }

            if (data.type === 'SUCCESS') {
                setStatus('✅ Gönderildi!');
                setTimeout(() => {
                    onSuccess({ success: true, phoneNumber, message });
                }, 2000);
            }

            if (data.type === 'ERROR') {
                console.warn('WebView Error:', data.error);
            }

        } catch (e) {
            // console.error('WebView message parse error', e); 
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onCancel} style={styles.backButton}>
                    <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>WhatsApp Ajanı 🕵️‍♂️</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.statusContainer}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.statusText}>{status}</Text>
            </View>

            <View style={styles.webViewContainer}>
                <WebView
                    ref={webViewRef}
                    source={{ uri: 'https://web.whatsapp.com' }}
                    userAgent={DESKTOP_USER_AGENT}
                    onMessage={handleMessage}

                    // Critical Props for WhatsApp Web
                    originWhitelist={['*']}
                    allowFileAccess={true}
                    domStorageEnabled={true}
                    javaScriptEnabled={true}
                    sharedCookiesEnabled={true}
                    thirdPartyCookiesEnabled={true}
                    mediaPlaybackRequiresUserAction={false}
                    allowsInlineMediaPlayback={true}
                    incognito={false}

                    injectedJavaScript={`
                        setInterval(() => {
                            if (document.querySelector('#side')) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOGIN_SUCCESS'}));
                            }
                            if (document.querySelector('span[data-icon="send"]')) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'READY_FOR_SEND'}));
                            }
                        }, 2000);
                        true;
                    `}
                    style={{ flex: 1 }}
                />
            </View>

            <View style={styles.footer}>
                {!isReady && (
                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => {
                            injectScript(`
                                // Try to find the link by text (it varies by language)
                                const links = Array.from(document.querySelectorAll('span[role="button"]'));
                                let found = false;
                                for(let l of links) {
                                    if(l.innerText && (l.innerText.includes("Link with phone") || l.innerText.includes("Telefon numarası"))) {
                                        l.click();
                                        found = true;
                                        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'CLICK_LINK_SUCCESS'}));
                                        break;
                                    }
                                }
                                if(!found) {
                                    // Try data-testid or specific layout
                                    const specificLink = document.querySelector('span[data-testid="link-device-qrcode-alt-linking-hint"]');
                                    if(specificLink) {
                                        specificLink.click();
                                        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'CLICK_LINK_SUCCESS'}));
                                    } else {
                                        alert('Buton bulunamadı. Lütfen QR kodun altındaki yazıya manuel tıklayın.');
                                    }
                                }
                             `);
                        }}
                    >
                        <Text style={styles.linkButtonText}>🔗 Telefon No ile Bağla (QR Yok)</Text>
                    </TouchableOpacity>
                )}
                <Text style={styles.footerText}>
                    QR veya Telefon No ile bağlanabilirsiniz.
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#1E1E2E',
    },
    backButton: {
        padding: 8,
    },
    title: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: '#10B98120',
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333'
    },
    statusText: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '600',
    },
    webViewContainer: {
        flex: 1,
    },
    footer: {
        padding: 16,
        backgroundColor: '#1E1E2E',
        alignItems: 'center',
        gap: 12,
    },
    footerText: {
        color: '#666',
        fontSize: 11,
        textAlign: 'center',
    },
    linkButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    linkButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    }
});

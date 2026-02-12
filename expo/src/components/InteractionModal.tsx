import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Share,
    Dimensions,
    ActivityIndicator,
    Image,
    SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { interactionService, InteractionRequest } from '../services/InteractionService';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { apiService } from '../services/ApiService';
import { UdfViewer } from './UdfViewer';
import * as Speech from 'expo-speech';
import { WhatsAppAutomationView } from './WhatsAppAutomationView';
import { WebAutomationView } from './WebAutomationView';
import { PdfViewer } from './PdfViewer';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const InteractionModal: React.FC = () => {
    const { colors } = useApp();

    // State
    const [visible, setVisible] = useState(false);
    const [request, setRequest] = useState<InteractionRequest | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [resolvePromise, setResolvePromise] = useState<((value: any) => void) | null>(null);
    const [copied, setCopied] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [attachedFile, setAttachedFile] = useState<{ uri: string, name: string, mimeType?: string } | null>(null);

    useEffect(() => {
        if (visible && request) {
            // Auto-speak the prompt/question
            const textToSpeak = request.description ? `${request.title}. ${request.description}` : request.title;
            if (textToSpeak && request.type !== 'speech') { // Don't speak over the user in speech mode
                Speech.speak(textToSpeak, { language: 'tr-TR' });
            }

            // Auto-start recording for SPEECH mode
            if (request.type === 'speech') {
                // Slight delay to allow modal animation
                setTimeout(() => {
                    startRecording().catch(err => console.warn('Auto-record failed:', err));
                }, 500);
            }

            // Test connection on open to diagnose network issues
            apiService.testConnection().then(result => {
                console.log('[InteractionModal] Connection Test:', result);
                if (!result.success) {
                    alert(`Sunucu bağlantı hatası: ${result.error || 'Bilinmeyen hata'}. Lütfen internetinizi kontrol edin veya API adresini doğrulayın.`);
                }
            });
        }
    }, [visible]);

    useEffect(() => {
        // Register handler
        interactionService.registerHandler(async (req) => {
            setRequest(req);
            setInputValue(req.defaultValue || '');
            setVisible(true);
            setCopied(false);

            return new Promise((resolve) => {
                setResolvePromise(() => resolve);
            });
        });

        return () => {
            interactionService.unregisterHandler();
        };
    }, []);

    const handleConfirm = () => {
        console.log('[InteractionModal] handleConfirm called');
        if (resolvePromise) {
            if (attachedFile) {
                console.log('[InteractionModal] Resolving with attachment:', attachedFile.name);
                resolvePromise({
                    text: inputValue,
                    attachments: [attachedFile]
                });
            } else {
                console.log('[InteractionModal] Resolving with text only');
                resolvePromise(inputValue);
            }
        } else {
            console.log('[InteractionModal] Warning: No resolvePromise found');
        }
        closeModal();
    };

    const handleMenuSelect = (option: string) => {
        if (resolvePromise) {
            resolvePromise(option);
        }
        closeModal();
    };

    const handleCancel = () => {
        console.log('[InteractionModal] handleCancel called');
        if (resolvePromise) {
            resolvePromise(null);
        }
        closeModal();
    };

    const handleResultAction = async (action: 'copy' | 'share' | 'close' | 'confirm' | 'cancel') => {
        if (action === 'copy' && request?.content) {
            const strItem = typeof request.content === 'object' ? JSON.stringify(request.content, null, 2) : String(request.content);
            await Clipboard.setStringAsync(strItem);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else if (action === 'share' && request?.content) {
            const message = typeof request.content === 'object' ? JSON.stringify(request.content, null, 2) : String(request.content);
            Share.share({ message });
        } else if (action === 'confirm') {
            if (resolvePromise) resolvePromise(true);
            closeModal();
        } else if (action === 'cancel' || action === 'close') {
            if (resolvePromise) resolvePromise(false);
            closeModal();
        }
    };

    const closeModal = () => {
        setVisible(false);
        setRequest(null);
        setInputValue('');
        setResolvePromise(null);
        setCopied(false);
        setAttachedFile(null);
        setIsRecording(false);
    };

    // 📎 Attachment Button Handler
    const handleAttachment = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf', 'text/*', '*/*'],
                copyToCacheDirectory: true,
            });

            console.log('[InteractionModal] DocumentPicker result:', JSON.stringify(result));

            if (!result.canceled && result.assets?.[0]) {
                const file = result.assets[0];
                setAttachedFile({
                    uri: file.uri,
                    name: file.name,
                    mimeType: file.mimeType
                });
            }
        } catch (error) {
            console.error('[InteractionModal] File picker error:', error);
        }
    };

    // 📸 Camera Button Handler
    const handleCamera = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

            if (permissionResult.granted === false) {
                alert("Kamera izni gerekli!");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use simple enum access
                quality: 0.8,
            });

            console.log('[InteractionModal] Camera result:', JSON.stringify(result));

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                setAttachedFile({
                    uri: file.uri,
                    name: file.fileName || `camera_${Date.now()}.jpg`,
                    mimeType: file.mimeType || 'image/jpeg'
                });
            }
        } catch (error) {
            console.error('[InteractionModal] Camera error:', error);
        }
    };

    // Check if file is an image
    const isImageFile = (mimeType?: string) => {
        return mimeType?.startsWith('image/');
    };

    // 🎙️ Microphone Button Handler
    const handleMicPress = async () => {
        if (recording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    };

    const startRecording = async () => {
        try {
            // Prevent multiple recordings
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (e) {
                    console.log('Cleanup error', e);
                }
                setRecording(null);
            }

            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                alert("Mikrofon izni gerekli");
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(newRecording);
            setIsRecording(true);
        } catch (error) {
            console.error('[InteractionModal] Recording start error:', error);
            setIsRecording(false);
            setRecording(null);
        }
    };

    const stopRecording = async () => {
        try {
            if (!recording) return;

            setIsRecording(false);
            setIsTranscribing(true);

            // Get URI before unloading to be safe
            const uri = recording.getURI();

            await recording.stopAndUnloadAsync();
            setRecording(null);

            if (uri) {
                console.log('[InteractionModal] Transcribing URI:', uri);
                try {
                    const transcription = await apiService.transcribeAudio(uri);
                    if (transcription) {
                        setInputValue(prev => (prev ? prev + ' ' : '') + transcription);
                    }
                } catch (error) {
                    console.error('[InteractionModal] Transcription error:', error);
                    // Show error in input for visibility
                    // But don't ruin the user's text.
                    alert("Ses metne çevrilemedi. İnternet bağlantınızı kontrol edin.");
                }
            }
        } catch (error) {
            console.error('[InteractionModal] Recording stop error:', error);
        } finally {
            setIsTranscribing(false);
        }
    };

    if (!request) return null;

    const getIcon = (): keyof typeof Ionicons.glyphMap => {
        switch (request.type) {
            case 'input': return 'create-outline';
            case 'menu': return 'list-outline';
            case 'result': return 'text-outline';
            case 'image': return 'image-outline';
            default: return 'chatbubble-ellipses-outline';
        }
    };

    const getAccentColor = () => {
        switch (request.type) {
            case 'input': return ['#6366F1', '#8B5CF6'];
            case 'menu': return ['#10B981', '#059669'];
            case 'result': return ['#F59E0B', '#D97706'];
            case 'image': return ['#EC4899', '#DB2777'];
            case 'udf': return ['#F59E0B', '#D97706'];
            default: return ['#6366F1', '#8B5CF6'];
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleCancel}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardView}
                >
                    <View style={styles.container}>
                        {/* Glassmorphism Background */}
                        <View style={styles.glassContainer}>
                            {/* Header - Minimal WhatsApp Style */}
                            <View style={styles.header}>
                                <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
                                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                                </TouchableOpacity>
                                <View style={styles.headerInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name={getIcon()} size={20} color="#00F5FF" />
                                        <Text style={styles.title}>{request.title}</Text>
                                    </View>
                                    {request.description && (
                                        <Text style={styles.description} numberOfLines={1}>{request.description}</Text>
                                    )}
                                </View>
                            </View>

                            {/* Content */}
                            <View style={styles.content}>
                                {/* INPUT MODE */}
                                {request.type === 'input' && (
                                    <View
                                        style={styles.inputContainer}
                                    >
                                        {/* Spacer to push input to bottom */}
                                        <TouchableOpacity
                                            style={{ flex: 1 }}
                                            activeOpacity={1}
                                            onPress={handleCancel}
                                        />

                                        {/* Recording Indicator Overlay */}
                                        {isRecording && (
                                            <View style={styles.recordingOverlay}>
                                                <View style={styles.recordingDot} />
                                                <Text style={styles.recordingText}>Kayıt yapılıyor... {inputValue.length > 0 ? '' : '(Konuşun)'}</Text>
                                            </View>
                                        )}

                                        {/* Footer Input Bar */}
                                        <View style={styles.footerBar}>

                                            {/* Attachment Preview (ABOVE INPUT) */}
                                            {attachedFile && (
                                                <View style={styles.attachmentArea}>
                                                    <View style={[styles.fileIconBadge, { overflow: 'hidden', padding: 0, backgroundColor: 'transparent' }]}>
                                                        {(attachedFile.mimeType?.startsWith('image/') || attachedFile.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                                                            <Image
                                                                source={{ uri: attachedFile.uri }}
                                                                style={{ width: 36, height: 36, borderRadius: 8 }}
                                                                resizeMode="cover"
                                                            />
                                                        ) : (
                                                            <View style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 245, 255, 0.1)', borderRadius: 8 }}>
                                                                <Ionicons name="document-text" size={20} color="#00F5FF" />
                                                            </View>
                                                        )}
                                                    </View>
                                                    <View style={{ flex: 1, marginLeft: 8 }}>
                                                        <Text style={styles.innerAttachmentName} numberOfLines={1}>{attachedFile.name}</Text>
                                                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>
                                                            {(attachedFile.mimeType || attachedFile.name.split('.').pop() || 'DOSYA').toUpperCase()}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity onPress={() => setAttachedFile(null)} style={styles.innerAttachmentRemove}>
                                                        <Ionicons name="close-circle" size={24} color="#FF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            )}

                                            {/* Input Row */}
                                            <View style={styles.inputRow}>
                                                {/* Input Wrapper (Contains Left Icons + Input + Right Icons) */}
                                                <View style={styles.footerInputWrapper}>

                                                    <TouchableOpacity style={styles.innerInputBtn}>
                                                        <Ionicons name="happy-outline" size={24} color="#94a3b8" />
                                                    </TouchableOpacity>

                                                    <TextInput
                                                        style={styles.footerInput}
                                                        value={inputValue}
                                                        onChangeText={setInputValue}
                                                        placeholder={request.placeholder || "Mesaj yazın"}
                                                        placeholderTextColor="#64748b"
                                                        multiline
                                                    />

                                                    {/* Right Icons: Attach & Camera */}
                                                    <TouchableOpacity
                                                        style={styles.innerInputBtn}
                                                        onPress={handleAttachment}
                                                    >
                                                        <Ionicons name="attach" size={24} color="#94a3b8" style={{ transform: [{ rotate: '-45deg' }] }} />
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={styles.innerInputBtn}
                                                        onPress={handleCamera}
                                                    >
                                                        <Ionicons name="camera-outline" size={24} color="#94a3b8" />
                                                    </TouchableOpacity>
                                                </View>

                                                {/* Mic or Send Button (Outside) */}
                                                <TouchableOpacity
                                                    style={[
                                                        styles.footerSendBtn,
                                                        (inputValue.length > 0 || attachedFile) ? styles.btnSend : styles.btnMic
                                                    ]}
                                                    onPress={() => {
                                                        if (inputValue.length > 0 || attachedFile) {
                                                            handleConfirm();
                                                        } else {
                                                            handleMicPress();
                                                        }
                                                    }}
                                                >
                                                    {isTranscribing ? (
                                                        <ActivityIndicator size="small" color="#FFF" />
                                                    ) : (
                                                        <Ionicons
                                                            name={(inputValue.length > 0 || attachedFile) ? 'send' : (isRecording ? 'stop' : 'mic')}
                                                            size={24}
                                                            color="#FFF"
                                                        />
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* MENU MODE */}
                                {request.type === 'menu' && request.options && (
                                    <View style={styles.menuContainer}>
                                        <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
                                            {request.options.map((option, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={styles.menuOption}
                                                    onPress={() => handleMenuSelect(option)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.menuOptionDot} />
                                                    <Text style={styles.menuOptionText}>{option}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                        <TouchableOpacity
                                            style={styles.menuCancelButton}
                                            onPress={handleCancel}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.menuCancelText}>İptal</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* IMAGE MODE */}
                                {request.type === 'image' && (
                                    <View style={[styles.resultContainer, { flex: 1 }]}>
                                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                                            <Image
                                                source={{ uri: String(request.content) }}
                                                style={{ width: '100%', height: '100%', borderRadius: 12 }}
                                                resizeMode="contain"
                                            />
                                        </View>
                                        <View style={styles.resultActions}>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.confirmButton]}
                                                onPress={() => handleResultAction('confirm')}
                                                activeOpacity={0.8}
                                            >
                                                <LinearGradient
                                                    colors={['#10B981', '#059669']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.closeButtonGradient}
                                                >
                                                    <Text style={styles.closeButtonText}>Onayla</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.cancelButton]}
                                                onPress={() => handleResultAction('cancel')}
                                                activeOpacity={0.8}
                                            >
                                                <LinearGradient
                                                    colors={['#EF4444', '#B91C1C']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.closeButtonGradient}
                                                >
                                                    <Text style={styles.closeButtonText}>İptal</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* RESULT MODE */}
                                {request.type === 'result' && (
                                    <View style={[styles.resultContainer, { flex: 1 }]}>
                                        <View style={styles.resultBubble}>
                                            <ScrollView
                                                style={styles.resultScroll}
                                                contentContainerStyle={{ flexGrow: 1 }}
                                                showsVerticalScrollIndicator={true}
                                            >
                                                <Text style={styles.resultText} selectable>
                                                    {typeof request.content === 'object'
                                                        ? JSON.stringify(request.content, null, 2)
                                                        : String(request.content || 'Sonuç yok')
                                                    }
                                                </Text>
                                                <Text style={styles.resultTime}>
                                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </ScrollView>
                                        </View>

                                        <View style={styles.resultActions}>
                                            <TouchableOpacity
                                                style={[styles.actionButton, copied && styles.actionButtonSuccess]}
                                                onPress={() => handleResultAction('copy')}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={22} color={copied ? "#FFF" : "#00F5FF"} />
                                                <Text style={[styles.actionText, copied && styles.actionTextSuccess, !copied && { color: '#00F5FF' }]}>
                                                    {copied ? 'Kopyalandı' : 'Kopyala'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleResultAction('share')}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="share-social-outline" size={22} color="#FFF" />
                                                <Text style={styles.actionText}>Paylaş</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.closeButton]}
                                                onPress={() => handleResultAction('close')}
                                                activeOpacity={0.8}
                                            >
                                                <Ionicons name="close-circle-outline" size={24} color="#FF4444" />
                                                <Text style={[styles.actionText, { color: '#FF4444' }]}>Kapat</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* UDF / PDF VIEWER MODE */}
                                {request.type === 'udf' && (
                                    <View style={[styles.resultContainer, { flex: 1, padding: 0, overflow: 'hidden', borderRadius: 12 }]}>
                                        {request.description === 'pdf' ? (
                                            <View style={{ flex: 1, backgroundColor: '#f3f4f6', width: '100%', padding: 20 }}>
                                                {/* Unified PDF Viewer (using PDF.js for Android compatibility) */}
                                                <PdfViewer
                                                    uri={String(request.content)}
                                                    onClose={() => handleResultAction('close')}
                                                />

                                                {/* PDF Overlay Actions */}
                                                <TouchableOpacity
                                                    style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: '#2A2A4A', padding: 10, borderRadius: 8 }}
                                                    onPress={() => Share.share({ url: String(request.content), title: 'PDF Paylaş' })}
                                                >
                                                    <Text style={{ color: 'white' }}>📤 Paylaş / Aç</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' }}
                                                    onPress={() => handleResultAction('close')}
                                                >
                                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>✕</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={{ flex: 1, padding: 10 }}>
                                                <UdfViewer
                                                    uri={String(request.content)}
                                                    onClose={() => handleResultAction('close')}
                                                />
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* WHATSAPP AUTOMATION MODE */}
                                {request.type === 'whatsapp' && (
                                    <View style={[styles.resultContainer, { flex: 1, padding: 0, overflow: 'hidden', borderRadius: 20 }]}>
                                        <WhatsAppAutomationView
                                            phoneNumber={request.content.phoneNumber}
                                            message={request.content.message}
                                            mediaPath={request.content.mediaPath}
                                            onSuccess={(res) => {
                                                if (resolvePromise) {
                                                    resolvePromise(res);
                                                }
                                                closeModal();
                                            }}
                                            onError={(err) => {
                                                console.warn('WhatsApp Error:', err);
                                            }}
                                            onCancel={() => {
                                                if (resolvePromise) {
                                                    resolvePromise({ success: false, error: 'Cancelled' });
                                                }
                                                closeModal();
                                            }}
                                        />
                                    </View>
                                )}

                                {/* SPEECH RECOGNITION MODE */}
                                {request.type === 'speech' && (
                                    <View style={[styles.resultContainer, { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 30 }]}>
                                        <View style={{ alignItems: 'center', gap: 10 }}>
                                            <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '600' }}>
                                                {isTranscribing ? 'Çevriliyor...' : (isRecording ? 'Dinliyorum...' : 'Dokun ve Konuş')}
                                            </Text>
                                            <Text style={{ color: '#94A3B8', fontSize: 16 }}>
                                                {isTranscribing ? 'Lütfen bekleyin' : (isRecording ? 'Durdurmak için dokunun' : 'Başlamak için dokunun')}
                                            </Text>
                                        </View>

                                        <TouchableOpacity
                                            style={{
                                                width: 120,
                                                height: 120,
                                                borderRadius: 60,
                                                backgroundColor: isRecording ? '#EF4444' : '#00F5FF',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                shadowColor: isRecording ? '#EF4444' : '#00F5FF',
                                                shadowOffset: { width: 0, height: 0 },
                                                shadowOpacity: 0.5,
                                                shadowRadius: 20,
                                                elevation: 10,
                                                borderWidth: 4,
                                                borderColor: 'rgba(255,255,255,0.2)'
                                            }}
                                            onPress={handleMicPress}
                                        >
                                            {isTranscribing ? (
                                                <ActivityIndicator size="large" color="#FFF" />
                                            ) : (
                                                <Ionicons name={isRecording ? "stop" : "mic"} size={50} color="#FFF" />
                                            )}
                                        </TouchableOpacity>

                                        {/* Result Preview */}
                                        {inputValue.length > 0 && (
                                            <View style={{ padding: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, width: '90%', maxHeight: 150 }}>
                                                <ScrollView>
                                                    <Text style={{ color: '#E2E8F0', fontSize: 18, textAlign: 'center' }}>
                                                        "{inputValue}"
                                                    </Text>
                                                </ScrollView>
                                            </View>
                                        )}

                                        {/* Actions */}
                                        {inputValue.length > 0 && !isRecording && !isTranscribing && (
                                            <View style={{ flexDirection: 'row', gap: 16 }}>
                                                <TouchableOpacity
                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#EF4444', borderRadius: 30 }}
                                                    onPress={() => setInputValue('')}
                                                >
                                                    <Ionicons name="trash-outline" size={20} color="#FFF" />
                                                    <Text style={{ color: '#FFF', fontWeight: '600' }}>Sil</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#10B981', borderRadius: 30 }}
                                                    onPress={handleConfirm}
                                                >
                                                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                                                    <Text style={{ color: '#FFF', fontWeight: '600' }}>Onayla</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* WEB AUTOMATION MODE */}
                                {request.type === 'web_automation' && (
                                    <View style={[styles.resultContainer, { flex: 1, padding: 0, overflow: 'hidden', borderRadius: 20 }]}>
                                        <WebAutomationView
                                            config={request.content}
                                            onSuccess={(res) => {
                                                if (resolvePromise) {
                                                    resolvePromise({ success: true, ...res });
                                                }
                                                closeModal();
                                            }}
                                            onError={(err) => {
                                                if (resolvePromise) {
                                                    resolvePromise({ success: false, error: err });
                                                }
                                                closeModal();
                                            }}
                                        />
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    // Full Screen Overlay
    overlay: {
        flex: 1,
        backgroundColor: '#000',
    },
    keyboardView: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    // Main Gradient Container (Replaces Glass)
    glassContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#0A0A0B', // Deep Black Background
    },
    // Large Header Styles
    header: {
        width: '100%',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(10, 10, 11, 0.95)',
        zIndex: 10,
        gap: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 13,
        color: '#94A3B8', // slate-400
        marginTop: 2,
    },
    // Content Area
    content: {
        flex: 1,
    },
    // INPUT MODE STYLES
    inputContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: '#0A0A0B',
    },
    // Footer Bar (Input Area)
    footerBar: {
        width: '100%',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 12,
        backgroundColor: '#121214', // Slightly lighter than bg
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    attachmentArea: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 245, 255, 0.05)', // Tinted Cyan
        borderRadius: 12,
        padding: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 245, 255, 0.1)',
        marginHorizontal: 4,
    },
    fileIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 245, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    innerAttachmentName: {
        fontSize: 14,
        color: '#FFF',
        flex: 1,
        fontWeight: '500',
    },
    innerAttachmentRemove: {
        padding: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    footerInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#1E1E22',
        borderRadius: 24,
        paddingHorizontal: 4,
        paddingVertical: 4,
        minHeight: 48,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    footerInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
        maxHeight: 120,
        paddingHorizontal: 8,
        paddingVertical: 12, // Centered vertically
        minHeight: 40,
    },
    innerInputBtn: {
        width: 40,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerSendBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    btnMic: {
        backgroundColor: '#10B981', // Emerald 500
    },
    btnSend: {
        backgroundColor: '#00F5FF', // Cyan
    },
    recordingOverlay: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#1E1E22',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#FF4444',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF4444',
    },
    recordingText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    // RESULT / SHOW TEXT Styles
    resultContainer: {
        flex: 1,
        width: '100%',
        padding: 16,
        justifyContent: 'center', // Center vertically like a showcase
        backgroundColor: '#0A0A0B', // Ensure dark bg
    },
    resultBubble: {
        flex: 1, // Take available space
        backgroundColor: '#1E1E22',
        borderRadius: 20,
        borderBottomLeftRadius: 4, // Chat bubble effect
        padding: 4,
        marginBottom: 24,
        maxWidth: '100%',
        alignSelf: 'flex-start', // Align left like received message
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    resultScroll: {
        flex: 1,
        padding: 16,
    },
    resultText: {
        color: '#E2E8F0', // slate-200
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 15,
        lineHeight: 24,
        letterSpacing: 0.3,
    },
    resultTime: {
        alignSelf: 'flex-end',
        color: '#64748B',
        fontSize: 11,
        marginTop: 8,
    },
    resultActions: {
        flexDirection: 'row',
        gap: 12,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    actionButton: {
        flex: 1,
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    actionButtonSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)', // Tinted Green
        borderColor: '#10B981',
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    actionTextSuccess: {
        color: '#10B981',
    },
    closeButton: {
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        borderColor: 'rgba(255, 68, 68, 0.2)',
    },
    // Menu Options (Full Screen)
    menuContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'flex-end', // Bottom sheet style
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menuScroll: {
        flexGrow: 0,
        maxHeight: '70%',
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E22',
        padding: 20,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    menuOptionDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#00F5FF',
        marginRight: 16,
    },
    menuOptionText: {
        fontSize: 16,
        color: '#FFF',
        fontWeight: '500',
    },
    menuCancelButton: {
        marginTop: 8,
        padding: 18,
        backgroundColor: '#0A0A0B',
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    menuCancelText: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '600',
    },
    // Missing Styles
    closeButtonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    closeButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    cancelButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
});

export default InteractionModal;

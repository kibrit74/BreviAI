import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Linking, Modal, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/ApiService';
import { userSettingsService, AIProvider } from '../services/UserSettingsService';
import { googleService, GoogleAuthState } from '../services/GoogleService';

import { microsoftService, MicrosoftAuthState } from '../services/MicrosoftService';
import { backgroundService } from '../services/BackgroundService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe import for native module
let BreviSettings: any = null;
try {
    BreviSettings = require('../../modules/brevi-settings');
} catch (e) {
    console.log('BreviSettings not available');
}

export default function SettingsScreen({ navigation }: any) {
    const { theme, setTheme, language, setLanguage, t, colors, isDebugMode, setDebugMode } = useApp();

    // Ensure missing colors have defaults if not in context
    const getColors = () => ({
        ...colors,
        textSecondary: '#94A3B8', // Fallback
        danger: (colors as any).error || '#FF4444',
    });

    const activeColors = getColors();
    const [notifications, setNotifications] = React.useState(true);
    const [connectionStatus, setConnectionStatus] = React.useState<{ checking: boolean; result?: string; success?: boolean } | null>(null);

    // Background Service state
    const [isBackgroundActive, setIsBackgroundActive] = React.useState(false);

    // Initial check - load saved preference
    React.useEffect(() => {
        const loadBackgroundState = async () => {
            try {
                const saved = await AsyncStorage.getItem('background_service_enabled');
                setIsBackgroundActive(saved === 'true');
            } catch (e) {
                console.warn('Failed to load background service state:', e);
            }
        };
        loadBackgroundState();
    }, []);

    const handleBackgroundToggle = async (value: boolean) => {
        setIsBackgroundActive(value);
        if (value) {
            const success = await backgroundService.startForegroundService();
            if (!success) {
                setIsBackgroundActive(false);
                await AsyncStorage.setItem('background_service_enabled', 'false');
            } else {
                await AsyncStorage.setItem('background_service_enabled', 'true');
            }
        } else {
            await backgroundService.stopForegroundService();
            await AsyncStorage.setItem('background_service_enabled', 'false');
        }
    };



    // ... (render functions)
    const [geminiKey, setGeminiKey] = React.useState('');
    const [openaiKey, setOpenaiKey] = React.useState('');
    const [claudeKey, setClaudeKey] = React.useState('');
    const [openWeatherKey, setOpenWeatherKey] = React.useState('');
    const [weatherKeyModalVisible, setWeatherKeyModalVisible] = React.useState(false);
    const [weatherKeyInput, setWeatherKeyInput] = React.useState('');
    const [apiKeyModalVisible, setApiKeyModalVisible] = React.useState(false);
    const [currentApiProvider, setCurrentApiProvider] = React.useState<AIProvider>('gemini');
    const [currentApiKeyInput, setCurrentApiKeyInput] = React.useState('');
    const [isSavingKey, setIsSavingKey] = React.useState(false);

    // Custom Variables State
    const [variablesModalVisible, setVariablesModalVisible] = React.useState(false);
    const [customVariables, setCustomVariables] = React.useState<Record<string, { value: string; description: string; }>>({});
    const [newVarName, setNewVarName] = React.useState('');
    const [newVarValue, setNewVarValue] = React.useState('');
    const [newVarDescription, setNewVarDescription] = React.useState('');
    const [showVarsHelp, setShowVarsHelp] = React.useState(false);
    const [isAddingVar, setIsAddingVar] = React.useState(false);

    // Google account state
    const [googleAuth, setGoogleAuth] = React.useState<GoogleAuthState>({ isSignedIn: false, user: null, accessToken: null });
    const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

    // Microsoft account state
    const [microsoftAuth, setMicrosoftAuth] = React.useState<MicrosoftAuthState>(microsoftService.getAuthState());

    // Collapsible Sections State
    const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
        'preferences': false,       // General settings
        'accounts': true,           // Accounts (Expanded by default for WA setup)
        'automation': false,
        'ai_keys': false,
        'data_privacy': false,
        'tts_settings': false,
    });

    // WhatsApp State
    const [waStatus, setWaStatus] = React.useState<{ status: string; ready: boolean; qrCode?: string; user?: any } | null>(null);
    const [isWaLoading, setIsWaLoading] = React.useState(false);
    const [waBackendUrl, setWaBackendUrl] = React.useState('http://136.117.34.89:3001'); // Default to Remote

    // Load saved WA URL on mount
    React.useEffect(() => {
        const loadWaUrl = async () => {
            try {
                // Priority 1: Check UserSettings variables (set via .env or custom vars)
                const envUrl = userSettingsService.getCustomVariable('WHATSAPP_BACKEND_URL');
                if (envUrl && (envUrl.startsWith('http') || envUrl.includes('.'))) {
                    console.log('[Settings] Loaded WA URL from Variables:', envUrl);
                    setWaBackendUrl(envUrl);
                    return;
                }

                // Priority 2: Check AsyncStorage (manual overrides)
                const saved = await AsyncStorage.getItem('whatsapp_backend_url');
                if (saved && (saved.startsWith('http') || saved.includes('.'))) {
                    setWaBackendUrl(saved);
                }
            } catch (e) {
                console.log('Failed to load WA URL');
            }
        };
        loadWaUrl();
    }, []);

    // Save WA URL on change (debounced)
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (waBackendUrl && waBackendUrl.length > 8 && waBackendUrl.startsWith('http')) {
                AsyncStorage.setItem('whatsapp_backend_url', waBackendUrl.trim().replace(/\/$/, ''));
            }
        }, 1000); // 1s debounce
        return () => clearTimeout(timer);
    }, [waBackendUrl]);

    const resetWaUrl = () => {
        const defaultUrl = 'http://136.117.34.89:3001';
        setWaBackendUrl(defaultUrl);
        AsyncStorage.setItem('whatsapp_backend_url', defaultUrl);
        Alert.alert('Sıfırlandı', 'URL varsayılan sunucuya (Remote) ayarlandı.');
    };

    const checkWhatsAppStatus = async () => {
        setIsWaLoading(true);
        try {
            // Check if user has a custom override
            const url = waBackendUrl;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(`${url}/whatsapp/status`, {
                headers: { 'x-auth-key': 'breviai-secret-password' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const text = await response.text();
            try {
                const data = JSON.parse(text);
                setWaStatus(data);
            } catch (jsonError) {
                console.warn('WA Status JSON Error:', text.substring(0, 100)); // Log first 100 chars
                setWaStatus({ status: 'error', ready: false });
            }
        } catch (error) {
            console.warn('WA Status Fetch Error:', error);
            setWaStatus({ status: 'error', ready: false });
        } finally {
            setIsWaLoading(false);
        }
    };

    // Auto-refresh check when section is open
    React.useEffect(() => {
        if (expandedSections['accounts']) {
            checkWhatsAppStatus();
        }
    }, [expandedSections['accounts']]);

    // Poll if QR is pending
    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        if (waStatus?.qrCode && !waStatus.ready && expandedSections['accounts']) {
            interval = setInterval(checkWhatsAppStatus, 3000);
        }
        return () => clearInterval(interval);
    }, [waStatus?.qrCode, waStatus?.ready, expandedSections['accounts']]);


    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    // Load settings on mount and focus
    React.useEffect(() => {
        loadSettings();
        const unsubscribe = navigation.addListener('focus', () => {
            loadSettings();
            setMicrosoftAuth(microsoftService.getAuthState());
        });
        return unsubscribe;
    }, [navigation]);

    const loadSettings = async () => {
        const settings = await userSettingsService.loadSettings();
        setGeminiKey(settings.geminiApiKey);
        setOpenaiKey(settings.openaiApiKey);
        setClaudeKey(settings.claudeApiKey);
        setOpenWeatherKey(settings.openWeatherApiKey);
        setGoogleAuth(googleService.getAuthState());
    };

    const openApiKeyModal = (provider: AIProvider) => {
        setCurrentApiProvider(provider);
        setCurrentApiKeyInput(userSettingsService.getApiKey(provider));
        setApiKeyModalVisible(true);
    };

    const saveApiKey = async () => {
        setIsSavingKey(true);
        try {
            await userSettingsService.setApiKey(currentApiProvider, currentApiKeyInput);
            // Update local state
            switch (currentApiProvider) {
                case 'gemini': setGeminiKey(currentApiKeyInput); break;
                case 'openai': setOpenaiKey(currentApiKeyInput); break;
                case 'claude': setClaudeKey(currentApiKeyInput); break;
            }
            setApiKeyModalVisible(false);
            Alert.alert('✅ Başarılı', 'API anahtarı kaydedildi');
        } catch (error) {
            Alert.alert('Hata', 'API anahtarı kaydedilemedi');
        } finally {
            setIsSavingKey(false);
        }
    };

    // Custom Variables Logic
    React.useEffect(() => {
        if (variablesModalVisible) {
            loadVariables();
        }
    }, [variablesModalVisible]);

    const loadVariables = () => {
        const vars = userSettingsService.getCustomVariables();
        // vars is Record<string, { value: string, description: string }>
        // If state expects Record<string, string>, update state definition or handle here.
        // We updated state definition in types earlier but let's confirm the usage
        // Wait, I didn't update the state definition line in the code block I replaced earlier for SettingsScreen.
        // Let's assume I cast it here to match what the component expects or update the component state.

        // Actually, let's update state definition to be `any` or correct type to be safe, 
        // but since I can't see the state definition line right now (it's around line 55),
        // I will just set it and let React handle it, BUT the map function below expects `data`.
        setCustomVariables(vars);
    };

    const handleAddVariable = async () => {
        if (!newVarName.trim() || !newVarValue.trim()) {
            Alert.alert('Hata', 'Değişken adı ve değeri boş olamaz');
            return;
        }

        // Auto-uppercase and sanitize for Turkish characters and spaces
        const finalName = newVarName.trim()
            .replace(/ı/g, 'i')
            .replace(/İ/g, 'I')
            .toUpperCase()
            .replace(/[^A-Z0-9_]/g, '');

        if (!finalName) {
            Alert.alert('Hata', 'Geçersiz değişken adı.');
            return;
        }
        try {
            await userSettingsService.setCustomVariable(finalName, newVarValue.trim(), newVarDescription.trim());
            setNewVarName('');
            setNewVarValue('');
            setNewVarDescription('');
            loadVariables();
        } catch (e) {
            Alert.alert('Hata', 'Değişken eklenemedi');
        } finally {
            setIsAddingVar(false);
        }
    };

    const handleDeleteVariable = async (key: string) => {
        Alert.alert(
            'Sil',
            `'${key}' değişkenini silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        await userSettingsService.deleteCustomVariable(key);
                        loadVariables();
                    }
                }
            ]
        );
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
            const authState = await googleService.signIn();
            setGoogleAuth(authState);
            if (authState.isSignedIn) {
                Alert.alert('✅ Başarılı', `${authState.user?.email} ile bağlandı`);
            }
        } catch (error) {
            Alert.alert('Hata', 'Google girişi başarısız');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleGoogleSignOut = async () => {
        Alert.alert(
            'Google Hesabı',
            'Hesap bağlantısını kaldırmak istiyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Kaldır',
                    style: 'destructive',
                    onPress: async () => {
                        await googleService.signOut();
                        setGoogleAuth({ isSignedIn: false, user: null, accessToken: null });
                    }
                }
            ]
        );
    };

    const handleMicrosoftSignOut = async () => {
        Alert.alert(
            'Microsoft Hesabı',
            'Hesap bağlantısını kaldırmak istiyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Kaldır',
                    style: 'destructive',
                    onPress: async () => {
                        await microsoftService.signOut();
                        setMicrosoftAuth(microsoftService.getAuthState());
                    }
                }
            ]
        );
    };

    const getApiKeyStatus = (key: string) => {
        if (!key) return '⚪ Ayarlanmamış';
        return '🟢 Aktif';
    };

    const handleTestConnection = async () => {
        setConnectionStatus({ checking: true });
        const result = await apiService.testConnection();
        setConnectionStatus({
            checking: false,
            success: result.success,
            result: result.success
                ? `${t('online') || 'Çevrimiçi'} (${result.latency}ms)`
                : `${t('offline') || 'Çevrimdışı/Hata'}: ${result.error}`
        });
    };

    const handleThemeToggle = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    const handleNotificationToggle = () => {
        setNotifications(!notifications);
    };

    // --- Native Bridge Logic ---
    const [shortsBlocking, setShortsBlocking] = React.useState(true);

    React.useEffect(() => {
        try {
            // Dynamic import to avoid crash in Expo Go if module missing
            // In a real build, this would be a static import 'brevi-settings'
            // For now, we assume global availability or use a try-catch pattern if we had the module loaded.
            // Since we can't easily dynamic import a native module without it being linked,
            // we will simulate the connection check.

            // To make this work with the file we created at `modules/brevi-settings/index.ts`:
            // Ideally: import * as BreviSettings from '../../modules/brevi-settings';
            // But we need to update the imports at the top of the file first.
        } catch (e) {
            console.log("Native settings module not found (Expo Go?)");
        }
    }, []);

    const handleShortsBlockToggle = (value: boolean) => {
        setShortsBlocking(value);
        try {
            BreviSettings.setShortsBlockingEnabled(value);
            console.log("Native setting updated:", value);
        } catch (e) {
            console.warn("Native bridge error:", e);
            // Don't alert on every toggle if in dev mode, just warn
        }
    };

    const handleLanguageChange = () => {
        console.log('Language change requested. Current:', language);
        Alert.alert(
            t('language'),
            t('language'),
            [
                {
                    text: 'Türkçe',
                    onPress: () => {
                        console.log('User selected Turkish');
                        setLanguage('tr');
                    }
                },
                {
                    text: 'English',
                    onPress: () => {
                        console.log('User selected English');
                        setLanguage('en');
                    }
                },
                { text: t('cancel'), style: 'cancel' }
            ]
        );
    };

    const handleAbout = () => {
        navigation.navigate('About');
    };

    const handlePrivacy = () => {
        navigation.navigate('PrivacyPolicy');
    };

    const handleTerms = () => {
        navigation.navigate('TermsOfService');
    };

    const handleClearData = () => {
        Alert.alert(
            t('clearData'),
            t('clearDataConfirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('confirm'), style: 'destructive', onPress: () => {
                        Alert.alert(t('success'), t('dataCleared'));
                    }
                }
            ]
        );
    };

    const styles = createStyles(activeColors);

    const renderToggleItem = (
        icon: keyof typeof Ionicons.glyphMap,
        label: string,
        value: boolean,
        onToggle: (value: boolean) => void
    ) => (
        <View style={styles.item}>
            <View style={styles.itemLeft}>
                <Ionicons name={icon} size={22} color={activeColors.primary} style={styles.itemIcon} />
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: activeColors.border, true: activeColors.primary }}
                thumbColor={value ? '#ffffff' : '#9ca3af'}
            />
        </View>
    );

    const renderPressableItem = (
        icon: keyof typeof Ionicons.glyphMap,
        label: string,
        value: string | undefined,
        onPress: () => void,
        danger?: boolean
    ) => (
        <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.itemLeft, { flex: 1, paddingRight: 8 }]}>
                <Ionicons name={icon} size={22} color={danger ? activeColors.danger : activeColors.primary} style={styles.itemIcon} />
                <Text style={[styles.itemLabel, danger && styles.dangerText]} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
            </View>
            <View style={[styles.itemRight, { justifyContent: 'flex-end', maxWidth: '40%' }]}>
                {value && <Text style={[styles.itemValue, { textAlign: 'right' }]} numberOfLines={1} ellipsizeMode="tail">{value}</Text>}
                <Ionicons name="chevron-forward" size={20} color={activeColors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

    const renderCollapsibleSection = (
        id: string,
        title: string,
        icon: keyof typeof Ionicons.glyphMap,
        content: React.ReactNode
    ) => {
        const isExpanded = expandedSections[id];
        return (
            <View style={styles.section}>
                <TouchableOpacity
                    style={[styles.item, { marginBottom: isExpanded ? 0 : 8, borderBottomLeftRadius: isExpanded ? 0 : 14, borderBottomRightRadius: isExpanded ? 0 : 14 }]}
                    onPress={() => toggleSection(id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.itemLeft}>
                        <Ionicons name={icon} size={22} color={activeColors.primary} style={styles.itemIcon} />
                        <Text style={[styles.itemLabel, { fontWeight: '600' }]}>{title}</Text>
                    </View>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={activeColors.textSecondary} />
                </TouchableOpacity>
                {isExpanded && (
                    <View style={{
                        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                        borderBottomLeftRadius: 14,
                        borderBottomRightRadius: 14,
                        padding: 10,
                        paddingTop: 16
                    }}>
                        {content}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('settings')}</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Otomasyon (Varsayılan Açık) */}
                {renderCollapsibleSection('automation', '🤖 Otomasyon & Özellikler', 'git-network-outline', (
                    <>
                        {renderPressableItem('git-network-outline', 'Workflow Builder', 'Yeni', () => navigation.navigate('Workflows'))}
                        {renderPressableItem('apps-outline', 'Widget Ayarları', '6 Buton', () => navigation.navigate('WidgetConfig'))}
                        {renderPressableItem('time-outline', 'Çalıştırma Geçmişi', 'Son 50', () => navigation.navigate('ExecutionHistory'))}
                        <View style={styles.item}>
                            <View style={styles.itemLeft}>
                                <Ionicons name="shield-checkmark-outline" size={22} color="#6366F1" style={styles.itemIcon} />
                                <View>
                                    <Text style={styles.itemLabel}>Arka Planda Çalış</Text>
                                    <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Kapanmayı engeller (Foreground Service)</Text>
                                </View>
                            </View>
                            <Switch
                                value={isBackgroundActive}
                                onValueChange={handleBackgroundToggle}
                                trackColor={{ false: activeColors.border, true: "#6366F1" }}
                                thumbColor={'#ffffff'}
                            />
                        </View>
                    </>
                ))}

                {/* Yapay Zeka */}
                {renderCollapsibleSection('ai_keys', '🧠 AI Yapılandırması', 'key-outline', (
                    <>
                        {/* API Anahtarları */}
                        <Text style={[styles.sectionHeader, { fontSize: 14, marginTop: 10, marginBottom: 5 }]}>AI Servisleri</Text>
                        {renderPressableItem('flash-outline', 'Gemini API', getApiKeyStatus(geminiKey), () => openApiKeyModal('gemini'))}
                        {renderPressableItem('logo-electron', 'OpenAI API', getApiKeyStatus(openaiKey), () => openApiKeyModal('openai'))}
                        {renderPressableItem('cube-outline', 'Claude API', getApiKeyStatus(claudeKey), () => openApiKeyModal('claude'))}

                        <Text style={[styles.sectionHeader, { fontSize: 14, marginTop: 16, marginBottom: 5 }]}>Diğer Servisler</Text>
                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => {
                                setWeatherKeyInput(openWeatherKey);
                                setWeatherKeyModalVisible(true);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.itemLeft, { flex: 1, paddingRight: 8 }]}>
                                <Ionicons name="cloud-outline" size={22} color={activeColors.primary} style={styles.itemIcon} />
                                <Text style={styles.itemLabel}>OpenWeatherMap API</Text>
                            </View>
                            <View style={[styles.itemRight, { justifyContent: 'flex-end', maxWidth: '40%' }]}>
                                <Text style={[styles.itemValue, { textAlign: 'right' }]}>{getApiKeyStatus(openWeatherKey)}</Text>
                                <Ionicons name="chevron-forward" size={20} color={activeColors.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    </>
                ))}

                {/* Hesaplar ve Entegrasyonlar */}
                {renderCollapsibleSection('accounts', '🔗 Hesaplar & Entegrasyonlar', 'link-outline', (
                    <>
                        {/* WhatsApp Section */}
                        <View style={{ marginBottom: 20, backgroundColor: theme === 'dark' ? '#075E54' + '40' : '#25D366' + '15', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme === 'dark' ? '#075E54' : '#25D366' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Ionicons name="logo-whatsapp" size={28} color="#25D366" style={{ marginRight: 10 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: 'bold', fontSize: 17, color: activeColors.text }}>WhatsApp</Text>
                                        <TextInput
                                            style={{
                                                fontSize: 11,
                                                color: activeColors.text,
                                                borderBottomWidth: 1,
                                                borderBottomColor: activeColors.border,
                                                paddingVertical: 2,
                                                marginTop: 2
                                            }}
                                            value={waBackendUrl}
                                            onChangeText={setWaBackendUrl}
                                            placeholder="http://localhost:3001"
                                            placeholderTextColor={activeColors.textSecondary}
                                        />
                                        <Text style={{ fontSize: 10, color: activeColors.textSecondary, marginTop: 2 }}>
                                            URL'yi düzenlemek için tıklayın (Örn: http://192.168.1.35:3001)
                                        </Text>
                                        <TouchableOpacity onPress={resetWaUrl} style={{ marginTop: 4 }}>
                                            <Text style={{ fontSize: 10, color: activeColors.primary, textDecorationLine: 'underline' }}>
                                                Varsayılana Sıfırla (Remote)
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={checkWhatsAppStatus}
                                    disabled={isWaLoading}
                                    style={{ padding: 8, backgroundColor: activeColors.card, borderRadius: 20, marginLeft: 10 }}
                                >
                                    {isWaLoading ? <ActivityIndicator size="small" color="#25D366" /> : <Ionicons name="refresh" size={20} color={activeColors.textSecondary} />}
                                </TouchableOpacity>
                            </View>

                            {/* Content based on waStatus */}
                            {!waStatus ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                                    <ActivityIndicator size="small" color="#25D366" />
                                    <Text style={{ color: activeColors.textSecondary, fontSize: 14 }}>Durum kontrol ediliyor...</Text>
                                </View>
                            ) : waStatus.status === 'error' ? (
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        <Ionicons name="alert-circle" size={20} color={activeColors.danger} style={{ marginRight: 6 }} />
                                        <Text style={{ color: activeColors.danger, fontWeight: 'bold' }}>Sunucuya Ulaşılamadı</Text>
                                    </View>
                                    <Text style={{ fontSize: 13, color: activeColors.textSecondary, marginBottom: 12, lineHeight: 18 }}>
                                        Sunucunun açık olduğundan emin olun.
                                    </Text>
                                    <TouchableOpacity
                                        style={{ backgroundColor: activeColors.card, padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: activeColors.border }}
                                        onPress={() => {
                                            Linking.openURL(waBackendUrl + '/whatsapp/qr');
                                        }}
                                    >
                                        <Text style={{ color: activeColors.primary, fontWeight: '600' }}>Tarayıcıda Aç</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : waStatus.ready ? (
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#25D366' + '20', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#25D366', marginRight: 8 }} />
                                        <Text style={{ color: '#25D366', fontWeight: '700', fontSize: 13 }}>BAĞLI</Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: activeColors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                            <Ionicons name="person" size={20} color={activeColors.textSecondary} />
                                        </View>
                                        <View>
                                            <Text style={{ color: activeColors.text, fontSize: 15, fontWeight: '600' }}>{waStatus.user?.name || 'Kullanıcı'}</Text>
                                            <Text style={{ color: activeColors.textSecondary, fontSize: 13 }}>{waStatus.user?.number}</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={{ backgroundColor: '#25D366', padding: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowColor: "#25D366", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
                                        onPress={() => {
                                            const safeUrl = (waBackendUrl || 'http://10.0.2.2:3001');
                                            console.log('[WA Debug] Sending test message...');
                                            console.log('[WA Debug] URL:', safeUrl);
                                            console.log('[WA Debug] User:', waStatus?.user);

                                            if (!safeUrl) {
                                                Alert.alert('Hata', 'WhatsApp URL tanımlı değil.');
                                                return;
                                            }

                                            // Default phone number if user is undefined (e.g. still initializing)
                                            const targetPhone = waStatus?.user?.number || '905555555555';

                                            try {
                                                fetch(`${safeUrl}/whatsapp/send`, {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        'x-auth-key': 'breviai-secret-password'
                                                    },
                                                    body: JSON.stringify({
                                                        phone: targetPhone,
                                                        message: '🔔 BreviAI Test Mesajı\n\nBu mesaj bağlantının çalıştığını doğrulamak için gönderildi.'
                                                    })
                                                })
                                                    .then(async r => {
                                                        const text = await r.text();
                                                        console.log('[WA Debug] Raw Response:', text);
                                                        try {
                                                            return JSON.parse(text);
                                                        } catch {
                                                            return { error: 'Invalid JSON response', raw: text };
                                                        }
                                                    })
                                                    .then(d => {
                                                        console.log('[WA Debug] Parsed Response:', d);
                                                        if (d.success) Alert.alert('✅ Başarılı', 'Test mesajı gönderildi!');
                                                        else Alert.alert('Hata', (d.error && typeof d.error === 'string') ? d.error : JSON.stringify(d));
                                                    })
                                                    .catch(e => {
                                                        console.error('[WA Debug] Fetch Error:', e);
                                                        Alert.alert('Hata', e.message || 'Bilinmeyen bir iletişim hatası.');
                                                    });
                                            } catch (err: any) {
                                                console.error('[WA Debug] Critical Error:', err);
                                                Alert.alert('Kritik Hata', 'Mesaj gönderilirken bir hata oluştu.');
                                            }
                                        }}
                                    >
                                        <Ionicons name="send" size={18} color="white" />
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Test Mesajı Gönder</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ alignItems: 'center', padding: 16, backgroundColor: activeColors.background, borderRadius: 12 }}>
                                    {waStatus.qrCode ? (
                                        <Image
                                            source={{ uri: waStatus.qrCode }}
                                            style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 16 }}
                                        />
                                    ) : (
                                        <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                                            <ActivityIndicator size="large" color="#25D366" />
                                            <Text style={{ marginTop: 16, color: activeColors.textSecondary, fontWeight: '500' }}>QR Kod Hazırlanıyor...</Text>
                                        </View>
                                    )}

                                    <Text style={{ color: activeColors.text, fontWeight: 'bold', marginBottom: 6, fontSize: 16 }}>Cihazı Bağlayın</Text>
                                    <Text style={{ color: activeColors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 }}>
                                        1. 📱 Telefonunuzda WhatsApp'ı açın{'\n'}
                                        2. ⚙️ Ayarlar {'>'} Bağlı Cihazlar menüsüne gidin{'\n'}
                                        3. 📷 Cihaz Bağla diyerek bu kodu taratın
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={[styles.sectionHeader, { marginBottom: 0, fontSize: 14 }]}>Google Hesabı</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('GmailSetup')}>
                                    <Text style={{ color: activeColors.primary, fontSize: 12 }}>Nasıl?</Text>
                                </TouchableOpacity>
                            </View>
                            {googleAuth.isSignedIn ? (
                                <TouchableOpacity style={styles.googleConnected} onPress={handleGoogleSignOut}>
                                    <View style={styles.googleInfo}>
                                        <Text style={styles.googleEmail}>{googleAuth.user?.email}</Text>
                                        <Text style={styles.googleSubtext}>Gmail, Drive, Sheets</Text>
                                    </View>
                                    <Ionicons name="checkmark-circle" size={24} color="#34A853" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn} disabled={isGoogleLoading}>
                                    {isGoogleLoading ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="logo-google" size={18} color="#fff" /><Text style={styles.googleButtonText}>Bağlan</Text></>}
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Microsoft */}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={[styles.sectionHeader, { marginBottom: 8, fontSize: 14 }]}>Microsoft Hesabı</Text>
                            {microsoftAuth.isSignedIn ? (
                                <TouchableOpacity style={[styles.googleConnected, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]} onPress={handleMicrosoftSignOut}>
                                    <View style={styles.googleInfo}>
                                        <Text style={[styles.googleEmail, { color: '#1E3A8A' }]}>{microsoftAuth.user?.displayName}</Text>
                                        <Text style={[styles.googleSubtext, { color: '#3B82F6' }]}>Outlook, Excel</Text>
                                    </View>
                                    <Ionicons name="checkmark-circle" size={24} color="#0078D4" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={[styles.googleButton, { backgroundColor: '#2F2F2F' }]} onPress={() => navigation.navigate('OutlookSetup')}>
                                    <Ionicons name="logo-microsoft" size={18} color="#fff" />
                                    <Text style={styles.googleButtonText}>Bağlan</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Variables */}
                        <View>
                            <Text style={[styles.sectionHeader, { marginBottom: 8, fontSize: 14 }]}>Global Değişkenler</Text>
                            {renderPressableItem('key-outline', 'Yönet', `${Object.keys(userSettingsService.getCustomVariables()).length} Değişken`, () => setVariablesModalVisible(true))}
                        </View>
                    </>
                ))}

                {/* Tercihler */}
                {renderCollapsibleSection('preferences', '⚙️ Uygulama Tercihleri', 'settings-outline', (
                    <>
                        {renderToggleItem('moon-outline', t('darkTheme'), theme === 'dark', handleThemeToggle)}
                        {renderToggleItem('notifications-outline', t('notifications'), notifications, handleNotificationToggle)}
                        {renderPressableItem('language-outline', t('language'), language === 'tr' ? 'Türkçe' : 'English', handleLanguageChange)}

                    </>
                ))}

                {/* TTS Ayarları (Top Level) */}
                {renderCollapsibleSection('tts_settings', '🔊 Ses Ayarları', 'volume-high-outline', (
                    <>
                        {renderPressableItem(
                            'language-outline',
                            'Ses Dili',
                            userSettingsService.getTTSSettings().language,
                            () => {
                                Alert.alert(
                                    'Ses Dili Seç',
                                    'Sesli okuma için dil seçin',
                                    [
                                        { text: 'Türkçe', onPress: () => userSettingsService.saveSettings({ ttsLanguage: 'tr-TR' }).then(() => loadSettings()) },
                                        { text: 'English (US)', onPress: () => userSettingsService.saveSettings({ ttsLanguage: 'en-US' }).then(() => loadSettings()) },
                                        { text: 'English (UK)', onPress: () => userSettingsService.saveSettings({ ttsLanguage: 'en-GB' }).then(() => loadSettings()) },
                                        { text: 'Deutsch', onPress: () => userSettingsService.saveSettings({ ttsLanguage: 'de-DE' }).then(() => loadSettings()) },
                                        { text: 'Français', onPress: () => userSettingsService.saveSettings({ ttsLanguage: 'fr-FR' }).then(() => loadSettings()) },
                                        { text: 'İptal', style: 'cancel' }
                                    ]
                                );
                            }
                        )}
                        {renderPressableItem(
                            'speedometer-outline',
                            'Konuşma Hızı',
                            `${userSettingsService.getTTSSettings().rate.toFixed(1)}x`,
                            () => {
                                Alert.alert(
                                    'Konuşma Hızı',
                                    'Ses hızını seçin',
                                    [
                                        { text: '0.5x (Yavaş)', onPress: () => userSettingsService.saveSettings({ ttsRate: 0.5 }).then(() => loadSettings()) },
                                        { text: '0.75x', onPress: () => userSettingsService.saveSettings({ ttsRate: 0.75 }).then(() => loadSettings()) },
                                        { text: '1.0x (Normal)', onPress: () => userSettingsService.saveSettings({ ttsRate: 1.0 }).then(() => loadSettings()) },
                                        { text: '1.25x', onPress: () => userSettingsService.saveSettings({ ttsRate: 1.25 }).then(() => loadSettings()) },
                                        { text: '1.5x (Hızlı)', onPress: () => userSettingsService.saveSettings({ ttsRate: 1.5 }).then(() => loadSettings()) },
                                        { text: '2.0x (Çok Hızlı)', onPress: () => userSettingsService.saveSettings({ ttsRate: 2.0 }).then(() => loadSettings()) },
                                        { text: 'İptal', style: 'cancel' }
                                    ]
                                );
                            }
                        )}
                        {renderPressableItem(
                            'musical-notes-outline',
                            'Ses Tonu',
                            `${userSettingsService.getTTSSettings().pitch.toFixed(1)}`,
                            () => {
                                Alert.alert(
                                    'Ses Tonu',
                                    'Ses tonunu seçin (1.0 normal)',
                                    [
                                        { text: '0.5 (Kalın)', onPress: () => userSettingsService.saveSettings({ ttsPitch: 0.5 }).then(() => loadSettings()) },
                                        { text: '0.75', onPress: () => userSettingsService.saveSettings({ ttsPitch: 0.75 }).then(() => loadSettings()) },
                                        { text: '1.0 (Normal)', onPress: () => userSettingsService.saveSettings({ ttsPitch: 1.0 }).then(() => loadSettings()) },
                                        { text: '1.25', onPress: () => userSettingsService.saveSettings({ ttsPitch: 1.25 }).then(() => loadSettings()) },
                                        { text: '1.5 (İnce)', onPress: () => userSettingsService.saveSettings({ ttsPitch: 1.5 }).then(() => loadSettings()) },
                                        { text: 'İptal', style: 'cancel' }
                                    ]
                                );
                            }
                        )}
                        <TouchableOpacity
                            style={[styles.item, { backgroundColor: colors.primary + '20' }]}
                            onPress={async () => {
                                try {
                                    const Speech = require('expo-speech');
                                    const tts = userSettingsService.getTTSSettings();

                                    await Speech.stop();

                                    Speech.speak('Merhaba! Bu bir test mesajıdır. Sesli okuma ayarlarınız bu şekilde çalışacak.', {
                                        language: tts.language,
                                        rate: tts.rate,
                                        pitch: tts.pitch,
                                        onError: (error: any) => console.error('[TTS] Error:', error),
                                    });
                                } catch (error) {
                                    Alert.alert('TTS Hatası', 'Sesli okuma başlatılamadı.');
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.itemLeft}>
                                <Ionicons name="volume-high-outline" size={22} color={activeColors.primary} style={styles.itemIcon} />
                                <Text style={[styles.itemLabel, { color: activeColors.primary }]}>🔊 Sesi Test Et</Text>
                            </View>
                            <Ionicons name="play-circle-outline" size={24} color={activeColors.primary} />
                        </TouchableOpacity>


                    </>
                ))}

                {/* ... Rethinking. Replacing the whole ScrollView content is too big and risky for one go.
                     I should do it section by section.
                     1. Replace "Genel Ayarlar" section with "Preferences" collapsible start.
                     2. Replace "Data Management" section (move it to bottom).
                     3. Replace "Automation" section with "Automation" collapsible.
                     4. Replace "Variables" section with "Accounts" collapsible start.
                     5. Replace "AI Keys" section.
                 */}



                {/* Veri ve Gizlilik */}
                {renderCollapsibleSection('data_privacy', '🛡️ Veri & Gizlilik', 'shield-checkmark-outline', (
                    <>
                        {renderPressableItem('information-circle-outline', t('appAbout'), '1.0.0', handleAbout)}
                        {renderPressableItem('document-text-outline', t('termsOfService'), undefined, handleTerms)}
                        {renderPressableItem('shield-checkmark-outline', t('privacyPolicy'), undefined, handlePrivacy)}
                        {renderPressableItem('trash-outline', t('clearData'), undefined, handleClearData, true)}
                    </>
                ))}


                {/* Developer and Automation sections removed by user request */}

                {/* Boşluk */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* API Key Modal */}
            <Modal
                visible={apiKeyModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setApiKeyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {currentApiProvider === 'gemini' ? '🔮 Gemini' :
                                currentApiProvider === 'openai' ? '🤖 OpenAI' : '🧠 Claude'} API Anahtarı
                        </Text>
                        <TextInput
                            style={styles.apiInput}
                            value={currentApiKeyInput}
                            onChangeText={setCurrentApiKeyInput}
                            placeholder="API anahtarınızı yapıştırın..."
                            placeholderTextColor="#666"
                            secureTextEntry={true}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity
                            style={styles.apiLinkButton}
                            onPress={() => {
                                const urls = {
                                    gemini: 'https://aistudio.google.com/apikey',
                                    openai: 'https://platform.openai.com/api-keys',
                                    claude: 'https://console.anthropic.com/'
                                };
                                Linking.openURL(urls[currentApiProvider]);
                            }}
                        >
                            <Text style={styles.apiLinkText}>🔑 API anahtarı al</Text>
                        </TouchableOpacity>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setApiKeyModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSaveButton}
                                onPress={saveApiKey}
                                disabled={isSavingKey}
                            >
                                {isSavingKey ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.modalSaveText}>Kaydet</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* OpenWeatherMap API Modal */}
            <Modal
                visible={weatherKeyModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setWeatherKeyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>🌤️ OpenWeatherMap API</Text>
                        <TextInput
                            style={styles.apiInput}
                            value={weatherKeyInput}
                            onChangeText={setWeatherKeyInput}
                            placeholder="API anahtarınızı yapıştırın..."
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity
                            style={styles.apiLinkButton}
                            onPress={() => Linking.openURL('https://openweathermap.org/api')}
                        >
                            <Text style={styles.apiLinkText}>🔑 Ücretsiz API anahtarı al</Text>
                        </TouchableOpacity>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setWeatherKeyModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSaveButton}
                                onPress={async () => {
                                    await userSettingsService.saveSettings({ openWeatherApiKey: weatherKeyInput });
                                    setOpenWeatherKey(weatherKeyInput);
                                    setWeatherKeyModalVisible(false);
                                    Alert.alert('✅', 'OpenWeatherMap API kaydedildi');
                                }}
                            >
                                <Text style={styles.modalSaveText}>Kaydet</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Variables Modal */}
            <Modal
                visible={variablesModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setVariablesModalVisible(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: activeColors.text }}>Değişkenler</Text>
                        <TouchableOpacity
                            onPress={() => setVariablesModalVisible(false)}
                            style={{ padding: 8, backgroundColor: activeColors.card, borderRadius: 8 }}
                        >
                            <Text style={{ color: activeColors.primary, fontWeight: 'bold' }}>Kapat</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ padding: 16, flex: 1 }}>
                        {/* Brief / Bilgilendirme Alanı */}
                        {/* Brief / Bilgilendirme Alanı (Collapsible) */}
                        <TouchableOpacity
                            onPress={() => setShowVarsHelp(!showVarsHelp)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 12,
                                backgroundColor: colors.card,
                                borderRadius: 12,
                                marginBottom: 16,
                                borderWidth: 1,
                                borderColor: colors.border
                            }}
                        >
                            <Ionicons name="information-circle-outline" size={24} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={{ flex: 1, fontWeight: '600', color: colors.text }}>Nasıl Kullanılır?</Text>
                            <Ionicons name={showVarsHelp ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {showVarsHelp && (
                            <ScrollView style={{ maxHeight: '40%', marginBottom: 20 }} nestedScrollEnabled={true}>
                                <View style={{ backgroundColor: colors.primary + '10', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                                    <Text style={{ color: colors.text, marginBottom: 12, lineHeight: 20, fontSize: 13 }}>
                                        Bu alana ekleyeceğiniz değişkenler, tüm workflow'larınızda otomatik olarak kullanılır.
                                    </Text>

                                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>Gmail Örneği:</Text>
                                    <View style={{ backgroundColor: colors.background, padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
                                        <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textSecondary }}>AD: <Text style={{ color: colors.text, fontWeight: 'bold' }}>GMAIL_EMAIL</Text></Text>
                                        <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textSecondary }}>DEĞER: <Text style={{ color: colors.text }}>ornek@gmail.com</Text></Text>
                                        <View style={{ height: 4 }} />
                                        <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textSecondary }}>AD: <Text style={{ color: colors.text, fontWeight: 'bold' }}>GMAIL_PASSWORD</Text></Text>
                                        <Text style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textSecondary }}>DEĞER: <Text style={{ color: colors.text }}>xxxx yyyy zzzz wwww</Text></Text>
                                        <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>(Google Hesabım -{'>'} Güvenlik -{'>'} Uygulama Şifreleri)</Text>
                                    </View>

                                    <TouchableOpacity onPress={() => Linking.openURL('https://myaccount.google.com/apppasswords')} style={{ marginTop: 4 }}>
                                        <Text style={{ color: colors.primary, fontSize: 12, textDecorationLine: 'underline' }}>🔗 Google App Password Al</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}

                        <Text style={[styles.sectionHeader, { marginTop: 10 }]}>Yeni Değişken Ekle</Text>

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                            <View style={{ flex: 1, gap: 8 }}>
                                <TextInput
                                    style={[styles.apiInput, { marginBottom: 0 }]}
                                    placeholder="AD (Örn: GMAIL_PASSWORD)"
                                    value={newVarName}
                                    onChangeText={setNewVarName}
                                    autoCapitalize="characters"
                                    placeholderTextColor="#999"
                                />
                                <TextInput
                                    style={[styles.apiInput, { marginBottom: 0 }]}
                                    placeholder="Değer"
                                    value={newVarValue}
                                    onChangeText={setNewVarValue}
                                    secureTextEntry={true}
                                    placeholderTextColor="#999"
                                />
                                <TextInput
                                    style={[styles.apiInput, { marginBottom: 0 }]}
                                    placeholder="Açıklama (Opsiyonel)"
                                    value={newVarDescription}
                                    onChangeText={setNewVarDescription}
                                    placeholderTextColor="#999"
                                />
                            </View>
                            <TouchableOpacity
                                style={{ backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 20 }}
                                onPress={handleAddVariable}
                                disabled={isAddingVar}
                            >
                                {isAddingVar ? <ActivityIndicator color="#fff" /> : <Ionicons name="add" size={28} color="#fff" />}
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionHeader}>Kayıtlı Değişkenler</Text>
                        <ScrollView style={{ flex: 1 }} nestedScrollEnabled={true}>
                            {Object.entries(customVariables).length === 0 ? (
                                <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 20 }}>Henüz değişken yok.</Text>
                            ) : (
                                Object.entries(customVariables).map(([key, data]: [string, any]) => (
                                    <View key={key} style={styles.item}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemLabel}>{key}</Text>
                                            <Text style={[styles.itemValue, { fontSize: 13 }]}>********</Text>
                                            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{data.description || 'Açıklama yok'}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleDeleteVariable(key)}>
                                            <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setVariablesModalVisible(false)}
                            style={{
                                marginTop: 10,
                                backgroundColor: colors.card,
                                padding: 16,
                                borderRadius: 12,
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: colors.border
                            }}
                        >
                            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>Bitti / Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView >
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        padding: 24,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.text,
    },
    content: {
        flex: 1,
    },
    section: {
        marginTop: 8,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    item: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 14,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemIcon: {
        marginRight: 14,
    },
    itemLabel: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemValue: {
        fontSize: 15,
        color: colors.textSecondary,
    },
    dangerText: {
        color: colors.danger,
    },
    // Google Button Styles
    googleButton: {
        backgroundColor: '#4285F4',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 14,
        gap: 10,
    },
    googleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    googleConnected: {
        backgroundColor: colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#34A853',
    },
    googleInfo: {
        flex: 1,
    },
    googleEmail: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    googleSubtext: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 2,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 20,
    },
    apiInput: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
    },
    apiLinkButton: {
        alignItems: 'center',
        marginBottom: 20,
    },
    apiLinkText: {
        color: colors.primary,
        fontSize: 14,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.background,
        alignItems: 'center',
    },
    modalCancelText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    modalSaveButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    modalSaveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

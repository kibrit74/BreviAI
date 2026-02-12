import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, LogBox, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { deviceScanner } from './src/services/DeviceScanner';
import { sensorTriggerService } from './src/services/SensorTriggerService';
import { DebugConsole } from './src/components/DebugConsole';
import InteractionModal from './src/components/InteractionModal';
import { GlobalGestureHandler } from './src/components/GlobalGestureHandler';
import { TriggerManager } from './src/services/TriggerManager';
import { backgroundService } from './src/services/BackgroundService';
import { apiService } from './src/services/ApiService';
import { DeepLinkHandler } from './src/components/DeepLinkHandler';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Ignore specific warnings
LogBox.ignoreLogs(['Warning: ...']);

// Initialize Background Tasks
// Notification Listener is now Native (NotificationTriggerService)

// IMMEDIATELY hide splash - don't wait for anything
SplashScreen.preventAutoHideAsync().catch(() => { });

export default function App() {
    const [appIsReady, setAppIsReady] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [initialState, setInitialState] = useState({
        theme: 'dark' as 'dark' | 'light',
        language: 'tr' as 'tr' | 'en',
        debug: false
    });

    useEffect(() => {
        let isMounted = true;

        async function prepare() {
            console.log("App: Beginning boot process...");
            try {
                // Load fonts first - critical for UI
                console.log("App: Loading fonts...");
                await Font.loadAsync(Ionicons.font);
                console.log("App: Fonts loaded.");

                // Load settings from storage
                console.log("App: Loading user settings...");
                try {
                    const [theme, language, debug] = await Promise.all([
                        AsyncStorage.getItem('user_theme'),
                        AsyncStorage.getItem('user_language'),
                        AsyncStorage.getItem('user_debug_mode')
                    ]);

                    if (isMounted) {
                        setInitialState({
                            theme: (theme as 'dark' | 'light') || 'dark',
                            language: (language as 'tr' | 'en') || 'tr',
                            debug: debug === 'true'
                        });
                    }
                    console.log("App: Settings configured.");
                } catch (storageError) {
                    console.warn('Storage error:', storageError);
                }

                // Initialize Device Scanner in background (don't block boot)
                console.log("App: Triggering device scan in background...");
                deviceScanner.scan().catch(err => console.warn("Background scan error", err));

                // Initialize Sensor Triggers
                console.log("App: Refreshing sensor triggers...");
                sensorTriggerService.refreshTriggers().catch(err => console.warn("Sensor trigger refresh error", err));

                // Initialize Telegram Bot Polling
                console.log("App: Starting Telegram bot polling...");
                try {
                    const { telegramPollingService } = require('./src/services/TelegramPollingService');
                    telegramPollingService.refreshPolling().catch((err: Error) => console.warn("Telegram polling error", err));
                } catch (e) { }

                // Initialize Background Fetch Task (TriggerManager)
                console.log("App: Initializing TriggerManager for background tasks...");
                TriggerManager.init().catch(err => console.warn("TriggerManager init error", err));

                // Auto-start BackgroundService if user enabled it previously
                const backgroundEnabled = await AsyncStorage.getItem('background_service_enabled');
                if (backgroundEnabled === 'true') {
                    console.log("App: Auto-starting BackgroundService...");
                    backgroundService.startForegroundService().catch(err => console.warn("BackgroundService auto-start error", err));
                }

                // Check Notification Listener Permissions
                try {
                    const { BreviSettingsManager } = require('react-native').NativeModules;
                    // hasNotificationListenerAccess is synchronous
                    const hasNotifPerm = BreviSettingsManager?.hasNotificationListenerAccess?.();

                    if (hasNotifPerm === false) { // Explicit check since it might be undefined/null on iOS or error
                        console.log("App: Notification Permission missing. Prompting user...");
                        Alert.alert(
                            "Bildirim Erişimi Gerekli",
                            "WhatsApp ve SMS tetikleyicilerinin çalışması için 'Bildirim Erişim' izni gereklidir.",
                            [
                                { text: "Daha Sonra", style: 'cancel' },
                                {
                                    text: "Ayarları Aç",
                                    onPress: async () => {
                                        BreviSettingsManager?.requestNotificationListenerAccess();
                                    }
                                }
                            ]
                        );
                    } else {
                        console.log("App: Notification Permission granted (or module missing).");
                    }
                } catch (e) {
                    console.warn("App: Notif Perm check failed", e);
                }

                // Explicitly Test Backend Connection
                console.log("App: Running Backend Connection Test...");
                try {
                    const conn = await apiService.testConnection();
                    if (conn.success) {
                        console.log(`App: Backend Connection SUCCESS (Latency: ${conn.latency}ms)`);
                        Alert.alert("Bağlantı Başarılı", `Sunucuya başarıyla bağlanıldı. (${conn.latency}ms)`);
                    } else {
                        console.warn("App: Connection Error:", conn.error);
                        Alert.alert("Bağlantı Hatası", `Sunucuya bağlanılamadı. Hata: ${conn.error}\nLütfen internet bağlantınızı kontrol edin.`);
                    }
                } catch (e) {
                    console.error("App: Connection Test Exception:", e);
                    Alert.alert("Kritik Hata", "Bağlantı testi sırasında beklenmeyen bir hata oluştu: " + String(e));
                }

            } catch (e) {
                console.error('App Boot Failure:', e);
                if (isMounted) {
                    setLoadError(String(e));
                }
            } finally {
                if (isMounted) {
                    console.log("App: Setting appIsReady to true.");
                    setAppIsReady(true);
                }
            }
        }

        prepare();

        return () => {
            isMounted = false;
        };
    }, []);

    // Hide splash when ready
    useEffect(() => {
        if (appIsReady) {
            SplashScreen.hideAsync().catch(() => { });
        }
    }, [appIsReady]);

    // Force hide splash after 5 seconds no matter what
    useEffect(() => {
        const timer = setTimeout(() => {
            SplashScreen.hideAsync().catch(() => { });
            if (!appIsReady) {
                setAppIsReady(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    // Show error screen if there's a critical error
    if (loadError) {
        return (
            <SafeAreaProvider>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827', padding: 20 }}>
                    <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
                        Yükleme Hatası
                    </Text>
                    <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
                        {loadError}
                    </Text>
                </View>
            </SafeAreaProvider>
        );
    }

    // Show nothing while loading (splash screen is visible)
    if (!appIsReady) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ErrorBoundary screenName="Ana Ekran">
                    <AppProvider
                        initialTheme={initialState.theme}
                        initialLanguage={initialState.language}
                        initialDebug={initialState.debug}
                    >
                        <GlobalGestureHandler>
                            <StatusBar style={initialState.theme === 'dark' ? 'light' : 'dark'} />
                            <AppNavigator />
                            <InteractionModal />
                            <DebugConsole />
                            <DeepLinkHandler />
                        </GlobalGestureHandler>
                    </AppProvider>
                </ErrorBoundary>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

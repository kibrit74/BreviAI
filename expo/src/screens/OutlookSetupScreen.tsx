import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, ResponseType } from 'expo-auth-session';
import { microsoftService, MICROSOFT_CONFIG } from '../services/MicrosoftService';
import * as Clipboard from 'expo-clipboard';

WebBrowser.maybeCompleteAuthSession();

export default function OutlookSetupScreen() {
    const navigation = useNavigation<any>();
    const [clientId, setClientId] = useState(MICROSOFT_CONFIG.clientId);
    const [isLoading, setIsLoading] = useState(false);
    const [authState, setAuthState] = useState(microsoftService.getAuthState());

    // Discovery endpoints
    const discovery = MICROSOFT_CONFIG.discovery;

    // Redirect URI
    const redirectUri = makeRedirectUri({
        scheme: 'brevi-ai',
        path: 'oauth'
    });

    // Check if Developer has configured the ID
    const isConfigured = clientId && clientId !== 'YOUR_CLIENT_ID_HERE';

    // Auth Request Hook
    const [request, response, promptAsync] = useAuthRequest(
        {
            clientId: isConfigured ? clientId : 'PLACEHOLDER',
            scopes: MICROSOFT_CONFIG.scopes,
            redirectUri,
            responseType: ResponseType.Code,
            extraParams: {
                prompt: 'select_account'
            }
        },
        discovery
    );

    useEffect(() => {
        // Load initial state
        const state = microsoftService.getAuthState();
        setAuthState(state);
        // Sync with service
        setClientId(microsoftService.getClientId());

        console.log('[OutlookSetup] Current Redirect URI:', redirectUri);
    }, []);

    // Auto-trigger login when screen opens (if configured and not signed in)
    useEffect(() => {
        if (request && isConfigured && !authState.isSignedIn && !isLoading) {
            // Small delay to let screen render first
            const timer = setTimeout(() => {
                promptAsync();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [request, isConfigured, authState.isSignedIn]);

    useEffect(() => {
        if (response?.type === 'success') {
            const { code } = response.params;
            if (code) {
                // Exchange code for token comes next
                // But wait, useAuthRequest just gives code? 
                // We need exchangeCodeAsync but that requires client secret usually?
                // For Public Clients (Mobile/Desktop) with PKCE, we can exchange code without secret.
                handleExchangeCode(code, request?.codeVerifier);
            }
        } else if (response?.type === 'error') {
            Alert.alert('Hata', 'Giriş başarısız oldu: ' + response.error?.message);
        }
    }, [response]);

    const handleExchangeCode = async (code: string, codeVerifier?: string) => {
        setIsLoading(true);
        try {
            // Exchange code for token
            // We use fetch manually because exchangeCodeAsync helper works best with secret
            // With PKCE public client, we send code_verifier

            const bodyBody = new URLSearchParams({
                client_id: clientId,
                scope: MICROSOFT_CONFIG.scopes.join(' '),
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            });

            if (codeVerifier) {
                bodyBody.append('code_verifier', codeVerifier);
            }

            const res = await fetch(discovery.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: bodyBody.toString()
            });

            const data = await res.json();

            if (res.ok) {
                // Save tokens
                console.log('[OutlookSetup] Token exchange successful, saving auth...');
                await microsoftService.saveAuth({
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresIn: data.expires_in,
                    tokenType: data.token_type,
                    scope: data.scope,
                    issuedAt: Date.now() / 1000
                } as any, clientId);

                // Small delay to ensure userInfo fetch completes
                await new Promise(resolve => setTimeout(resolve, 500));

                const newState = microsoftService.getAuthState();
                console.log('[OutlookSetup] New auth state:', newState);
                setAuthState(newState);
                Alert.alert('Başarılı', 'Microsoft hesabınız bağlandı!');
            } else {
                throw new Error(data.error_description || data.error || 'Token değişimi başarısız');
            }

        } catch (error) {
            console.error('Token Exchange Error:', error);
            Alert.alert('Hata', 'Token alınamadı: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!isConfigured) {
            Alert.alert('Geliştirici Uyarısı', 'Lütfen kaynak kodda (MicrosoftService.ts) Client ID tanımlayın.');
            return;
        }

        try {
            await promptAsync();
        } catch (e) {
            Alert.alert("Başlatılamadı", "Auth session başlatılamadı: " + e);
        }
    };

    const handleLogout = async () => {
        await microsoftService.signOut();
        setAuthState(microsoftService.getAuthState());
    };

    const openAzureGuide = () => {
        Linking.openURL('https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Outlook & Microsoft</Text>
            </View>

            <ScrollView style={styles.content}>

                {authState.isSignedIn ? (
                    <View style={[styles.card, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
                        <View style={styles.userInfo}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {authState.user?.displayName?.charAt(0) || 'M'}
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.userName}>{authState.user?.displayName}</Text>
                                <Text style={styles.userEmail}>{authState.user?.email}</Text>
                            </View>
                        </View>
                        <View style={styles.statusBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#059669" />
                            <Text style={styles.statusText}>Bağlandı</Text>
                        </View>

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutText}>Bağlantıyı Kes</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        <View style={styles.introCard}>
                            <Ionicons name="logo-microsoft" size={24} color="#0078D4" />
                            <Text style={styles.introText}>
                                Outlook ve Excel işlemlerini kullanmak için Microsoft hesabınızla giriş yapın.
                            </Text>
                        </View>

                        {!isConfigured ? (
                            <View style={[styles.card, { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Ionicons name="construct" size={24} color="#D97706" />
                                    <Text style={[styles.label, { color: '#D97706', marginLeft: 8, marginBottom: 0 }]}>Geliştirici Yapılandırması Eksik</Text>
                                </View>
                                <Text style={styles.helperText}>
                                    Lütfen `expo/src/services/MicrosoftService.ts` dosyasındaki `MICROSOFT_CONFIG.clientId` alanına Azure Client ID'nizi girin.
                                </Text>
                                <Text style={{ fontFamily: 'monospace', fontSize: 11, backgroundColor: '#FEF3C7', padding: 8, borderRadius: 4, marginTop: 4 }}>
                                    clientId: 'YOUR_CLIENT_ID_HERE'
                                </Text>
                                <TouchableOpacity onPress={openAzureGuide} style={{ marginTop: 12 }}>
                                    <Text style={styles.linkText}>🔗 Azure Portal'da Uygulama Oluştur</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        <TouchableOpacity
                            style={[
                                styles.loginButton,
                                (!isConfigured || !request) && styles.disabledButton
                            ]}
                            onPress={handleLogin}
                            disabled={!isConfigured || !request || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="logo-microsoft" size={20} color="#FFF" style={{ marginRight: 10 }} />
                                    <Text style={styles.loginButtonText}>Microsoft ile Giriş Yap</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={{ marginTop: 16, alignItems: 'center' }}>
                            <Text style={styles.redirectInfo}>Redirect URI (Azure'a ekleyin):</Text>
                            <TouchableOpacity onPress={async () => {
                                await Clipboard.setStringAsync(redirectUri);
                                Alert.alert('Kopyalandı', 'Redirect URI kopyalandı. Azure Portal\'a yapıştırın.');
                            }} style={{ backgroundColor: '#E5E7EB', padding: 8, borderRadius: 6, marginTop: 4 }}>
                                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>{redirectUri}</Text>
                                <View style={{ position: 'absolute', right: -20, top: 8 }}>
                                    <Ionicons name="copy-outline" size={14} color="#6B7280" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}


            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    content: { padding: 16 },
    card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
    introCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
    introText: { flex: 1, marginLeft: 12, color: '#1E40AF', fontSize: 14 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
    helperText: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
    linkText: { color: '#2563EB', fontSize: 12, fontWeight: '500' },
    loginButton: { flexDirection: 'row', backgroundColor: '#2F2F2F', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    disabledButton: { opacity: 0.5 },
    loginButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
    userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    userName: { fontSize: 16, fontWeight: '700', color: '#064E3B' },
    userEmail: { fontSize: 14, color: '#059669' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 16 },
    statusText: { fontSize: 12, fontWeight: '600', color: '#059669', marginLeft: 4 },
    logoutButton: { padding: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EF4444', borderRadius: 8, alignItems: 'center' },
    logoutText: { color: '#EF4444', fontWeight: '600' },
    infoSection: { marginTop: 16, paddingBottom: 40 },
    infoTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
    infoStep: { fontSize: 14, color: '#4B5563', marginBottom: 8, lineHeight: 20 },
    code: { fontFamily: 'monospace', backgroundColor: '#E5E7EB', padding: 4, borderRadius: 4, color: '#1F2937' },
    redirectInfo: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 16 }
});

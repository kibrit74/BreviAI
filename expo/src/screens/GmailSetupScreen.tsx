
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Clipboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function GmailSetupScreen() {
    const navigation = useNavigation<any>();

    const openLink = (url: string) => {
        Linking.openURL(url);
    };

    const copyToClipboard = (text: string) => {
        Clipboard.setString(text);
        Alert.alert('Kopyalandı', text);
    };

    const Step = ({ number, title, content, link, code }: { number: string, title: string, content: string, link?: string, code?: string }) => (
        <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{number}</Text>
                </View>
                <Text style={styles.stepTitle}>{title}</Text>
            </View>
            <Text style={styles.stepContent}>{content}</Text>

            {link && (
                <TouchableOpacity style={styles.linkButton} onPress={() => openLink(link)}>
                    <Text style={styles.linkText}>🔗 Linki Aç</Text>
                </TouchableOpacity>
            )}

            {code && (
                <TouchableOpacity style={styles.codeBlock} onPress={() => copyToClipboard(code)}>
                    <Text style={styles.codeText}>{code}</Text>
                    <Ionicons name="copy-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gmail Okuma Kurulumu</Text>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.introCard}>
                    <Ionicons name="information-circle" size={24} color="#2563EB" />
                    <Text style={styles.introText}>
                        Google güvenlik politikaları gereği, kendi maillerinizi okumak için ücretsiz bir "Client ID" almanız gerekir. Bu işlem 5 dakika sürer.
                    </Text>
                </View>

                <Step
                    number="1"
                    title="Google Cloud Console"
                    content="Google Cloud Console adresine gidin ve yeni bir proje oluşturun."
                    link="https://console.cloud.google.com/"
                />

                <Step
                    number="2"
                    title="API Etkinleştirme"
                    content="Menüden 'APIs & Services > Library' seçin. 'Gmail API' aratıp etkinleştirin (Enable)."
                />

                <Step
                    number="3"
                    title="İzin Ekranı"
                    content="Menüden 'OAuth consent screen' seçin. 'External' seçip ilerleyin. 'Test Users' kısmına KENDİ mail adresinizi eklemeyi unutmayın!"
                />

                <Step
                    number="4"
                    title="ID Oluşturma"
                    content="Menüden 'Credentials > Create Credentials > OAuth Client ID' seçin. Application Type: 'Android'. Package Name kısmına şunu yapıştırın:"
                    code="com.breviai.app"
                />

                <Step
                    number="5"
                    title="Sonuç"
                    content="Oluşan Client ID'yi kopyalayın ve BreviAI Ayarlar ekranına yapıştırın."
                />

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 60,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    content: {
        padding: 16,
    },
    introCard: {
        flexDirection: 'row',
        backgroundColor: '#EFF6FF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        alignItems: 'center',
    },
    introText: {
        flex: 1,
        marginLeft: 12,
        color: '#1E40AF',
        fontSize: 14,
        lineHeight: 20,
    },
    stepContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    stepBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#10B981',
    },
    stepBadgeText: {
        color: '#059669',
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    stepContent: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginLeft: 38,
    },
    linkButton: {
        marginTop: 12,
        marginLeft: 38,
        backgroundColor: '#F3F4F6',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    linkText: {
        color: '#2563EB',
        fontWeight: '500',
        fontSize: 14,
    },
    codeBlock: {
        marginTop: 12,
        marginLeft: 38,
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    codeText: {
        fontFamily: 'monospace',
        color: '#4B5563',
        fontSize: 13,
    },
});

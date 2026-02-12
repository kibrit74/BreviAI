import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

export default function AboutScreen({ navigation }: any) {
    const { colors, t } = useApp();

    const styles = createStyles(colors);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('appAbout')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logo}>
                        <Ionicons name="flash" size={48} color="#ffffff" />
                    </View>
                    <Text style={styles.appName}>BreviAI</Text>
                    <Text style={styles.version}>{t('version')} 1.0.0</Text>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.description}>
                        {t('aboutDesc')}
                    </Text>
                </View>

                {/* Features */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('featuresTitle') || 'Özellikler'}</Text>

                    <View style={styles.featureItem}>
                        <Ionicons name="git-network-outline" size={24} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.featureTitle}>Gelişmiş Otomasyon</Text>
                            <Text style={styles.featureDesc}>Sürükle-bırak Workflow Builder ile karmaşık görevleri otomatikleştirin.</Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <Ionicons name="bulb-outline" size={24} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.featureTitle}>Akıllı Hafıza</Text>
                            <Text style={styles.featureDesc}>Sizi tanıyan, tercihlerinizi hatırlayan ve öğrenen yapay zeka asistanı.</Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <Ionicons name="home-outline" size={24} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.featureTitle}>Akıllı Ev Kontrolü</Text>
                            <Text style={styles.featureDesc}>Philips Hue ve diğer cihazlarınızı sesli komutlarla yönetin.</Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <Ionicons name="apps-outline" size={24} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.featureTitle}>Hızlı Erişim</Text>
                            <Text style={styles.featureDesc}>Ana ekran widget'ları ile favori işlemlerinize tek tıkla ulaşın.</Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.featureTitle}>Çoklu LLM Desteği</Text>
                            <Text style={styles.featureDesc}>Gemini, OpenAI ve Claude modelleri arasında özgürce geçiş yapın.</Text>
                        </View>
                    </View>
                </View>

                {/* Credits */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('developerTitle')}</Text>
                    <Text style={styles.credits}>© 2024 BreviAI Team</Text>
                    <Text style={styles.credits}>Powered by Google Gemini AI</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logo: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
    },
    version: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 24,
        textAlign: 'center',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    featureDesc: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    credits: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 4,
    },
});

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

interface TermsModalProps {
    onAccept: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ onAccept }) => {
    const { theme, t } = useApp();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? COLORS.dark : COLORS.light;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        style={styles.logoGradient}
                    >
                        <Ionicons name="flash" size={32} color="#fff" />
                    </LinearGradient>
                </View>
                <Text style={[styles.title, { color: currentTheme.text }]}>
                    BreviAI
                </Text>
                <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
                    Kullanım Koşulları
                </Text>
            </View>

            {/* Terms Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
            >
                <View style={[styles.termsCard, { backgroundColor: currentTheme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                        1. Hizmet Kullanımı
                    </Text>
                    <Text style={[styles.termsText, { color: currentTheme.textSecondary }]}>
                        BreviAI uygulamasını kullanarak, bu koşulları kabul etmiş olursunuz.
                        Uygulama, Android cihazınızda otomasyon kısayolları oluşturmanıza
                        ve yönetmenize olanak tanır.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                        2. Veri Gizliliği
                    </Text>
                    <Text style={[styles.termsText, { color: currentTheme.textSecondary }]}>
                        Kişisel verileriniz yerel cihazınızda saklanır. Sesli komutlarınız
                        işlenmek üzere sunucularımıza gönderilir ancak kaydedilmez.
                        Gizliliğinize saygı duyuyoruz.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                        3. İzinler
                    </Text>
                    <Text style={[styles.termsText, { color: currentTheme.textSecondary }]}>
                        Uygulama, tam işlevsellik için mikrofon, bildirim ve sistem ayarları
                        izinlerine ihtiyaç duyar. Bu izinler yalnızca otomasyon
                        işlevleri için kullanılır.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                        4. Sorumluluk
                    </Text>
                    <Text style={[styles.termsText, { color: currentTheme.textSecondary }]}>
                        BreviAI, otomasyonların yanlış kullanımından kaynaklanan
                        sorunlardan sorumlu değildir. Lütfen kısayollarınızı dikkatli
                        bir şekilde yapılandırın.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                        5. Güncellemeler
                    </Text>
                    <Text style={[styles.termsText, { color: currentTheme.textSecondary }]}>
                        Bu koşullar zaman zaman güncellenebilir. Önemli değişiklikler
                        için uygulama içinden bilgilendirileceksiniz.
                    </Text>
                </View>
            </ScrollView>

            {/* Accept Button */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={onAccept} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.acceptButton}
                    >
                        <Text style={styles.acceptButtonText}>
                            Kabul Et ve Devam Et
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
                <Text style={[styles.footerNote, { color: currentTheme.textTertiary }]}>
                    Devam ederek kullanım koşullarını kabul etmiş olursunuz.
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 20,
    },
    logoContainer: {
        marginBottom: 16,
    },
    logoGradient: {
        width: 72,
        height: 72,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: SPACING.medium,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    termsCard: {
        borderRadius: 16,
        padding: SPACING.large,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    termsText: {
        fontSize: 14,
        lineHeight: 22,
    },
    footer: {
        padding: SPACING.large,
        paddingBottom: 40,
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    footerNote: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 12,
    },
});

export default TermsModal;

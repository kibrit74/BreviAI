import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

export default function TermsOfServiceScreen({ navigation }: any) {
    const { colors, t } = useApp();

    const styles = createStyles(colors);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('termsOfService')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <Text style={styles.lastUpdated}>{t('lastUpdated')}</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('termsTitle1')}</Text>
                    <Text style={styles.paragraph}>{t('termsDesc1')}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('termsTitle2')}</Text>
                    <Text style={styles.paragraph}>{t('termsDesc2')}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('termsTitle3')}</Text>
                    <Text style={styles.paragraph}>{t('termsDesc3')}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('termsTitle4')}</Text>
                    <Text style={styles.paragraph}>{t('termsDesc4')}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('termsTitle5')}</Text>
                    <Text style={styles.paragraph}>{t('termsDesc5')}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('termsTitle6')}</Text>
                    <Text style={styles.paragraph}>{t('termsDesc6')}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('termsTitle7')}</Text>
                    <Text style={styles.paragraph}>{t('termsDesc7')}</Text>
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
    lastUpdated: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    paragraph: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 24,
    },
});

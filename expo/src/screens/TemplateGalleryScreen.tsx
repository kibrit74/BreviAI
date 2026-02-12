
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkflowStorage } from '../services/WorkflowStorage';
import { WORKFLOW_TEMPLATES, WorkflowTemplate } from '../constants/WorkflowTemplates';
import { useApp } from '../context/AppContext';
import { SPACING } from '../constants/theme';

// Simple ID generator
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

export default function TemplateGalleryScreen() {
    const navigation = useNavigation<any>();
    const { colors, theme } = useApp();
    const isDark = theme === 'dark';
    const insets = useSafeAreaInsets();

    const handleSelectTemplate = async (template: WorkflowTemplate) => {
        try {
            // Create a real workflow from template
            const newWorkflow = {
                id: generateId(),
                name: template.name,
                description: template.description,
                icon: template.icon,
                color: template.color,
                nodes: template.nodes, // Deep copy ideally
                edges: template.edges,
                isActive: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                runCount: 0
            };

            await WorkflowStorage.save(newWorkflow);
            Alert.alert('Başarılı', 'Şablon kütüphanenize eklendi!', [
                { text: 'Düzenle', onPress: () => navigation.navigate('WorkflowBuilder', { workflowId: newWorkflow.id }) },
                { text: 'Tamam', style: 'cancel' }
            ]);
        } catch (error) {
            Alert.alert('Hata', 'Şablon oluşturulamadı.');
            console.error(error);
        }
    };

    const renderItem = ({ item }: { item: WorkflowTemplate }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSelectTemplate(item)}
            accessibilityLabel={`${item.name} şablonunu ekle`}
            accessibilityRole="button"
        >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={32} color={item.color} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
            </View>
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + SPACING.medium, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    accessibilityLabel="Geri dön"
                    accessibilityRole="button"
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Şablon Galerisi</Text>
            </View>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Hazır senaryolarla hemen başlayın.</Text>

            <FlatList
                data={WORKFLOW_TEMPLATES}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.medium,
        borderBottomWidth: 1,
    },
    backButton: {
        marginRight: SPACING.medium,
        padding: SPACING.micro,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 14,
        paddingHorizontal: SPACING.medium,
        paddingTop: SPACING.medium,
        paddingBottom: SPACING.small,
    },
    list: {
        padding: SPACING.medium,
        paddingBottom: 100,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: SPACING.medium,
        marginBottom: SPACING.small + 4,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.medium,
    },
    textContainer: {
        flex: 1,
        marginRight: SPACING.small,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
    },
});


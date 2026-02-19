import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AssistantFixSuggestion } from '../../services/assistant/WorkflowAssistantTypes';

interface WorkflowFixPreviewModalProps {
    visible: boolean;
    suggestion: AssistantFixSuggestion | null;
    onClose: () => void;
    onApply: (suggestion: AssistantFixSuggestion) => void;
    colors: any;
    isDark: boolean;
}

export const WorkflowFixPreviewModal: React.FC<WorkflowFixPreviewModalProps> = ({
    visible,
    suggestion,
    onClose,
    onApply,
    colors,
    isDark,
}) => {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.card, { backgroundColor: isDark ? '#121214' : colors.card, borderColor: colors.border }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Düzeltme Önizleme</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={[styles.close, { color: colors.textSecondary }]}>x</Text>
                        </TouchableOpacity>
                    </View>

                    {!suggestion && (
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Önizlenecek bir değişiklik yok.</Text>
                    )}

                    {suggestion && (
                        <>
                            <Text style={[styles.suggestionTitle, { color: colors.text }]}>{suggestion.title}</Text>
                            <Text style={[styles.suggestionWhy, { color: colors.textSecondary }]}>{suggestion.why}</Text>

                            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                                {suggestion.changes.map((change, index) => (
                                    <View key={`${change.type}_${index}`} style={[styles.changeCard, { borderColor: colors.border }]}>
                                        <Text style={[styles.changeType, { color: colors.text }]}>{change.type}</Text>
                                        {!!change.nodeId && (
                                            <Text style={[styles.changeMeta, { color: colors.textSecondary }]}>Node: {change.nodeId}</Text>
                                        )}
                                        {!!change.path && (
                                            <Text style={[styles.changeMeta, { color: colors.textSecondary }]}>Alan: {change.path}</Text>
                                        )}
                                        {change.oldValue !== undefined && (
                                            <Text style={[styles.changeMeta, { color: colors.textSecondary }]}>
                                                Önce: {String(change.oldValue)}
                                            </Text>
                                        )}
                                        {change.newValue !== undefined && (
                                            <Text style={[styles.changeMeta, { color: colors.textSecondary }]}>
                                                Sonra: {String(change.newValue)}
                                            </Text>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>

                            <TouchableOpacity style={styles.applyButton} onPress={() => onApply(suggestion)}>
                                <Text style={styles.applyButtonText}>Değişiklikleri Uygula</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    close: {
        fontSize: 22,
        fontWeight: '700',
    },
    emptyText: {
        fontSize: 13,
    },
    suggestionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    suggestionWhy: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 10,
    },
    scroll: {
        maxHeight: 360,
    },
    scrollContent: {
        gap: 8,
    },
    changeCard: {
        borderRadius: 10,
        borderWidth: 1,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    changeType: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    changeMeta: {
        fontSize: 12,
        lineHeight: 16,
    },
    applyButton: {
        marginTop: 12,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: '#10B981',
    },
    applyButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
});

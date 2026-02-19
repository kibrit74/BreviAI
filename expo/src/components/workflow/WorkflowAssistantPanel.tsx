import React, { useMemo, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Workflow } from '../../types/workflow-types';
import { ExecutionLogEntry } from '../../services/ExecutionLogger';
import { workflowAssistantService } from '../../services/assistant/WorkflowAssistantService';
import { AssistantFixSuggestion, AssistantResponse } from '../../services/assistant/WorkflowAssistantTypes';

interface WorkflowAssistantPanelProps {
    visible: boolean;
    workflow: Workflow;
    latestError: ExecutionLogEntry | null;
    onClose: () => void;
    onPreviewSuggestion: (suggestion: AssistantFixSuggestion) => void;
    colors: any;
    isDark: boolean;
}

export const WorkflowAssistantPanel: React.FC<WorkflowAssistantPanelProps> = ({
    visible,
    workflow,
    latestError,
    onClose,
    onPreviewSuggestion,
    colors,
    isDark,
}) => {
    const [userMessage, setUserMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [response, setResponse] = useState<AssistantResponse | null>(null);

    const placeholderText = useMemo(() => {
        if (!latestError) return 'Bu workflow\'u iyileştirmek için bir hedef yazın...';
        const node = latestError.failedNodeLabel || 'hata';
        return `${node} hatasını düzeltmek için ne önerirsin?`;
    }, [latestError]);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await workflowAssistantService.generateFixes({
                workflow,
                latestError,
                userMessage: userMessage.trim() || 'Bu workflow hatasını çöz ve uygulanabilir patch öner.',
            });
            setResponse(result);
        } catch (err: any) {
            setError(err?.message || 'Asistan yanıtı alınamadı.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.card, { backgroundColor: isDark ? '#121214' : colors.card, borderColor: colors.border }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Sorun Çöz Asistanı</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={[styles.close, { color: colors.textSecondary }]}>x</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                        {response ? `${response.provider} / ${response.model}` : 'Provider otomatik seçilir'}
                    </Text>

                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        value={userMessage}
                        onChangeText={setUserMessage}
                        placeholder={placeholderText}
                        placeholderTextColor={colors.textTertiary || colors.textSecondary}
                        multiline
                        numberOfLines={3}
                    />

                    <TouchableOpacity style={styles.generateButton} disabled={loading} onPress={handleGenerate}>
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.generateButtonText}>Analiz Et</Text>
                        )}
                    </TouchableOpacity>

                    {!!error && (
                        <Text style={styles.errorText}>{error}</Text>
                    )}

                    {response && (
                        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                            <View style={[styles.block, { borderColor: colors.border }]}>
                                <Text style={[styles.blockTitle, { color: colors.text }]}>Basit Açıklama</Text>
                                <Text style={[styles.blockText, { color: colors.textSecondary }]}>{response.beginnerExplanation}</Text>
                            </View>

                            <View style={[styles.block, { borderColor: colors.border }]}>
                                <Text style={[styles.blockTitle, { color: colors.text }]}>Orta Seviye</Text>
                                <Text style={[styles.blockText, { color: colors.textSecondary }]}>{response.intermediateExplanation}</Text>
                            </View>

                            {response.suggestions.map((suggestion, index) => (
                                <View key={`${suggestion.title}_${index}`} style={[styles.block, { borderColor: colors.border }]}>
                                    <Text style={[styles.blockTitle, { color: colors.text }]}>{suggestion.title}</Text>
                                    <Text style={[styles.blockText, { color: colors.textSecondary }]}>{suggestion.why}</Text>
                                    <Text style={[styles.changeCount, { color: colors.textTertiary || colors.textSecondary }]}>
                                        {suggestion.changes.length} değişiklik önerildi
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.previewButton}
                                        onPress={() => onPreviewSuggestion(suggestion)}
                                    >
                                        <Text style={styles.previewButtonText}>Önizle ve Uygula</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {response.safetyNotes.length > 0 && (
                                <View style={[styles.block, { borderColor: colors.border }]}>
                                    <Text style={[styles.blockTitle, { color: colors.text }]}>Güvenlik Notları</Text>
                                    {response.safetyNotes.map((note, index) => (
                                        <Text key={`${note}_${index}`} style={[styles.blockText, { color: colors.textSecondary }]}>
                                            - {note}
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
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
        maxHeight: '92%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    close: {
        fontSize: 22,
        fontWeight: '700',
    },
    meta: {
        fontSize: 12,
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        minHeight: 74,
        marginBottom: 10,
        textAlignVertical: 'top',
    },
    generateButton: {
        backgroundColor: '#2563EB',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        marginBottom: 8,
    },
    generateButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginBottom: 8,
    },
    scroll: {
        marginTop: 6,
    },
    scrollContent: {
        gap: 8,
        paddingBottom: 8,
    },
    block: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    blockTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
    },
    blockText: {
        fontSize: 12,
        lineHeight: 18,
    },
    changeCount: {
        fontSize: 11,
        marginTop: 6,
    },
    previewButton: {
        marginTop: 8,
        backgroundColor: '#10B981',
        borderRadius: 10,
        alignItems: 'center',
        paddingVertical: 9,
    },
    previewButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
});

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useApp } from '../context/AppContext';

// Execution state interface (previously from ShortcutEngine)
export interface ExecutionState {
    isExecuting: boolean;
    isPaused: boolean;
    currentStep: number;
    totalSteps: number;
    currentAction: string;
    canCancel: boolean;
    canPause: boolean;
}

interface ExecutionModalProps {
    visible: boolean;
    state: ExecutionState;
    onCancel: () => void;
    onPause?: () => void;
    onResume?: () => void;
    shortcutName?: string;
}

const ExecutionModal: React.FC<ExecutionModalProps> = ({ visible, state, onCancel, onPause, onResume, shortcutName }) => {
    const { colors } = useApp();
    const styles = createStyles(colors);

    const progressPercent = state.totalSteps > 0
        ? Math.round((state.currentStep / state.totalSteps) * 100)
        : 0;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {state.isPaused ? '⏸️ Duraklatıldı' : state.isExecuting ? '⚡ Çalışıyor...' : '✓ Tamamlandı'}
                        </Text>
                        {shortcutName && (
                            <Text style={styles.subtitle}>{shortcutName}</Text>
                        )}
                    </View>

                    {/* Progress */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                        </View>
                        <Text style={styles.progressText}>
                            {state.currentStep} / {state.totalSteps}
                        </Text>
                    </View>

                    {/* Current Action */}
                    <View style={styles.actionContainer}>
                        {state.isExecuting && (
                            <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
                        )}
                        <Text style={styles.actionText} numberOfLines={2}>
                            {state.currentAction}
                        </Text>
                    </View>

                    {/* Control Buttons */}
                    {state.isExecuting && (
                        <View style={styles.buttonRow}>
                            {/* Pause/Resume Button */}
                            {state.canPause && onPause && onResume && (
                                <TouchableOpacity
                                    style={[styles.controlButton, state.isPaused ? styles.resumeButton : styles.pauseButton]}
                                    onPress={state.isPaused ? onResume : onPause}
                                >
                                    <Text style={styles.controlButtonText}>
                                        {state.isPaused ? '▶️ Devam' : '⏸️ Duraklat'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {/* Stop Button */}
                            {state.canCancel && (
                                <TouchableOpacity style={[styles.controlButton, styles.stopButton]} onPress={onCancel}>
                                    <Text style={styles.controlButtonText}>⏹️ Durdur</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Close Button (when finished) */}
                    {!state.isExecuting && (
                        <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
                            <Text style={styles.closeButtonText}>Kapat</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textMuted,
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.border,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
    },
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 40,
        marginBottom: 20,
    },
    spinner: {
        marginRight: 8,
    },
    actionText: {
        fontSize: 14,
        color: colors.text,
        textAlign: 'center',
        flex: 1,
    },
    cancelButton: {
        backgroundColor: '#ff4444',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    closeButton: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // Pause/Resume/Stop button styles
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    controlButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    pauseButton: {
        backgroundColor: '#F59E0B', // Orange/Amber
    },
    resumeButton: {
        backgroundColor: '#10B981', // Green
    },
    stopButton: {
        backgroundColor: '#EF4444', // Red
    },
    controlButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default ExecutionModal;

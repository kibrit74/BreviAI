import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useDebugStore, LogEntry } from '../services/DebugLogger';
import { Ionicons } from '@expo/vector-icons';

export const DebugConsole = () => {
    const { logs, isVisible, toggleVisibility, clearLogs } = useDebugStore();

    if (!isVisible) return null;

    const getLogColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'error': return '#ef4444';
            case 'network': return '#10b981';
            case 'ai': return '#8b5cf6';
            case 'execution': return '#f59e0b';
            default: return '#3b82f6';
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={toggleVisibility}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Debug Console</Text>
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={clearLogs} style={styles.button}>
                            <Ionicons name="trash-outline" size={20} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={toggleVisibility} style={styles.button}>
                            <Ionicons name="close-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView style={styles.logsContainer}>
                    {logs.map((log) => (
                        <View key={log.id} style={[styles.logEntry, { borderLeftColor: getLogColor(log.type) }]}>
                            <View style={styles.logHeader}>
                                <Text style={[styles.logType, { color: getLogColor(log.type) }]}>
                                    {log.type.toUpperCase()}
                                </Text>
                                <Text style={styles.logTime}>
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </Text>
                            </View>
                            <Text style={styles.logTitle}>{log.title}</Text>
                            {log.details ? (
                                <Text style={styles.logDetails}>{log.details}</Text>
                            ) : null}
                        </View>
                    ))}
                    {logs.length === 0 && (
                        <Text style={styles.emptyText}>No logs yet...</Text>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        marginTop: 50, // Leave some space at top
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
    },
    button: {
        padding: 4,
    },
    logsContainer: {
        flex: 1,
        padding: 16,
    },
    logEntry: {
        backgroundColor: '#1a1a1a',
        marginBottom: 12,
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    logType: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    logTime: {
        color: '#666',
        fontSize: 10,
    },
    logTitle: {
        color: '#eee',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    logDetails: {
        color: '#aaa',
        fontSize: 12,
        fontFamily: 'monospace',
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        marginTop: 32,
    }
});

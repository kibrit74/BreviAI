import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useDebugStore, debugLog, LogType } from '../services/DebugLogger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

export default function DebugConsoleScreen() {
    const { logs, clearLogs, filter, setFilter } = useDebugStore();
    const insets = useSafeAreaInsets();

    const filteredLogs = filter === 'all'
        ? logs
        : logs.filter(l => l.type === filter);

    const getLogColor = (type: LogType) => {
        switch (type) {
            case 'error': return '#EF4444';
            case 'warning': return '#F59E0B';
            case 'execution': return '#10B981';
            case 'workflow': return '#8B5CF6';
            case 'native': return '#EC4899';
            case 'network': return '#3B82F6';
            default: return '#6B7280';
        }
    };

    const copyLogs = async () => {
        const text = logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.type.toUpperCase()}] ${l.title}\n${l.details}`).join('\n\n');
        await Clipboard.setStringAsync(text);
        debugLog('info', 'Logs copied to clipboard');
    };

    const shareLogs = async () => {
        const text = logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.type.toUpperCase()}] ${l.title}\n${l.details}`).join('\n\n');
        await Share.share({ message: text });
    };

    const renderFilterChip = (type: LogType | 'all', label: string) => (
        <TouchableOpacity
            style={[styles.chip, filter === type && styles.activeChip]}
            onPress={() => setFilter(type)}
        >
            <Text style={[styles.chipText, filter === type && styles.activeChipText]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Debug Console</Text>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={shareLogs} style={styles.iconBtn}>
                        <Feather name="share" size={20} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={copyLogs} style={styles.iconBtn}>
                        <Feather name="copy" size={20} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={clearLogs} style={styles.iconBtn}>
                        <Feather name="trash-2" size={20} color="#EF4444" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => debugLog('error', 'Test Error', 'This is a test error', new Error('Test stack trace'))} style={styles.iconBtn}>
                        <Feather name="alert-triangle" size={20} color="#F59E0B" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.filters}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {renderFilterChip('all', 'All')}
                    {renderFilterChip('error', 'Errors')}
                    {renderFilterChip('warning', 'Warn')}
                    {renderFilterChip('execution', 'Exec')}
                    {renderFilterChip('workflow', 'Workflow')}
                    {renderFilterChip('native', 'Native')}
                </ScrollView>
            </View>

            <FlatList
                data={filteredLogs}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={[styles.logItem, { borderLeftColor: getLogColor(item.type) }]}>
                        <View style={styles.logHeader}>
                            <Text style={[styles.logType, { color: getLogColor(item.type) }]}>
                                {item.type.toUpperCase()}
                            </Text>
                            <Text style={styles.logTime}>
                                {new Date(item.timestamp).toLocaleTimeString()}
                            </Text>
                        </View>
                        <Text style={styles.logTitle}>{item.title}</Text>
                        <Text style={styles.logDetails} numberOfLines={5}>{item.details}</Text>
                        {item.stackTrace && (
                            <Text style={styles.stackTrace}>{item.stackTrace}</Text>
                        )}
                    </View>
                )}
            />
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
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    filters: {
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: '#FFF',
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 4,
    },
    activeChip: {
        backgroundColor: '#111',
    },
    chipText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '600',
    },
    activeChipText: {
        color: '#FFF',
    },
    list: {
        padding: 16,
        gap: 12,
    },
    logItem: {
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    logType: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    logTime: {
        fontSize: 11,
        color: '#9CA3AF',
        fontFamily: 'monospace',
    },
    logTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    logDetails: {
        fontSize: 13,
        color: '#4B5563',
        fontFamily: 'monospace',
        backgroundColor: '#F3F4F6',
        padding: 8,
        borderRadius: 4,
    },
    stackTrace: {
        marginTop: 8,
        fontSize: 11,
        color: '#EF4444',
        fontFamily: 'monospace',
    }
});

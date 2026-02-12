import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

interface CodePreviewProps {
    code: string;
    isDark?: boolean;
    fileName?: string;
}

export const CodePreview: React.FC<CodePreviewProps> = ({
    code,
    isDark = true,
    fileName = 'automation.json',
}) => {
    const lines = code.split('\n');

    // Simple syntax highlighting for JSON
    const highlightLine = (line: string) => {
        const parts: { text: string; color: string }[] = [];

        // Match patterns for JSON syntax
        const patterns = [
            { regex: /("[\w]+")\s*:/g, color: '#9cdcfe' }, // keys
            { regex: /:\s*(".*?")/g, color: '#ce9178' }, // string values
            { regex: /:\s*(\d+)/g, color: '#b5cea8' }, // numbers
            { regex: /:\s*(true|false)/g, color: '#569cd6' }, // booleans
            { regex: /([{}\[\]])/g, color: '#ffd700' }, // brackets
        ];

        let processedLine = line;

        // Simple approach: just render the whole line with basic coloring
        if (line.includes('"')) {
            // Has quotes - likely key or value
            const keyMatch = line.match(/"([^"]+)":/);
            const valueMatch = line.match(/:\s*"([^"]+)"/);

            if (keyMatch && valueMatch) {
                return (
                    <>
                        <Text style={{ color: '#d4d4d4' }}>{line.split('"')[0]}</Text>
                        <Text style={{ color: '#9cdcfe' }}>"{keyMatch[1]}"</Text>
                        <Text style={{ color: '#d4d4d4' }}>: </Text>
                        <Text style={{ color: '#ce9178' }}>"{valueMatch[1]}"</Text>
                        <Text style={{ color: '#d4d4d4' }}>{line.endsWith(',') ? ',' : ''}</Text>
                    </>
                );
            } else if (keyMatch) {
                return (
                    <>
                        <Text style={{ color: '#d4d4d4' }}>{line.split('"')[0]}</Text>
                        <Text style={{ color: '#9cdcfe' }}>"{keyMatch[1]}"</Text>
                        <Text style={{ color: '#d4d4d4' }}>{line.slice(line.indexOf('":') + 2)}</Text>
                    </>
                );
            }
        }

        // Default - just return the line
        let color = '#d4d4d4';
        if (line.includes('{') || line.includes('}')) color = '#ffd700';
        if (line.includes('[') || line.includes(']')) color = '#da70d6';

        return <Text style={{ color }}>{line}</Text>;
    };

    return (
        <View style={styles.container}>
            {/* Mac-style Window Controls */}
            <View style={styles.header}>
                <View style={styles.controls}>
                    <View style={[styles.control, { backgroundColor: '#ff5f56' }]} />
                    <View style={[styles.control, { backgroundColor: '#ffbd2e' }]} />
                    <View style={[styles.control, { backgroundColor: '#27c93f' }]} />
                </View>
                <Text style={styles.fileName}>{fileName}</Text>
                <View style={{ width: 52 }} />
            </View>

            {/* Code Content */}
            <ScrollView
                style={styles.codeContainer}
                horizontal
                showsHorizontalScrollIndicator={false}
            >
                <View style={styles.codeContent}>
                    {/* Line Numbers */}
                    <View style={styles.lineNumbers}>
                        {lines.map((_, index) => (
                            <Text key={index} style={styles.lineNumber}>
                                {index + 1}
                            </Text>
                        ))}
                    </View>

                    {/* Code */}
                    <View style={styles.codeLines}>
                        {lines.map((line, index) => (
                            <Text key={index} style={styles.codeLine}>
                                {highlightLine(line)}
                            </Text>
                        ))}
                        {/* Blinking Cursor */}
                        <View style={styles.cursor} />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.medium,
        paddingVertical: SPACING.small + 2,
        backgroundColor: '#252526',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    controls: {
        flexDirection: 'row',
        gap: 6,
    },
    control: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    fileName: {
        fontSize: 10,
        color: '#6b7280',
        fontFamily: 'monospace',
    },
    codeContainer: {
        maxHeight: 300,
    },
    codeContent: {
        flexDirection: 'row',
        padding: SPACING.medium,
    },
    lineNumbers: {
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.05)',
        paddingRight: SPACING.medium,
        marginRight: SPACING.medium,
    },
    lineNumber: {
        fontSize: 13,
        lineHeight: 22,
        color: '#4b5563',
        fontFamily: 'monospace',
        textAlign: 'right',
    },
    codeLines: {
        flex: 1,
    },
    codeLine: {
        fontSize: 13,
        lineHeight: 22,
        fontFamily: 'monospace',
    },
    cursor: {
        width: 8,
        height: 16,
        backgroundColor: COLORS.dark.primary,
        marginTop: 4,
        opacity: 0.8,
    },
});


import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Share } from 'react-native';
import { udfParser } from '../services/UdfParserService';
import { LinearGradient } from 'expo-linear-gradient';

interface UdfViewerProps {
    uri: string;
    onClose: () => void;
}

export const UdfViewer: React.FC<UdfViewerProps> = ({ uri, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [content, setContent] = useState<string>('');
    const [metadata, setMetadata] = useState<any>(null);

    useEffect(() => {
        loadUdf();
    }, [uri]);

    const loadUdf = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Parsing UDF:', uri);
            const result = await udfParser.parseUdfFile(uri);
            setContent(result.text);
            setMetadata(result.metadata);
        } catch (err) {
            console.error('UDF Parse Error:', err);
            setError('Dosya açılamadı veya format hatalı.');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!content) return;
        try {
            await Share.share({
                message: content,
                title: 'UDF İçeriği'
            });
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#F59E0B" />
                <Text style={styles.loadingText}>UDF Dosyası Ayrıştırılıyor...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={onClose} style={styles.retryButton}>
                    <Text style={styles.retryText}>Kapat</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <View style={styles.paper}>
                    <Text style={styles.content}>{content}</Text>
                </View>
            </ScrollView>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                    <Text style={styles.actionIcon}>📤</Text>
                    <Text style={styles.actionText}>Metni Paylaş</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.closeText}>Kapat</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 15,
        color: '#AAA',
        fontSize: 16,
    },
    errorIcon: {
        fontSize: 40,
        marginBottom: 10,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#2A2A4A',
        borderRadius: 8,
    },
    retryText: {
        color: '#FFF',
    },
    scroll: {
        flex: 1,
        marginBottom: 15,
    },
    scrollContent: {
        padding: 5,
    },
    paper: {
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        padding: 20,
        minHeight: 400,
    },
    content: {
        color: '#000000',
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'monospace', // UYAP docs often look typewriter-ish
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2A2A4A',
        borderRadius: 12,
        padding: 15,
        gap: 8,
    },
    actionIcon: {
        fontSize: 18,
    },
    actionText: {
        color: '#FFF',
        fontWeight: '600',
    },
    closeButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradient: {
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        color: '#FFF',
        fontWeight: '700',
    },
});

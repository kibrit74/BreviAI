/**
 * NodePalette - Node selection palette for workflow builder
 * Categorized list of available nodes - optimized with FlashList
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
    Dimensions,
    TextInput,
    Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
    NodeType,
    NodeCategory,
    NodeMetadata,
    NODE_REGISTRY,
} from '../../types/workflow-types';
import { useApp } from '../../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NodePaletteProps {
    visible: boolean;
    onClose: () => void;
    onSelectNode: (type: NodeType) => void;
}

interface NodeItem extends NodeMetadata {
    type: NodeType;
}

const CATEGORY_INFO: Record<NodeCategory | 'all', { name: string; icon: string; color: string }> = {
    all: { name: 'Tümü', icon: 'apps', color: '#FFF' },
    trigger: { name: 'Tetikleyiciler', icon: 'flash', color: '#10B981' },
    control: { name: 'Kontrol', icon: 'git-branch', color: '#6366F1' },
    input: { name: 'Giriş', icon: 'log-in', color: '#8B5CF6' },
    output: { name: 'Çıkış', icon: 'log-out', color: '#F59E0B' },
    device: { name: 'Cihaz', icon: 'hardware-chip', color: '#EF4444' },
    processing: { name: 'İşleme', icon: 'construct', color: '#06B6D4' },
    ai: { name: 'AI', icon: 'sparkles', color: '#EC4899' },
    state: { name: 'Durum', icon: 'pulse', color: '#14B8A6' },
    calendar: { name: 'Takvim', icon: 'calendar', color: '#8B5CF6' },
    location: { name: 'Konum', icon: 'location', color: '#8B5CF6' },
    audio: { name: 'Ses', icon: 'volume-high', color: '#EF4444' },
    communication: { name: 'İletişim', icon: 'chatbubbles', color: '#F59E0B' },
    web: { name: 'Web', icon: 'globe', color: '#06B6D4' },
    files: { name: 'Dosya', icon: 'folder', color: '#10B981' },
    google: { name: 'Google', icon: 'logo-google', color: '#4285F4' },
    microsoft: { name: 'Microsoft', icon: 'logo-windows', color: '#0078D4' },
    social: { name: 'Sosyal Medya', icon: 'share-social', color: '#1877F2' },
    data: { name: 'Veri', icon: 'server', color: '#6366F1' },
};

// Item width for 2-column grid
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2;

export const NodePalette: React.FC<NodePaletteProps> = ({

    visible,
    onClose,
    onSelectNode,
}) => {
    const { colors, theme } = useApp();
    const [selectedCategory, setSelectedCategory] = useState<NodeCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Memoize grouped nodes
    const nodesByCategory = useMemo(() => {
        return Object.entries(NODE_REGISTRY).reduce((acc, [type, metadata]) => {
            const category = metadata.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push({ type: type as NodeType, ...metadata });
            return acc;
        }, {} as Record<NodeCategory, NodeItem[]>);
    }, []);

    // Get current category nodes with Search Filtering
    const currentNodes = useMemo(() => {
        let nodes: NodeItem[] = [];
        if (selectedCategory === 'all') {
            nodes = Object.values(nodesByCategory).flat();
        } else {
            nodes = nodesByCategory[selectedCategory] || [];
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return nodes.filter(node =>
                node.name.toLowerCase().includes(query) ||
                node.description.toLowerCase().includes(query)
            );
        }

        return nodes;
    }, [nodesByCategory, selectedCategory, searchQuery]);

    const handleSelectNode = (type: NodeType) => {
        onSelectNode(type);
        onClose();
    };

    // Render individual node card
    const renderNodeCard = ({ item }: { item: NodeItem }) => {
        // Check if icon is likely an Ionicon name (ASCII only) or an Emoji
        // Since we standardized on Ionicons in NODE_REGISTRY, we can assume it's an ionicon mostly.
        // But for safety, we keep the check if any emojis slipped through, though our regex might interpret emojis as non-ionicon.
        const isIonicon = /^[a-z0-9-]+$/.test(item.icon);

        return (
            <TouchableOpacity
                style={[styles.nodeCard, {
                    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : colors.card,
                    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors.border
                }]}
                onPress={() => handleSelectNode(item.type)}
                activeOpacity={0.7}
            >
                <View style={styles.nodeIconContainer}>
                    <LinearGradient
                        colors={[item.color, `${item.color}80`]}
                        style={styles.nodeCardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {isIonicon ? (
                            <Ionicons name={item.icon as any} size={24} color="#FFF" />
                        ) : (
                            <Text style={styles.emojiIcon}>{item.icon}</Text>
                        )}
                    </LinearGradient>
                </View>

                <View style={styles.nodeContent}>
                    <Text style={[styles.nodeName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.nodeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.description}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={theme === 'dark' ? 40 : 80} style={styles.blurBackground} tint={theme === 'dark' ? "dark" : "light"}>
                    <TouchableOpacity style={styles.dismissArea} onPress={onClose} />
                </BlurView>

                <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#0A0A0B' : colors.background }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors.border }]}>
                        <View style={styles.headerTitleContainer}>
                            <Text style={[styles.title, { color: colors.text }]}>Element Ekle</Text>
                            <View style={[styles.badge, {
                                borderColor: 'rgba(0, 245, 255, 0.2)',
                                backgroundColor: theme === 'dark' ? 'rgba(0, 245, 255, 0.1)' : 'rgba(0, 245, 255, 0.05)'
                            }]}>
                                <Text style={styles.badgeText}>{currentNodes.length}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={[styles.closeButton, {
                            backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors.cardAlt,
                            borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors.border
                        }]}>
                            <Ionicons name="close" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchWrapper}>
                        <View style={[styles.searchContainer, {
                            backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : colors.card,
                            borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors.border
                        }]}>
                            <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Node ara..."
                                placeholderTextColor={colors.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Category tabs */}
                    <View style={[styles.tabsContainer, { borderBottomColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors.border }]}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.categoryTabs}
                            contentContainerStyle={styles.categoryTabsContent}
                        >
                            {Object.entries(CATEGORY_INFO).map(([category, info]) => {
                                const isSelected = category === selectedCategory;
                                const hasNodes = category === 'all'
                                    ? Object.keys(nodesByCategory).length > 0
                                    : nodesByCategory[category as NodeCategory]?.length > 0;

                                if (!hasNodes) return null;

                                return (
                                    <TouchableOpacity
                                        key={category}
                                        style={[
                                            styles.categoryTab,
                                            {
                                                backgroundColor: isSelected
                                                    ? (category !== 'all' ? info.color : colors.primary)
                                                    : (theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : colors.card),
                                                borderColor: isSelected
                                                    ? (category !== 'all' ? info.color : colors.primary)
                                                    : (theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors.border)
                                            }
                                        ]}
                                        onPress={() => setSelectedCategory(category as NodeCategory | 'all')}
                                    >
                                        <Ionicons
                                            name={info.icon as any}
                                            size={14}
                                            color={isSelected ? '#FFF' : colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.categoryName,
                                            { color: isSelected ? '#FFF' : colors.textSecondary }
                                        ]}>
                                            {info.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Node list - FlashList for performance */}
                    <View style={styles.nodeListContainer}>
                        <FlashList
                            data={currentNodes}
                            renderItem={renderNodeCard}
                            keyExtractor={(item) => item.type}
                            numColumns={2}
                            // @ts-ignore - Prop type definition mismatch in curr env
                            estimatedItemSize={85}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    blurBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    dismissArea: {
        flex: 1,
    },
    container: {
        backgroundColor: '#0A0A0B', // Neo-Noir Deep Black
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        height: '85%',
        shadowColor: "#00F5FF",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 20,
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    badge: {
        backgroundColor: 'rgba(0, 245, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 245, 255, 0.2)',
    },
    badgeText: {
        color: '#00F5FF',
        fontSize: 12,
        fontWeight: '600',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    searchWrapper: {
        paddingHorizontal: 20,
        marginVertical: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 50,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 15,
        height: '100%',
    },
    clearButton: {
        padding: 4,
    },
    tabsContainer: {
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    categoryTabs: {
        maxHeight: 40,
    },
    categoryTabsContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    categoryTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        gap: 6,
    },
    categoryTabSelected: {
        borderColor: '#00F5FF',
        backgroundColor: 'rgba(0, 245, 255, 0.1)',
    },
    categoryName: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600',
    },
    categoryNameSelected: {
        color: '#FFF',
    },
    nodeListContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    nodeCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        marginHorizontal: 4,
        height: 80,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    nodeIconContainer: {
        marginRight: 12,
    },
    nodeCardGradient: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    emojiIcon: {
        fontSize: 22,
    },
    nodeContent: {
        flex: 1,
        justifyContent: 'center',
    },
    nodeName: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    nodeDescription: {
        color: '#94A3B8',
        fontSize: 11,
        lineHeight: 14,
    },
});

export default NodePalette;

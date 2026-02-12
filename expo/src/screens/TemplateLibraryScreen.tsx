import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useApp } from '../context/AppContext';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { ShortcutTemplate, SEED_TEMPLATES } from '../data/seed_templates';
import { TemplateCard } from '../components/TemplateCard';
import { apiService } from '../services/ApiService';

const CATEGORIES = ['All', 'System', 'Social', 'Productivity', 'Lifestyle', 'Health', 'Web'];

const WEB_AUTO_TEST_TEMPLATE: ShortcutTemplate = {
    id: 'web-auto-test-v1',
    title: 'Web Otomasyon Testi',
    title_en: 'Web Automation Test',
    description: 'Web otomasyon nodunu canlı test edin. (Example.com)',
    description_en: 'Test Web Automation Node live.',
    category: 'Web',
    author: 'BreviAI',
    downloads: 'Dev',
    tags: ['test', 'web', 'dev'],
    template_json: {
        name: 'Web Otomasyon Testi',
        description: 'Web otomasyon nodunun çalışıp çalışmadığını test eder.',
        nodes: [
            { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 50 }, config: {}, label: "Başlat" },
            {
                id: "2", type: "WEB_AUTOMATION", position: { x: 100, y: 200 },
                config: {
                    url: 'https://news.ycombinator.com',
                    interactive: false,
                    variableName: 'site_data',
                    actions: [
                        { type: 'wait', value: '2000', description: 'Yüklenmesini bekle' },
                        { type: 'scroll', description: 'Aşağı kaydır' },
                        { type: 'wait', value: '1000', description: 'Kaydırma sonrası bekle' },
                        { type: 'scrape', selector: 'a.storylink, .titleline > a', variableName: 'baslik', description: 'İlk haber başlığını çek' },
                        { type: 'scrape', selector: '.score', variableName: 'icerik', description: 'Puanı çek' }
                    ]
                }, label: "Example.com Gez"
            },
            {
                id: "3", type: "SHOW_TEXT", position: { x: 100, y: 400 },
                config: {
                    title: 'Test Sonucu',
                    content: 'Başlık: {{site_data.baslik}}\n\nİçerik: {{site_data.icerik}}'
                }, label: "Sonucu Göster"
            }
        ],
        edges: [
            { id: "e1", sourceNodeId: "1", targetNodeId: "2", sourcePort: "default" },
            { id: "e2", sourceNodeId: "2", targetNodeId: "3", sourcePort: "default" }
        ]
    }
};

const SMART_WEB_TEST_TEMPLATE: ShortcutTemplate = {
    id: 'smart-web-test-v1',
    title: '🧠 Smart Web Agent',
    title_en: 'Smart Web Agent',
    description: 'AI Agent bir web sitesini gezer ve hedefini gerçekleştirir.',
    description_en: 'AI Agent navigates a website to achieve a goal.',
    category: 'Web',
    author: 'BreviAI',
    downloads: 'Beta',
    tags: ['ai', 'web', 'smart'],
    template_json: {
        name: 'Smart Web Agent',
        description: 'AI, HackerNews üzerindeki ilk başlığı bulur.',
        nodes: [
            { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 50 }, config: {}, label: "Başlat" },
            {
                id: "2", type: "WEB_AUTOMATION", position: { x: 100, y: 200 },
                config: {
                    url: 'https://news.ycombinator.com',
                    mode: 'smart',
                    smartGoal: 'Find the first news title and return it as variable "top_news".',
                    variableName: 'agent_result',
                    actions: [] // Empty because smart mode decides actions
                }, label: "HackerNews Agent"
            },
            {
                id: "3", type: "SHOW_TEXT", position: { x: 100, y: 400 },
                config: {
                    title: 'Agent Sonucu',
                    content: 'Agent şunu buldu:\n\n{{agent_result}}' // Agent finish returns object, might need .value if structured
                }, label: "Sonucu Göster"
            }
        ],
        edges: [
            { id: "e1", sourceNodeId: "1", targetNodeId: "2", sourcePort: "default" },
            { id: "e2", sourceNodeId: "2", targetNodeId: "3", sourcePort: "default" }
        ]
    }
};

export default function TemplateLibraryScreen({ navigation }: any) {
    const { theme, t } = useApp();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? COLORS.dark : COLORS.light;
    const insets = useSafeAreaInsets();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // API Data Loading
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<ShortcutTemplate[]>([]);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const apiTemplates = await apiService.getTemplates();

            // Enrich API templates with local metadata (icons/colors) if available
            const enrichedTemplates = (apiTemplates || []).map(apiTpl => {
                // Try matching by ID first, then by Title (exact match)
                const localMatch = (SEED_TEMPLATES || []).find(local =>
                    local.id === apiTpl.id ||
                    local.title.trim().toLowerCase() === apiTpl.title.trim().toLowerCase()
                );

                if (localMatch) {
                    return {
                        ...apiTpl,
                        icon: localMatch.icon || apiTpl.icon,
                        color: localMatch.color || apiTpl.color,
                        bg: localMatch.bg || apiTpl.bg
                    };
                }
                return apiTpl;
            });

            if (enrichedTemplates.length > 0) {
                // Also explicitly add the local-only test templates
                setTemplates([...enrichedTemplates, WEB_AUTO_TEST_TEMPLATE, SMART_WEB_TEST_TEMPLATE]);
            } else {
                // Fallback to local if API returns empty
                setTemplates([...(SEED_TEMPLATES || []), WEB_AUTO_TEST_TEMPLATE, SMART_WEB_TEST_TEMPLATE]);
            }
        } catch (error) {
            console.error('Failed to load templates from API, using local:', error);
            setTemplates(SEED_TEMPLATES || []);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredTemplates = useMemo(() => {
        return templates.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' ||
                (item.tags && item.tags.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase())) ||
                // Fallback categorization based on name/description if tags missing
                (selectedCategory === 'System' && (item.title.includes('Battery') || item.title.includes('WiFi'))) ||
                (selectedCategory === 'Social' && (item.title.includes('Insta') || item.title.includes('Message'))) ||
                (selectedCategory === 'Productivity' && (item.title.includes('Meeting') || item.title.includes('Email')));

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory, templates]);

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.topRow}>
                <Text style={[styles.screenTitle, { color: currentTheme.text }]}>{t('libraryTitle')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Workflows')}>
                    <Text style={{ color: currentTheme.primary, fontWeight: '600' }}>{t('edit')}</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
                <Ionicons name="search" size={20} color={currentTheme.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                    style={[styles.searchInput, { color: currentTheme.text }]}
                    placeholder={t('searchTemplates')}
                    placeholderTextColor={currentTheme.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <TouchableOpacity>
                    <Ionicons name="mic" size={20} color={currentTheme.primary} />
                </TouchableOpacity>
            </View>

            {/* Categories */}
            <FlatList
                horizontal
                data={CATEGORIES}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.categoryPill,
                            selectedCategory === item
                                ? { backgroundColor: currentTheme.primary }
                                : { backgroundColor: currentTheme.surface, borderWidth: 1, borderColor: currentTheme.border }
                        ]}
                        onPress={() => setSelectedCategory(item)}
                    >
                        <Text style={[
                            styles.categoryText,
                            { color: selectedCategory === item ? '#fff' : currentTheme.textSecondary }
                        ]}>
                            {item}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('featuredTemplates')}</Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: currentTheme.background, paddingTop: insets.top }]}>
            <FlatList
                data={filteredTemplates}
                numColumns={2}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                columnWrapperStyle={styles.columnWrapper}
                renderItem={({ item }) => (
                    <TemplateCard
                        template={item}
                        isDark={isDark}
                        onPress={() => navigation.navigate('WorkflowBuilder', { template: item, autoRun: false })}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color={currentTheme.primary} />
                        ) : (
                            <Text style={{ color: currentTheme.textSecondary }}>{t('noTemplatesFound')}</Text>
                        )}
                    </View>
                }
            />

            {/* Floating Create Button/Action (if needed, but using Tab bar for creates) */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: SPACING.medium,
        marginBottom: SPACING.small,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.medium,
        marginTop: SPACING.small,
    },
    screenTitle: {
        fontSize: 34,
        fontWeight: 'bold',
        letterSpacing: 0.3,
        // fontFamily: FONTS.bold, // Removed to use system default sans-serif which is cleaner
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 12,
        paddingHorizontal: SPACING.medium,
        borderWidth: 1,
        marginBottom: SPACING.medium,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    categoriesList: {
        gap: SPACING.small,
        paddingBottom: SPACING.medium,
        paddingHorizontal: SPACING.small, // Added for better spacing from edges
    },
    categoryPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    categoryText: {
        fontWeight: '600',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: SPACING.small,
        marginBottom: SPACING.small,
    },
    listContent: {
        paddingBottom: 100, // Space for bottom tab
    },
    columnWrapper: {
        paddingHorizontal: SPACING.medium, // Increased from SPACING.small for better visual balance
    },
    emptyContainer: {
        alignItems: 'center',
        padding: SPACING.large,
    }
});

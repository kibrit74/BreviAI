import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONTS } from '../../constants/theme';

interface CategoryListProps {
    categories: { id: string, name: string, icon: string }[];
    selectedId: string;
    onSelect: (id: string) => void;
    isDark?: boolean;
}

export const CategoryList: React.FC<CategoryListProps> = ({ categories, selectedId, onSelect, isDark = false }) => {
    const theme = isDark ? COLORS.dark : COLORS.light;

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
        >
            {categories.map((cat) => {
                const isSelected = cat.id === selectedId;
                return (
                    <TouchableOpacity
                        key={cat.id}
                        style={[
                            styles.pill,
                            {
                                backgroundColor: isSelected ? theme.accent : theme.surface,
                                borderColor: theme.border,
                                borderWidth: isSelected ? 0 : 1
                            }
                        ]}
                        onPress={() => onSelect(cat.id)}
                    >
                        <Text style={{ marginRight: 6 }}>{cat.icon}</Text>
                        <Text style={[
                            styles.label,
                            { color: isSelected ? '#fff' : theme.text }
                        ]}>
                            {cat.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 0,
        marginVertical: SPACING.medium,
    },
    contentContainer: {
        paddingHorizontal: SPACING.medium,
        gap: SPACING.small,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 20,
        // minWidth: 80,
        justifyContent: 'center',
    },
    label: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        fontWeight: '500',
    }
});

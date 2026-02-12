export const COLORS = {
    light: {
        primary: '#2b8cee', // Modern blue
        secondary: '#a855f7', // Purple accent
        accent: '#ff9800', // Turuncu
        success: '#22c55e', // Yeşil
        background: '#f6f7f8', // Açık Gri
        surface: '#ffffff', // Beyaz
        card: '#ffffff',
        text: '#0f172a',
        textSecondary: '#64748b',
        textTertiary: '#94a3b8',
        border: '#e2e8f0',
        error: '#ef4444',
        warning: '#f59e0b',
    },
    dark: {
        primary: '#00F5FF', // Electric Cyan
        secondary: '#a855f7', // Purple accent - kept for variety
        accent: '#00F5FF', // Match primary for consistency
        success: '#10B981', // Emerland Green
        background: '#0A0A0B', // Deep Space Black
        surface: '#121214', // Slightly lighter panel
        card: '#121214',
        text: '#FFFFFF',
        textSecondary: '#94A3B8', // Slate 400
        textTertiary: '#64748B', // Slate 500
        border: '#27272A', // Zinc 800
        error: '#ef4444',
        warning: '#f59e0b',
    },
};

export const SPACING = {
    micro: 4,
    small: 8,
    medium: 16,
    large: 24,
    xlarge: 32,
};

import { Platform } from 'react-native';

export const FONTS = {
    regular: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    medium: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    bold: Platform.OS === 'ios' ? 'System' : 'sans-serif', // Use with fontWeight: 'bold'
};

export const SHADOWS = {
    light: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 4,
    },
    none: {
        shadowColor: 'transparent',
        elevation: 0,
    }
};

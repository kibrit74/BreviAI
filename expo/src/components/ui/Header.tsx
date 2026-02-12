import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONTS } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';

interface HeaderProps {
    title?: string;
    isDark?: boolean;
    showLogo?: boolean;
    showProfile?: boolean;
    showSettings?: boolean;
    userName?: string;
}

export const Header: React.FC<HeaderProps> = ({
    title,
    isDark = true,
    showLogo = false,
    showProfile = false, // If true, shows the "Welcome back, Alex" style
    showSettings = true,
    userName = 'Alex'
}) => {
    const insets = useSafeAreaInsets();
    const theme = isDark ? COLORS.dark : COLORS.light;
    const navigation = useNavigation<any>();

    return (
        <View style={[
            styles.container,
            {
                paddingTop: insets.top + SPACING.small,
                backgroundColor: theme.background, // Match screen bg
            }
        ]}>
            <View style={styles.content}>
                {showProfile ? (
                    <View style={styles.profileContainer}>
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={require('../../../assets/icon.png')}
                                style={styles.avatar}
                            />
                            <View style={styles.onlineStatus} />
                        </View>
                        <View style={styles.welcomeInfo}>
                            <Text style={[styles.welcomeLabel, { color: theme.textSecondary }]}>Welcome back</Text>
                            <Text style={[styles.userName, { color: theme.text }]}>{userName}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.titleContainer}>
                        {/* Back Button if needed */}
                        {navigation.canGoBack() && !showLogo && (
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                style={styles.iconButton}
                            >
                                <Ionicons name="chevron-back" size={24} color={theme.text} />
                            </TouchableOpacity>
                        )}

                        {showLogo && (
                            <View style={styles.logoWrapper}>
                                <Image
                                    source={require('../../../assets/adaptive-icon.png')}
                                    style={styles.logo}
                                />
                            </View>
                        )}
                        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                    </View>
                )}

                {showSettings && (
                    <TouchableOpacity
                        style={[styles.settingsButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0' }]}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <Ionicons name="settings-outline" size={20} color={theme.text} />
                    </TouchableOpacity>
                )}
            </View>
        </View>

    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingBottom: SPACING.medium,
        zIndex: 10,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.medium,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.small,
    },
    avatarWrapper: {
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 12, // More modern squircle-like radius
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    onlineStatus: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22c55e',
        borderWidth: 2,
        borderColor: '#101922',
    },
    welcomeInfo: {
        justifyContent: 'center',
        gap: 2,
    },
    welcomeLabel: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoWrapper: {
        shadowColor: COLORS.light.primary, // Glow color
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)', // Subtle background
    },
    logo: {
        width: 36,
        height: 36,
        borderRadius: 8,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        fontFamily: FONTS.bold,
        letterSpacing: -0.5,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    iconButton: {
        padding: 4,
        marginRight: 4,
    }
});

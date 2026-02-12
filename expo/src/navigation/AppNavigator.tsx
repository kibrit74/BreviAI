import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, TouchableOpacity, StyleSheet, Text, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Screens
import HomeScreenNeo from '../screens/HomeScreenNeo'; // Active v2 Interface
import HomeScreen from '../screens/HomeScreen';
import TemplateLibraryScreen from '../screens/TemplateLibraryScreen';
import MyShortcutsScreen from '../screens/MyShortcutsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateShortcutScreen from '../screens/CreateShortcutScreen';
import AboutScreen from '../screens/AboutScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import ShortcutDetailScreen from '../screens/ShortcutDetailScreen';
import WorkflowListScreen from '../screens/WorkflowListScreen';
import WorkflowBuilderScreen from '../screens/WorkflowBuilderScreen';
import TemplateGalleryScreen from '../screens/TemplateGalleryScreen';
import GmailSetupScreen from '../screens/GmailSetupScreen';
import OutlookSetupScreen from '../screens/OutlookSetupScreen';
import WidgetConfigScreen from '../screens/WidgetConfigScreen';
import ExecutionHistoryScreen from '../screens/ExecutionHistoryScreen';

// Onboarding
import { OnboardingFlow } from '../components/onboarding';

import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Custom Tab Button for Create Action
const CustomTabButton = ({ children, onPress }: any) => (
    <TouchableOpacity
        style={{
            top: -24, // Lifted up
            justifyContent: 'center',
            alignItems: 'center',
        }}
        onPress={onPress}
        activeOpacity={0.9}
    >
        <LinearGradient
            colors={['#00F5FF', '#2b8cee']} // Neo-Noir Cyan Gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#00F5FF',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 16,
                elevation: 10,
                borderWidth: 4,
                borderColor: '#0A0A0B', // Match deep black bg
            }}
        >
            {children}
        </LinearGradient>
    </TouchableOpacity>
);

function TabNavigator() {
    const { theme, t } = useApp();
    const isDark = theme === 'dark';
    const currentColors = isDark ? COLORS.dark : COLORS.light;
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            id="MainTabs"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: isDark ? 'rgba(10, 10, 11, 0.95)' : '#ffffff', // Neo-Noir Deep Black
                    borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0', // Subtle border
                    height: 65 + insets.bottom,
                    paddingBottom: insets.bottom + 8,
                    paddingTop: 8,
                    marginTop: 0,
                    borderTopWidth: 1,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 8, // Increased for Android separation
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: isDark ? 0.3 : 0.1,
                    shadowRadius: 4,
                },
                tabBarActiveTintColor: isDark ? currentColors.primary : currentColors.primary,
                tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    fontFamily: 'Roboto',
                    marginTop: 4,
                },
                tabBarIcon: ({ focused, color }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'home';

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Templates') {
                        iconName = focused ? 'compass' : 'compass-outline'; // "Discover"
                    } else if (route.name === 'Create') {
                        return <Ionicons name="add" size={32} color="#fff" />;
                    } else if (route.name === 'Workflows') {
                        iconName = focused ? 'layers' : 'layers-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    // Add glow for focused icons in dark mode
                    return (
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name={iconName} size={24} color={color} />
                            {focused && (
                                <View style={{
                                    position: 'absolute',
                                    top: 30,
                                    width: 4,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: color,
                                }} />
                            )}
                        </View>
                    );
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreenNeo}
                options={{ tabBarLabel: t('home') }}
            />
            <Tab.Screen
                name="Templates"
                component={TemplateLibraryScreen}
                options={{ tabBarLabel: t('tab_discover') }}
            />

            {/* Center + Button */}
            <Tab.Screen
                name="Create"
                component={WorkflowBuilderScreen}
                options={{
                    tabBarLabel: '',
                    tabBarButton: (props) => (
                        <CustomTabButton {...props}>
                            <Ionicons name="add" size={36} color="#fff" />
                        </CustomTabButton>
                    ),
                    tabBarStyle: { display: 'none' } // Hide tabs when builder is open
                }}
                listeners={({ navigation }) => ({
                    tabPress: (e: any) => {
                        e.preventDefault();
                        // Open as modal/stack screen for full space
                        navigation.navigate('WorkflowBuilder', { autoOpenAI: true });
                    },
                })}
            />

            <Tab.Screen
                name="Workflows"
                component={WorkflowListScreen}
                options={{ tabBarLabel: t('tab_workflows') }}
            />
            <Tab.Screen
                name="Profile"
                component={SettingsScreen}
                options={{ tabBarLabel: t('tab_profile') }}
            />
        </Tab.Navigator>
    );
}

import * as Linking from 'expo-linking';

// ... (other imports)

export default function AppNavigator() {
    const { theme } = useApp();
    const isDark = theme === 'dark';
    const currentColors = isDark ? COLORS.dark : COLORS.light;

    // Linking configuration for Deep Links
    const linking = {
        prefixes: [Linking.createURL('/'), 'brevi-ai://'],
        config: {
            screens: {
                WidgetConfig: 'widget-config',
            },
        },
    };

    // Onboarding state
    const [showOnboarding, setShowOnboarding] = useState(true);

    const navigationTheme = {
        ...(isDark ? DarkTheme : DefaultTheme),
        colors: {
            ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
            primary: currentColors.primary,
            background: currentColors.background,
            card: currentColors.surface,
            text: currentColors.text,
            border: currentColors.border,
            notification: currentColors.error,
        },
    };

    // Show onboarding first
    if (showOnboarding) {
        console.log("AppNavigator: Rendering OnboardingFlow...");
        return (
            <View style={{ flex: 1, backgroundColor: currentColors.background }}>
                <OnboardingFlow onComplete={() => {
                    console.log("AppNavigator: Onboarding complete.");
                    setShowOnboarding(false);
                }} />
            </View>
        );
    }

    console.log("AppNavigator: Rendering Main Navigation Container...");
    return (
        <NavigationContainer theme={navigationTheme} linking={linking}>
            <Stack.Navigator id="RootStack" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Main" component={TabNavigator} />

                <Stack.Screen name="About" component={AboutScreen} />
                <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
                <Stack.Screen
                    name="ShortcutDetail"
                    component={ShortcutDetailScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="MyShortcuts"
                    component={MyShortcutsScreen}
                    options={{ headerShown: false }}
                />

                <Stack.Screen
                    name="WorkflowBuilder"
                    component={WorkflowBuilderScreen}
                    options={{
                        headerShown: false,
                        presentation: 'modal',
                        animation: 'slide_from_right',
                    }}
                />

                <Stack.Screen name="TemplateGallery" component={TemplateGalleryScreen} />
                <Stack.Screen name="GmailSetup" component={GmailSetupScreen} options={{ presentation: 'modal' }} />
                <Stack.Screen name="OutlookSetup" component={OutlookSetupScreen} options={{ presentation: 'modal' }} />
                <Stack.Screen name="WidgetConfig" component={WidgetConfigScreen} options={{ presentation: 'card' }} />
                <Stack.Screen name="ExecutionHistory" component={ExecutionHistoryScreen} options={{ presentation: 'card' }} />

            </Stack.Navigator>
        </NavigationContainer>
    );
}

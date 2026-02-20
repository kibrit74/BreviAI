import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Theme = 'dark' | 'light';
type Language = 'tr' | 'en';



interface AppContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: string) => string;
    colors: typeof darkColors;
    isDebugMode: boolean;
    setDebugMode: (enabled: boolean) => void;
}

const darkColors = {
    background: '#111827',
    surface: '#1f2937',
    card: '#1f2937',
    cardAlt: '#374151',
    primary: '#3b82f6', // Blue 500
    secondary: '#2563eb', // Blue 600
    text: '#ffffff',
    textSecondary: '#9ca3af',
    textTertiary: '#6b7280',
    textMuted: '#6b7280',
    border: '#374151',
    danger: '#ef4444',
    success: '#22c55e',
};

const lightColors = {
    background: '#f3f4f6',
    surface: '#ffffff',
    card: '#ffffff',
    cardAlt: '#e5e7eb',
    primary: '#2563eb', // Blue 600
    secondary: '#3b82f6', // Blue 500
    text: '#111827',
    textSecondary: '#4b5563',
    textTertiary: '#9ca3af',
    textMuted: '#9ca3af',
    border: '#e5e7eb',
    danger: '#ef4444',
    success: '#22c55e',
};

const translations = {
    tr: {
        settings: 'Ayarlar',
        general: 'Genel',
        darkTheme: 'Koyu Tema',
        notifications: 'Bildirimler',
        language: 'Dil',
        dataManagement: 'Veri Yönetimi',
        clearData: 'Verileri Temizle',
        about: 'Hakkında',
        appAbout: 'Uygulama Hakkında',
        termsOfService: 'Kullanım Koşulları',
        privacyPolicy: 'Gizlilik Politikası',
        home: 'Ana Sayfa',
        templates: 'Şablonlar',
        createShortcut: 'Kestirme Oluştur',
        use: 'Kullan',
        edit: 'Düzenle',
        cancel: 'İptal',
        confirm: 'Onayla',
        success: 'Başarılı',
        error: 'Hata',
        turkish: 'Türkçe',
        english: 'English',
        version: 'Sürüm',
        clearDataConfirm: 'Tüm yerel veriler silinecek. Emin misiniz?',
        dataCleared: 'Veriler temizlendi.',
        themeChanged: 'Tema değiştirildi',
        languageChanged: 'Dil değiştirildi',
        // Home
        welcome: 'Hoş Geldin',
        quickStart: 'Hızlı Başla',
        quickStartDesc: 'İlk AI kestirmeni oluştur veya hazır şablonları keşfet.',
        exploreTemplates: 'Şablonları İncele',
        recentActivity: 'Son Aktiviteler',
        noRecentActivity: 'Henüz kullanılan kestirme yok.',
        // Templates
        library: 'Kestirme Kütüphanesi',
        librarySubtitle: 'Hazır Otomasyon Şablonu',
        searchPlaceholder: 'Ara... (pil, güvenlik, vb.)',
        noResults: 'Sonuç bulunamadı 😔',
        showMore: 'Daha Fazla Göster',
        remaining: 'kaldı',
        // My Shortcuts
        myShortcuts: 'Kestirmelerim',
        active: 'Aktif',
        stopped: 'Durduruldu',
        noShortcuts: 'Henüz kestirme yok.',
        // Create Shortcut
        newShortcut: 'Yeni Kestirme',
        whatToDo: 'Ne yapmak istiyorsun?',
        promptPlaceholder: 'Örn: Toplantıdayım, not al ve yöneticime mail at',
        micPermission: 'İzin Gerekli',
        micPermissionDesc: 'Mikrofon izni verilmedi.',
        audioRecorded: 'Ses Kaydedildi',
        audioRecordedDesc: 'Ses kaydınız alındı. Şimdilik lütfen komutunuzu yazarak girin.',
        enterPrompt: 'Lütfen bir komut girin.',
        generationError: 'Kestirme oluşturulamadı. Lütfen tekrar deneyin.',
        executionSuccess: 'Kestirme başarıyla çalıştırıldı!',
        executionError: 'Kestirme çalıştırılırken bir hata oluştu.',
        listening: 'Dinliyorum...',
        sayCommand: 'Komutunuzu söyleyin',
        preparing: 'Kestirme hazırlanıyor...',
        analyzing: 'AI komutunuzu analiz ediyor',
        executing: 'Kestirme çalıştırılıyor...',
        stepsButtons: 'adım',
        run: 'Çalıştır',
        // Categories
        cat_All: 'Tümü',
        cat_Battery: 'Pil',
        cat_Security: 'Güvenlik',
        cat_Productivity: 'Verimlilik',
        cat_Lifestyle: 'Yaşam Tarzı',
        cat_Social: 'Sosyal',
        cat_Health: 'Sağlık',
        cat_Travel: 'Seyahat',
        blockShorts: 'Shorts Engelleyici',
        // New UI strings
        welcomeTo: 'Hoş Geldiniz',
        automationsRun: 'Çalışan Otomasyonlar',
        timeSaved: 'Kazanılan Zaman',
        activeShortcuts: 'Aktif Kestirmeler',
        viewAll: 'Tümünü Gör',
        tab_discover: 'Keşfet',
        tab_workflows: 'Otomasyonlar',
        tab_profile: 'Profil',
        libraryTitle: 'Kütüphane',
        searchTemplates: 'Şablon ara veya komut söyle...',
        featuredTemplates: 'Öne Çıkan Şablonlar',
        noTemplatesFound: 'Şablon bulunamadı',
        automationName: 'OTOMASYON ADI',
        generateWithGemini: 'AI ile Oluştur',
        magicEdit: 'Sihirli Düzenleme',
        accessibilityPermissions: 'Erişilebilirlik İzinleri',
        accessibilityDesc: 'Spotify ve Sistem Ayarlarıyla etkileşim için gerekli.',
        grantAccess: 'ERİŞİM VER',
        logicFlow: 'MANTIK AKIŞI',
        addNextStep: 'Sonraki adımı ekle',
        saveAutomation: 'Otomasyonu Kaydet',
        noShortcutsYet: 'Henüz kısayol yok',
        createShortcutHint: 'Yeni bir kısayol oluşturup kaydedin',
        shortcutCreate: 'Kısayol Oluştur',
        automationSaved: 'Otomasyon başarıyla kaydedildi!',
        executingAutomation: 'Otomasyon manuel olarak çalıştırılıyor...',
        magicEditDesc: 'AI ile otomasyonunuzu optimize edin',
        editNameDesc: 'İsim düzenleme yakında eklenecek',
        stepLibraryDesc: 'Adım kütüphanesini aç',
        nameUpdated: 'İsim başarıyla güncellendi!',
        addedToMyShortcuts: 'Kestirmelerime eklendi!',
        stop: 'Durdur',
        automationStopped: 'Otomasyon durduruldu',
        selectApp: 'Uygulama Seç',
        selectShortcut: 'Otomasyon Seç',
        noAppsFound: 'Uygulama bulunamadı',
        saveFailed: 'Kaydedilemedi',
        online: 'Çevrimiçi',
        offline: 'Çevrimdışı/Hata',
        minutesShort: 'dk',
        activeAutomationFallback: 'Aktif otomasyon',
        homeMockDailyReport: 'Günlük Rapor Özeti',
        homeMockMeetingPrep: 'Toplantı Hazırlığı',
        homeMockDailyTime: '09:00 - Her gün',
        homeMockBeforeEvent: 'Etkinlikten 15dk önce',
        tapToSpeak: 'Konuşmak için Dokun',
        voiceExample: '"Hey BreviAI, notlarımı özetle"',
        // About Screen
        aboutDesc: 'BreviAI, yapay zeka destekli Android otomasyon uygulamasıdır. Doğal dil kullanarak karmaşık otomasyon senaryoları (kestirmeler) oluşturmanızı sağlar.',
        featuresTitle: 'Özellikler',
        feature1: 'Sesli komutlarla kestirme oluşturma',
        feature2: 'AI destekli akıllı otomasyon',
        feature3: '50+ hazır şablon kütüphanesi',
        feature4: 'Sistem ayarları kontrolü',
        developerTitle: 'Geliştirici',
        // Privacy Policy
        lastUpdated: 'Son güncelleme: Ocak 2024',
        privacyTitle1: '1. Giriş',
        privacyDesc1: 'BreviAI olarak gizliliğinize önem veriyoruz. Bu politika, uygulamamızı kullanırken hangi bilgilerin toplandığını ve nasıl kullanıldığını açıklar.',
        privacyTitle2: '2. Toplanan Veriler',
        privacyDesc2: '• Sesli komutlar (yalnızca işlem sırasında)\n• Oluşturulan kestirme şablonları\n• Cihaz bilgileri (model, işletim sistemi)\n• Uygulama kullanım istatistikleri',
        privacyTitle3: '3. Veri Kullanımı',
        privacyDesc3: 'Toplanan veriler yalnızca uygulama işlevselliğini sağlamak, AI modellerini eğitmek ve kullanıcı deneyimini iyileştirmek için kullanılır.',
        privacyTitle4: '4. Veri Güvenliği',
        privacyDesc4: 'Verileriniz şifreli bağlantılar üzerinden iletilir ve güvenli sunucularda saklanır. Üçüncü taraflarla paylaşılmaz.',
        privacyTitle5: '5. Haklarınız',
        privacyDesc5: 'Verilerinizi silme, dışa aktarma veya işlemeyi durdurma hakkına sahipsiniz. Ayarlar bölümünden verilerinizi temizleyebilirsiniz.',
        privacyTitle6: '6. İletişim',
        privacyDesc6: 'Sorularınız için: privacy@breviai.app',
        // Terms of Service
        termsTitle1: '1. Kabul',
        termsDesc1: 'BreviAI uygulamasını kullanarak bu kullanım koşullarını kabul etmiş sayılırsınız.',
        termsTitle2: '2. Hizmet Tanımı',
        termsDesc2: 'BreviAI, yapay zeka destekli Android otomasyon uygulamasıdır. Kullanıcıların doğal dil kullanarak cihaz otomasyonları oluşturmasını sağlar.',
        termsTitle3: '3. Kullanım Kuralları',
        termsDesc3: '• Uygulamayı yalnızca yasal amaçlarla kullanın\n• Başkalarının haklarını ihlal etmeyin\n• Kötü amaçlı içerik oluşturmayın\n• Sistem güvenliğini tehlikeye atmayın',
        termsTitle4: '4. Fikri Mülkiyet',
        termsDesc4: 'Uygulama ve içeriği BreviAI\'a aittir. Yazılı izin olmadan kopyalanamaz veya dağıtılamaz.',
        termsTitle5: '5. Sorumluluk Reddi',
        termsDesc5: 'BreviAI, uygulamanın kesintisiz veya hatasız çalışacağını garanti etmez. Kullanımdan doğan zararlardan sorumlu değildir.',
        termsTitle6: '6. Değişiklikler',
        termsDesc6: 'Bu koşullar önceden haber vermeksizin değiştirilebilir. Güncel koşullar uygulama içinde yayınlanır.',
        termsTitle7: '7. İletişim',
        termsDesc7: 'Sorularınız için: support@breviai.app',
    },
    en: {
        settings: 'Settings',
        general: 'General',
        darkTheme: 'Dark Theme',
        notifications: 'Notifications',
        language: 'Language',
        dataManagement: 'Data Management',
        clearData: 'Clear Data',
        about: 'About',
        appAbout: 'About App',
        termsOfService: 'Terms of Service',
        privacyPolicy: 'Privacy Policy',
        home: 'Home',
        templates: 'Templates',
        createShortcut: 'Create Shortcut',
        use: 'Use',
        edit: 'Edit',
        cancel: 'Cancel',
        confirm: 'Confirm',
        success: 'Success',
        error: 'Error',
        turkish: 'Turkish',
        english: 'English',
        version: 'Version',
        clearDataConfirm: 'All local data will be deleted. Are you sure?',
        dataCleared: 'Data cleared.',
        themeChanged: 'Theme changed',
        languageChanged: 'Language changed',
        // Home
        welcome: 'Welcome',
        quickStart: 'Quick Start',
        quickStartDesc: 'Create your first AI shortcut or explore templates.',
        exploreTemplates: 'Explore Templates',
        recentActivity: 'Recent Activity',
        noRecentActivity: 'No shortcuts used yet.',
        // Templates
        library: 'Shortcut Library',
        librarySubtitle: 'Ready Automation Templates',
        searchPlaceholder: 'Search... (battery, security, etc.)',
        noResults: 'No results found 😔',
        showMore: 'Show More',
        remaining: 'remaining',
        // My Shortcuts
        myShortcuts: 'My Shortcuts',
        active: 'Active',
        stopped: 'Stopped',
        noShortcuts: 'No shortcuts yet.',
        // Create Shortcut
        newShortcut: 'New Shortcut',
        whatToDo: 'What do you want to do?',
        promptPlaceholder: 'Ex: I am in a meeting, take notes and email my manager',
        micPermission: 'Permission Required',
        micPermissionDesc: 'Microphone permission not granted.',
        audioRecorded: 'Audio Recorded',
        audioRecordedDesc: 'Your audio has been recorded. For now, please type your command.',
        enterPrompt: 'Please enter a command.',
        generationError: 'Could not create shortcut. Please try again.',
        executionSuccess: 'Shortcut executed successfully!',
        executionError: 'An error occurred while executing the shortcut.',
        listening: 'Listening...',
        sayCommand: 'Say your command',
        preparing: 'Preparing shortcut...',
        analyzing: 'AI is analyzing your command',
        executing: 'Executing shortcut...',
        stepsButtons: 'steps',
        run: 'Run',
        // Categories
        cat_All: 'All',
        cat_Battery: 'Battery',
        cat_Security: 'Security',
        cat_Productivity: 'Productivity',
        cat_Lifestyle: 'Lifestyle',
        cat_Social: 'Social',
        cat_Health: 'Health',
        cat_Travel: 'Travel',
        blockShorts: 'Block Shorts',
        // New UI strings
        welcomeTo: 'Welcome to',
        automationsRun: 'Automations Run',
        timeSaved: 'Time Saved',
        activeShortcuts: 'Active Shortcuts',
        viewAll: 'View All',
        tab_discover: 'Discover',
        tab_workflows: 'Automations',
        tab_profile: 'Profile',
        libraryTitle: 'Library',
        searchTemplates: 'Search templates or say a command...',
        featuredTemplates: 'Featured Templates',
        noTemplatesFound: 'No templates found',
        automationName: 'AUTOMATION NAME',
        generateWithGemini: 'Generate with AI',
        magicEdit: 'Magic Edit',
        accessibilityPermissions: 'Accessibility Permissions',
        accessibilityDesc: 'Required to interact with Spotify & System Settings.',
        grantAccess: 'GRANT ACCESS',
        logicFlow: 'LOGIC FLOW',
        addNextStep: 'Add next step',
        saveAutomation: 'Save Automation',
        noShortcutsYet: 'No shortcuts yet',
        createShortcutHint: 'Create and save a new shortcut',
        shortcutCreate: 'Create Shortcut',
        automationSaved: 'Automation saved successfully!',
        executingAutomation: 'Executing automation manually...',
        magicEditDesc: 'Optimize your automation with AI',
        editNameDesc: 'Name editing coming soon',
        stepLibraryDesc: 'Open step library',
        nameUpdated: 'Name updated successfully!',
        addedToMyShortcuts: 'Added to My Shortcuts!',
        stop: 'Stop',
        automationStopped: 'Automation stopped',
        selectApp: 'Select App',
        selectShortcut: 'Select Automation',
        noAppsFound: 'No apps found',
        saveFailed: 'Failed to save',
        online: 'Online',
        offline: 'Offline/Error',
        minutesShort: 'min',
        activeAutomationFallback: 'Active automation',
        homeMockDailyReport: 'Daily Report Summary',
        homeMockMeetingPrep: 'Meeting Prep',
        homeMockDailyTime: '09:00 - Every day',
        homeMockBeforeEvent: '15 min before event',
        tapToSpeak: 'Tap to Speak',
        voiceExample: '"Hey BreviAI, summarize my notes"',
        // About Screen
        aboutDesc: 'BreviAI is an AI-powered Android automation app. It allows you to create complex automation scenarios (shortcuts) using natural language.',
        featuresTitle: 'Features',
        feature1: 'Create shortcuts with voice commands',
        feature2: 'AI-powered smart automation',
        feature3: '50+ ready template library',
        feature4: 'System settings control',
        developerTitle: 'Developer',
        // Privacy Policy
        lastUpdated: 'Last updated: January 2024',
        privacyTitle1: '1. Introduction',
        privacyDesc1: 'We care about your privacy at BreviAI. This policy explains what information is collected and how it is used when using our app.',
        privacyTitle2: '2. Collected Data',
        privacyDesc2: '• Voice commands (only during processing)\n• Created shortcut templates\n• Device information (model, OS)\n• App usage statistics',
        privacyTitle3: '3. Data Usage',
        privacyDesc3: 'Collected data is used solely to provide app functionality, train AI models, and improve user experience.',
        privacyTitle4: '4. Data Security',
        privacyDesc4: 'Your data is transmitted over encrypted connections and stored on secure servers. It is not shared with third parties.',
        privacyTitle5: '5. Your Rights',
        privacyDesc5: 'You have the right to delete, export, or stop processing your data. You can clear your data from the settings section.',
        privacyTitle6: '6. Contact',
        privacyDesc6: 'For questions: privacy@breviai.app',
        // Terms of Service
        termsTitle1: '1. Acceptance',
        termsDesc1: 'By using the BreviAI app, you agree to these terms of service.',
        termsTitle2: '2. Service Description',
        termsDesc2: 'BreviAI is an AI-powered Android automation app. It allows users to create device automations using natural language.',
        termsTitle3: '3. Usage Rules',
        termsDesc3: '• Use the app only for legal purposes\n• Do not infringe on others\' rights\n• Do not create malicious content\n• Do not compromise system security',
        termsTitle4: '4. Intellectual Property',
        termsDesc4: 'The app and its content belong to BreviAI. Cannot be copied or distributed without written permission.',
        termsTitle5: '5. Disclaimer',
        termsDesc5: 'BreviAI does not guarantee that the app will run uninterrupted or error-free. Not responsible for damages arising from use.',
        termsTitle6: '6. Changes',
        termsDesc6: 'These terms may change without prior notice. Current terms are published in the app.',
        termsTitle7: '7. Contact',
        termsDesc7: 'For questions: support@breviai.app',
    },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({
    children,
    initialTheme = 'dark',
    initialLanguage = 'tr',
    initialDebug = false
}: {
    children: ReactNode;
    initialTheme?: Theme;
    initialLanguage?: Language;
    initialDebug?: boolean;
}) {
    const [theme, setThemeState] = useState<Theme>(initialTheme);
    const [language, setLanguageState] = useState<Language>(initialLanguage);
    const [isDebugMode, setDebugMode] = useState(initialDebug);

    // We trust that the parent (App.tsx) has already loaded the initial values.
    // However, we can still load to ensure sync or handle updates if needed, 
    // but we won't block rendering.

    const setTheme = async (newTheme: Theme) => {
        try {
            setThemeState(newTheme);
            await AsyncStorage.setItem('user_theme', newTheme);
        } catch (error) {
            console.error('Failed to save theme', error);
        }
    };

    const setLanguage = async (newLanguage: Language) => {
        console.log('Changing language to:', newLanguage);
        try {
            setLanguageState(newLanguage);
            await AsyncStorage.setItem('user_language', newLanguage);
        } catch (error) {
            console.error('Failed to save language', error);
        }
    };

    const setDebugModeHandler = async (enabled: boolean) => {
        setDebugMode(enabled);
        await AsyncStorage.setItem('user_debug_mode', String(enabled));
    };

    const colors = theme === 'dark' ? darkColors : lightColors;

    const t = (key: string): string => {
        return translations[language][key as keyof typeof translations['tr']] || key;
    };

    // No waiting for isLoaded here! Immediate render!

    return (
        <AppContext.Provider value={{
            theme,
            setTheme,
            language,
            setLanguage,
            t,
            colors,
            isDebugMode,
            setDebugMode: setDebugModeHandler
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}

export { darkColors, lightColors };

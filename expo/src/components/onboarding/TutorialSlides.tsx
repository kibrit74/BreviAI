import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Dimensions,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import {
    VoiceControlIllustration,
    TemplatesIllustration,
    CreateFlowIllustration,
    ReadyIllustration
} from './TutorialIllustrations';

const { width } = Dimensions.get('window');

interface TutorialSlidesProps {
    onComplete: () => void;
}

interface SlideData {
    id: string;
    title: string;
    description: string;
}

const SLIDES: SlideData[] = [
    {
        id: '1',
        title: '🎤 Sesli Kontrol',
        description: 'İstediğini söyle, BreviAI yapsın.\nSadece konuş, gerisini biz halledelim.',
    },
    {
        id: '2',
        title: '📚 Hazır Şablonlar',
        description: 'Yüzlerce otomasyon arasından seçim yap.\nTek dokunuşla aktif et.',
    },
    {
        id: '3',
        title: '⚡ Kendi Akışın',
        description: 'Kendi özel kısayollarını\ndakikalar içinde oluştur.',
    },
    {
        id: '4',
        title: '✅ Hazırsın!',
        description: 'Hadi başlayalım!\nDeneyimini keşfetmeye başla.',
    },
];

// Render the appropriate illustration based on slide id
const renderIllustration = (slideId: string) => {
    switch (slideId) {
        case '1':
            return <VoiceControlIllustration size={200} />;
        case '2':
            return <TemplatesIllustration size={200} />;
        case '3':
            return <CreateFlowIllustration size={200} />;
        case '4':
            return <ReadyIllustration size={200} />;
        default:
            return null;
    }
};

export const TutorialSlides: React.FC<TutorialSlidesProps> = ({ onComplete }) => {
    const { theme } = useApp();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? COLORS.dark : COLORS.light;

    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const goToNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            onComplete();
        }
    };

    const skip = () => {
        onComplete();
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index || 0);
        }
    }).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const renderSlide = ({ item }: { item: SlideData }) => (
        <View style={[styles.slide, { width }]}>
            <View style={styles.illustrationContainer}>
                {renderIllustration(item.id)}
            </View>
            <Text style={[styles.slideTitle, { color: currentTheme.text }]}>
                {item.title}
            </Text>
            <Text style={[styles.slideDescription, { color: currentTheme.textSecondary }]}>
                {item.description}
            </Text>
        </View>
    );

    const renderDots = () => (
        <View style={styles.dotsContainer}>
            {SLIDES.map((_, index) => {
                const inputRange = [
                    (index - 1) * width,
                    index * width,
                    (index + 1) * width,
                ];
                const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 24, 8],
                    extrapolate: 'clamp',
                });
                const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                });
                return (
                    <Animated.View
                        key={index}
                        style={[
                            styles.dot,
                            {
                                width: dotWidth,
                                opacity,
                                backgroundColor: currentTheme.primary,
                            },
                        ]}
                    />
                );
            })}
        </View>
    );

    const isLastSlide = currentIndex === SLIDES.length - 1;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
            {/* Skip Button */}
            <View style={styles.header}>
                {!isLastSlide && (
                    <TouchableOpacity onPress={skip} style={styles.skipButton}>
                        <Text style={[styles.skipText, { color: currentTheme.textSecondary }]}>
                            Atla
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Slides */}
            {/* Slides */}
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                extraData={currentIndex}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(data, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                })}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                windowSize={3}
                removeClippedSubviews={false}
            />

            {/* Dots */}
            {renderDots()}

            {/* Navigation Buttons */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={goToNext} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.nextButton}
                    >
                        <Text style={styles.nextButtonText}>
                            {isLastSlide ? 'Başla' : 'İleri'}
                        </Text>
                        <Ionicons
                            name={isLastSlide ? 'rocket' : 'arrow-forward'}
                            size={20}
                            color="#fff"
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: SPACING.large,
        paddingTop: SPACING.medium,
        minHeight: 50,
    },
    skipButton: {
        padding: 8,
    },
    skipText: {
        fontSize: 16,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.large,
    },
    illustrationContainer: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    slideTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    slideDescription: {
        fontSize: 17,
        textAlign: 'center',
        lineHeight: 26,
        paddingHorizontal: 20,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 30,
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    footer: {
        padding: SPACING.large,
        paddingBottom: 40,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
});

export default TutorialSlides;

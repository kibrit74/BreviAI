import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TermsModal } from './TermsModal';
import { TutorialSlides } from './TutorialSlides';

const ONBOARDING_KEY = '@breviai_onboarding_complete';

type OnboardingStep = 'loading' | 'terms' | 'tutorial' | 'complete';

interface OnboardingFlowProps {
    onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
    const [step, setStep] = useState<OnboardingStep>('loading');

    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    const checkOnboardingStatus = async () => {
        console.log("OnboardingFlow: Checking status in AsyncStorage...");
        try {
            const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
            console.log("OnboardingFlow: Status found:", completed);
            if (completed === 'true') {
                setStep('complete');
                onComplete();
            } else {
                console.log("OnboardingFlow: Onboarding NOT complete, showing terms.");
                setStep('terms');
            }
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            setStep('terms');
        }
    };

    const handleTermsAccept = () => {
        setStep('tutorial');
    };

    const handleTutorialComplete = async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
            setStep('complete');
            onComplete();
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            onComplete();
        }
    };

    // Loading state - return nothing while checking
    if (step === 'loading') {
        return <View style={styles.container} />;
    }

    // Complete - should not render anything
    if (step === 'complete') {
        return null;
    }

    // Terms step
    if (step === 'terms') {
        return <TermsModal onAccept={handleTermsAccept} />;
    }

    // Tutorial step
    if (step === 'tutorial') {
        return <TutorialSlides onComplete={handleTutorialComplete} />;
    }

    return null;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default OnboardingFlow;

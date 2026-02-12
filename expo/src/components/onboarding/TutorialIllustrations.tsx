import React from 'react';
import Svg, {
    Circle,
    Path,
    Rect,
    G,
    Defs,
    LinearGradient,
    Stop,
    Text as SvgText
} from 'react-native-svg';

interface IllustrationProps {
    size?: number;
}

// Slide 1: Voice Control Illustration
export const VoiceControlIllustration: React.FC<IllustrationProps> = ({ size = 200 }) => (
    <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
            <LinearGradient id="micGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#6366F1" />
                <Stop offset="100%" stopColor="#8B5CF6" />
            </LinearGradient>
            <LinearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                <Stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
                <Stop offset="100%" stopColor="#6366F1" stopOpacity="0.3" />
            </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle cx="100" cy="100" r="80" fill="url(#micGrad)" opacity="0.1" />
        <Circle cx="100" cy="100" r="60" fill="url(#micGrad)" opacity="0.2" />

        {/* Sound waves */}
        <Path d="M40 100 Q50 80, 60 100 T80 100" stroke="url(#waveGrad)" strokeWidth="3" fill="none" />
        <Path d="M120 100 Q130 80, 140 100 T160 100" stroke="url(#waveGrad)" strokeWidth="3" fill="none" />

        {/* Microphone body */}
        <Rect x="85" y="70" width="30" height="50" rx="15" fill="url(#micGrad)" />

        {/* Microphone stand */}
        <Path d="M85 110 Q85 140, 100 140 Q115 140, 115 110" stroke="url(#micGrad)" strokeWidth="4" fill="none" />
        <Rect x="95" y="140" width="10" height="20" fill="url(#micGrad)" />
        <Rect x="80" y="155" width="40" height="6" rx="3" fill="url(#micGrad)" />
    </Svg>
);

// Slide 2: Templates Library Illustration
export const TemplatesIllustration: React.FC<IllustrationProps> = ({ size = 200 }) => (
    <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
            <LinearGradient id="cardGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#EC4899" />
                <Stop offset="100%" stopColor="#F43F5E" />
            </LinearGradient>
            <LinearGradient id="cardGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#10B981" />
                <Stop offset="100%" stopColor="#14B8A6" />
            </LinearGradient>
            <LinearGradient id="cardGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#6366F1" />
                <Stop offset="100%" stopColor="#8B5CF6" />
            </LinearGradient>
        </Defs>

        {/* Card 1 - Back */}
        <G transform="translate(45, 30) rotate(-10)">
            <Rect width="70" height="90" rx="10" fill="url(#cardGrad1)" opacity="0.8" />
            <Rect x="10" y="15" width="50" height="6" rx="3" fill="white" opacity="0.5" />
            <Rect x="10" y="30" width="35" height="4" rx="2" fill="white" opacity="0.3" />
            <Circle cx="35" cy="60" r="15" fill="white" opacity="0.3" />
        </G>

        {/* Card 2 - Middle */}
        <G transform="translate(65, 50)">
            <Rect width="70" height="90" rx="10" fill="url(#cardGrad2)" />
            <Rect x="10" y="15" width="50" height="6" rx="3" fill="white" opacity="0.5" />
            <Rect x="10" y="30" width="35" height="4" rx="2" fill="white" opacity="0.3" />
            <Circle cx="35" cy="60" r="15" fill="white" opacity="0.3" />
        </G>

        {/* Card 3 - Front */}
        <G transform="translate(85, 70) rotate(8)">
            <Rect width="70" height="90" rx="10" fill="url(#cardGrad3)" />
            <Rect x="10" y="15" width="50" height="6" rx="3" fill="white" opacity="0.6" />
            <Rect x="10" y="30" width="35" height="4" rx="2" fill="white" opacity="0.4" />
            <Circle cx="35" cy="60" r="15" fill="white" opacity="0.4" />
        </G>
    </Svg>
);

// Slide 3: Create Custom Flow Illustration
export const CreateFlowIllustration: React.FC<IllustrationProps> = ({ size = 200 }) => (
    <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
            <LinearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#10B981" />
                <Stop offset="100%" stopColor="#14B8A6" />
            </LinearGradient>
            <LinearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#10B981" />
                <Stop offset="100%" stopColor="#14B8A6" />
            </LinearGradient>
        </Defs>

        {/* Connection lines */}
        <Path d="M100 55 L100 85" stroke="url(#lineGrad)" strokeWidth="3" strokeDasharray="5,5" />
        <Path d="M100 115 L100 145" stroke="url(#lineGrad)" strokeWidth="3" strokeDasharray="5,5" />
        <Path d="M70 100 L50 80" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="5,5" />
        <Path d="M130 100 L150 80" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="5,5" />

        {/* Center node - Plus */}
        <Circle cx="100" cy="100" r="25" fill="url(#nodeGrad)" />
        <Path d="M90 100 L110 100 M100 90 L100 110" stroke="white" strokeWidth="4" strokeLinecap="round" />

        {/* Top node */}
        <Circle cx="100" cy="45" r="18" fill="url(#nodeGrad)" opacity="0.7" />
        <Path d="M93 45 L107 45" stroke="white" strokeWidth="3" strokeLinecap="round" />

        {/* Bottom node */}
        <Circle cx="100" cy="155" r="18" fill="url(#nodeGrad)" opacity="0.7" />
        <Circle cx="100" cy="155" r="6" fill="white" opacity="0.8" />

        {/* Left node */}
        <Circle cx="45" cy="70" r="14" fill="url(#nodeGrad)" opacity="0.5" />

        {/* Right node */}
        <Circle cx="155" cy="70" r="14" fill="url(#nodeGrad)" opacity="0.5" />
    </Svg>
);

// Slide 4: Ready/Checkmark Illustration
export const ReadyIllustration: React.FC<IllustrationProps> = ({ size = 200 }) => (
    <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
            <LinearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#F97316" />
            </LinearGradient>
        </Defs>

        {/* Outer glow circles */}
        <Circle cx="100" cy="100" r="90" fill="url(#checkGrad)" opacity="0.05" />
        <Circle cx="100" cy="100" r="75" fill="url(#checkGrad)" opacity="0.1" />
        <Circle cx="100" cy="100" r="60" fill="url(#checkGrad)" opacity="0.15" />

        {/* Main circle */}
        <Circle cx="100" cy="100" r="45" fill="url(#checkGrad)" />

        {/* Checkmark */}
        <Path
            d="M75 100 L92 117 L125 84"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />

        {/* Sparkles */}
        <Circle cx="155" cy="55" r="4" fill="url(#checkGrad)" opacity="0.6" />
        <Circle cx="45" cy="145" r="3" fill="url(#checkGrad)" opacity="0.5" />
        <Circle cx="165" cy="120" r="2" fill="url(#checkGrad)" opacity="0.4" />
        <Circle cx="35" cy="80" r="2" fill="url(#checkGrad)" opacity="0.4" />
    </Svg>
);

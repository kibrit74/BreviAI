/**
 * NodeConfigModal - Configuration modal for workflow nodes
 * Dynamic form based on node type
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Modal,
    Switch,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import * as Calendar from 'expo-calendar';
import { getAppList } from '../../services/nodes/devices';
import { FREE_APIS } from '../../constants/FreeApis';
import { GeofenceCreateFields } from './GeofenceCreateFields';
import { GeofenceEnterFields } from './GeofenceEnterFields';
import { GeofenceExitFields } from './GeofenceExitFields';
import {
    WorkflowNode,
    NodeType,
    NodeConfig,
    NODE_REGISTRY,
    TimeTriggerConfig,
    DelayConfig,
    IfElseConfig,
    VariableConfig,
    LoopConfig,
    NotificationConfig,
    SoundModeConfig,
    AppLaunchConfig,
    DNDControlConfig,
    BrightnessControlConfig,
    FlashlightControlConfig,
    CalendarReadConfig,
    CalendarCreateConfig,
    LocationGetConfig,
    GeofenceCreateConfig,
    GeofenceEnterConfig,
    GeofenceExitConfig,
    BatteryCheckConfig,
    NetworkCheckConfig,
    VolumeControlConfig,
    SpeakTextConfig,
    SmsSendConfig,
    EmailSendConfig,
    HttpRequestConfig,
    FileWriteConfig,
    FileReadConfig,
    AlarmSetConfig,
    SpeechToTextConfig,
    ShowTextConfig,
    FilePickConfig,
    ViewUdfConfig,
} from '../../types/workflow-types';

interface NodeConfigModalProps {
    visible: boolean;
    node: WorkflowNode | null;
    allNodes?: WorkflowNode[]; // All nodes in workflow for variable detection
    onClose: () => void;
    onSave: (node: WorkflowNode) => void;
    onDelete: () => void;
}

// Node types that produce file outputs
const FILE_OUTPUT_NODE_TYPES: NodeType[] = [
    'FILE_PICK', 'AUDIO_RECORD', 'IMAGE_GENERATOR', 'IMAGE_EDIT', 'PDF_CREATE', 'TEXT_INPUT'
];

// Helper to extract file-producing variable names from nodes
const getFileVariables = (nodes: WorkflowNode[]): string[] => {
    const variables: string[] = [];

    nodes.forEach(n => {
        const config = n.config as any;

        // For TEXT_INPUT, check attachmentsVariableName
        if (n.type === 'TEXT_INPUT' && config?.attachmentsVariableName) {
            variables.push(config.attachmentsVariableName);
        }
        // For other file-producing nodes, use variableName
        else if (FILE_OUTPUT_NODE_TYPES.includes(n.type) && config?.variableName) {
            variables.push(config.variableName);
        }
    });

    return variables;
};



// ═══════════════════════════════════════════════════════════════
// CONFIG FIELD COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface ConfigFieldsProps {
    config: any;
    updateConfig: (key: string, value: any) => void;
}

// ═══════════════════════════════════════════════════════════════
// YARDIMCI BİLEŞENLER
// ═══════════════════════════════════════════════════════════════

// Genişleyebilir Metin Girişi - Uzun içerikler için tam ekran modal
interface ExpandableTextInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    label?: string;
    hint?: string;
    minHeight?: number;
}

const ExpandableTextInput: React.FC<ExpandableTextInputProps> = ({
    value,
    onChangeText,
    placeholder,
    label,
    hint,
    minHeight = 80
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    const openModal = () => {
        setTempValue(value);
        setModalVisible(true);
    };

    const handleSave = () => {
        onChangeText(tempValue);
        setModalVisible(false);
    };

    return (
        <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <TextInput
                    style={[styles.input, { flex: 1, minHeight, textAlignVertical: 'top' }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                />
                <TouchableOpacity
                    style={{
                        backgroundColor: '#3A3A5A',
                        padding: 12,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onPress={openModal}
                >
                    <Text style={{ fontSize: 18 }}>⬜</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent={false}>
                <View style={{ flex: 1, backgroundColor: '#0D0D1A' }}>
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        backgroundColor: '#1A1A2E',
                        borderBottomWidth: 1,
                        borderBottomColor: '#2A2A4A'
                    }}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={{ color: '#888', fontSize: 16 }}>İptal</Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '600' }}>
                            {label || 'Metin Düzenle'}
                        </Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={{ color: '#8B5CF6', fontSize: 16, fontWeight: '600' }}>Kaydet</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Hint */}
                    {hint && (
                        <View style={{ padding: 12, backgroundColor: '#1E1E2E' }}>
                            <Text style={{ color: '#888', fontSize: 13 }}>{hint}</Text>
                        </View>
                    )}

                    {/* Full-screen TextInput */}
                    <TextInput
                        style={{
                            flex: 1,
                            color: '#FFF',
                            fontSize: 16,
                            padding: 16,
                            textAlignVertical: 'top',
                            fontFamily: 'monospace',
                        }}
                        value={tempValue}
                        onChangeText={setTempValue}
                        placeholder={placeholder}
                        placeholderTextColor="#666"
                        multiline
                        autoFocus
                    />
                </View>
            </Modal>
        </>
    );
};

// API Dokümantasyon Linki
interface ApiDocLinkProps {
    title: string;
    url: string;
    brief?: string;
}

const ApiDocLink: React.FC<ApiDocLinkProps> = ({ title, url, brief }) => (
    <View style={{
        backgroundColor: '#1E1E2E',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#3A3A5A'
    }}>
        {brief && (
            <Text style={{ color: '#AAA', fontSize: 13, marginBottom: 8 }}>
                💡 {brief}
            </Text>
        )}
        <TouchableOpacity
            onPress={() => Linking.openURL(url)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
            <Text style={{ fontSize: 14 }}>📚</Text>
            <Text style={{ color: '#8B5CF6', fontSize: 14, fontWeight: '500' }}>
                {title}
            </Text>
            <Text style={{ color: '#666', fontSize: 12 }}>↗</Text>
        </TouchableOpacity>
    </View>
);


// Improved TimeInput component that handles local state
interface TimeInputProps {
    value: number;
    onChange: (value: number) => void;
    max: number;
    placeholder: string;
}

// Simplified Time Input - No internal state management, just direct prop control
const SimplifiedTimeInput: React.FC<{
    value: number;
    onChange: (value: number) => void;
    max: number;
    placeholder: string;
}> = ({ value, onChange, max, placeholder }) => {
    // Local state to handle typing freely without aggressive formatting
    const [text, setText] = useState(value.toString().padStart(2, '0'));
    const [isFocused, setIsFocused] = useState(false);

    // Sync with prop value when not focused (handling external updates)
    useEffect(() => {
        if (!isFocused) {
            setText(value.toString().padStart(2, '0'));
        }
    }, [value, isFocused]);

    const handleBlur = () => {
        setIsFocused(false);
        // On blur, ensure valid number and format
        let num = parseInt(text, 10);
        if (isNaN(num)) num = 0;
        if (num > max) num = max; // Clamp

        onChange(num);
        setText(num.toString().padStart(2, '0'));
    };

    return (
        <TextInput
            style={[styles.input, styles.timeInput]}
            value={text}
            onChangeText={(t) => {
                setText(t);

                // Optional: Update parent immediately if valid integer (for live feedback)
                // But don't clamp or format yet to allow backspacing
                if (t === '') {
                    onChange(0); // Treat empty as 0 internally but show empty
                } else if (/^\d+$/.test(t)) {
                    // Start updating parent but don't force format locally
                    const num = parseInt(t, 10);
                    if (!isNaN(num)) {
                        // Don't clamp strictly here, allow user to type "59" then change to "5"
                        // But for safety we can clamp if it exceeds 2 digits? 
                        // No, user might type '123' by mistake, just clamp for parent update
                        const clamped = Math.min(Math.max(0, num), max);
                        onChange(clamped);
                    }
                }
            }}
            onFocus={() => {
                setIsFocused(true);
                // Optional: Select all on focus for easier overwriting
            }}
            onBlur={handleBlur}
            keyboardType="number-pad"
            // Remove maxLength to allow easy editing (e.g. typing 3rd digit then deleting first)
            placeholder={placeholder}
            placeholderTextColor="#666"
            selectTextOnFocus
        />
    );
};

const TimeTriggerFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => {
    return (
        <>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Saat</Text>
                <View style={styles.timeRow}>
                    <SimplifiedTimeInput
                        value={config.hour ?? 9}
                        onChange={(v) => updateConfig('hour', v)}
                        max={23}
                        placeholder="09"
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <SimplifiedTimeInput
                        value={config.minute ?? 0}
                        onChange={(v) => updateConfig('minute', v)}
                        max={59}
                        placeholder="00"
                    />
                </View>
                <Text style={styles.fieldHint}>Örnek: 03:16 veya 14:30</Text>
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Her Gün Tekrarla</Text>
                <Switch
                    value={config.repeat ?? true}
                    onValueChange={(v) => updateConfig('repeat', v)}
                    trackColor={{ false: '#2A2A4A', true: '#6366F1' }}
                    thumbColor="#FFF"
                />
            </View>
        </>
    );
};



const NotificationTriggerFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => {
    const [hasAccess, setHasAccess] = React.useState<boolean | null>(null);

    React.useEffect(() => {
        // Check notification listener access on mount
        const checkAccess = () => {
            try {
                const { BreviHelperModule } = require('react-native').NativeModules;
                if (BreviHelperModule?.hasNotificationListenerAccess) {
                    const access = BreviHelperModule.hasNotificationListenerAccess();
                    setHasAccess(access);
                }
            } catch (e) {
                console.log('Could not check notification access');
            }
        };
        checkAccess();
    }, []);

    const requestAccess = () => {
        try {
            const { BreviHelperModule } = require('react-native').NativeModules;
            BreviHelperModule?.requestNotificationListenerAccess?.();
        } catch (e) {
            console.log('Could not request notification access');
        }
    };

    return (
        <>
            {/* Permission Check Banner */}
            {hasAccess === false && (
                <TouchableOpacity
                    style={{
                        backgroundColor: '#FEF3C7',
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#F59E0B'
                    }}
                    onPress={requestAccess}
                >
                    <Text style={{ fontSize: 20, marginRight: 10 }}>⚠️</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#92400E', fontWeight: 'bold', fontSize: 13 }}>
                            Bildirim Erişimi Gerekli
                        </Text>
                        <Text style={{ color: '#B45309', fontSize: 12, marginTop: 2 }}>
                            Bu tetikleyici için izin verin → Dokunun
                        </Text>
                    </View>
                    <Text style={{ fontSize: 18 }}>→</Text>
                </TouchableOpacity>
            )}

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Paket Adı (örn: com.whatsapp)</Text>
                <TextInput
                    style={styles.input}
                    value={config.packageName || ''}
                    onChangeText={(v) => updateConfig('packageName', v)}
                    placeholder="com.whatsapp"
                    placeholderTextColor="#666"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Başlık Filtresi (Opsiyonel)</Text>
                <TextInput
                    style={styles.input}
                    value={config.titleFilter || ''}
                    onChangeText={(v) => updateConfig('titleFilter', v)}
                    placeholder="Ahmet Yılmaz (veya Regex)"
                    placeholderTextColor="#666"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Metin Filtresi (Opsiyonel)</Text>
                <TextInput
                    style={styles.input}
                    value={config.textFilter || ''}
                    onChangeText={(v) => updateConfig('textFilter', v)}
                    placeholder="Anahtar kelime..."
                    placeholderTextColor="#666"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tam Eşleşme</Text>
                <Switch
                    value={config.exactMatch || false}
                    onValueChange={(v) => updateConfig('exactMatch', v)}
                    trackColor={{ false: '#2A2A4A', true: '#6366F1' }}
                    thumbColor="#FFF"
                />
            </View>
        </>
    );
};

const EmailTriggerFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Gönderen Filtresi (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.senderFilter || ''}
                onChangeText={(v) => updateConfig('senderFilter', v)}
                placeholder="Örn: Google, banka@..."
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Konu Filtresi (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.subjectFilter || ''}
                onChangeText={(v) => updateConfig('subjectFilter', v)}
                placeholder="Örn: Fatura, Kod..."
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>İçerik Filtresi (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.bodyFilter || ''}
                onChangeText={(v) => updateConfig('bodyFilter', v)}
                placeholder="Örn: Ödeme alındı..."
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const TelegramTriggerFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Bot Token (Opsiyonel - Long Polling)</Text>
            <TextInput
                style={styles.input}
                value={config.botToken || ''}
                onChangeText={(v) => updateConfig('botToken', v)}
                placeholder="123456:ABC-DEF..."
                placeholderTextColor="#666"
            />
            <Text style={styles.fieldHint}>
                Girerseniz Bot API üzerinden mesajları dinler. Girmezseniz telefon bildirimlerini dinler.
            </Text>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Kişi/Grup Adı (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.chatNameFilter || ''}
                onChangeText={(v) => updateConfig('chatNameFilter', v)}
                placeholder="Örn: Ahmet, Yazılım Grubu..."
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mesaj İçeriği (Regex Destekli)</Text>
            <TextInput
                style={styles.input}
                value={config.messageFilter || ''}
                onChangeText={(v) => updateConfig('messageFilter', v)}
                placeholder="Örn: ^/ai (veya Merhaba)"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const CallTriggerFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => {
    const states = config.states || [];

    const toggleState = (state: string) => {
        const newStates = states.includes(state)
            ? states.filter((s: string) => s !== state)
            : [...states, state];
        updateConfig('states', newStates);
    };

    return (
        <>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tetikleyici Durumlar</Text>
                <View style={[styles.buttonRow, { gap: 8 }]}>
                    {['Incoming', 'Connected', 'Disconnected', 'Dialing'].map(state => (
                        <TouchableOpacity
                            key={state}
                            style={[styles.unitButton, states.includes(state) && styles.unitButtonSelected]}
                            onPress={() => toggleState(state)}
                        >
                            <Text style={[styles.unitButtonText, states.includes(state) && styles.unitButtonTextSelected]}>
                                {state === 'Incoming' ? 'Gelen' : state === 'Connected' ? 'Bağlı' : state === 'Disconnected' ? 'Bitti' : 'Aranıyor'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Numara Filtresi (Opsiyonel)</Text>
                <TextInput
                    style={styles.input}
                    value={config.phoneNumber || ''}
                    onChangeText={(v) => updateConfig('phoneNumber', v)}
                    placeholder="+905..."
                    placeholderTextColor="#666"
                    keyboardType="phone-pad"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
                <TextInput
                    style={styles.input}
                    value={config.variableName}
                    onChangeText={(t) => updateConfig('variableName', t)}
                    placeholder="callInfo"
                    placeholderTextColor="#666"
                />
            </View>
        </>
    );
};

const SmsTriggerFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => {
    const [hasAccess, setHasAccess] = React.useState<boolean | null>(null);

    React.useEffect(() => {
        // Check SMS permission on mount
        const checkAccess = async () => {
            try {
                const { checkSmsPermissions } = require('../../utils/PermissionUtils');
                const access = await checkSmsPermissions();
                setHasAccess(access);
            } catch (e) {
                console.log('Could not check SMS access');
            }
        };
        checkAccess();
    }, []);

    const requestAccess = async () => {
        try {
            const { requestSmsPermissions } = require('../../utils/PermissionUtils');
            const granted = await requestSmsPermissions();
            setHasAccess(granted);
        } catch (e) {
            console.log('Could not request SMS access');
        }
    };

    return (
        <>
            {/* Permission Check Banner */}
            {hasAccess === false && (
                <TouchableOpacity
                    style={{
                        backgroundColor: '#FEF3C7',
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#F59E0B'
                    }}
                    onPress={requestAccess}
                >
                    <Text style={{ fontSize: 20, marginRight: 10 }}>⚠️</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#92400E', fontWeight: 'bold', fontSize: 13 }}>
                            SMS Okuma İzni Gerekli
                        </Text>
                        <Text style={{ color: '#B45309', fontSize: 12, marginTop: 2 }}>
                            Tetikleyici için izin verin → Dokunun
                        </Text>
                    </View>
                    <Text style={{ fontSize: 18 }}>→</Text>
                </TouchableOpacity>
            )}

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Gönderen (Opsiyonel)</Text>
                <TextInput
                    style={styles.input}
                    value={config.phoneNumberFilter || ''}
                    onChangeText={(v) => updateConfig('phoneNumberFilter', v)}
                    placeholder="+905... veya Başlık"
                    placeholderTextColor="#666"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Mesaj İçeriği (Opsiyonel)</Text>
                <TextInput
                    style={styles.input}
                    value={config.messageFilter || ''}
                    onChangeText={(v) => updateConfig('messageFilter', v)}
                    placeholder="Örn: Kod, Şifre..."
                    placeholderTextColor="#666"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
                <TextInput
                    style={styles.input}
                    value={config.variableName}
                    onChangeText={(t) => updateConfig('variableName', t)}
                    placeholder="smsInfo"
                    placeholderTextColor="#666"
                />
            </View>
        </>
    );
};

const WhatsAppTriggerFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Gönderen (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.senderFilter || ''}
                onChangeText={(v) => updateConfig('senderFilter', v)}
                placeholder="Kişi adı veya numara"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Grup Adı (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.groupFilter || ''}
                onChangeText={(v) => updateConfig('groupFilter', v)}
                placeholder="Örn: Aile Grubu"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mesaj İçeriği (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.messageFilter || ''}
                onChangeText={(v) => updateConfig('messageFilter', v)}
                placeholder="Anahtar kelime"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="whatsappInfo"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const DelayFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Süre</Text>
            <TextInput
                style={styles.input}
                value={String(config.duration || 0)}
                onChangeText={(v) => updateConfig('duration', parseInt(v) || 0)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Birim</Text>
            <View style={styles.buttonRow}>
                {['ms', 'sec', 'min', 'hour'].map(unit => (
                    <TouchableOpacity
                        key={unit}
                        style={[styles.unitButton, config.unit === unit && styles.unitButtonSelected]}
                        onPress={() => updateConfig('unit', unit)}
                    >
                        <Text style={[styles.unitButtonText, config.unit === unit && styles.unitButtonTextSelected]}>
                            {unit === 'ms' ? 'ms' : unit === 'sec' ? 'sn' : unit === 'min' ? 'dk' : 'saat'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    </>
);

const ShowOverlayFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mesaj</Text>
            <ExpandableTextInput
                value={config.text || ''}
                onChangeText={(v) => updateConfig('text', v)}
                placeholder="Görüntülenecek mesaj... (Değişken kullanabilirsiniz)"
                label="Mesaj İçeriği"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Gönderen Tipi</Text>
            <View style={styles.buttonRow}>
                {['bot', 'user'].map(type => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.unitButton, (config.showAs || 'bot') === type && styles.unitButtonSelected]}
                        onPress={() => updateConfig('showAs', type)}
                    >
                        <Text style={[styles.unitButtonText, (config.showAs || 'bot') === type && styles.unitButtonTextSelected]}>
                            {type === 'bot' ? 'Bot (Asistan)' : 'User (Kullanıcı)'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    </>
);

const OverlayInputFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Placeholder (İpucu)</Text>
            <TextInput
                style={styles.input}
                value={config.placeholder || ''}
                onChangeText={(v) => updateConfig('placeholder', v)}
                placeholder="Örn: İsminiz nedir?"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="inputResult"
                placeholderTextColor="#666"
            />
            <Text style={styles.fieldHint}>Kullanıcının girdiği metin bu değişkene atanır.</Text>
        </View>
    </>
);

const IfElseFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => {
    // Helper to add a new condition
    const addCondition = () => {
        const newConditions = config.conditions ? [...config.conditions] : [];
        if (!config.conditions && config.left) {
            // Migrate legacy single condition to array
            newConditions.push({
                left: config.left,
                operator: config.operator,
                right: config.right,
                caseSensitive: config.caseSensitive
            });
        }
        newConditions.push({ left: '', operator: '==', right: '' });
        updateConfig('conditions', newConditions);
    };

    // Helper to update a specific condition (or legacy fields if index -1)
    const updateCondition = (index: number, key: string, value: any) => {
        if (config.conditions) {
            const newConditions = [...config.conditions];
            newConditions[index] = { ...newConditions[index], [key]: value };
            updateConfig('conditions', newConditions);
        } else {
            updateConfig(key, value);
        }
    };

    // Remove condition
    const removeCondition = (index: number) => {
        if (config.conditions) {
            const newConditions = config.conditions.filter((_, i) => i !== index);
            updateConfig('conditions', newConditions);
        }
    };

    const conditions = config.conditions || [{
        left: config.left,
        operator: config.operator,
        right: config.right,
        caseSensitive: config.caseSensitive
    }];

    return (
        <ScrollView style={{ maxHeight: 500 }}>
            <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Mantık Operatörü</Text>
                <View style={styles.buttonRow}>
                    {['AND', 'OR'].map(op => (
                        <TouchableOpacity
                            key={op}
                            style={[
                                styles.unitButton,
                                (config.logic || 'AND') === op && styles.unitButtonSelected
                            ]}
                            onPress={() => updateConfig('logic', op)}
                        >
                            <Text style={[
                                styles.unitButtonText,
                                (config.logic || 'AND') === op && styles.unitButtonTextSelected
                            ]}>
                                {op === 'AND' ? 'VE (Hepsine Uy)' : 'VEYA (Birine Uy)'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {conditions.map((item: any, index: number) => (
                <View key={index} style={{
                    borderWidth: 1,
                    borderColor: '#333',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 10,
                    backgroundColor: '#1E1E2E'
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text style={[styles.fieldLabel, { color: '#AAA' }]}>Koşul {index + 1}</Text>
                        {conditions.length > 1 && (
                            <TouchableOpacity onPress={() => removeCondition(index)}>
                                <Text style={{ color: '#EF4444' }}>Sil</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Sol Değer</Text>
                        <TextInput
                            style={styles.input}
                            value={item.left || ''}
                            onChangeText={(v) => updateCondition(index, 'left', v)}
                            placeholder="{{var}}"
                            placeholderTextColor="#666"
                        />
                    </View>

                    <View style={styles.field}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.buttonRow}>
                                {['==', '!=', '>', '<', '>=', '<=', 'contains', 'isEmpty'].map(op => (
                                    <TouchableOpacity
                                        key={op}
                                        style={[
                                            styles.unitButton,
                                            item.operator === op && styles.unitButtonSelected,
                                            { minWidth: 40, paddingHorizontal: 8 }
                                        ]}
                                        onPress={() => updateCondition(index, 'operator', op)}
                                    >
                                        <Text style={[
                                            styles.unitButtonText,
                                            item.operator === op && styles.unitButtonTextSelected
                                        ]}>
                                            {op}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Sağ Değer</Text>
                        <TextInput
                            style={styles.input}
                            value={item.right || ''}
                            onChangeText={(v) => updateCondition(index, 'right', v)}
                            placeholder="Değer"
                            placeholderTextColor="#666"
                        />
                    </View>
                </View>
            ))}

            <TouchableOpacity
                style={[styles.button, { backgroundColor: '#3B82F6', marginTop: 5 }]}
                onPress={addCondition}
            >
                <Text style={styles.buttonText}>+ Koşul Ekle</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const VariableFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>İşlem</Text>
            <View style={styles.buttonRow}>
                {['set', 'get', 'increment', 'clear'].map(op => (
                    <TouchableOpacity
                        key={op}
                        style={[styles.unitButton, config.operation === op && styles.unitButtonSelected]}
                        onPress={() => updateConfig('operation', op)}
                    >
                        <Text style={[styles.unitButtonText, config.operation === op && styles.unitButtonTextSelected]}>
                            {op === 'set' ? 'Ata' : op === 'get' ? 'Oku' : op === 'increment' ? 'Artır' : 'Sil'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Değişken Adı</Text>
            <TextInput
                style={styles.input}
                value={config.name || ''}
                onChangeText={(v) => updateConfig('name', v)}
                placeholder="degiskenAdi"
                placeholderTextColor="#666"
            />
        </View>
        {(config.operation === 'set' || config.operation === 'increment') && (
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Değer</Text>
                <ExpandableTextInput
                    value={String(config.value || '')}
                    onChangeText={(v) => updateConfig('value', v)}
                    placeholder="Değer"
                    label="Değer"
                    minHeight={60}
                />
            </View>
        )}
    </>
);

const LoopFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Döngü Tipi</Text>
            <View style={styles.buttonRow}>
                {['count', 'while', 'forEach'].map(type => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.unitButton, config.type === type && styles.unitButtonSelected]}
                        onPress={() => updateConfig('type', type)}
                    >
                        <Text style={[styles.unitButtonText, config.type === type && styles.unitButtonTextSelected]}>
                            {type === 'count' ? 'Sayaç' : type === 'while' ? 'Koşul' : 'Her biri'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        {config.type === 'count' && (
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tekrar Sayısı</Text>
                <TextInput
                    style={styles.input}
                    value={String(config.count || 1)}
                    onChangeText={(v) => updateConfig('count', parseInt(v) || 1)}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor="#666"
                />
            </View>
        )}
        {config.type === 'forEach' && (
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Liste Değişkeni (Array)</Text>
                <ExpandableTextInput
                    value={config.items || ''}
                    onChangeText={(v) => updateConfig('items', v)}
                    placeholder="items"
                    label="Liste Değişkeni"
                    hint="Array değişkeni adı veya JSON array: [1,2,3]"
                    minHeight={60}
                />
            </View>
        )}
        {config.type === 'while' && (
            <View style={styles.field}>
                <Text>While koşulu IF_ELSE benzeri yapılandırılmalı (Henüz desteklenmiyor)</Text>
            </View>
        )}
    </>
);

const NotificationFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tip</Text>
            <View style={styles.buttonRow}>
                {['toast', 'push'].map(type => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.unitButton, config.type === type && styles.unitButtonSelected]}
                        onPress={() => updateConfig('type', type)}
                    >
                        <Text style={[styles.unitButtonText, config.type === type && styles.unitButtonTextSelected]}>
                            {type === 'toast' ? 'Toast' : 'Bildirim'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        {config.type === 'push' && (
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Başlık</Text>
                <TextInput
                    style={styles.input}
                    value={config.title || ''}
                    onChangeText={(v) => updateConfig('title', v)}
                    placeholder="Bildirim başlığı"
                    placeholderTextColor="#666"
                />
            </View>
        )}
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mesaj</Text>
            <ExpandableTextInput
                value={config.message || ''}
                onChangeText={(v) => updateConfig('message', v)}
                placeholder="Mesaj metni ({{degisken}} kullanılabilir)"
                label="Mesaj"
                hint="Bildirim içeriği"
                minHeight={80}
            />
        </View>
    </>
);

const SoundModeFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>Mod</Text>
        <View style={styles.buttonRow}>
            {['silent', 'vibrate', 'normal'].map(mode => (
                <TouchableOpacity
                    key={mode}
                    style={[styles.unitButton, config.mode === mode && styles.unitButtonSelected]}
                    onPress={() => updateConfig('mode', mode)}
                >
                    <Text style={[styles.unitButtonText, config.mode === mode && styles.unitButtonTextSelected]}>
                        {mode === 'silent' ? '🔇 Sessiz' : mode === 'vibrate' ? '📳 Titreşim' : '🔊 Normal'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

const AppLaunchFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [apps, setApps] = useState<{ label: string, packageName: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const loadApps = async () => {
        setLoading(true);
        const list = await getAppList();
        setApps(list);
        setLoading(false);
    };

    const openModal = () => {
        setModalVisible(true);
        loadApps();
    };

    const filteredApps = apps.filter(app =>
        app.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.packageName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Paket Adı</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                        style={[styles.input, { flex: 1, minHeight: 48 }]}
                        value={config.packageName || ''}
                        onChangeText={(v) => updateConfig('packageName', v)}
                        placeholder="com.example.app"
                        placeholderTextColor="#666"
                    />
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#6366F1',
                            justifyContent: 'center',
                            paddingHorizontal: 15,
                            borderRadius: 8
                        }}
                        onPress={openModal}
                    >
                        <Text style={{ color: 'white' }}>Seç</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Uygulama Adı (opsiyonel)</Text>
                <ExpandableTextInput
                    value={config.appName || ''}
                    onChangeText={(v) => updateConfig('appName', v)}
                    placeholder="Uygulama ismi"
                    label="Uygulama Adı"
                    minHeight={60}
                />
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#1E1E2E', borderRadius: 16, maxHeight: '80%', padding: 20 }}>
                        <Text style={{ color: 'white', fontSize: 20, marginBottom: 20, fontWeight: 'bold' }}>Uygulama Seç</Text>

                        <TextInput
                            style={[styles.input, { marginBottom: 20 }]}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            placeholder="Uygulama ara..."
                            placeholderTextColor="#666"
                        />

                        {loading ? (
                            <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 20 }} />
                        ) : (
                            <FlatList
                                data={filteredApps}
                                keyExtractor={item => item.packageName}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={{
                                            padding: 15,
                                            borderBottomWidth: 1,
                                            borderBottomColor: '#2A2A4A',
                                        }}
                                        onPress={() => {
                                            updateConfig('packageName', item.packageName);
                                            updateConfig('appName', item.label);
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '500', fontSize: 16 }}>{item.label}</Text>
                                        <Text style={{ color: '#888', fontSize: 12 }}>{item.packageName}</Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={{ color: '#666', textAlign: 'center', padding: 20 }}>Uygulama bulunamadı</Text>
                                }
                            />
                        )}

                        <TouchableOpacity
                            style={{
                                marginTop: 15,
                                padding: 15,
                                backgroundColor: '#2A2A4A',
                                borderRadius: 12,
                                alignItems: 'center'
                            }}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={{ color: '#FFF', fontWeight: '600' }}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const DNDControlFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Rahatsız Etmeyin</Text>
            <Switch
                value={config.enabled || false}
                onValueChange={(v) => updateConfig('enabled', v)}
                trackColor={{ false: '#2A2A4A', true: '#6366F1' }}
                thumbColor="#FFF"
            />
        </View>
        {config.enabled && (
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Süre (dakika, 0 = süresiz)</Text>
                <TextInput
                    style={styles.input}
                    value={String(config.duration || 0)}
                    onChangeText={(v) => updateConfig('duration', parseInt(v) || 0)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#666"
                />
            </View>
        )}
    </>
);

const BrightnessControlFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Parlaklık Seviyesi (0-100)</Text>
            <TextInput
                style={styles.input}
                value={String(config.level ?? 50)}
                onChangeText={(v) => updateConfig('level', Math.min(100, Math.max(0, parseInt(v) || 0)))}
                keyboardType="number-pad"
                placeholder="50"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tekrar Eski Haline Dönsün Mü?</Text>
            <Switch
                value={config.saveCurrentLevel || false}
                onValueChange={(v) => updateConfig('saveCurrentLevel', v)}
                trackColor={{ false: '#2A2A4A', true: '#6366F1' }}
                thumbColor="#FFF"
            />
        </View>
    </>
);


// Calendar Picker Helper
const CalendarPickerField = ({
    value,
    onSelect,
    placeholder = "Takvim Seç"
}: {
    value?: string,
    onSelect: (name: string, source: string) => void
    placeholder?: string
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
    const [loading, setLoading] = useState(false);

    const loadCalendars = async () => {
        setLoading(true);
        try {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status === 'granted') {
                const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
                setCalendars(cals);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const openModal = () => {
        setModalVisible(true);
        loadCalendars();
    };

    return (
        <>
            <TouchableOpacity onPress={openModal} style={{ flex: 1 }}>
                <View style={[styles.input, { justifyContent: 'center' }]}>
                    <Text style={{ color: value ? '#FFF' : '#666' }}>{value || placeholder}</Text>
                </View>
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#1E1E2E', borderRadius: 16, maxHeight: '80%', padding: 20 }}>
                        <Text style={{ color: 'white', fontSize: 20, marginBottom: 20, fontWeight: 'bold' }}>Takvim Seç</Text>

                        {loading ? (
                            <ActivityIndicator size="large" color="#6366F1" />
                        ) : (
                            <FlatList
                                data={calendars}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#2A2A4A' }}
                                        onPress={() => {
                                            onSelect(item.title, item.source.name);
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '500' }}>{item.title}</Text>
                                        <Text style={{ color: '#888', fontSize: 12 }}>{item.source.name} ({item.source.type})</Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={<Text style={{ color: '#666', textAlign: 'center' }}>Takvim bulunamadı</Text>}
                            />
                        )}
                        <TouchableOpacity
                            style={{ marginTop: 15, padding: 15, backgroundColor: '#2A2A4A', borderRadius: 12, alignItems: 'center' }}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={{ color: '#FFF' }}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const FlashlightFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>Mod</Text>
        <View style={styles.buttonRow}>
            {['toggle', 'on', 'off'].map(mode => (
                <TouchableOpacity
                    key={mode}
                    style={[styles.unitButton, config.mode === mode && styles.unitButtonSelected]}
                    onPress={() => updateConfig('mode', mode)}
                >
                    <Text style={[styles.unitButtonText, config.mode === mode && styles.unitButtonTextSelected]}>
                        {mode === 'toggle' ? 'Değiştir' : mode === 'on' ? 'Aç' : 'Kapat'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);





// New Node Field Components

const CalendarReadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dönem</Text>
            <View style={styles.buttonRow}>
                {['next', 'today', 'week'].map(type => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.unitButton, config.type === type && styles.unitButtonSelected]}
                        onPress={() => updateConfig('type', type)}
                    >
                        <Text style={[styles.unitButtonText, config.type === type && styles.unitButtonTextSelected]}>
                            {type === 'next' ? 'Sonraki' : type === 'today' ? 'Bugün' : 'Bu Hafta'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Maksimum Etkinlik Sayısı</Text>
            <TextInput
                style={styles.input}
                value={String(config.maxEvents || 5)}
                onChangeText={(t) => updateConfig('maxEvents', parseInt(t) || 5)}
                keyboardType="numeric"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Takvim Adı (Opsiyonel)</Text>
            <CalendarPickerField
                value={config.calendarName}
                onSelect={(name, source) => {
                    updateConfig('calendarName', name);
                    updateConfig('calendarSource', source);
                }}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="events"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const CalendarCreateFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Başlık</Text>
            <ExpandableTextInput
                value={config.title}
                onChangeText={(t) => updateConfig('title', t)}
                placeholder="Toplantı başlığı"
                label="Başlık"
                minHeight={60}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notlar</Text>
            <ExpandableTextInput
                value={config.notes}
                onChangeText={(t) => updateConfig('notes', t)}
                placeholder="Detaylar..."
                label="Notlar"
                minHeight={100}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Konum</Text>
            <ExpandableTextInput
                value={config.location}
                onChangeText={(t) => updateConfig('location', t)}
                placeholder="Ofis / Online"
                label="Konum"
                minHeight={60}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Takvim Adı (Opsiyonel)</Text>
            <CalendarPickerField
                value={config.calendarName}
                onSelect={(name, source) => {
                    updateConfig('calendarName', name);
                    updateConfig('calendarSource', source);
                }}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Hesap/Kaynak (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.calendarSource}
                onChangeText={(t) => updateConfig('calendarSource', t)}
                placeholder="Örn: Google, iCloud, Exchange"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// CALENDAR UPDATE FIELDS
// ═══════════════════════════════════════════════════════════════

const CalendarUpdateFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Etkinlik ID</Text>
            <TextInput
                style={styles.input}
                value={config.eventId || ''}
                onChangeText={(t) => updateConfig('eventId', t)}
                placeholder="{{eventId}}"
                placeholderTextColor="#666"
            />
            <Text style={styles.fieldHint}>Değiştirilecek etkinliğin ID'si (Örn: takvim okuma sonucundan)</Text>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Yeni Başlık (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.title || ''}
                onChangeText={(t) => updateConfig('title', t)}
                placeholder="Toplantı (Revize)"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.rowField}>
            <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>Yeni Başlangıç (Ops)</Text>
                <TextInput
                    style={styles.input}
                    value={config.startDate || ''}
                    onChangeText={(t) => updateConfig('startDate', t)}
                    placeholder="2026-01-30 14:00"
                    placeholderTextColor="#666"
                />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.fieldLabel}>Yeni Bitiş (Ops)</Text>
                <TextInput
                    style={styles.input}
                    value={config.endDate || ''}
                    onChangeText={(t) => updateConfig('endDate', t)}
                    placeholder="2026-01-30 15:00"
                    placeholderTextColor="#666"
                />
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="updateStatus"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// CALENDAR DELETE FIELDS
// ═══════════════════════════════════════════════════════════════

const CalendarDeleteFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Etkinlik ID</Text>
            <TextInput
                style={styles.input}
                value={config.eventId || ''}
                onChangeText={(t) => updateConfig('eventId', t)}
                placeholder="{{eventId}}"
                placeholderTextColor="#666"
            />
            <Text style={styles.fieldHint}>Silinecek etkinliğin ID'si</Text>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="deleteStatus"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const LocationGetFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Hassasiyet</Text>
            <View style={styles.buttonRow}>
                {['low', 'medium', 'high'].map(acc => (
                    <TouchableOpacity
                        key={acc}
                        style={[styles.unitButton, config.accuracy === acc && styles.unitButtonSelected]}
                        onPress={() => updateConfig('accuracy', acc)}
                    >
                        <Text style={[styles.unitButtonText, config.accuracy === acc && styles.unitButtonTextSelected]}>
                            {acc === 'low' ? 'Düşük' : acc === 'medium' ? 'Orta' : 'Yüksek'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="location"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const BatteryCheckFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
        <TextInput
            style={styles.input}
            value={config.variableName}
            onChangeText={(t) => updateConfig('variableName', t)}
            placeholder="battery"
            placeholderTextColor="#666"
        />
    </View>
);

const NetworkCheckFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Kontrol Tipi</Text>
            <View style={styles.buttonRow}>
                {['any', 'wifi', 'cellular'].map(type => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.unitButton, config.checkType === type && styles.unitButtonSelected]}
                        onPress={() => updateConfig('checkType', type)}
                    >
                        <Text style={[styles.unitButtonText, config.checkType === type && styles.unitButtonTextSelected]}>
                            {type === 'any' ? 'Herhangi' : type === 'wifi' ? 'WiFi' : 'Hücresel'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="network"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const VolumeControlFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Ses Türü</Text>
            <View style={styles.buttonRow}>
                {['media', 'ring', 'alarm'].map(type => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.unitButton, config.type === type && styles.unitButtonSelected]}
                        onPress={() => updateConfig('type', type)}
                    >
                        <Text style={[styles.unitButtonText, config.type === type && styles.unitButtonTextSelected]}>
                            {type === 'media' ? 'Medya' : type === 'ring' ? 'Zil' : 'Alarm'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Seviye: {config.level}%</Text>
            <TextInput
                style={styles.input}
                value={String(config.level)}
                onChangeText={(t) => updateConfig('level', parseInt(t) || 0)}
                keyboardType="numeric"
                maxLength={3}
            />
        </View>
    </>
);

const SpeakTextFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Metin</Text>
            <ExpandableTextInput
                value={config.text}
                onChangeText={(t) => updateConfig('text', t)}
                placeholder="Okunacak metin..."
                label="Okunacak Metin"
                minHeight={100}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dil (Örn: tr-TR, en-US)</Text>
            <TextInput
                style={styles.input}
                value={config.language || 'tr-TR'}
                onChangeText={(t) => updateConfig('language', t)}
                placeholder="tr-TR"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const SmsSendFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Telefon Numarası</Text>
            <TextInput
                style={styles.input}
                value={config.phoneNumber || ''}
                onChangeText={(t) => updateConfig('phoneNumber', t)}
                placeholder="+90555..."
                placeholderTextColor="#666"
                keyboardType="phone-pad"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mesaj</Text>
            <ExpandableTextInput
                value={config.message || ''}
                onChangeText={(t) => updateConfig('message', t)}
                placeholder="Mesaj içeriği..."
                label="SMS Mesajı"
                minHeight={100}
            />
        </View>
    </>
);

const EmailSendFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Alıcı (E-posta)</Text>
            <TextInput
                style={styles.input}
                value={config.to || ''}
                onChangeText={(t) => updateConfig('to', t)}
                placeholder="ornek@email.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Konu</Text>
            <TextInput
                style={styles.input}
                value={config.subject || ''}
                onChangeText={(t) => updateConfig('subject', t)}
                placeholder="E-posta konusu"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>CC</Text>
            <TextInput
                style={styles.input}
                value={config.cc || ''}
                onChangeText={(t) => updateConfig('cc', t)}
                placeholder="cc@email.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>İçerik</Text>
            <ExpandableTextInput
                value={config.body || ''}
                onChangeText={(t) => updateConfig('body', t)}
                placeholder="E-posta içeriği..."
                label="E-posta İçeriği"
                minHeight={150}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya Ekleri (Değişken Adı)</Text>
            <TextInput
                style={styles.input}
                value={Array.isArray(config.attachments) ? config.attachments[0] : (config.attachments || '')}
                onChangeText={(t) => updateConfig('attachments', t ? [t] : undefined)}
                placeholder="audioFile"
                placeholderTextColor="#666"
            />
            <Text style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                Dosya URI'si içeren bir değişken adı girin (Örn: audioFile)
            </Text>
        </View>
        <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Otomatik Gönder (Arka Plan)</Text>
            <Switch
                value={config.isAuto || false}
                onValueChange={(v) => updateConfig('isAuto', v)}
                trackColor={{ false: '#2A2A4A', true: '#6366F1' }}
                thumbColor="#FFF"
            />
        </View>
    </>
);

const SlackSendFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <ApiDocLink
            title="Slack Webhook Kurulumu"
            url="https://api.slack.com/messaging/webhooks"
            brief="Slack'e mesaj göndermek için gelen webhook URL'si gereklidir."
        />
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Webhook URL</Text>
            <TextInput
                style={styles.input}
                value={config.webhookUrl || ''}
                onChangeText={(t) => updateConfig('webhookUrl', t)}
                placeholder="https://hooks.slack.com/services/..."
                placeholderTextColor="#666"
                keyboardType="url"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mesaj</Text>
            <ExpandableTextInput
                value={config.message || ''}
                onChangeText={(t) => updateConfig('message', t)}
                placeholder="Slack'e gönderilecek mesaj..."
                label="Mesaj İçeriği"
                minHeight={100}
            />
        </View>
    </>
);

const HttpRequestFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredApis = FREE_APIS.filter(api =>
        api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        api.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectApi = (api: any) => {
        updateConfig('url', api.url);
        updateConfig('method', api.method);
        if (api.headers) updateConfig('headers', api.headers);
        if (api.body) updateConfig('body', api.body);
        if (api.variableName) updateConfig('variableName', api.variableName);
        setModalVisible(false);
    };

    return (
        <>
            <View style={styles.field}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>URL</Text>
                    <TouchableOpacity
                        onPress={() => setModalVisible(true)}
                        style={{ padding: 5, backgroundColor: '#6366F1', borderRadius: 5, marginBottom: 5 }}
                    >
                        <Text style={{ color: 'white', fontSize: 12 }}>⚡ Hızlı API Seç</Text>
                    </TouchableOpacity>
                </View>
                <TextInput
                    style={styles.input}
                    value={config.url || ''}
                    onChangeText={(t) => updateConfig('url', t)}
                    placeholder="https://api.example.com"
                    placeholderTextColor="#666"
                    keyboardType="url"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sorgu Parametreleri (Her satırda key=value)</Text>
                <TextInput
                    style={[styles.input, { height: 80 }]}
                    value={
                        config.queryParameters
                            ? Object.entries(config.queryParameters).map(([k, v]) => `${k}=${v}`).join('\n')
                            : ''
                    }
                    onChangeText={(text) => {
                        const params: Record<string, string> = {};
                        text.split('\n').forEach(line => {
                            const parts = line.split('=');
                            if (parts.length >= 2) {
                                const key = parts[0].trim();
                                const value = parts.slice(1).join('=').trim();
                                if (key) params[key] = value;
                            }
                        });
                        updateConfig('queryParameters', params);
                    }}
                    placeholder="api_key=123&#10;limit=10"
                    placeholderTextColor="#666"
                    multiline
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Metot</Text>
                <View style={styles.buttonRow}>
                    {['GET', 'POST', 'PUT', 'DELETE'].map(method => (
                        <TouchableOpacity
                            key={method}
                            style={[styles.unitButton, config.method === method && styles.unitButtonSelected]}
                            onPress={() => updateConfig('method', method)}
                        >
                            <Text style={[styles.unitButtonText, config.method === method && styles.unitButtonTextSelected]}>
                                {method}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Headers (JSON)</Text>
                <ExpandableTextInput
                    value={config.headers || ''}
                    onChangeText={(t) => updateConfig('headers', t)}
                    placeholder='{"Authorization": "..."}'
                    label="Headers (JSON)"
                    hint={'JSON formatında başlıklar: {"Key": "Value"}'}
                    minHeight={60}
                />
            </View>
            <View style={styles.rowField}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>User-Agent (Opsiyonel)</Text>
                    <TextInput
                        style={styles.input}
                        value={config.userAgent || ''}
                        onChangeText={(t) => updateConfig('userAgent', t)}
                        placeholder="Varsayılan (Android)"
                        placeholderTextColor="#666"
                    />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Timeout (ms)</Text>
                    <TextInput
                        style={styles.input}
                        value={String(config.timeout || 30000)}
                        onChangeText={(t) => updateConfig('timeout', parseInt(t) || 30000)}
                        keyboardType="numeric"
                    />
                </View>
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Kimlik Doğrulama</Text>
                <View style={styles.buttonRow}>
                    {['none', 'basic', 'bearer'].map(type => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.unitButton, config.authentication?.type === type && styles.unitButtonSelected]}
                            onPress={() => updateConfig('authentication', { ...config.authentication, type })}
                        >
                            <Text style={[styles.unitButtonText, config.authentication?.type === type && styles.unitButtonTextSelected]}>
                                {type === 'none' ? 'Yok' : type === 'basic' ? 'Basic' : 'Bearer'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            {config.authentication?.type === 'basic' && (
                <View style={styles.rowField}>
                    <View style={{ flex: 1 }}>
                        <TextInput
                            style={styles.input}
                            value={config.authentication?.username || ''}
                            onChangeText={(t) => updateConfig('authentication', { ...config.authentication, username: t })}
                            placeholder="Kullanıcı Adı"
                            placeholderTextColor="#666"
                        />
                    </View>
                    <View style={{ width: 10 }} />
                    <View style={{ flex: 1 }}>
                        <TextInput
                            style={styles.input}
                            value={config.authentication?.password || ''}
                            onChangeText={(t) => updateConfig('authentication', { ...config.authentication, password: t })}
                            placeholder="Şifre"
                            placeholderTextColor="#666"
                            secureTextEntry
                        />
                    </View>
                </View>
            )}
            {config.authentication?.type === 'bearer' && (
                <View style={styles.field}>
                    <TextInput
                        style={styles.input}
                        value={config.authentication?.token || ''}
                        onChangeText={(t) => updateConfig('authentication', { ...config.authentication, token: t })}
                        placeholder="Token"
                        placeholderTextColor="#666"
                    />
                </View>
            )}
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Body (JSON)</Text>
                <ExpandableTextInput
                    value={config.body || ''}
                    onChangeText={(t) => updateConfig('body', t)}
                    placeholder='{"key": "value"}'
                    label="Body (JSON)"
                    hint={'İstek gövdesi (JSON formatında)'}
                    minHeight={120}
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
                <TextInput
                    style={styles.input}
                    value={config.variableName || ''}
                    onChangeText={(t) => updateConfig('variableName', t)}
                    placeholder="response"
                    placeholderTextColor="#666"
                />
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#1E1E2E', borderRadius: 16, maxHeight: '80%', padding: 20 }}>
                        <Text style={{ color: 'white', fontSize: 20, marginBottom: 20, fontWeight: 'bold' }}>Hazır API Listesi</Text>

                        <TextInput
                            style={[styles.input, { marginBottom: 20 }]}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            placeholder="API ara..."
                            placeholderTextColor="#666"
                        />

                        <FlatList
                            data={filteredApis}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{
                                        padding: 15,
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#2A2A4A',
                                    }}
                                    onPress={() => selectApi(item)}
                                >
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{item.name}</Text>
                                    <Text style={{ color: '#AAA', fontSize: 14, marginTop: 4 }}>{item.description}</Text>
                                    <Text style={{ color: '#6366F1', fontSize: 12, marginTop: 4 }}>{item.category}</Text>
                                </TouchableOpacity>
                            )}
                        />

                        <TouchableOpacity
                            style={{ marginTop: 15, padding: 15, backgroundColor: '#2A2A4A', borderRadius: 12, alignItems: 'center' }}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={{ color: '#FFF' }}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const FileWriteFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        {/* Kaydetme Yeri Seçimi */}
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Kaydetme Yeri</Text>
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.unitButton, (!config.saveLocation || config.saveLocation === 'local') && styles.unitButtonSelected]}
                    onPress={() => updateConfig('saveLocation', 'local')}
                >
                    <Text style={[styles.unitButtonText, (!config.saveLocation || config.saveLocation === 'local') && styles.unitButtonTextSelected]}>
                        📁 Yerel Depolama
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.unitButton, config.saveLocation === 'google_drive' && styles.unitButtonSelected]}
                    onPress={() => updateConfig('saveLocation', 'google_drive')}
                >
                    <Text style={[styles.unitButtonText, config.saveLocation === 'google_drive' && styles.unitButtonTextSelected]}>
                        ☁️ Google Drive
                    </Text>
                </TouchableOpacity>
            </View>
        </View>

        {/* Google Drive Bilgi */}
        {config.saveLocation === 'google_drive' && (
            <View style={{
                backgroundColor: '#1E3A5F',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                borderLeftWidth: 3,
                borderLeftColor: '#4285F4'
            }}>
                <Text style={{ color: '#FFF', fontSize: 13 }}>
                    📌 Dosya Google Drive'da <Text style={{ fontWeight: 'bold' }}>BreviAI</Text> klasörüne kaydedilecek.
                </Text>
                <Text style={{ color: '#AAA', fontSize: 12, marginTop: 4 }}>
                    İlk kullanımda Google hesabınızla giriş yapmanız gerekebilir.
                </Text>
            </View>
        )}

        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya Adı</Text>
            <TextInput
                style={styles.input}
                value={config.filename}
                onChangeText={(t) => updateConfig('filename', t)}
                placeholder="not.txt"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>İçerik</Text>
            <ExpandableTextInput
                value={config.content}
                onChangeText={(t) => updateConfig('content', t)}
                placeholder="Dosya içeriği..."
                label="Dosya İçeriği"
                minHeight={150}
            />
        </View>
        <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Ekle (Append)</Text>
            <Switch
                value={config.append}
                onValueChange={(v) => updateConfig('append', v)}
                trackColor={{ false: '#2A2A4A', true: '#6366F1' }}
                thumbColor="#FFF"
            />
        </View>
    </>
);

const ShowImageFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Resim URL veya Değişken</Text>
            <TextInput
                style={styles.input}
                value={config.imageUrl || ''}
                onChangeText={(t) => updateConfig('imageUrl', t)}
                placeholder="https://... veya variableName"
                placeholderTextColor="#666"
            />
            <Text style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                Bir resim URL'si veya resim içeren bir değişken adı girin.
            </Text>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Başlık</Text>
            <TextInput
                style={styles.input}
                value={config.title || ''}
                onChangeText={(t) => updateConfig('title', t)}
                placeholder="Görüntüleyici Başlığı"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const ClipboardReaderFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Değişken Adı</Text>
            <Text style={styles.fieldHint}>Panodan okunan metin bu değişkene atanır.</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="clipboardContent"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const FileReadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya Adı</Text>
            <TextInput
                style={styles.input}
                value={config.filename}
                onChangeText={(t) => updateConfig('filename', t)}
                placeholder="not.txt"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="fileContent"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const PdfCreateFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>İçerik (Değişken Adı)</Text>
            <ExpandableTextInput
                value={config.items}
                onChangeText={(t) => updateConfig('items', t)}
                placeholder="resimListesi"
                label="İçerik"
                hint="Metin, HTML veya Resim Listesi içeren değişken"
                minHeight={80}
            />
            <Text style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                Metin, HTML veya Resim Listesi içeren değişken
            </Text>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya Adı (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.filename}
                onChangeText={(t) => updateConfig('filename', t)}
                placeholder="belge"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni (PDF Yolu)</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="pdfUri"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const AlarmSetFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.rowField}>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Saat</Text>
                <TextInput
                    style={styles.input}
                    value={String(config.hour || '0')}
                    onChangeText={(t) => updateConfig('hour', Math.min(23, Math.max(0, parseInt(t) || 0)))}
                    keyboardType="numeric"
                />
            </View>
            <View style={{ width: 16 }} />
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Dakika</Text>
                <TextInput
                    style={styles.input}
                    value={String(config.minute || '0')}
                    onChangeText={(t) => updateConfig('minute', Math.min(59, Math.max(0, parseInt(t) || 0)))}
                    keyboardType="numeric"
                />
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Alarm Mesajı</Text>
            <ExpandableTextInput
                value={config.message}
                onChangeText={(t) => updateConfig('message', t)}
                placeholder="Uyanma vakti!"
                label="Alarm Mesajı"
                minHeight={60}
            />
        </View>
    </>
);

// New Node Implementations

const TextInputFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Soru Metni (Prompt)</Text>
            <ExpandableTextInput
                value={config.prompt}
                onChangeText={(t) => updateConfig('prompt', t)}
                placeholder="Örn: Adınız nedir?"
                label="Soru Metni"
                minHeight={80}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Varsayılan Değer</Text>
            <ExpandableTextInput
                value={config.defaultValue}
                onChangeText={(t) => updateConfig('defaultValue', t)}
                placeholder="Opsiyonel"
                label="Varsayılan Değer"
                minHeight={60}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Yer Tutucu (Placeholder)</Text>
            <ExpandableTextInput
                value={config.placeholder}
                onChangeText={(t) => updateConfig('placeholder', t)}
                placeholder="Metin girin..."
                label="Yer Tutucu"
                minHeight={60}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="userInput"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Ekleri Kaydet (Değişken Adı - Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.attachmentsVariableName || ''}
                onChangeText={(t) => updateConfig('attachmentsVariableName', t)}
                placeholder="attachedFiles"
                placeholderTextColor="#666"
            />
        </View>
    </>
);



const ShowMenuFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Menü Başlığı</Text>
            <TextInput
                style={styles.input}
                value={config.title}
                onChangeText={(t) => updateConfig('title', t)}
                placeholder="Bir seçenek belirleyin"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Seçenekler (Satır satır girin)</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={Array.isArray(config.options) ? config.options.join('\n') : ''}
                onChangeText={(t) => updateConfig('options', t.split('\n'))}
                placeholder="Seçenek 1&#10;Seçenek 2&#10;Seçenek 3"
                placeholderTextColor="#666"
                multiline
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="selectedOption"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const ScreenWakeFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Ekranı Açık Tut</Text>
            <Switch
                value={config.keepAwake}
                onValueChange={(v) => updateConfig('keepAwake', v)}
                trackColor={{ false: '#2A2A4A', true: '#6366F1' }}
                thumbColor="#FFF"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Süre (ms, opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={String(config.duration || '')}
                onChangeText={(t) => updateConfig('duration', parseInt(t) || undefined)}
                keyboardType="numeric"
                placeholder="Süresiz"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const GlobalActionFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>Aksiyon</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.buttonRow}>
                {['home', 'back', 'recents', 'notifications', 'quick_settings', 'lock_screen', 'screenshot'].map(act => (
                    <TouchableOpacity
                        key={act}
                        style={[styles.unitButton, config.action === act && styles.unitButtonSelected]}
                        onPress={() => updateConfig('action', act)}
                    >
                        <Text style={[styles.unitButtonText, config.action === act && styles.unitButtonTextSelected]}>
                            {act}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    </View>
);

const MediaControlFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>Medya Komutu</Text>
        <View style={styles.buttonRow}>
            {['play_pause', 'next', 'previous', 'volume_up', 'volume_down'].map(act => (
                <TouchableOpacity
                    key={act}
                    style={[styles.unitButton, config.action === act && styles.unitButtonSelected]}
                    onPress={() => updateConfig('action', act)}
                >
                    <Text style={[styles.unitButtonText, config.action === act && styles.unitButtonTextSelected]}>
                        {act === 'play_pause' ? 'Oynat/Durdur' : act === 'next' ? 'İleri' : act === 'previous' ? 'Geri' : act === 'volume_up' ? 'Ses +' : 'Ses -'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

const OpenUrlFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>URL</Text>
        <ExpandableTextInput
            value={config.url}
            onChangeText={(t) => updateConfig('url', t)}
            placeholder="https://google.com"
            label="URL"
            minHeight={60}
        />
        <View style={{ height: 16 }} />
        <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Uygulama İçinde Aç</Text>
            <Switch
                value={!config.openExternal}
                onValueChange={(v) => updateConfig('openExternal', !v)}
                trackColor={{ false: '#2A2A4A', true: '#6366F1' }}
                thumbColor="#FFF"
            />
        </View>
        <Text style={{ color: '#666', fontSize: 11, marginTop: -10 }}>
            Kapalıysa varsayılan tarayıcıda veya uygun uygulamada açılır.
        </Text>
    </View>
);

const SpeechToTextFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dil Kodu (Örn: tr-TR)</Text>
            <TextInput
                style={styles.input}
                value={config.language || 'tr-TR'}
                onChangeText={(t) => updateConfig('language', t)}
                placeholder="tr-TR"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="transcription"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Sürekli Dinleme (Uzun)</Text>
            <Switch
                value={config.continuous || false}
                onValueChange={(v) => updateConfig('continuous', v)}
                trackColor={{ false: '#2A2A4A', true: '#6366F1' }}
                thumbColor="#FFF"
            />
        </View>
    </>
);

const AgentAIFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Prompt ({'{'} {'{'} degisken {'}'} {'}'} kullanılabilir)</Text>
            <ExpandableTextInput
                value={config.prompt}
                onChangeText={(t) => updateConfig('prompt', t)}
                placeholder="Örn: Bu metni özetle: {{metin}}"
                label="AI Prompt"
                hint="{{değişken}} kullanarak dinamik prompt oluşturabilirsiniz"
                minHeight={150}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Provider</Text>
            <View style={styles.buttonRow}>
                {['gemini', 'openai', 'claude'].map(p => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.unitButton, config.provider === p && styles.unitButtonSelected]}
                        onPress={() => updateConfig('provider', p)}
                    >
                        <Text style={[styles.unitButtonText, config.provider === p && styles.unitButtonTextSelected]}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>API Key</Text>
            <TextInput
                style={styles.input}
                value={config.apiKey}
                onChangeText={(t) => updateConfig('apiKey', t)}
                placeholder="Ayarlardan çekmek için boş bırakın"
                placeholderTextColor="#666"
                secureTextEntry
            />
            <View style={styles.apiKeyLinks}>
                <Text style={styles.apiKeyHint}>🔑 Key Al: </Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}>
                    <Text style={styles.apiKeyLink}>Gemini</Text>
                </TouchableOpacity>
                <Text style={styles.apiKeyHint}> | </Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}>
                    <Text style={styles.apiKeyLink}>OpenAI</Text>
                </TouchableOpacity>
                <Text style={styles.apiKeyHint}> | </Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://console.anthropic.com/')}>
                    <Text style={styles.apiKeyLink}>Claude</Text>
                </TouchableOpacity>
            </View>
        </View>
        <View style={styles.rowField}>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Model (Opsiyonel)</Text>
                <TextInput
                    style={styles.input}
                    value={config.model}
                    onChangeText={(t) => updateConfig('model', t)}
                    placeholder="Varsayılan"
                    placeholderTextColor="#666"
                />
            </View>
            <View style={{ width: 16 }} />
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Sıcaklık (0-1)</Text>
                <TextInput
                    style={styles.input}
                    value={String(config.temperature ?? 0.7)}
                    onChangeText={(t) => updateConfig('temperature', parseFloat(t))}
                    keyboardType="numeric"
                />
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="aiResponse"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>📎 Ek Resimler (Değişken Adı)</Text>
            <TextInput
                style={styles.input}
                value={config.attachments || ''}
                onChangeText={(t) => updateConfig('attachments', t)}
                placeholder="resimDegiskeni"
                placeholderTextColor="#666"
            />
            <Text style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                Resim içeren değişken adı. AI resmi görerek analiz eder.
            </Text>
        </View>
    </>
);

const AudioRecordFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Süre (Saniye)</Text>
            <TextInput
                style={styles.input}
                value={String(config.duration || 5)}
                onChangeText={(t) => updateConfig('duration', parseInt(t) || 5)}
                keyboardType="numeric"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="audioUri"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// SHOW_TEXT FIELDS
// ═══════════════════════════════════════════════════════════════

const ShowTextFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Başlık (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.title || ''}
                onChangeText={(t) => updateConfig('title', t)}
                placeholder="Sonuç"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>İçerik</Text>
            <Text style={styles.fieldHint}>{'{{değişken}} kullanabilirsiniz'}</Text>
            <ExpandableTextInput
                value={config.content || ''}
                onChangeText={(t) => updateConfig('content', t)}
                placeholder="{{previous_output}} veya metin yazın"
                label="Gösterilecek İçerik"
                hint="{{değişken}} kullanabilirsiniz"
                minHeight={120}
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// FILE_PICK FIELDS
// ═══════════════════════════════════════════════════════════════

const fileTypeOptions = [
    { key: 'all', label: 'Tümü' },
    { key: 'image', label: 'Resim' },
    { key: 'pdf', label: 'PDF' },
    { key: 'document', label: 'Doküman' },
];

const FilePickFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => {
    const allowedTypes = config.allowedTypes || ['all'];

    const toggleType = (type: string) => {
        if (type === 'all') {
            updateConfig('allowedTypes', ['all']);
        } else {
            let newTypes = allowedTypes.filter((t: string) => t !== 'all');
            if (newTypes.includes(type)) {
                newTypes = newTypes.filter((t: string) => t !== type);
            } else {
                newTypes.push(type);
            }
            if (newTypes.length === 0) newTypes = ['all'];
            updateConfig('allowedTypes', newTypes);
        }
    };

    return (
        <>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Dosya Türleri</Text>
                <View style={styles.optionsRow}>
                    {fileTypeOptions.map(opt => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[
                                styles.optionButton,
                                allowedTypes.includes(opt.key) && styles.optionButtonSelected
                            ]}
                            onPress={() => toggleType(opt.key)}
                        >
                            <Text style={[
                                styles.optionText,
                                allowedTypes.includes(opt.key) && styles.optionTextSelected
                            ]}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Birden Fazla Seç</Text>
                <Switch
                    value={config.multiple || false}
                    onValueChange={(v) => updateConfig('multiple', v)}
                    trackColor={{ false: '#3A3A5A', true: '#8B5CF6' }}
                    thumbColor={config.multiple ? '#FFF' : '#999'}
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
                <TextInput
                    style={styles.input}
                    value={config.variableName || ''}
                    onChangeText={(t) => updateConfig('variableName', t)}
                    placeholder="selectedFile"
                    placeholderTextColor="#666"
                />
            </View>
        </>
    );
};

// ═══════════════════════════════════════════════════════════════
// GOOGLE SHEETS WRITE FIELDS
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// NAVIGATE TO FIELDS
// ═══════════════════════════════════════════════════════════════

const NavigateToFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Hedef (Adres veya Koordinat)</Text>
            <TextInput
                style={styles.input}
                value={config.destination || ''}
                onChangeText={(t) => updateConfig('destination', t)}
                placeholder="Taksim, İstanbul veya 41.0082,28.9784"
                placeholderTextColor="#666"
            />
            <Text style={styles.fieldHint}>Variable kullanabilirsiniz (örn: {'{{location}}'})</Text>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Uygulama Tercihi</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['google', 'apple', 'yandex', 'waze'].map(app => (
                    <TouchableOpacity
                        key={app}
                        style={[
                            styles.unitButton,
                            config.app === app && styles.unitButtonSelected,
                            { minWidth: 80 }
                        ]}
                        onPress={() => updateConfig('app', app)}
                    >
                        <Text style={[styles.unitButtonText, config.app === app && styles.unitButtonTextSelected]}>
                            {app.charAt(0).toUpperCase() + app.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Seyahat Modu</Text>
            <View style={styles.buttonRow}>
                {[
                    { key: 'driving', label: 'Araba' },
                    { key: 'walking', label: 'Yürüyerek' },
                    { key: 'transit', label: 'Toplu Taşıma' },
                ].map(mode => (
                    <TouchableOpacity
                        key={mode.key}
                        style={[styles.unitButton, config.mode === mode.key && styles.unitButtonSelected]}
                        onPress={() => updateConfig('mode', mode.key)}
                    >
                        <Text style={[styles.unitButtonText, config.mode === mode.key && styles.unitButtonTextSelected]}>
                            {mode.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// SETTINGS OPEN FIELDS
// ═══════════════════════════════════════════════════════════════

const SettingsOpenFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Açılacak Ayar</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                    { key: 'settings', label: 'Genel Ayarlar' },
                    { key: 'wifi', label: 'WiFi (Android)' },
                    { key: 'bluetooth', label: 'Bluetooth (Android)' },
                    { key: 'location', label: 'Konum (Android)' },
                    { key: 'airplane_mode', label: 'Uçak Modu (Android)' },
                ].map(item => (
                    <TouchableOpacity
                        key={item.key}
                        style={[
                            styles.unitButton,
                            config.setting === item.key && styles.unitButtonSelected,
                            { marginBottom: 8 }
                        ]}
                        onPress={() => updateConfig('setting', item.key)}
                    >
                        <Text style={[styles.unitButtonText, config.setting === item.key && styles.unitButtonTextSelected]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.fieldHint}>iOS'ta sadece uygulama ayarları veya ana ayarlar açılabilir.</Text>
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// DATABASE READ FIELDS
// ═══════════════════════════════════════════════════════════════

// Database fields moved to end of file

// ═══════════════════════════════════════════════════════════════
// DATABASE WRITE FIELDS
// ═══════════════════════════════════════════════════════════════

// Database write fields moved to end of file

const ContactsReadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Arama (İsim)</Text>
            <TextInput
                style={styles.input}
                value={config.query || ''}
                onChangeText={(t) => updateConfig('query', t)}
                placeholder="Ahmet..."
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Tümünü Getir</Text>
            <Switch
                value={config.fetchAll || false}
                onValueChange={(v) => updateConfig('fetchAll', v)}
                trackColor={{ false: '#3A3A5A', true: '#8B5CF6' }}
                thumbColor={config.fetchAll ? '#FFF' : '#999'}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="contacts"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// CONTACTS WRITE FIELDS
// ═══════════════════════════════════════════════════════════════

const ContactsWriteFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>İsim</Text>
            <TextInput
                style={styles.input}
                value={config.firstName || ''}
                onChangeText={(t) => updateConfig('firstName', t)}
                placeholder="Ali"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Soyisim</Text>
            <TextInput
                style={styles.input}
                value={config.lastName || ''}
                onChangeText={(t) => updateConfig('lastName', t)}
                placeholder="Veli"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Telefon</Text>
            <TextInput
                style={styles.input}
                value={config.phoneNumber || ''}
                onChangeText={(t) => updateConfig('phoneNumber', t)}
                placeholder="05..."
                placeholderTextColor="#666"
                keyboardType="phone-pad"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>E-posta (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.email || ''}
                onChangeText={(t) => updateConfig('email', t)}
                placeholder="ali@..."
                placeholderTextColor="#666"
                keyboardType="email-address"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Şirket (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.company || ''}
                onChangeText={(t) => updateConfig('company', t)}
                placeholder="Şirket A.Ş."
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni (ID)</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="newContactId"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// GMAIL READ FIELDS
// ═══════════════════════════════════════════════════════════════

const GmailReadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <ApiDocLink
            title="Gmail Arama Operatörleri"
            url="https://support.google.com/mail/answer/7190"
            brief="E-postaları filtrelemek için arama operatörlerini kullanabilirsiniz."
        />

        {/* Client ID Configuration */}
        <View style={{ marginBottom: 16 }}>
            <Text style={styles.fieldLabel}>Client ID (BYOK)</Text>
            <TextInput
                style={styles.input}
                value={config.clientId || ''}
                onChangeText={(t) => updateConfig('clientId', t)}
                placeholder="...apps.googleusercontent.com"
                placeholderTextColor="#666"
            />
            <TouchableOpacity
                style={{ marginTop: 8 }}
                onPress={() => Linking.openURL('https://console.cloud.google.com/apis/credentials')}
            >
                <Text style={{ color: '#8B5CF6', fontSize: 12 }}>
                    ℹ️ Client ID nasıl alınır? (Google Cloud Console)
                </Text>
            </TouchableOpacity>
        </View>

        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Maksimum Sayı</Text>
            <TextInput
                style={styles.input}
                value={String(config.maxResults || 5)}
                onChangeText={(t) => updateConfig('maxResults', parseInt(t) || 5)}
                keyboardType="numeric"
                maxLength={2}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Arama Sorgusu (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.query || ''}
                onChangeText={(t) => updateConfig('query', t)}
                placeholder="is:unread label:work"
                placeholderTextColor="#666"
            />
            <Text style={styles.fieldHint}>Örn: "is:unread" (okunmamış) veya "from:patron@sirket.com"</Text>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="emails"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// GMAIL SEND FIELDS
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// OUTLOOK SEND FIELDS
// ═══════════════════════════════════════════════════════════════

const OutlookSendFields: React.FC<ConfigFieldsProps & { fileVariables?: string[] }> = ({ config, updateConfig, fileVariables }) => {
    // Auto-fill attachments from file variables if empty
    useEffect(() => {
        if (!config.attachments && fileVariables && fileVariables.length > 0) {
            updateConfig('attachments', fileVariables[fileVariables.length - 1]);
        }
    }, [fileVariables]);

    return (
        <>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Client ID (Azure - BYOK)</Text>
                <TextInput
                    style={styles.input}
                    value={config.clientId || ''}
                    onChangeText={(t) => updateConfig('clientId', t)}
                    placeholder="Azure Portal'dan alınan ID"
                    placeholderTextColor="#666"
                />
                <View style={styles.apiKeyLinks}>
                    <Text style={styles.apiKeyHint}>ID almak için: </Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade')}>
                        <Text style={styles.apiKeyLink}>Azure Portal &gt; App Registrations</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tenant ID (Opsiyonel)</Text>
                <TextInput
                    style={styles.input}
                    value={config.tenantId}
                    onChangeText={(t) => updateConfig('tenantId', t)}
                    placeholder="common"
                    placeholderTextColor="#666"
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Kime (To)</Text>
                <TextInput
                    style={styles.input}
                    value={config.to || ''}
                    onChangeText={(t) => updateConfig('to', t)}
                    placeholder="ornek@outlook.com"
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Konu</Text>
                <TextInput
                    style={styles.input}
                    value={config.subject || ''}
                    onChangeText={(t) => updateConfig('subject', t)}
                    placeholder="E-posta konusu"
                    placeholderTextColor="#666"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>İçerik</Text>
                <ExpandableTextInput
                    value={config.body || ''}
                    onChangeText={(t) => updateConfig('body', t)}
                    placeholder="E-posta içeriği..."
                    label="E-posta İçeriği"
                    minHeight={150}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Dosya Ekleri (Değişken Adı)</Text>
                <TextInput
                    style={styles.input}
                    value={config.attachments || ''}
                    onChangeText={(t) => updateConfig('attachments', t)}
                    placeholder="selectedFile"
                    placeholderTextColor="#666"
                />
                <Text style={styles.fieldHint}>Dosya içeren değişken adı (örn: selectedFile)</Text>
            </View>

            <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>HTML İçerik</Text>
                <Switch
                    value={config.isHtml || false}
                    onValueChange={(v) => updateConfig('isHtml', v)}
                    trackColor={{ false: '#3A3A5A', true: '#8B5CF6' }}
                    thumbColor={config.isHtml ? '#FFF' : '#999'}
                />
            </View>
        </>
    );
};

// ═══════════════════════════════════════════════════════════════
// OUTLOOK READ FIELDS
// ═══════════════════════════════════════════════════════════════

const OutlookReadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Client ID (Azure - BYOK)</Text>
            <TextInput
                style={styles.input}
                value={config.clientId || ''}
                onChangeText={(t) => updateConfig('clientId', t)}
                placeholder="Azure Portal'dan alınan ID"
                placeholderTextColor="#666"
            />
            <View style={styles.apiKeyLinks}>
                <Text style={styles.apiKeyHint}>ID almak için: </Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade')}>
                    <Text style={styles.apiKeyLink}>Azure Portal &gt; App Registrations</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tenant ID (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.tenantId}
                onChangeText={(t) => updateConfig('tenantId', t)}
                placeholder="common"
                placeholderTextColor="#666"
            />
        </View>

        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Klasör</Text>
            <TextInput
                style={styles.input}
                value={config.folderName || 'Inbox'}
                onChangeText={(t) => updateConfig('folderName', t)}
                placeholder="Inbox"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Maksimum Sayı</Text>
            <TextInput
                style={styles.input}
                value={String(config.maxResults || 10)}
                onChangeText={(t) => updateConfig('maxResults', parseInt(t) || 10)}
                keyboardType="numeric"
            />
        </View>
        <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Sadece Okunmamışlar</Text>
            <Switch
                value={config.unreadOnly !== false}
                onValueChange={(v) => updateConfig('unreadOnly', v)}
                trackColor={{ false: '#3A3A5A', true: '#8B5CF6' }}
                thumbColor={config.unreadOnly !== false ? '#FFF' : '#999'}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="emails"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// EXCEL READ FIELDS
// ═══════════════════════════════════════════════════════════════

const ExcelReadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya Adı (Önerilen)</Text>
            <Text style={styles.fieldHint}>OneDrive kök dizinindeki dosya adı (örn: Butce.xlsx)</Text>
            <TextInput
                style={styles.input}
                value={config.fileName || ''}
                onChangeText={(t) => updateConfig('fileName', t)}
                placeholder="Dosya.xlsx"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya ID (Alternatif)</Text>
            <TextInput
                style={styles.input}
                value={config.fileId || ''}
                onChangeText={(t) => updateConfig('fileId', t)}
                placeholder="OneDrive Dosya ID'si"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Aralık (Range)</Text>
            <TextInput
                style={styles.input}
                value={config.range || 'Sheet1!A1:Z10'}
                onChangeText={(t) => updateConfig('range', t)}
                placeholder="Sheet1!A1:Z10"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="excelData"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// EXCEL WRITE FIELDS
// ═══════════════════════════════════════════════════════════════

const ExcelWriteFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya Adı (Önerilen)</Text>
            <Text style={styles.fieldHint}>OneDrive kök dizinindeki dosya adı (örn: Butce.xlsx)</Text>
            <TextInput
                style={styles.input}
                value={config.fileName || ''}
                onChangeText={(t) => updateConfig('fileName', t)}
                placeholder="Dosya.xlsx"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya ID (Alternatif)</Text>
            <TextInput
                style={styles.input}
                value={config.fileId || ''}
                onChangeText={(t) => updateConfig('fileId', t)}
                placeholder="OneDrive Dosya ID'si"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Aralık (Range)</Text>
            <TextInput
                style={styles.input}
                value={config.range || 'Sheet1!A1'}
                onChangeText={(t) => updateConfig('range', t)}
                placeholder="Sheet1!A1"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Değerler (JSON Array)</Text>
            <TextInput
                style={styles.input}
                value={config.values || '[[]]'}
                onChangeText={(t) => updateConfig('values', t)}
                placeholder='[["Isim", "Yas"], ["Ahmet", 30]]'
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="writeResult"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// ONEDRIVE UPLOAD FIELDS
// ═══════════════════════════════════════════════════════════════

const OneDriveUploadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya Yolu (Değişken)</Text>
            <Text style={styles.fieldHint}>Önceki adımdan gelen dosya değişkeni (örn: selectedFile)</Text>
            <TextInput
                style={styles.input}
                value={config.filePath || ''}
                onChangeText={(t) => updateConfig('filePath', t)}
                placeholder="selectedFile"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Hedef Dosya Adı (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.fileName || ''}
                onChangeText={(t) => updateConfig('fileName', t)}
                placeholder="Orijinal adı kullan"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Klasör ID (Opsiyonel)</Text>
            <Text style={styles.fieldHint}>Boş bırakılırsa kök dizine yükler</Text>
            <TextInput
                style={styles.input}
                value={config.folderId || ''}
                onChangeText={(t) => updateConfig('folderId', t)}
                placeholder="Kök dizin"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="uploadResult"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// ONEDRIVE DOWNLOAD FIELDS
// ═══════════════════════════════════════════════════════════════

const OneDriveDownloadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya Adı</Text>
            <Text style={styles.fieldHint}>OneDrive'daki dosya adı (örn: rapor.pdf)</Text>
            <TextInput
                style={styles.input}
                value={config.fileName || ''}
                onChangeText={(t) => updateConfig('fileName', t)}
                placeholder="dosya.pdf"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya ID (Alternatif)</Text>
            <TextInput
                style={styles.input}
                value={config.fileId || ''}
                onChangeText={(t) => updateConfig('fileId', t)}
                placeholder="OneDrive Dosya ID'si"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="downloadedFile"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// ONEDRIVE LIST FIELDS
// ═══════════════════════════════════════════════════════════════

const OneDriveListFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Klasör ID (Opsiyonel)</Text>
            <Text style={styles.fieldHint}>Boş bırakılırsa kök dizini listeler</Text>
            <TextInput
                style={styles.input}
                value={config.folderId || ''}
                onChangeText={(t) => updateConfig('folderId', t)}
                placeholder="Kök dizin"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Maksimum Sonuç</Text>
            <TextInput
                style={styles.input}
                value={String(config.maxResults || 50)}
                onChangeText={(t) => updateConfig('maxResults', parseInt(t) || 50)}
                placeholder="50"
                placeholderTextColor="#666"
                keyboardType="numeric"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="fileList"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// TELEGRAM SEND FIELDS
// ═══════════════════════════════════════════════════════════════

const TelegramSendFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => {
    const operation = config.operation || 'sendMessage';

    return (
        <>
            <ApiDocLink
                title="Telegram Botfather"
                url="https://t.me/BotFather"
                brief="Bot token almak için @BotFather ile konuşun."
            />
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Bot Token</Text>
                <TextInput
                    style={styles.input}
                    value={config.botToken || ''}
                    onChangeText={(t) => updateConfig('botToken', t)}
                    placeholder="123456:ABC-DEF1234..."
                    placeholderTextColor="#666"
                    secureTextEntry
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Chat ID</Text>
                <TextInput
                    style={styles.input}
                    value={config.chatId || ''}
                    onChangeText={(t) => updateConfig('chatId', t)}
                    placeholder="12345678"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                />
                <Text style={styles.fieldHint}>Kullanıcı ID'nizi öğrenmek için @userinfobot kullanabilirsiniz.</Text>
            </View>

            {/* Operation Selection */}
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>İşlem Tipi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.buttonRow}>
                        {[
                            { id: 'sendMessage', label: 'Mesaj' },
                            { id: 'sendPhoto', label: 'Fotoğraf' },
                            { id: 'sendDocument', label: 'Dosya' },
                            { id: 'sendLocation', label: 'Konum' }
                        ].map(op => (
                            <TouchableOpacity
                                key={op.id}
                                style={[styles.unitButton, operation === op.id && styles.unitButtonSelected]}
                                onPress={() => updateConfig('operation', op.id)}
                            >
                                <Text style={[styles.unitButtonText, operation === op.id && styles.unitButtonTextSelected]}>
                                    {op.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* File Path for Photo/Document */}
            {(operation === 'sendPhoto' || operation === 'sendDocument') && (
                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Dosya Yolu / Değişken</Text>
                    <TextInput
                        style={styles.input}
                        value={config.filePath || ''}
                        onChangeText={(v) => updateConfig('filePath', v)}
                        placeholder="{{image_path}} veya /storage/..."
                        placeholderTextColor="#666"
                    />
                    <Text style={styles.fieldHint}>Önceki işlemden gelen dosya değişkenini kullanabilirsiniz.</Text>
                </View>
            )}

            {/* Location Fields */}
            {operation === 'sendLocation' && (
                <View style={[styles.field, { flexDirection: 'row', gap: 10 }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Enlem (Lat)</Text>
                        <TextInput
                            style={styles.input}
                            value={String(config.latitude || '')}
                            onChangeText={(v) => updateConfig('latitude', v)}
                            placeholder="41.0082"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Boylam (Long)</Text>
                        <TextInput
                            style={styles.input}
                            value={String(config.longitude || '')}
                            onChangeText={(v) => updateConfig('longitude', v)}
                            placeholder="28.9784"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                        />
                    </View>
                </View>
            )}

            {/* Message/Caption */}
            {operation !== 'sendLocation' && (
                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>
                        {operation === 'sendMessage' ? 'Mesaj' : 'Başlık (Caption)'}
                    </Text>
                    <ExpandableTextInput
                        value={config.message || ''}
                        onChangeText={(t) => updateConfig('message', t)}
                        placeholder={operation === 'sendMessage' ? "Merhaba Dünya..." : "Resim açıklaması..."}
                        label="Mesaj"
                        minHeight={100}
                    />
                </View>
            )}

            {/* Parse Mode */}
            {operation !== 'sendLocation' && (
                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Format</Text>
                    <View style={styles.buttonRow}>
                        {['Markdown', 'HTML'].map(mode => (
                            <TouchableOpacity
                                key={mode}
                                style={[styles.unitButton, config.parseMode === mode && styles.unitButtonSelected]}
                                onPress={() => updateConfig('parseMode', mode)}
                            >
                                <Text style={[styles.unitButtonText, config.parseMode === mode && styles.unitButtonTextSelected]}>
                                    {mode}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </>
    );
};

// ═══════════════════════════════════════════════════════════════
// WHATSAPP SEND FIELDS
// ═══════════════════════════════════════════════════════════════

const WhatsAppSendFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Telefon Numarası</Text>
            <TextInput
                style={styles.input}
                value={config.phoneNumber || ''}
                onChangeText={(t) => updateConfig('phoneNumber', t)}
                placeholder="+90 5XX XXX XX XX"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
            />
            <Text style={styles.fieldHint}>Uluslararası formatta girin (örn: +90...)</Text>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mesaj</Text>
            <ExpandableTextInput
                value={config.message || ''}
                onChangeText={(t) => updateConfig('message', t)}
                placeholder="WhatsApp mesajınız..."
                label="Mesaj"
                minHeight={100}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Medya Dosyası (Değişken Adı)</Text>
            <TextInput
                style={styles.input}
                value={config.mediaPath || ''}
                onChangeText={(t) => updateConfig('mediaPath', t)}
                placeholder="selectedFile, audioUri vb."
                placeholderTextColor="#666"
            />
            <Text style={styles.fieldHint}>Gönderilecek resim/video dosyasının yolu (Uri)</Text>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="whatsappStatus"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// GOOGLE TRANSLATE FIELDS
// ═══════════════════════════════════════════════════════════════

const GoogleTranslateFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Çevrilecek Metin</Text>
            <ExpandableTextInput
                value={config.text || ''}
                onChangeText={(t) => updateConfig('text', t)}
                placeholder="{{variable}} veya metin"
                label="Metin"
                minHeight={100}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>API Key (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.apiKey || ''}
                onChangeText={(t) => updateConfig('apiKey', t)}
                placeholder="Google Cloud Translation API Key"
                placeholderTextColor="#666"
                secureTextEntry
            />
            <Text style={styles.fieldHint}>Boş bırakılırsa ücretsiz (sınırlı) servis kullanılır.</Text>
        </View>
        <View style={styles.rowField}>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Hedef Dil (tr, en, de)</Text>
                <TextInput
                    style={styles.input}
                    value={config.targetLanguage || 'tr'}
                    onChangeText={(t) => updateConfig('targetLanguage', t)}
                    placeholder="tr"
                    placeholderTextColor="#666"
                    maxLength={5}
                />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Kaynak Dil</Text>
                <TextInput
                    style={styles.input}
                    value={config.sourceLanguage || 'auto'}
                    onChangeText={(t) => updateConfig('sourceLanguage', t)}
                    placeholder="auto"
                    placeholderTextColor="#666"
                    maxLength={5}
                />
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="translatedText"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════

const GmailSendFields: React.FC<ConfigFieldsProps & { fileVariables?: string[] }> = ({ config, updateConfig, fileVariables }) => {
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Auto-fill attachments from file variables if empty
    useEffect(() => {
        if (!config.attachments && fileVariables && fileVariables.length > 0) {
            updateConfig('attachments', fileVariables[fileVariables.length - 1]);
        }
    }, [fileVariables]);

    return (
        <>
            <ApiDocLink
                title="Gmail API Nasıl Kullanılır?"
                url="https://developers.google.com/gmail/api/guides"
                brief="Gmail ile e-posta göndermek için yetkilendirme gerekir."
            />

            {/* Client ID Configuration */}
            <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabel}>Client ID (BYOK)</Text>
                <TextInput
                    style={styles.input}
                    value={config.clientId || ''}
                    onChangeText={(t) => updateConfig('clientId', t)}
                    placeholder="...apps.googleusercontent.com"
                    placeholderTextColor="#666"
                />
                <TouchableOpacity
                    style={{ marginTop: 8 }}
                    onPress={() => Linking.openURL('https://console.cloud.google.com/apis/credentials')}
                >
                    <Text style={{ color: '#8B5CF6', fontSize: 12 }}>
                        ℹ️ Client ID nasıl alınır? (Google Cloud Console)
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Kime (To)</Text>
                <TextInput
                    style={styles.input}
                    value={config.to || ''}
                    onChangeText={(t) => updateConfig('to', t)}
                    placeholder="ornek@email.com"
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Konu</Text>
                <TextInput
                    style={styles.input}
                    value={config.subject || ''}
                    onChangeText={(t) => updateConfig('subject', t)}
                    placeholder="E-posta konusu"
                    placeholderTextColor="#666"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>İçerik</Text>
                <ExpandableTextInput
                    value={config.body || ''}
                    onChangeText={(t) => updateConfig('body', t)}
                    placeholder="E-posta içeriği..."
                    label="E-posta İçeriği"
                    minHeight={150}
                />
            </View>

            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 }}
                onPress={() => setShowAdvanced(!showAdvanced)}
            >
                <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>
                    {showAdvanced ? '🔽 Gelişmiş Ayarları Gizle' : '▶️ Gelişmiş Ayarları Göster'}
                </Text>
            </TouchableOpacity>

            {showAdvanced && (
                <View style={{ backgroundColor: '#1E1E2E', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>CC (Bilgi)</Text>
                        <TextInput
                            style={styles.input}
                            value={config.cc || ''}
                            onChangeText={(t) => updateConfig('cc', t)}
                            placeholder="cc@email.com"
                            placeholderTextColor="#666"
                            keyboardType="email-address"
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>BCC (Gizli)</Text>
                        <TextInput
                            style={styles.input}
                            value={config.bcc || ''}
                            onChangeText={(t) => updateConfig('bcc', t)}
                            placeholder="bcc@email.com"
                            placeholderTextColor="#666"
                            keyboardType="email-address"
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Gönderen Adı (Opsiyonel)</Text>
                        <TextInput
                            style={styles.input}
                            value={config.fromName || ''}
                            onChangeText={(t) => updateConfig('fromName', t)}
                            placeholder="Örn: BreviAI Asistan"
                            placeholderTextColor="#666"
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Dosya Ekleri (Değişken veya Path)</Text>
                        <TextInput
                            style={styles.input}
                            value={config.attachments || ''}
                            onChangeText={(t) => updateConfig('attachments', t)}
                            placeholder="{{filepath}}"
                            placeholderTextColor="#666"
                        />
                        <Text style={styles.fieldHint}>Dosya içeren değişken adı (örn: selectedFile)</Text>
                    </View>
                    <View style={styles.rowField}>
                        <Text style={styles.fieldLabel}>HTML İçerik</Text>
                        <Switch
                            value={config.isHtml || false}
                            onValueChange={(v) => updateConfig('isHtml', v)}
                            trackColor={{ false: '#3A3A5A', true: '#8B5CF6' }}
                            thumbColor={config.isHtml ? '#FFF' : '#999'}
                        />
                    </View>
                </View>
            )}

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sonuç Değişkeni (Opsiyonel)</Text>
                <TextInput
                    style={styles.input}
                    value={config.variableName || ''}
                    onChangeText={(t) => updateConfig('variableName', t)}
                    placeholder="emailStatus"
                    placeholderTextColor="#666"
                />
            </View>
        </>
    );
};

// ═══════════════════════════════════════════════════════════════
// GOOGLE SHEETS READ FIELDS
// ═══════════════════════════════════════════════════════════════

const GoogleSheetsReadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <ApiDocLink
            title="Google Sheets Okuma Rehberi"
            url="https://developers.google.com/sheets/api/items/reading"
            brief="Özel tablolardan veri okumak için kullanılır."
        />
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Spreadsheet ID</Text>
            <Text style={styles.fieldHint}>URL'den: docs.google.com/spreadsheets/d/[ID]/edit</Text>
            <TextInput
                style={styles.input}
                value={config.spreadsheetId || ''}
                onChangeText={(t) => updateConfig('spreadsheetId', t)}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgm..."
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Range (Aralık)</Text>
            <TextInput
                style={styles.input}
                value={config.range || ''}
                onChangeText={(t) => updateConfig('range', t)}
                placeholder="Sheet1!A1:B10"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Formatlı Veri (GridData)</Text>
            <Switch
                value={config.includeGridData || false}
                onValueChange={(v) => updateConfig('includeGridData', v)}
                trackColor={{ false: '#3A3A5A', true: '#8B5CF6' }}
                thumbColor={config.includeGridData ? '#FFF' : '#999'}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="sheetData"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// GOOGLE SHEETS WRITE FIELDS
// ═══════════════════════════════════════════════════════════════

const GoogleSheetsWriteFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <ApiDocLink
            title="Google Sheets API Rehberi"
            url="https://developers.google.com/sheets/api/guides/concepts"
            brief="Tabloya veri yazmak için yetki gerekir. ID'yi URL'den alın."
        />
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Spreadsheet ID</Text>
            <Text style={styles.fieldHint}>Google Sheets URL'den: docs.google.com/spreadsheets/d/[ID]/edit</Text>
            <TextInput
                style={styles.input}
                value={config.spreadsheetId || ''}
                onChangeText={(t) => updateConfig('spreadsheetId', t)}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs..."
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Range (Aralık)</Text>
            <Text style={styles.fieldHint}>Örn: Sheet1!A:H veya Sayfa1!A1:D10</Text>
            <TextInput
                style={styles.input}
                value={config.range || ''}
                onChangeText={(t) => updateConfig('range', t)}
                placeholder="Sheet1!A:H"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Veriler (JSON Array)</Text>
            <ExpandableTextInput
                value={config.values || ''}
                onChangeText={(t) => updateConfig('values', t)}
                placeholder='[["satır1sütun1","satır1sütun2"]]'
                label="Veriler (JSON Array)"
                hint={'Örn: [["değer1","değer2"]] veya {{değişken}}. Her satır bir array, tüm satırlar da bir array içinde.'}
                minHeight={80}
            />
        </View>
        <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Mevcut verilere ekle (Append)</Text>
            <Switch
                value={config.append || false}
                onValueChange={(v) => updateConfig('append', v)}
                trackColor={{ false: '#3A3A5A', true: '#8B5CF6' }}
                thumbColor={config.append ? '#FFF' : '#999'}
            />
        </View>
    </>
);


// ═══════════════════════════════════════════════════════════════
// GOOGLE DRIVE UPLOAD FIELDS
// ═══════════════════════════════════════════════════════════════

const GoogleDriveUploadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <ApiDocLink
            title="Google Drive API - Upload"
            url="https://developers.google.com/drive/api/guides/manage-uploads"
            brief="Dosya yüklemek için Google hesabı ile giriş yapılmalı. Klasör ID'yi Drive URL'den alın."
        />
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya Yolu (Değişken)</Text>
            <Text style={styles.fieldHint}>{'FILE_PICK sonucu veya {{değişken}}'}</Text>
            <TextInput
                style={styles.input}
                value={config.filePath || ''}
                onChangeText={(t) => updateConfig('filePath', t)}
                placeholder="{{selectedFile}}"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosya Adı</Text>
            <Text style={styles.fieldHint}>{'{{değişken}} kullanabilirsiniz'}</Text>
            <TextInput
                style={styles.input}
                value={config.fileName || ''}
                onChangeText={(t) => updateConfig('fileName', t)}
                placeholder="dosya_{{tarih}}.jpg"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Açıklama (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.description || ''}
                onChangeText={(t) => updateConfig('description', t)}
                placeholder="Dosya açıklaması"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Klasör ID (Opsiyonel)</Text>
            <Text style={styles.fieldHint}>Drive klasör URL'den ID alınabilir</Text>
            <TextInput
                style={styles.input}
                value={config.folderId || ''}
                onChangeText={(t) => updateConfig('folderId', t)}
                placeholder="Boş bırakılırsa kök dizine yükler"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.rowField}>
            <Text style={styles.fieldLabel}>Google Docs'a Çevir</Text>
            <Switch
                value={config.convert || false}
                onValueChange={(v) => updateConfig('convert', v)}
                trackColor={{ false: '#3A3A5A', true: '#8B5CF6' }}
                thumbColor={config.convert ? '#FFF' : '#999'}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="uploadedFile"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════

const SensorFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
        <TextInput
            style={styles.input}
            value={config.variableName || ''}
            onChangeText={(v) => updateConfig('variableName', v)}
            placeholder="sensorData"
            placeholderTextColor="#666"
        />
    </View>
);

const PedometerFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Başlangıç Zamanı</Text>
            <View style={styles.buttonRow}>
                {['today', 'last24h'].map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.unitButton, config.startDate === t && styles.unitButtonSelected]}
                        onPress={() => updateConfig('startDate', t)}
                    >
                        <Text style={[styles.unitButtonText, config.startDate === t && styles.unitButtonTextSelected]}>
                            {t === 'today' ? 'Bugün (00:00)' : 'Son 24 Saat'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(v) => updateConfig('variableName', v)}
                placeholder="stepCount"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const GestureTriggerFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Hareket Tipi</Text>
            <View style={styles.buttonRow}>
                {['shake', 'face_down', 'face_up', 'quadruple_tap'].map(g => (
                    <TouchableOpacity
                        key={g}
                        style={[styles.unitButton, config.gesture === g && styles.unitButtonSelected]}
                        onPress={() => updateConfig('gesture', g)}
                    >
                        <Text style={[styles.unitButtonText, config.gesture === g && styles.unitButtonTextSelected]}>
                            {g === 'shake' ? 'Salla' : g === 'face_down' ? 'Ters Çevir' : g === 'face_up' ? 'Düz Çevir' : '4 Kez Vur'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Hassasiyet</Text>
            <View style={styles.buttonRow}>
                {['low', 'medium', 'high'].map(s => (
                    <TouchableOpacity
                        key={s}
                        style={[styles.unitButton, config.sensitivity === s && styles.unitButtonSelected]}
                        onPress={() => updateConfig('sensitivity', s)}
                    >
                        <Text style={[styles.unitButtonText, config.sensitivity === s && styles.unitButtonTextSelected]}>
                            {s === 'low' ? 'Düşük' : s === 'medium' ? 'Orta' : 'Yüksek'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    </>
);

// Step Trigger Config
const StepTriggerFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>🎯 Hedef Adım Sayısı</Text>
            <TextInput
                style={styles.input}
                value={String(config.targetSteps || 10000)}
                onChangeText={(text) => updateConfig('targetSteps', parseInt(text) || 10000)}
                placeholder="10000"
                placeholderTextColor="#666"
                keyboardType="numeric"
            />
            <Text style={styles.fieldHint}>Bu sayıya ulaşıldığında workflow tetiklenir</Text>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Karşılaştırma Modu</Text>
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.unitButton, config.comparison === 'gte' && styles.unitButtonSelected]}
                    onPress={() => updateConfig('comparison', 'gte')}
                >
                    <Text style={[styles.unitButtonText, config.comparison === 'gte' && styles.unitButtonTextSelected]}>
                        ≥ Eşit veya Fazla
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.unitButton, config.comparison === 'eq' && styles.unitButtonSelected]}
                    onPress={() => updateConfig('comparison', 'eq')}
                >
                    <Text style={[styles.unitButtonText, config.comparison === 'eq' && styles.unitButtonTextSelected]}>
                        = Tam Eşit
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
        <View style={styles.field}>
            <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Her Gün Sıfırla</Text>
                <Switch
                    value={config.resetDaily !== false}
                    onValueChange={(val) => updateConfig('resetDaily', val)}
                    trackColor={{ false: '#3e3e3e', true: 'rgba(0, 245, 255, 0.3)' }}
                    thumbColor={config.resetDaily !== false ? '#00F5FF' : '#666'}
                />
            </View>
            <Text style={styles.fieldHint}>Açıksa gece yarısı adım sayacı sıfırlanır</Text>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Değişken Adı (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(text) => updateConfig('variableName', text)}
                placeholder="currentSteps"
                placeholderTextColor="#666"
            />
            <Text style={styles.fieldHint}>Güncel adım sayısı bu değişkene yazılır</Text>
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#1A1A2E',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        gap: 16,
    },
    headerIcon: {
        fontSize: 32,
    },
    headerText: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    headerDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        color: '#FFF',
        fontSize: 16,
    },
    content: {
        padding: 20,
        paddingBottom: 0,
    },
    field: {
        marginBottom: 20,
    },
    fieldLabel: {
        color: '#888',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#2A2A4A',
        borderRadius: 12,
        padding: 14,
        color: '#FFF',
        fontSize: 16,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeInput: {
        width: 60,
        textAlign: 'center',
    },
    timeSeparator: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '700',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    unitButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#2A2A4A',
    },
    unitButtonSelected: {
        backgroundColor: '#6366F1',
    },
    unitButtonText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '500',
    },
    unitButtonTextSelected: {
        color: '#FFF',
    },
    noConfig: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 20,
    },
    rowField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    actions: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#2A2A4A',
    },
    deleteButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#2A2A4A',
        alignItems: 'center',
    },
    deleteText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        flex: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    saveGradient: {
        padding: 16,
        alignItems: 'center',
    },
    saveText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    fieldHint: {
        color: '#666',
        fontSize: 12,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#2A2A4A',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3A3A5A',
    },
    optionButtonSelected: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    optionText: {
        color: '#AAA',
        fontSize: 14,
    },
    optionTextSelected: {
        color: '#FFF',
        fontWeight: '600',
    },
    apiKeyLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        flexWrap: 'wrap',
    },
    apiKeyHint: {
        color: '#888',
        fontSize: 12,
    },
    apiKeyLink: {
        color: '#8B5CF6',
        fontSize: 12,
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

// ═══════════════════════════════════════════════════════════════
// RSS READ FIELDS
// ═══════════════════════════════════════════════════════════════

const RssReadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => {
    const categories = {
        'Gündem': [
            { name: 'NTV', url: 'https://www.ntv.com.tr/son-dakika.rss' },
            { name: 'CNN Türk', url: 'https://www.cnnturk.com/feed/rss/all/news' },
            { name: 'BBC Türkçe', url: 'http://feeds.bbci.co.uk/turkce/rss.xml' }
        ],
        'Teknoloji': [
            { name: 'Webtekno', url: 'https://www.webtekno.com/rss.xml' },
            { name: 'Chip', url: 'https://www.chip.com.tr/rss/' },
            { name: 'DonanımHaber', url: 'https://www.donanimhaber.com/rss/tum/' }
        ],
        'Ekonomi': [
            { name: 'Bloomberg HT', url: 'https://www.bloomberght.com/rss' },
            { name: 'Döviz.com', url: 'https://www.doviz.com/rss/haber' }
        ],
        'Spor': [
            { name: 'Fanatik', url: 'https://www.fanatik.com.tr/rss/son-dakika' },
            { name: 'NTV Spor', url: 'https://www.ntvspor.net/rss' }
        ]
    };

    return (
        <>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Hazır Abonelikler</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    <View style={{ gap: 10 }}>
                        {Object.entries(categories).map(([catType, feeds]) => (
                            <View key={catType} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ color: '#AAA', fontSize: 12, width: 60 }}>{catType}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        {feeds.map((feed) => (
                                            <TouchableOpacity
                                                key={feed.name}
                                                style={[
                                                    styles.unitButton,
                                                    { backgroundColor: '#3A3A5A', paddingVertical: 6, paddingHorizontal: 10 },
                                                    config.url === feed.url && styles.unitButtonSelected
                                                ]}
                                                onPress={() => updateConfig('url', feed.url)}
                                            >
                                                <Text style={[
                                                    styles.unitButtonText,
                                                    { fontSize: 12 },
                                                    config.url === feed.url && styles.unitButtonTextSelected
                                                ]}>{feed.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>RSS URL (Haber Kaynağı)</Text>
                <TextInput
                    style={styles.input}
                    value={config.url || ''}
                    onChangeText={(t) => updateConfig('url', t)}
                    placeholder="https://www.ntv.com.tr/teknoloji.rss"
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                    keyboardType="url"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Kaç Haber?</Text>
                <TextInput
                    style={styles.input}
                    value={String(config.limit || 5)}
                    onChangeText={(t) => updateConfig('limit', parseInt(t) || 5)}
                    keyboardType="numeric"
                />
            </View>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
                <TextInput
                    style={styles.input}
                    value={config.variableName}
                    onChangeText={(t) => updateConfig('variableName', t)}
                    placeholder="rssNews"
                    placeholderTextColor="#666"
                />
            </View>
        </>
    );
};

// ═══════════════════════════════════════════════════════════════
// IMAGE GENERATOR FIELDS
// ═══════════════════════════════════════════════════════════════

const ImageGeneratorFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sağlayıcı (Provider)</Text>
            <View style={styles.buttonRow}>
                {['gemini', 'nanobana', 'pollinations'].map(p => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.unitButton, (config.provider || 'gemini') === p && styles.unitButtonSelected]}
                        onPress={() => updateConfig('provider', p)}
                    >
                        <Text style={[styles.unitButtonText, (config.provider || 'gemini') === p && styles.unitButtonTextSelected]}>
                            {p === 'gemini' ? 'Gemini' : p === 'nanobana' ? 'Nano Banana' : 'Pollinations'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {(config.provider === 'gemini' || config.provider === 'nanobana') && (
                <View style={{ marginTop: 10, gap: 10 }}>
                    <Text style={styles.fieldHint}>
                        Google'ın en gelişmiş resim üretim modeli Imagen 3'ü kullanır.
                    </Text>

                    {/* API Key */}
                    <View>
                        <Text style={styles.fieldLabel}>API Anahtarı (Opsiyonel)</Text>
                        <TextInput
                            style={styles.input}
                            value={config.apiKey}
                            onChangeText={(t) => updateConfig('apiKey', t)}
                            placeholder="Sistem anahtarını kullan (Varsayılan)"
                            placeholderTextColor="#666"
                            secureTextEntry
                        />
                        <Text style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                            Girilmezse ayarlardaki anahtar kullanılır.
                        </Text>
                    </View>

                    {/* Model Selection */}
                    <View>
                        <Text style={styles.fieldLabel}>Model</Text>
                        <View style={styles.buttonRow}>
                            {['imagen-3.0-generate-001', 'imagen-2.0'].map(m => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.unitButton, (config.model || 'imagen-3.0-generate-001') === m && styles.unitButtonSelected]}
                                    onPress={() => updateConfig('model', m)}
                                >
                                    <Text style={[styles.unitButtonText, (config.model || 'imagen-3.0-generate-001') === m && styles.unitButtonTextSelected]}>
                                        {m.replace('imagen-', 'Imagen ').replace('-generate-001', '')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Aspect Ratio */}
                    <View>
                        <Text style={styles.fieldLabel}>En/Boy Oranı</Text>
                        <View style={styles.buttonRow}>
                            {['1:1', '16:9', '9:16', '4:3', '3:4'].map(ar => (
                                <TouchableOpacity
                                    key={ar}
                                    style={[styles.unitButton, (config.aspectRatio || '1:1') === ar && styles.unitButtonSelected]}
                                    onPress={() => updateConfig('aspectRatio', ar)}
                                >
                                    <Text style={[styles.unitButtonText, (config.aspectRatio || '1:1') === ar && styles.unitButtonTextSelected]}>
                                        {ar}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            )}
            {/* Input Image for Editing/Remix */}
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Giriş Resmi (Opsiyonel - Düzenleme/Remix için)</Text>
                <TextInput
                    style={styles.input}
                    value={config.inputImage || ''}
                    onChangeText={(t) => updateConfig('inputImage', t)}
                    placeholder="{{previousImage}} veya URI"
                    placeholderTextColor="#666"
                />
                <Text style={styles.fieldHint}>Var olan bir resmi düzenlemek için değişken adını girin.</Text>
            </View>

        </View>

        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Prompt (Ne çizelim?)</Text>
            <ExpandableTextInput
                value={config.prompt || ''}
                onChangeText={(t) => updateConfig('prompt', t)}
                placeholder="A futuristic city with flying cars..."
                label="Prompt"
                minHeight={120}
            />
        </View>

        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="generatedImage"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

// ═══════════════════════════════════════════════════════════════
// IMAGE EDIT FIELDS
// ═══════════════════════════════════════════════════════════════

const ImageEditFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => {
    const actions = config.actions || [];

    const addAction = (type: string) => {
        const newAction: any = { type };
        if (type === 'resize') { newAction.width = 800; }
        if (type === 'rotate') { newAction.angle = 90; }
        if (type === 'crop') { newAction.width = 100; newAction.height = 100; newAction.originX = 0; newAction.originY = 0; }
        if (type === 'center_crop') { newAction.width = 500; newAction.height = 500; }
        if (type === 'flip') { newAction.horizontal = true; }

        updateConfig('actions', [...actions, newAction]);
    };

    const removeAction = (index: number) => {
        const newActions = [...actions];
        newActions.splice(index, 1);
        updateConfig('actions', newActions);
    };

    const updateAction = (index: number, key: string, value: any) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], [key]: value };
        updateConfig('actions', newActions);
    };

    return (
        <>
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Giriş Resimi (Değişken/URI)</Text>
                <ExpandableTextInput
                    value={config.inputImage || ''}
                    onChangeText={(t) => updateConfig('inputImage', t)}
                    placeholder="{{selectedFile}}"
                    label="Giriş Resmi"
                    minHeight={60}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>İşlemler</Text>

                {actions.map((action: any, index: number) => (
                    <View key={index} style={{
                        backgroundColor: '#1E1E2E',
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: '#3A3A5A'
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
                                #{index + 1} {action.type.toUpperCase().replace('_', ' ')}
                            </Text>
                            <TouchableOpacity onPress={() => removeAction(index)}>
                                <Text style={{ color: '#EF4444' }}>🗑️</Text>
                            </TouchableOpacity>
                        </View>

                        {action.type === 'resize' && (
                            <View style={styles.rowField}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#AAA', fontSize: 12 }}>Genişlik</Text>
                                    <ExpandableTextInput
                                        value={String(action.width || '')}
                                        onChangeText={(v) => updateAction(index, 'width', parseInt(v) || 0)}
                                        placeholder="Auto"
                                        label="Genişlik"
                                        minHeight={60}
                                    />
                                </View>
                                <View style={{ width: 10 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#AAA', fontSize: 12 }}>Yükseklik</Text>
                                    <ExpandableTextInput
                                        value={String(action.height || '')}
                                        onChangeText={(v) => updateAction(index, 'height', parseInt(v) || 0)}
                                        placeholder="Auto"
                                        label="Yükseklik"
                                        minHeight={60}
                                    />
                                </View>
                            </View>
                        )}

                        {action.type === 'center_crop' && (
                            <View style={styles.rowField}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#AAA', fontSize: 12 }}>Hedef Genişlik</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={String(action.width || '')}
                                        onChangeText={(v) => updateAction(index, 'width', parseInt(v) || 0)}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ width: 10 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#AAA', fontSize: 12 }}>Hedef Yükseklik</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={String(action.height || '')}
                                        onChangeText={(v) => updateAction(index, 'height', parseInt(v) || 0)}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        )}

                        {action.type === 'rotate' && (
                            <View>
                                <Text style={{ color: '#AAA', fontSize: 12 }}>Açı (Derece)</Text>
                                <ExpandableTextInput
                                    value={String(action.angle || 90)}
                                    onChangeText={(v) => updateAction(index, 'angle', parseInt(v) || 0)}
                                    placeholder="90"
                                    label="Açı (Derece)"
                                    minHeight={60}
                                />
                            </View>
                        )}

                        {action.type === 'flip' && (
                            <View style={styles.rowField}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: '#AAA', marginRight: 8 }}>Yatay</Text>
                                    <Switch
                                        value={action.horizontal}
                                        onValueChange={(v) => updateAction(index, 'horizontal', v)}
                                    />
                                </View>
                                <View style={{ width: 20 }} />
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: '#AAA', marginRight: 8 }}>Dikey</Text>
                                    <Switch
                                        value={action.vertical}
                                        onValueChange={(v) => updateAction(index, 'vertical', v)}
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                ))}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                        style={[styles.unitButton, { backgroundColor: '#3A3A5A' }]}
                        onPress={() => addAction('resize')}
                    >
                        <Text style={styles.unitButtonText}>+ Boyutlandır</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.unitButton, { backgroundColor: '#3A3A5A' }]}
                        onPress={() => addAction('center_crop')}
                    >
                        <Text style={styles.unitButtonText}>+ Orta Kırp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.unitButton, { backgroundColor: '#3A3A5A' }]}
                        onPress={() => addAction('rotate')}
                    >
                        <Text style={styles.unitButtonText}>+ Çevir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.unitButton, { backgroundColor: '#3A3A5A' }]}
                        onPress={() => addAction('flip')}
                    >
                        <Text style={styles.unitButtonText}>+ Ayna</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Kayıt Formatı</Text>
                <View style={styles.buttonRow}>
                    {['jpeg', 'png'].map(fmt => (
                        <TouchableOpacity
                            key={fmt}
                            style={[styles.unitButton, (config.saveFormat || 'jpeg') === fmt && styles.unitButtonSelected]}
                            onPress={() => updateConfig('saveFormat', fmt)}
                        >
                            <Text style={[styles.unitButtonText, (config.saveFormat || 'jpeg') === fmt && styles.unitButtonTextSelected]}>
                                {fmt.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Kalite (0.0 - 1.0)</Text>
                <TextInput
                    style={styles.input}
                    value={String(config.quality !== undefined ? config.quality : 0.9)}
                    onChangeText={(t) => updateConfig('quality', parseFloat(t))}
                    keyboardType="numeric"
                    placeholder="0.9"
                    placeholderTextColor="#666"
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
                <TextInput
                    style={styles.input}
                    value={config.variableName}
                    onChangeText={(t) => updateConfig('variableName', t)}
                    placeholder="editedImage"
                    placeholderTextColor="#666"
                />
            </View>
        </>
    );
};

// ═══════════════════════════════════════════════════════════════
// WEB AUTOMATION FIELDS
// ═══════════════════════════════════════════════════════════════

const WebAutomationFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>URL</Text>
            <TextInput
                style={styles.input}
                value={config.url || ''}
                onChangeText={(t) => updateConfig('url', t)}
                placeholder="https://example.com"
                placeholderTextColor="#666"
                autoCapitalize="none"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>İşlemler (JSON)</Text>
            <ExpandableTextInput
                value={typeof config.actions === 'string' ? config.actions : JSON.stringify(config.actions || [], null, 2)}
                onChangeText={(t) => {
                    try {
                        // Try to parse if valid JSON, otherwise keep as string until valid
                        const parsed = JSON.parse(t);
                        updateConfig('actions', parsed);
                    } catch (e) {
                        // If not valid JSON yet, maybe store as temporary string or handle differently.
                        // For this simple implementation, we might need a better way to handle raw text input for JSON.
                        // But WorkflowEngine expects object.
                        // Let's assume user pastes valid JSON or we provide a UI builder later.
                        // For now, let's keep it simple: just text input, but we need to ensure it saves as object if possible.
                        // Actually, let's use a helper or just let it be text and parse on execution?
                        // No, type definition says properties.
                        // Let's just update a "actionsString" property if we want, but let's try to parse.
                    }
                }}
                placeholder='[{"type": "click", "selector": "#btn"}, {"type": "wait", "value": "2000"}]'
                label="Actions JSON"
                minHeight={150}
                hint="Örnek: [{'type': 'click', 'selector': 'button.submit'}, {'type': 'scrape', 'selector': 'h1', 'variableName': 'title'}]"
            />
            <Text style={styles.fieldHint}>Tıklama, Yazma, Bekleme ve Veri Çekme işlemleri.</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ ...styles.fieldLabel, marginBottom: 0, marginRight: 10 }}>Arka Planda Çalıştır (Headless)</Text>
            <Switch
                value={config.headless || false}
                onValueChange={(v) => updateConfig('headless', v)}
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName || ''}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="automationResult"
                placeholderTextColor="#666"
            />
        </View>
    </>
);



// ═══════════════════════════════════════════════════════════════
// NEW FIELD COMPONENTS
// ═══════════════════════════════════════════════════════════════



const DatabaseReadFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tablo Adı</Text>
            <TextInput
                style={styles.input}
                value={config.tableName || ''}
                onChangeText={(t) => updateConfig('tableName', t)}
                placeholder="users"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.rowField}>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Filtre Anahtarı (Opsiyonel)</Text>
                <TextInput
                    style={styles.input}
                    value={config.filterKey || ''}
                    onChangeText={(t) => updateConfig('filterKey', t)}
                    placeholder="id"
                    placeholderTextColor="#666"
                />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Filtre Değeri</Text>
                <TextInput
                    style={styles.input}
                    value={config.filterValue || ''}
                    onChangeText={(t) => updateConfig('filterValue', t)}
                    placeholder="123"
                    placeholderTextColor="#666"
                />
            </View>
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="dbResult"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const DatabaseWriteFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tablo Adı</Text>
            <TextInput
                style={styles.input}
                value={config.tableName || ''}
                onChangeText={(t) => updateConfig('tableName', t)}
                placeholder="logs"
                placeholderTextColor="#666"
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>İşlem</Text>
            <View style={styles.buttonRow}>
                {['insert', 'update', 'delete'].map(op => (
                    <TouchableOpacity
                        key={op}
                        style={[styles.unitButton, (config.operation || 'insert') === op && styles.unitButtonSelected]}
                        onPress={() => updateConfig('operation', op)}
                    >
                        <Text style={[styles.unitButtonText, (config.operation || 'insert') === op && styles.unitButtonTextSelected]}>
                            {op.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        {config.operation !== 'insert' && (
            <View style={styles.rowField}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Filtre Anahtarı</Text>
                    <TextInput
                        style={styles.input}
                        value={config.filterKey || ''}
                        onChangeText={(t) => updateConfig('filterKey', t)}
                        placeholder="id"
                        placeholderTextColor="#666"
                    />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Filtre Değeri</Text>
                    <TextInput
                        style={styles.input}
                        value={config.filterValue || ''}
                        onChangeText={(t) => updateConfig('filterValue', t)}
                        placeholder="123"
                        placeholderTextColor="#666"
                    />
                </View>
            </View>
        )}

        {config.operation !== 'delete' && (
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Veri (JSON Formatında)</Text>
                <ExpandableTextInput
                    value={config.data || ''}
                    onChangeText={(t) => updateConfig('data', t)}
                    placeholder='{"name": "Ali", "age": 25}'
                    label="Veri Düzenle"
                    hint="Insert veya Update için kolon değerleri."
                />
            </View>
        )}

        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni (Opsiyonel)</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="operationStatus"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

const ViewUdfFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>Dosya Kaynağı (Değişken veya Yol)</Text>
        <ExpandableTextInput
            value={config.fileSource || ''}
            onChangeText={(v) => updateConfig('fileSource', v)}
            placeholder="{{dosya_yolu}} veya file://..."
            label="Dosya Kaynağı"
            hint="Açılacak UDF dosyasının yolu. Genellikle bir önceki adımdan gelir (örn: {{file_uri}})"
            minHeight={60}
        />
    </View>
);

const CameraCaptureFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Kamera Yönü</Text>
            <View style={styles.buttonRow}>
                {['back', 'front'].map(cam => (
                    <TouchableOpacity
                        key={cam}
                        style={[styles.unitButton, (config.cameraType || 'back') === cam && styles.unitButtonSelected]}
                        onPress={() => updateConfig('cameraType', cam)}
                    >
                        <Text style={[styles.unitButtonText, (config.cameraType || 'back') === cam && styles.unitButtonTextSelected]}>
                            {cam === 'back' ? 'Arka' : 'Ön'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Kalite</Text>
            <View style={styles.buttonRow}>
                {['low', 'medium', 'high'].map(q => (
                    <TouchableOpacity
                        key={q}
                        style={[styles.unitButton, (config.quality || 'medium') === q && styles.unitButtonSelected]}
                        onPress={() => updateConfig('quality', q)}
                    >
                        <Text style={[styles.unitButtonText, (config.quality || 'medium') === q && styles.unitButtonTextSelected]}>
                            {q === 'low' ? 'Düşük' : q === 'medium' ? 'Orta' : 'Yüksek'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        <View style={styles.field}>
            <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Metin Okuma (OCR - Gemini)</Text>
                <Switch
                    value={config.enableOcr || false}
                    onValueChange={(val) => updateConfig('enableOcr', val)}
                    trackColor={{ false: '#3e3e3e', true: 'rgba(0, 245, 255, 0.3)' }}
                    thumbColor={config.enableOcr ? '#00F5FF' : '#666'}
                />
            </View>
            <Text style={styles.fieldHint}>Fotoğraftaki metinleri yapay zeka ile okur (İnternet gerekir).</Text>
        </View>

        {config.enableOcr && (
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>OCR Metin Değişkeni</Text>
                <TextInput
                    style={styles.input}
                    value={config.textVariableName || ''}
                    onChangeText={(t) => updateConfig('textVariableName', t)}
                    placeholder="ocrText"
                    placeholderTextColor="#666"
                />
            </View>
        )}

        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Fotoğraf Değişkeni (Zorunlu)</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="cameraPhoto"
                placeholderTextColor="#666"
            />
            <Text style={styles.fieldHint}>Fotoğrafın dosya yolu bu değişkene atanır.</Text>
        </View>
    </>
);

const CodeExecutionFields: React.FC<ConfigFieldsProps> = ({ config, updateConfig }) => (
    <>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Javascript Kodu</Text>
            <Text style={styles.fieldHint}>
                Mevcut değişkenlere erişim: variables.myVar
            </Text>
            <ExpandableTextInput
                value={config.code || ''}
                onChangeText={(t) => updateConfig('code', t)}
                placeholder="// console.log('Hello');\nreturn { result: 'ok' };"
                label="Kod Düzenle"
                minHeight={200}
                hint="Dönüş değeri bir obje olmalıdır. async/await kullanabilirsiniz."
            />
        </View>
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sonuç Değişkeni</Text>
            <TextInput
                style={styles.input}
                value={config.variableName}
                onChangeText={(t) => updateConfig('variableName', t)}
                placeholder="codeOutput"
                placeholderTextColor="#666"
            />
        </View>
    </>
);

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({
    visible,
    node,
    allNodes,
    onClose,
    onSave,
    onDelete,
}) => {
    const fileVariables = allNodes ? getFileVariables(allNodes) : [];
    const [config, setConfig] = useState<NodeConfig>({});
    const [label, setLabel] = useState('');

    // Track previous node ID to prevent overwriting local state on re-renders
    const [lastNodeId, setLastNodeId] = useState<string | null>(null);

    useEffect(() => {
        if (node && node.id !== lastNodeId) {
            // Only reset config if we switched to a DIFFERENT node
            setConfig(node.config || {});
            setLabel(node.label);
            setLastNodeId(node.id);
        }
        // If node.id is the same, we IGNORE the prop update to preserve local state
        // This fixes the issue where background refreshes wipe out user input
    }, [node, lastNodeId]);

    if (!node) return null;

    const metadata = NODE_REGISTRY[node.type];

    const handleSave = () => {
        onSave({
            ...node,
            label,
            config,
        });
        onClose();
    };

    const updateConfig = (key: string, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const renderConfigFields = () => {
        switch (node.type) {
            case 'TIME_TRIGGER':
                return <TimeTriggerFields config={config} updateConfig={updateConfig} />;
            case 'NOTIFICATION_TRIGGER':
                return <NotificationTriggerFields config={config} updateConfig={updateConfig} />;
            case 'EMAIL_TRIGGER':
                return <EmailTriggerFields config={config} updateConfig={updateConfig} />;
            case 'TELEGRAM_TRIGGER':
                return <TelegramTriggerFields config={config} updateConfig={updateConfig} />;
            case 'CALL_TRIGGER':
                return <CallTriggerFields config={config} updateConfig={updateConfig} />;
            case 'SMS_TRIGGER':
                return <SmsTriggerFields config={config} updateConfig={updateConfig} />;
            case 'WHATSAPP_TRIGGER':
                return <WhatsAppTriggerFields config={config} updateConfig={updateConfig} />;
            case 'DELAY':
                return <DelayFields config={config} updateConfig={updateConfig} />;
            case 'IF_ELSE':
                return <IfElseFields config={config} updateConfig={updateConfig} />;
            case 'VARIABLE':
                return <VariableFields config={config} updateConfig={updateConfig} />;
            case 'LOOP':
                return <LoopFields config={config} updateConfig={updateConfig} />;
            case 'NOTIFICATION':
                return <NotificationFields config={config} updateConfig={updateConfig} />;
            case 'SOUND_MODE':
                return <SoundModeFields config={config} updateConfig={updateConfig} />;
            case 'APP_LAUNCH':
                return <AppLaunchFields config={config} updateConfig={updateConfig} />;
            case 'DND_CONTROL':
                return <DNDControlFields config={config} updateConfig={updateConfig} />;
            case 'BRIGHTNESS_CONTROL':
                return <BrightnessControlFields config={config} updateConfig={updateConfig} />;
            case 'FLASHLIGHT_CONTROL':
                return <FlashlightFields config={config} updateConfig={updateConfig} />;
            case 'TEXT_INPUT':
                return <TextInputFields config={config} updateConfig={updateConfig} />;
            case 'CLIPBOARD_READER':
                return <ClipboardReaderFields config={config} updateConfig={updateConfig} />;
            case 'SHOW_MENU':
                return <ShowMenuFields config={config} updateConfig={updateConfig} />;
            case 'SCREEN_WAKE':
                return <ScreenWakeFields config={config} updateConfig={updateConfig} />;

            case 'GLOBAL_ACTION':
                return <GlobalActionFields config={config} updateConfig={updateConfig} />;
            case 'MEDIA_CONTROL':
                return <MediaControlFields config={config} updateConfig={updateConfig} />;
            case 'OPEN_URL':
                return <OpenUrlFields config={config} updateConfig={updateConfig} />;
            // New Nodes
            case 'CALENDAR_READ':
                return <CalendarReadFields config={config} updateConfig={updateConfig} />;
            case 'CALENDAR_CREATE':
                return <CalendarCreateFields config={config} updateConfig={updateConfig} />;
            case 'CALENDAR_UPDATE':
                return <CalendarUpdateFields config={config} updateConfig={updateConfig} />;
            case 'CALENDAR_DELETE':
                return <CalendarDeleteFields config={config} updateConfig={updateConfig} />;
            case 'CONTACTS_READ':
                return <ContactsReadFields config={config} updateConfig={updateConfig} />;
            case 'CONTACTS_WRITE':
                return <ContactsWriteFields config={config} updateConfig={updateConfig} />;
            case 'NAVIGATE_TO':
                return <NavigateToFields config={config} updateConfig={updateConfig} />;
            case 'SETTINGS_OPEN':
                return <SettingsOpenFields config={config} updateConfig={updateConfig} />;
            case 'DB_READ':
                return <DatabaseReadFields config={config} updateConfig={updateConfig} />;
            case 'DB_WRITE':
                return <DatabaseWriteFields config={config} updateConfig={updateConfig} />;
            case 'LOCATION_GET':
                return <LocationGetFields config={config} updateConfig={updateConfig} />;
            case 'GEOFENCE_CREATE':
                return <GeofenceCreateFields config={config as any} updateConfig={updateConfig} />;
            case 'GEOFENCE_ENTER_TRIGGER':
                return <GeofenceEnterFields config={config as any} updateConfig={updateConfig} />;
            case 'GEOFENCE_EXIT_TRIGGER':
                return <GeofenceExitFields config={config as any} updateConfig={updateConfig} />;
            case 'CALL_TRIGGER':
                return <CallTriggerFields config={config} updateConfig={updateConfig} />;
            case 'BATTERY_CHECK':
                return <BatteryCheckFields config={config} updateConfig={updateConfig} />;
            case 'NETWORK_CHECK':
                return <NetworkCheckFields config={config} updateConfig={updateConfig} />;
            case 'VOLUME_CONTROL':
                return <VolumeControlFields config={config} updateConfig={updateConfig} />;
            case 'SPEAK_TEXT':
                return <SpeakTextFields config={config} updateConfig={updateConfig} />;
            case 'AUDIO_RECORD':
                return <AudioRecordFields config={config} updateConfig={updateConfig} />;
            case 'SMS_SEND':
                return <SmsSendFields config={config} updateConfig={updateConfig} />;
            case 'EMAIL_SEND':
                return <EmailSendFields config={config} updateConfig={updateConfig} />;
            case 'WHATSAPP_SEND':
                return <WhatsAppSendFields config={config} updateConfig={updateConfig} />;
            case 'SLACK_SEND':
                return <SlackSendFields config={config} updateConfig={updateConfig} />;
            case 'HTTP_REQUEST':
                return <HttpRequestFields config={config} updateConfig={updateConfig} />;
            case 'FILE_WRITE':
                return <FileWriteFields config={config} updateConfig={updateConfig} />;
            case 'FILE_READ':
                return <FileReadFields config={config} updateConfig={updateConfig} />;
            case 'PDF_CREATE':
                return <PdfCreateFields config={config} updateConfig={updateConfig} />;
            case 'ALARM_SET':
                return <AlarmSetFields config={config} updateConfig={updateConfig} />;
            case 'SPEECH_TO_TEXT':
                return <SpeechToTextFields config={config} updateConfig={updateConfig} />;
            case 'AGENT_AI':
                return <AgentAIFields config={config} updateConfig={updateConfig} />;
            case 'SHOW_TEXT':
                return <ShowTextFields config={config} updateConfig={updateConfig} />;
            case 'SHOW_IMAGE':
                return <ShowImageFields config={config} updateConfig={updateConfig} />;
            case 'FILE_PICK':
                return <FilePickFields config={config} updateConfig={updateConfig} />;
            case 'GMAIL_SEND':
                return <GmailSendFields config={config} updateConfig={updateConfig} fileVariables={fileVariables} />;
            case 'RSS_READ':
                return <RssReadFields config={config} updateConfig={updateConfig} />;
            case 'GMAIL_READ':
                return <GmailReadFields config={config} updateConfig={updateConfig} />;
            case 'SHEETS_READ':
                return <GoogleSheetsReadFields config={config} updateConfig={updateConfig} />;
            case 'SHEETS_WRITE':
                return <GoogleSheetsWriteFields config={config} updateConfig={updateConfig} />;
            case 'DRIVE_UPLOAD':
                return <GoogleDriveUploadFields config={config} updateConfig={updateConfig} />;
            // Sensors
            case 'LIGHT_SENSOR':
            case 'MAGNETOMETER':
            case 'BAROMETER':
                return <SensorFields config={config} updateConfig={updateConfig} />;
            case 'PEDOMETER':
                return <PedometerFields config={config} updateConfig={updateConfig} />;
            case 'GESTURE_TRIGGER':
                return <GestureTriggerFields config={config} updateConfig={updateConfig} />;
            case 'STEP_TRIGGER':
                return <StepTriggerFields config={config} updateConfig={updateConfig} />;
            case 'OUTLOOK_SEND':
                return <OutlookSendFields config={config} updateConfig={updateConfig} fileVariables={fileVariables} />;
            case 'OUTLOOK_READ':
                return <OutlookReadFields config={config} updateConfig={updateConfig} />;
            case 'EXCEL_READ':
                return <ExcelReadFields config={config} updateConfig={updateConfig} />;
            case 'EXCEL_WRITE':
                return <ExcelWriteFields config={config} updateConfig={updateConfig} />;
            case 'ONEDRIVE_UPLOAD':
                return <OneDriveUploadFields config={config} updateConfig={updateConfig} />;
            case 'ONEDRIVE_DOWNLOAD':
                return <OneDriveDownloadFields config={config} updateConfig={updateConfig} />;
            case 'ONEDRIVE_LIST':
                return <OneDriveListFields config={config} updateConfig={updateConfig} />;
            case 'TELEGRAM_SEND':
                return <TelegramSendFields config={config} updateConfig={updateConfig} />;
            case 'GOOGLE_TRANSLATE':
                return <GoogleTranslateFields config={config} updateConfig={updateConfig} />;
            case 'WEB_AUTOMATION':
                return <WebAutomationFields config={config} updateConfig={updateConfig} />;
            case 'IMAGE_GENERATOR':
                return <ImageGeneratorFields config={config} updateConfig={updateConfig} />;
            case 'IMAGE_EDIT':
                return <ImageEditFields config={config} updateConfig={updateConfig} />;
            case 'VIEW_UDF':
                return <ViewUdfFields config={config} updateConfig={updateConfig} />;
            case 'SHOW_OVERLAY':
                return <ShowOverlayFields config={config} updateConfig={updateConfig} />;
            case 'CAMERA_CAPTURE':
                return <CameraCaptureFields config={config} updateConfig={updateConfig} />;
            case 'OVERLAY_INPUT':
                return <OverlayInputFields config={config} updateConfig={updateConfig} />;
            default:
                return <Text style={styles.noConfig}>Bu node için ayar gerekmez</Text>;
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <LinearGradient
                        colors={[metadata.color, `${metadata.color}99`]}
                        style={styles.header}
                    >
                        {/^[a-z0-9-]+$/.test(metadata.icon) ? (
                            <Ionicons name={metadata.icon as any} size={32} color="#FFF" style={{ marginRight: 15 }} />
                        ) : (
                            <Text style={styles.headerIcon}>{metadata.icon}</Text>
                        )}
                        <View style={styles.headerText}>
                            <Text style={styles.headerTitle}>{metadata.name}</Text>
                            <Text style={styles.headerDesc}>{metadata.description}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </LinearGradient>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Label field */}
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Etiket</Text>
                            <TextInput
                                style={styles.input}
                                value={label}
                                onChangeText={setLabel}
                                placeholder="Node etiketi"
                                placeholderTextColor="#666"
                            />
                        </View>

                        {/* Type-specific fields */}
                        {renderConfigFields()}
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                            <Text style={styles.deleteText}>🗑️ Sil</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <LinearGradient
                                colors={['#8B5CF6', '#6366F1']}
                                style={styles.saveGradient}
                            >
                                <Text style={styles.saveText}>💾 Kaydet</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default NodeConfigModal;


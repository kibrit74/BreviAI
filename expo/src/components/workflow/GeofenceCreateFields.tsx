import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { GeofenceCreateConfig } from '../../types/workflow-types';

interface GeofenceCreateFieldsProps {
    config: GeofenceCreateConfig;
    updateConfig: (key: string, value: any) => void;
}

export const GeofenceCreateFields: React.FC<GeofenceCreateFieldsProps> = ({ config, updateConfig }) => {
    return (
        <View>
            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>
                    🏷️ Coğrafi Sınır Adı
                </Text>
                <TextInput
                    style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#f9f9f9'
                    }}
                    value={config.name || ''}
                    onChangeText={(value) => updateConfig('name', value)}
                    placeholder="Örn: Ofis, Ev, Okul"
                    placeholderTextColor="#999"
                />
            </View>

            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>
                    📍 Enlem (Latitude)
                </Text>
                <TextInput
                    style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#f9f9f9'
                    }}
                    value={config.latitude?.toString() || ''}
                    onChangeText={(value) => updateConfig('latitude', parseFloat(value) || 0)}
                    placeholder="41.0082"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                />
            </View>

            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>
                    📍 Boylam (Longitude)
                </Text>
                <TextInput
                    style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#f9f9f9'
                    }}
                    value={config.longitude?.toString() || ''}
                    onChangeText={(value) => updateConfig('longitude', parseFloat(value) || 0)}
                    placeholder="28.9784"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                />
            </View>

            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>
                    🎯 Yarıçap (metre)
                </Text>
                <TextInput
                    style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#f9f9f9'
                    }}
                    value={config.radius?.toString() || ''}
                    onChangeText={(value) => updateConfig('radius', parseInt(value) || 100)}
                    placeholder="100"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                />
            </View>

            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>
                    🔍 Tetikleme Türü
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(['enter', 'exit', 'both'] as const).map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: config.transition === type ? '#10B981' : '#ddd',
                                backgroundColor: config.transition === type ? '#10B98120' : '#f9f9f9'
                            }}
                            onPress={() => updateConfig('transition', type)}
                        >
                            <Text style={{
                                color: config.transition === type ? '#10B981' : '#666',
                                fontSize: 14,
                                fontWeight: '500'
                            }}>
                                {type === 'enter' ? '📥 Girme' : type === 'exit' ? '📤 Çıkma' : '🔄 Her İki'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={{ marginBottom: 16, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>
                    💡 <Text style={{ fontWeight: '600' }}>İpucu:</Text>
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                    • Girme: Alana girildiğinde tetiklenir{'\n'}
                    • Çıkma: Alandan çıkıldığında tetiklenir{'\n'}
                    • Her İki: Hem girme hem de çıkma olaylarında tetiklenir
                </Text>
            </View>
        </View>
    );
};
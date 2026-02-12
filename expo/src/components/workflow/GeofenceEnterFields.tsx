import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { GeofenceEnterConfig } from '../../types/workflow-types';
import { GeofenceService } from '../../services/GeofenceService';

interface GeofenceEnterFieldsProps {
    config: GeofenceEnterConfig;
    updateConfig: (key: string, value: any) => void;
}

export const GeofenceEnterFields: React.FC<GeofenceEnterFieldsProps> = ({ config, updateConfig }) => {
    const [availableGeofences, setAvailableGeofences] = React.useState<Array<{id: string, name: string}>>([]);

    React.useEffect(() => {
        // Load available geofences
        const geofenceService = GeofenceService.getInstance();
        const geofences = geofenceService.getGeofences().map(g => ({
            id: g.id,
            name: g.name
        }));
        setAvailableGeofences(geofences);
    }, []);

    return (
        <View>
            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>
                    🎯 Coğrafi Sınır Seç
                </Text>
                <View style={{ gap: 8 }}>
                    {availableGeofences.length > 0 ? (
                        availableGeofences.map((geofence) => (
                            <TouchableOpacity
                                key={geofence.id}
                                style={{
                                    padding: 12,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: config.geofenceId === geofence.id ? '#10B981' : '#ddd',
                                    backgroundColor: config.geofenceId === geofence.id ? '#10B98120' : '#f9f9f9'
                                }}
                                onPress={() => updateConfig('geofenceId', geofence.id)}
                            >
                                <Text style={{
                                    color: config.geofenceId === geofence.id ? '#10B981' : '#333',
                                    fontSize: 16,
                                    fontWeight: '500'
                                }}>
                                    📍 {geofence.name}
                                </Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={{ 
                            padding: 16, 
                            backgroundColor: '#FEF3C7', 
                            borderRadius: 8, 
                            borderWidth: 1,
                            borderColor: '#F59E0B'
                        }}>
                            <Text style={{ fontSize: 14, color: '#92400E', textAlign: 'center' }}>
                                ⚠️ Henüz hiç coğrafi sınır oluşturulmamış.{'\n'}
                                Önce "Coğrafi Sınır Oluştur" node'u ekleyin.
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>
                    📝 Değişken Adı (opsiyonel)
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
                    value={config.variableName || ''}
                    onChangeText={(value) => updateConfig('variableName', value)}
                    placeholder="geofence_event"
                    placeholderTextColor="#999"
                />
                <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    Event verileri bu değişkene kaydedilir
                </Text>
            </View>

            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>
                    ⏱️ Debounce Zamanı (ms)
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
                    value={config.debounceTime?.toString() || ''}
                    onChangeText={(value) => updateConfig('debounceTime', parseInt(value) || 5000)}
                    placeholder="5000"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                />
                <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    Aynı olayın tekrar tetiklenmesini engeller (varsayılan: 5000ms)
                </Text>
            </View>

            <View style={{ marginBottom: 16, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>
                    🔄 <Text style={{ fontWeight: '600' }}>Trigger Bilgisi:</Text>
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                    Bu trigger, seçilen coğrafi sınıra girildiğinde otomatik olarak çalışır.{'\n'}
                    Konum izinlerinin açık olması gerekir.
                </Text>
            </View>
        </View>
    );
};
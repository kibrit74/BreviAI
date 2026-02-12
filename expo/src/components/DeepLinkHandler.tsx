import React, { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Alert, ToastAndroid, Platform } from 'react-native';
import { workflowEngine } from '../services/WorkflowEngine';
import { WorkflowStorage } from '../services/WorkflowStorage';
import { Workflow } from '../types/workflow-types';

export const DeepLinkHandler: React.FC = () => {
    useEffect(() => {
        const handleDeepLink = async (event: { url: string }) => {
            const { url } = event;
            parseAndHandleUrl(url);
        };

        // Handle app launched via deep link
        Linking.getInitialURL().then((url) => {
            if (url) parseAndHandleUrl(url);
        });

        // Handle deep link while app is running
        const subscription = Linking.addEventListener('url', handleDeepLink);

        return () => {
            subscription.remove();
        };
    }, []);

    const parseAndHandleUrl = async (url: string) => {
        try {
            const parsed = Linking.parse(url);

            // Check for run-workflow path
            // Deep link format: brevi-ai://run-workflow/{id}
            // Linking.parse might return path as 'run-workflow/123' or parts

            let workflowId: string | null = null;

            if (parsed.path && parsed.path.startsWith('run-workflow')) {
                const parts = parsed.path.split('/');
                if (parts.length >= 2) {
                    workflowId = parts[1];
                }
            } else if (url.includes('run-workflow')) {
                // Manual fallback parsing if Expo Parsing behaves unexpectedly
                const parts = url.split('run-workflow/');
                if (parts.length > 1) {
                    workflowId = parts[1].split('/')[0]; // Take ID, ignore query params
                }
            }

            if (workflowId) {
                console.log(`[DeepLinkHandler] Triggering workflow: ${workflowId}`);
                await executeWorkflowById(workflowId);
            }
        } catch (e) {
            console.error('[DeepLinkHandler] Error handling URL:', e);
        }
    };

    const executeWorkflowById = async (id: string) => {
        try {
            // Give UI a moment to settle if app just opened
            await new Promise(resolve => setTimeout(resolve, 500));

            const workflows = await WorkflowStorage.getAll();
            const workflow = workflows.find(w => w.id === id);

            if (!workflow) {
                Alert.alert('Hata', 'Workflow bulunamadı.');
                return;
            }

            // Show toast
            if (Platform.OS === 'android') {
                ToastAndroid.show(`"${workflow.name}" başlatılıyor...`, ToastAndroid.SHORT);
            }

            // Execute
            const result = await workflowEngine.execute(workflow);

            if (result.success) {
                if (Platform.OS === 'android') {
                    ToastAndroid.show('✅ Otomasyon tamamlandı', ToastAndroid.SHORT);
                }
            } else {
                Alert.alert('Otomasyon Hatası', result.error || 'Bilinmeyen hata');
            }

        } catch (error) {
            console.error('[DeepLinkHandler] Execution error:', error);
            Alert.alert('Çalıştırma Hatası', String(error));
        }
    };

    return null; // Interface-less component
};

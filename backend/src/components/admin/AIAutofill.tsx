
'use client';

import { useState } from 'react';
import styles from '../admin.module.css'; // Adjust path as needed, assuming we are in src/components/admin

interface AIAutofillProps {
    onGenerated: (data: any) => void;
}

export default function AIAutofill({ onGenerated }: AIAutofillProps) {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/generate-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            const data = await res.json();

            if (data.success) {
                onGenerated(data.data);
                // Optionally clear prompt or give success feedback
            } else {
                setError(data.error || 'Failed to generate template');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'linear-gradient(145deg, rgba(88, 28, 135, 0.2), rgba(124, 58, 237, 0.1))',
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.3)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>✨</span>
                <h3 style={{ margin: 0, color: '#e9d5ff' }}>AI Assistant (Gemini 2.5 Pro)</h3>
            </div>

            <p style={{ color: '#d8b4fe', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Describe the shortcut you want to create (e.g., "Whatsapp message to Mom when I leave work").
                The AI will search the web for intent details and autofill the form.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your shortcut idea here..."
                    style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        minHeight: '80px',
                        resize: 'vertical'
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            handleGenerate();
                        }
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {error && <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</span>}
                    {!error && <span></span>} {/* Spacer */}

                    <button
                        onClick={handleGenerate}
                        disabled={loading || !prompt.trim()}
                        style={{
                            background: loading ? '#4b5563' : '#7c3aed',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'background 0.2s'
                        }}
                    >
                        {loading ? 'Generating...' : '✨ Auto-Fill Form'}
                    </button>
                </div>
            </div>
        </div>
    );
}

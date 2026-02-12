
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';

const CATEGORIES = ['Battery', 'Security', 'Productivity', 'Lifestyle', 'Social', 'Health', 'Travel'];

import AIAutofill from '@/components/admin/AIAutofill';

export default function NewTemplatePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        title_en: '',
        description: '',
        description_en: '',
        category: 'Productivity',
        author: 'BreviAI',
        tags: '',
        template_json: '{\n  "nodes": [],\n  "edges": []\n}'
    });

    const handleAutofill = (data: any) => {
        setFormData(prev => ({
            ...prev,
            title_en: data.title_en || prev.title_en,
            description: data.description || prev.description,
            description_en: data.description_en || prev.description_en,
            category: data.category || prev.category,
            tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || prev.tags),
            // Handle if AI returns keys directly or nested
            title: data.name || data.title || prev.title,
            template_json: JSON.stringify({
                nodes: data.nodes || [],
                edges: data.edges || []
            }, null, 2)
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Parse tags
            const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

            // Validate JSON
            let parsedJson = {};

            // Helper: Lexer-based JSON cleaner to escape newlines ONLY inside strings
            const cleanJsonString = (str: string) => {
                let result = '';
                let inString = false;
                let isEscaped = false;

                for (let i = 0; i < str.length; i++) {
                    const char = str[i];

                    if (inString) {
                        if (char === '\\') {
                            isEscaped = !isEscaped;
                            result += char;
                        } else if (char === '"' && !isEscaped) {
                            inString = false;
                            result += char;
                        } else if (char === '\n') {
                            // Escape literal newline inside string
                            result += '\\n';
                            isEscaped = false; // Reset escape after specific char
                        } else if (char === '\r') {
                            // Ignore CR inside string or handled by newline
                            isEscaped = false;
                        } else {
                            result += char;
                            isEscaped = false;
                        }
                    } else {
                        // Outside string
                        if (char === '"') {
                            inString = true;
                        }
                        result += char;
                    }
                }
                return result;
            };

            try {
                parsedJson = JSON.parse(formData.template_json);
            } catch (err: any) {
                console.error("JSON Parse Error:", err);

                try {
                    // Smart Clean: Only escape newlines inside quotes
                    const fixedJson = cleanJsonString(formData.template_json);
                    parsedJson = JSON.parse(fixedJson);
                    console.log("Fixed JSON parse worked with smart cleaner!");
                } catch (e2: any) {
                    console.error("Smart cleaner failed too:", e2);
                    // Fallback/Original Error
                }

                if (!parsedJson || Object.keys(parsedJson).length === 0) {
                    // Get line number from error if possible or show generic
                    setError(`Invalid JSON format: ${err.message}. (Check for unescaped newlines in your prompt text)`);
                    setLoading(false);
                    return;
                }
            }

            const payload = {
                ...formData,
                tags: tagsArray,
                template_json: parsedJson
            };

            const res = await fetch('/api/admin/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                router.push('/admin');
            } else {
                setError(data.error || 'Failed to create template');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>New Shortcut</h1>
                <Link href="/admin" className={`${styles.button} ${styles.secondaryButton}`}>
                    Cancel
                </Link>
            </div>

            <AIAutofill onGenerated={handleAutofill} />

            <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.grid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Title (TR)</label>
                        <input
                            required
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Süper Güç Tasarrufu"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Title (EN)</label>
                        <input
                            name="title_en"
                            value={formData.title_en}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Super Power Saver"
                        />
                    </div>
                </div>

                <div className={styles.grid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Category</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className={styles.select}
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Author</label>
                        <input
                            required
                            name="author"
                            value={formData.author}
                            onChange={handleChange}
                            className={styles.input}
                        />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Description (TR)</label>
                    <textarea
                        required
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className={styles.textarea}
                        style={{ minHeight: '80px' }}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Description (EN)</label>
                    <textarea
                        name="description_en"
                        value={formData.description_en}
                        onChange={handleChange}
                        className={styles.textarea}
                        style={{ minHeight: '80px' }}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Tags (comma separated)</label>
                    <input
                        name="tags"
                        value={formData.tags}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="battery, power, saver"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Template JSON Structure</label>
                    <textarea
                        required
                        name="template_json"
                        value={formData.template_json}
                        onChange={handleChange}
                        className={styles.textarea}
                        style={{ fontFamily: 'monospace', minHeight: '200px' }}
                    />
                </div>

                <div className={styles.actions}>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`${styles.button} ${styles.primaryButton}`}
                    >
                        {loading ? 'Creating...' : 'Create Shortcut'}
                    </button>
                </div>
            </form>
        </div>
    );
}

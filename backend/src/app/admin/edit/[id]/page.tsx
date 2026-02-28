
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../admin.module.css';
import { withAdminAuthHeaders } from '@/lib/admin-client-auth';

const CATEGORIES = ['Battery', 'Security', 'Productivity', 'Lifestyle', 'Social', 'Health', 'Travel'];

import AIAutofill from '@/components/admin/AIAutofill';

export default function EditTemplatePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        title_en: '',
        description: '',
        description_en: '',
        category: 'Productivity',
        author: '',
        downloads: '0',
        tags: '',
        template_json: '{}'
    });

    const fetchTemplate = useCallback(async () => {
        try {
            const headers = await withAdminAuthHeaders();
            const res = await fetch(`/api/admin/templates/${id}`, { headers });
            const data = await res.json();

            if (data.success && data.template) {
                const t = data.template;
                setFormData({
                    title: t.title || '',
                    title_en: t.title_en || '',
                    description: t.description || '',
                    description_en: t.description_en || '',
                    category: t.category || 'Productivity',
                    author: t.author || '',
                    downloads: t.downloads || '0',
                    tags: Array.isArray(t.tags) ? t.tags.join(', ') : (t.tags || ''),
                    template_json: JSON.stringify(t.template_json || {}, null, 2)
                });
            } else {
                setError('Template not found');
            }
        } catch {
            setError('Failed to fetch template details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTemplate();
    }, [fetchTemplate]);

    const handleAutofill = (data: Record<string, unknown>) => {
        const safeTags = Array.isArray(data.tags)
            ? data.tags.filter((tag): tag is string => typeof tag === 'string').join(', ')
            : typeof data.tags === 'string'
                ? data.tags
                : undefined;

        const safeTemplateJson =
            data.template_json && typeof data.template_json === 'object'
                ? data.template_json
                : {};

        setFormData(prev => ({
            ...prev,
            title: typeof data.title === 'string' ? data.title : prev.title,
            title_en: typeof data.title_en === 'string' ? data.title_en : prev.title_en,
            description: typeof data.description === 'string' ? data.description : prev.description,
            description_en: typeof data.description_en === 'string' ? data.description_en : prev.description_en,
            category: typeof data.category === 'string' ? data.category : prev.category,
            tags: safeTags || prev.tags,
            template_json: JSON.stringify(safeTemplateJson, null, 2)
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            // Parse tags
            const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

            // Validate JSON
            let parsedJson = {};
            try {
                parsedJson = JSON.parse(formData.template_json);
            } catch {
                setError('Invalid JSON format in Template Data');
                setSaving(false);
                return;
            }

            const payload = {
                ...formData,
                tags: tagsArray,
                template_json: parsedJson
            };

            const headers = await withAdminAuthHeaders({ 'Content-Type': 'application/json' });
            const res = await fetch(`/api/admin/templates/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                router.push('/admin');
            } else {
                setError(data.error || 'Failed to update template');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading Template...</div>;
    if (error && !formData.title) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Edit Shortcut</h1>
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
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Title (EN)</label>
                        <input
                            name="title_en"
                            value={formData.title_en}
                            onChange={handleChange}
                            className={styles.input}
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
                    <label className={styles.label}>Downloads (Manually Override)</label>
                    <input
                        name="downloads"
                        value={formData.downloads}
                        onChange={handleChange}
                        className={styles.input}
                    />
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
                        disabled={saving}
                        className={`${styles.button} ${styles.primaryButton}`}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}

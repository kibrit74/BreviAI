
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../admin.module.css';

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

    useEffect(() => {
        fetchTemplate();
    }, [id]);

    const fetchTemplate = async () => {
        try {
            const res = await fetch(`/api/admin/templates/${id}`);
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
        } catch (err) {
            setError('Failed to fetch template details');
        } finally {
            setLoading(false);
        }
    };

    const handleAutofill = (data: any) => {
        setFormData(prev => ({
            ...prev,
            title: data.title || prev.title,
            title_en: data.title_en || prev.title_en,
            description: data.description || prev.description,
            description_en: data.description_en || prev.description_en,
            category: data.category || prev.category,
            tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || prev.tags),
            template_json: JSON.stringify(data.template_json || {}, null, 2)
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
            } catch (err) {
                setError('Invalid JSON format in Template Data');
                setSaving(false);
                return;
            }

            const payload = {
                ...formData,
                tags: tagsArray,
                template_json: parsedJson
            };

            const res = await fetch(`/api/admin/templates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                router.push('/admin');
            } else {
                setError(data.error || 'Failed to update template');
            }
        } catch (err) {
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


'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './admin.module.css';

interface Template {
    id: string;
    title: string;
    description: string;
    category: string;
    downloads: string;
    author: string;
}

export default function AdminDashboard() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/templates');
            const data = await res.json();
            if (data.success) {
                setTemplates(data.templates);
            } else {
                setError(data.error || 'Failed to load templates');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            const res = await fetch(`/api/admin/templates/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                setTemplates(templates.filter(t => t.id !== id));
            } else {
                alert('Failed to delete: ' + data.error);
            }
        } catch (err) {
            alert('Error deleting template');
        }
    };

    if (loading) return <div className={styles.loading}>Loading Dashboard...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>BreviAI Admin</h1>
                <Link href="/admin/new" className={styles.primaryButton}>
                    <span>+</span> Add Shortcut
                </Link>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.grid}>
                {templates.map(template => (
                    <div key={template.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>{template.title}</h3>
                            <span className={styles.cardBadge}>{template.category}</span>
                        </div>
                        <p className={styles.cardDescription}>{template.description}</p>
                        <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
                            Author: {template.author} • Downloads: {template.downloads}
                        </div>
                        <div className={styles.cardActions}>
                            <Link href={`/admin/edit/${template.id}`} className={`${styles.button} ${styles.secondaryButton}`}>
                                Edit
                            </Link>
                            <button
                                onClick={() => handleDelete(template.id)}
                                className={`${styles.button} ${styles.dangerButton}`}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

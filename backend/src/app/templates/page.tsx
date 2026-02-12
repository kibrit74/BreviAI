'use client';

import React, { useState, useMemo } from 'react';
import styles from './templates.module.css';
import { SEED_TEMPLATES } from '@/data/seed_templates';
import { ShortcutTemplate } from '@/data/types';
import TemplateCard from '@/components/TemplateCard';

const CATEGORIES = ['All', 'Battery', 'Security', 'Productivity', 'Lifestyle', 'Social', 'Health', 'Travel'];

export default function TemplateLibrary() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const filteredTemplates = useMemo(() => {
        return SEED_TEMPLATES.filter(template => {
            const matchesSearch =
                template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    const handleUse = (template: ShortcutTemplate) => {
        // Logic to load template into editor (to be implemented)
        console.log('Using template:', template.id);
        alert(`"${template.title}" şablonu yüklendi! (Demo)`);
    };

    const handleEdit = (template: ShortcutTemplate) => {
        // Logic to open editor with this template (to be implemented)
        console.log('Editing template:', template.id);
        alert(`"${template.title}" düzenleme modunda açılıyor... (Demo)`);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Kestirme Kütüphanesi</h1>
                <p className={styles.subtitle}>Hayatınızı kolaylaştıracak 50+ hazır otomasyon şablonu.</p>
            </header>

            <div className={styles.controls}>
                <div className={styles.searchContainer}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        placeholder="Kestirme ara... (örn: 'pil', 'güvenlik', 'whatsapp')"
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.filterBar}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        className={`${styles.filterBtn} ${selectedCategory === cat ? styles.filterBtnActive : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {filteredTemplates.length > 0 ? (
                <div className={styles.grid}>
                    {filteredTemplates.map(template => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onUse={handleUse}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    Aradığınız kriterlere uygun şablon bulunamadı. 😔
                </div>
            )}
        </div>
    );
}

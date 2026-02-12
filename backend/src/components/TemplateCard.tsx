import React from 'react';
import styles from './TemplateCard.module.css';
import { ShortcutTemplate } from '@/data/types';

interface TemplateCardProps {
    template: ShortcutTemplate;
    onUse: (template: ShortcutTemplate) => void;
    onEdit: (template: ShortcutTemplate) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onUse, onEdit }) => {
    const getCategoryClass = (category: string) => {
        switch (category) {
            case 'Battery': return styles.catBattery;
            case 'Security': return styles.catSecurity;
            case 'Productivity': return styles.catProductivity;
            case 'Lifestyle': return styles.catLifestyle;
            case 'Social': return styles.catSocial;
            case 'Health': return styles.catHealth;
            case 'Travel': return styles.catTravel;
            default: return styles.catProductivity; // Default fallback
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3 className={styles.title}>{template.title}</h3>
                <span className={`${styles.categoryBadge} ${getCategoryClass(template.category)}`}>
                    {template.category}
                </span>
            </div>

            <p className={styles.description}>{template.description}</p>

            <div className={styles.tags}>
                {template.tags.slice(0, 3).map(tag => (
                    <span key={tag} className={styles.tag}>#{tag}</span>
                ))}
            </div>

            <div className={styles.footer}>
                <div className={styles.stats}>
                    <span className={styles.statItem}>⬇ {template.downloads}</span>
                    <span className={styles.statItem}>👤 {template.author}</span>
                </div>
                <div className={styles.actions}>
                    <button className={`${styles.btn} ${styles.btnEdit}`} onClick={() => onEdit(template)}>
                        Düzenle
                    </button>
                    <button className={`${styles.btn} ${styles.btnUse}`} onClick={() => onUse(template)}>
                        Kullan
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TemplateCard;

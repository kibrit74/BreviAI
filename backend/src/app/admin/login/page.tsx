
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured, supabase, supabaseConfigError } from '@/lib/supabase';
import styles from '../admin.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const configurationError = !isSupabaseConfigured
        ? (supabaseConfigError || 'Supabase configuration is missing.')
        : '';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSupabaseConfigured) {
            setError(configurationError);
            return;
        }
        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                setLoading(false);
            } else {
                router.push('/admin');
                router.refresh();
            }
        } catch (err) {
            setError('An unexpected error occurred');
            setLoading(false);
        }
    };

    return (
        <div className={styles.container} style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className={styles.form} style={{ width: '100%', maxWidth: '400px' }}>
                <h1 className={styles.title} style={{ marginBottom: '2rem', textAlign: 'center' }}>Admin Login</h1>

                {configurationError && <div className={styles.error}>{configurationError}</div>}
                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.input}
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder="••••••••"
                        />
                    </div>

                    <div className={styles.actions} style={{ justifyContent: 'center' }}>
                        <button
                            type="submit"
                            disabled={loading || !isSupabaseConfigured}
                            className={`${styles.button} ${styles.primaryButton}`}
                            style={{ width: '100%' }}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

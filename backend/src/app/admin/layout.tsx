
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './admin.module.css';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                if (pathname !== '/admin/login') {
                    router.push('/admin/login');
                }
                setAuthenticated(false);
            } else {
                setAuthenticated(true);
                if (pathname === '/admin/login') {
                    router.push('/admin');
                }
            }
            setLoading(false);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                setAuthenticated(false);
                router.push('/admin/login');
            } else if (session) {
                setAuthenticated(true);
            }
        });

        return () => subscription.unsubscribe();
    }, [pathname, router]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div className="spinner"></div>
                    <div>Verifying Access...</div>
                </div>
            </div>
        );
    }

    // If not authenticated and not on login page, we are redirecting, so don't show content
    if (!authenticated && pathname !== '/admin/login') {
        return null;
    }

    return (
        <div style={{ minHeight: '100vh' }}>
            {authenticated && pathname !== '/admin/login' && (
                <nav style={{
                    padding: '1rem 2rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className={`${styles.button} ${styles.secondaryButton}`}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                    >
                        Sign Out
                    </button>
                </nav>
            )}
            {children}
        </div>
    );
}

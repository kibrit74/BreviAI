
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isSupabaseConfigured, supabase, supabaseConfigError } from '@/lib/supabase';
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
    const [configError, setConfigError] = useState('');

    useEffect(() => {
        let subscription: { unsubscribe: () => void } | null = null;
        let cancelled = false;

        const safeSetLoading = (value: boolean) => {
            if (!cancelled) setLoading(value);
        };

        const safeSetAuthenticated = (value: boolean) => {
            if (!cancelled) setAuthenticated(value);
        };

        const safeSetConfigError = (value: string) => {
            if (!cancelled) setConfigError(value);
        };

        const getSessionWithTimeout = async (timeoutMs = 5000) => {
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Auth check timeout')), timeoutMs);
            });
            return Promise.race([supabase.auth.getSession(), timeoutPromise]);
        };

        if (!isSupabaseConfigured) {
            safeSetAuthenticated(false);
            safeSetConfigError(supabaseConfigError || 'Supabase configuration missing.');
            if (pathname !== '/admin/login') {
                router.push('/admin/login');
            }
            safeSetLoading(false);
            return;
        }

        // Login page should always render form; do not block on auth check here.
        if (pathname === '/admin/login') {
            safeSetLoading(false);
            safeSetAuthenticated(false);

            supabase.auth.getSession()
                .then(({ data: { session } }) => {
                    if (!cancelled && session) {
                        router.replace('/admin');
                    }
                })
                .catch((error) => {
                    console.error('Login route auth precheck failed:', error);
                    safeSetConfigError('Authentication service is temporarily unavailable.');
                });

            try {
                const authListener = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_OUT') {
                        safeSetAuthenticated(false);
                        return;
                    }
                    if (session) {
                        safeSetAuthenticated(true);
                        router.replace('/admin');
                    }
                });
                subscription = authListener.data.subscription;
            } catch (error) {
                console.error('Auth listener init failed on login route:', error);
            }

            return () => {
                cancelled = true;
                if (subscription) {
                    subscription.unsubscribe();
                }
            };
        }

        const checkAuth = async () => {
            try {
                const sessionResult = await getSessionWithTimeout();
                const { data: { session } } = sessionResult as Awaited<ReturnType<typeof supabase.auth.getSession>>;

                if (!session) {
                    router.push('/admin/login');
                    safeSetAuthenticated(false);
                } else {
                    safeSetAuthenticated(true);
                }
            } catch (error) {
                console.error('Admin auth check failed:', error);
                safeSetAuthenticated(false);
                safeSetConfigError('Authentication check failed. Verify Supabase settings.');
                router.push('/admin/login');
            } finally {
                safeSetLoading(false);
            }
        };

        checkAuth();

        try {
            const authListener = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT') {
                    safeSetAuthenticated(false);
                    router.push('/admin/login');
                } else if (session) {
                    safeSetAuthenticated(true);
                }
            });
            subscription = authListener.data.subscription;
        } catch (error) {
            console.error('Auth listener init failed:', error);
            safeSetConfigError('Authentication listener failed to initialize.');
        }

        return () => {
            cancelled = true;
            if (subscription) {
                subscription.unsubscribe();
            }
        };
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
            {configError && pathname === '/admin/login' && (
                <div style={{
                    margin: '1rem auto 0',
                    maxWidth: '900px',
                    padding: '0.75rem 1rem',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '8px',
                    color: '#fecaca',
                    background: 'rgba(127, 29, 29, 0.25)',
                }}>
                    {configError}
                </div>
            )}
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

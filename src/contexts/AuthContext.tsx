import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type User, type Session, type AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthModalOpen: boolean;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    signInWithGoogle: () => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setIsLoading(false);
            return;
        }

        // 1. Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        }).catch((err) => {
            console.error('Session retrieval error:', err);
            setIsLoading(false);
        });

        // 2. Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);

            if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const openAuthModal = () => {
        setIsAuthModalOpen(true);
    };

    const closeAuthModal = () => {
        setIsAuthModalOpen(false);
    };

    const signInWithGoogle = async () => {
        if (!isSupabaseConfigured) {
            const mockUser = {
                id: `google-user-${Date.now()}`,
                email: 'user@gmail.com',
                app_metadata: { provider: 'google' },
                user_metadata: { name: 'Google User', avatar_url: '' },
                aud: 'authenticated',
                created_at: new Date().toISOString()
            } as User;
            setUser(mockUser);
            setIsAuthModalOpen(false);
            return { error: null };
        }

        const result = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        return { error: result.error };
    };

    const signOut = async () => {
        if (isSupabaseConfigured) {
            await supabase.auth.signOut();
        }
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            isLoading,
            isAuthModalOpen,
            openAuthModal,
            closeAuthModal,
            signInWithGoogle,
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

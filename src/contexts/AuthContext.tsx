import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type User, type Session, type AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthModalOpen: boolean;
    authModalTab: 'login' | 'signup';
    openAuthModal: (tab?: 'login' | 'signup') => void;
    closeAuthModal: () => void;
    signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null; user: User | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
    const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');

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

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const openAuthModal = (tab: 'login' | 'signup' = 'login') => {
        setAuthModalTab(tab);
        setIsAuthModalOpen(true);
    };

    const closeAuthModal = () => {
        setIsAuthModalOpen(false);
    };

    const signInWithEmail = async (email: string, password: string) => {
        if (!isSupabaseConfigured) {
            // Mock local user session if Supabase keys are pending
            const mockUser = {
                id: `mock-user-${Date.now()}`,
                email,
                app_metadata: {},
                user_metadata: { name: email.split('@')[0] },
                aud: 'authenticated',
                created_at: new Date().toISOString()
            } as User;
            setUser(mockUser);
            setIsAuthModalOpen(false);
            return { error: null };
        }

        const result = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (!result.error) {
            setIsAuthModalOpen(false);
        }

        return { error: result.error };
    };

    const signUpWithEmail = async (email: string, password: string) => {
        if (!isSupabaseConfigured) {
            const mockUser = {
                id: `mock-user-${Date.now()}`,
                email,
                app_metadata: {},
                user_metadata: { name: email.split('@')[0] },
                aud: 'authenticated',
                created_at: new Date().toISOString()
            } as User;
            setUser(mockUser);
            setIsAuthModalOpen(false);
            return { error: null, user: mockUser };
        }

        const result = await supabase.auth.signUp({
            email,
            password
        });

        if (!result.error && result.data.user) {
            setIsAuthModalOpen(false);
        }

        return { error: result.error, user: result.data.user };
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
            authModalTab,
            openAuthModal,
            closeAuthModal,
            signInWithEmail,
            signUpWithEmail,
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

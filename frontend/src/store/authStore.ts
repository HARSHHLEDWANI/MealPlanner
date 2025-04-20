import { create } from 'zustand';
import { supabase, signInWithOTP, signOut, getCurrentUser } from '../lib/supabase';
import { User, AuthState } from '../types';

interface AuthStore {
  user: User | null;
  authState: AuthState;
  error: string | null;
  signIn: (email: string) => Promise<{ success: boolean, error: string | null }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  authState: 'LOADING',
  error: null,

  signIn: async (email: string) => {
    try {
      const { error } = await signInWithOTP(email);
      
      if (error) {
        set({ error: error.message });
        return { success: false, error: error.message };
      }
      
      return { success: true, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    await signOut();
    set({ user: null, authState: 'UNAUTHENTICATED', error: null });
  },

  checkAuth: async () => {
    try {
      const { user, error } = await getCurrentUser();
      
      if (error || !user) {
        set({ user: null, authState: 'UNAUTHENTICATED', error: error?.message || null });
        return;
      }
      
      set({ 
        user: { 
          id: user.id, 
          email: user.email || undefined,
          phone: user.phone || undefined
        }, 
        authState: 'AUTHENTICATED', 
        error: null 
      });
    } catch (error) {
      set({ 
        user: null, 
        authState: 'UNAUTHENTICATED', 
        error: error instanceof Error ? error.message : 'Authentication check failed' 
      });
    }
  }
}));

// Subscribe to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    useAuthStore.getState().checkAuth();
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, authState: 'UNAUTHENTICATED' });
  }
});
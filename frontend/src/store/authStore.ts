import { create } from 'zustand';
import { User, AuthState } from '../types';
import { supabase } from '../lib/supabase';

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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, authState: 'UNAUTHENTICATED', error: null });
    } catch (error) {
      console.error('Logout error:', error);
      set({ user: null, authState: 'UNAUTHENTICATED', error: null });
    }
  },

  checkAuth: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        set({ user: null, authState: 'UNAUTHENTICATED', error: error.message });
        return;
      }

      if (user) {
        set({ 
          user: { 
            id: user.id, 
            email: user.email || undefined,
            phone: user.phone || undefined
          }, 
          authState: 'AUTHENTICATED', 
          error: null 
        });
      } else {
        set({ user: null, authState: 'UNAUTHENTICATED', error: null });
      }
    } catch (error) {
      set({ 
        user: null, 
        authState: 'UNAUTHENTICATED', 
        error: error instanceof Error ? error.message : 'Authentication check failed' 
      });
    }
  }
}));
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => ({ data: null, error: null }),
  signIn: async () => ({ data: null, error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getClient();

  useEffect(() => {
    // Clear corrupted Supabase cookies that cause "Invalid value" fetch errors
    const clearCorruptedCookies = () => {
      document.cookie.split(';').forEach((c) => {
        const name = c.trim().split('=')[0];
        if (name.startsWith('sb-') && name.endsWith('-auth-token')) {
          const val = c.trim().split('=').slice(1).join('=');
          // Corrupted if the value is empty, "undefined", or clearly broken
          if (!val || val === 'undefined' || val === 'null' || val.length < 10) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          }
        }
      });
    };
    clearCorruptedCookies();

    supabase.auth.getSession().then((res: any) => {
      setUser(res.data?.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signUp = async (email: string, password: string, username: string) => {
    const doSignUp = async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) return { data, error };
      if (data?.user) {
        await supabase
          .from('profiles')
          .upsert({ id: data.user.id, username }, { onConflict: 'id' })
          .select();
      }
      return { data, error: null };
    };

    try {
      return await doSignUp();
    } catch (e: any) {
      if (e?.message?.includes('Invalid value')) {
        document.cookie.split(';').forEach((c) => {
          const name = c.trim().split('=')[0];
          if (name.startsWith('sb-')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          }
        });
        return await doSignUp();
      }
      return { data: null, error: e };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return { data, error };
    } catch (e: any) {
      // "Invalid value" fetch error = corrupted cookies — clear them and retry once
      if (e?.message?.includes('Invalid value')) {
        document.cookie.split(';').forEach((c) => {
          const name = c.trim().split('=')[0];
          if (name.startsWith('sb-')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          }
        });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error };
      }
      return { data: null, error: e };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

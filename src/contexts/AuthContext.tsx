import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEY } from '@/i18n';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Load user's language preference when they log in
        if (session?.user) {
          setTimeout(() => {
            supabase
              .from('profiles')
              .select('language')
              .eq('id', session.user.id)
              .single()
              .then(({ data }) => {
                if (data?.language) {
                  i18n.changeLanguage(data.language);
                  localStorage.setItem(STORAGE_KEY, data.language);
                }
              });
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Load user's language preference on initial load
      if (session?.user) {
        supabase
          .from('profiles')
          .select('language')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.language) {
              i18n.changeLanguage(data.language);
              localStorage.setItem(STORAGE_KEY, data.language);
            }
          });
      }
    });

    return () => subscription.unsubscribe();
  }, [i18n]);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

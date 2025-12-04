import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEY } from '@/i18n';
import { toast } from 'sonner';

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
  const sessionCreatedAtRef = useRef<string | null>(null);

  // Listen for realtime broadcast to terminate session immediately
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`session-terminate-${user.id}`);
    
    channel
      .on('broadcast', { event: 'terminate' }, async (payload) => {
        console.log('[AuthContext] Received terminate broadcast:', payload);
        toast.info('Az adminisztrátor kijelentkeztette Önt');
        await supabase.auth.signOut();
      })
      .subscribe((status) => {
        console.log('[AuthContext] Session terminate channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Update session created time on new login
        if (event === 'SIGNED_IN' && session) {
          sessionCreatedAtRef.current = new Date().toISOString();
        }
        
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
      
      // Store initial session time
      if (session) {
        sessionCreatedAtRef.current = new Date().toISOString();
      }
      
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

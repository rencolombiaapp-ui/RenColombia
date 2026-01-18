import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Singleton para prevenir múltiples listeners con HMR
// Usar window para persistir a través de hot reloads
const AUTH_SUBSCRIPTION_KEY = '__RENCOLOMBIA_AUTH_SUBSCRIPTION__';

function getAuthSubscription() {
  if (typeof window !== 'undefined') {
    return (window as any)[AUTH_SUBSCRIPTION_KEY] as ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | undefined;
  }
  return undefined;
}

function setAuthSubscription(subscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null) {
  if (typeof window !== 'undefined') {
    (window as any)[AUTH_SUBSCRIPTION_KEY] = subscription;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    let isMounted = true;

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted && mountedRef.current) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    }).catch((err) => {
      console.error('[Auth] Error getting session:', err);
      if (isMounted && mountedRef.current) {
        setLoading(false);
      }
    });

    // Limpiar suscripción anterior SOLO si existe y es diferente (HMR)
    const existingSubscription = getAuthSubscription();
    if (existingSubscription && existingSubscription !== subscriptionRef.current) {
      // Desuscribir inmediatamente solo si es una suscripción huérfana de HMR
      try {
        existingSubscription.unsubscribe();
      } catch (e) {
        // Ignorar errores silenciosamente
      }
      setAuthSubscription(null);
    }

    // Limpiar referencia anterior solo si es diferente
    if (subscriptionRef.current && subscriptionRef.current !== existingSubscription) {
      try {
        subscriptionRef.current.unsubscribe();
      } catch (e) {
        // Ignorar errores
      }
    }

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted && mountedRef.current) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    subscriptionRef.current = subscription;
    setAuthSubscription(subscription);

    return () => {
      isMounted = false;
      mountedRef.current = false;
      
      // Cleanup inmediato pero seguro
      if (subscriptionRef.current === subscription) {
        try {
          subscriptionRef.current.unsubscribe();
        } catch (e) {
          // Ignorar errores
        }
        subscriptionRef.current = null;
      }
      
      const currentSubscription = getAuthSubscription();
      if (currentSubscription === subscription) {
        setAuthSubscription(null);
      }
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // En lugar de lanzar error, retornar valores por defecto seguros
    // Esto evita que la aplicación se rompa si el provider no está disponible
    console.warn("useAuth called outside AuthProvider, using default values");
    return {
      user: null,
      session: null,
      loading: false,
      signUp: async () => ({ error: new Error("AuthProvider not available") }),
      signIn: async () => ({ error: new Error("AuthProvider not available") }),
      signOut: async () => {},
    };
  }
  return context;
}

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'coach' | 'admin' | 'school_admin' | 'super_admin';
  avatarUrl?: string;
  mustChangePassword?: boolean;
}

// Login result type
export interface LoginResult {
  user: User;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<void>;
  clearMustChangePassword: () => void;
}

// Default context value
const defaultAuthContext: AuthContextType = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  mustChangePassword: false,
  login: async () => ({ user: {} as User, mustChangePassword: false }),
  logout: async () => {},
  checkAuth: async () => false,
  updatePassword: async () => {},
  clearMustChangePassword: () => {}
};

// Create context
export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to determine user role from Supabase user
// Returns null if user has no valid role
const determineUserRole = async (supabaseUser: SupabaseUser): Promise<'student' | 'coach' | 'admin' | 'school_admin' | 'super_admin' | null> => {
  if (!supabase) return null;

  // Check user_metadata first (set during account creation)
  const metadataRole = supabaseUser.user_metadata?.account_type;
  if (metadataRole) {
    return metadataRole as 'student' | 'coach' | 'admin' | 'school_admin' | 'super_admin';
  }

  // Fallback: check tables in order of priority
  const userId = supabaseUser.id;

  // Check super_admins
  const { data: superAdmin } = await supabase.from('super_admins').select('id').eq('id', userId).single();
  if (superAdmin) return 'super_admin';

  // Check school_admins
  const { data: schoolAdmin } = await supabase.from('school_admins').select('id').eq('id', userId).single();
  if (schoolAdmin) return 'school_admin';

  // Check coaches
  const { data: coach } = await supabase.from('coaches').select('id').eq('id', userId).single();
  if (coach) return 'coach';

  // Check students
  const { data: student } = await supabase.from('students').select('id').eq('id', userId).single();
  if (student) return 'student';

  // No valid role found
  return null;
};

// Helper function to convert Supabase user to our User type
// Returns null if user has no valid role
const mapSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User | null> => {
  const role = await determineUserRole(supabaseUser);

  // If no valid role found, return null
  if (!role) {
    return null;
  }

  return {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Utilisateur',
    email: supabaseUser.email || '',
    role,
    avatarUrl: supabaseUser.user_metadata?.avatar_url || '',
    mustChangePassword: supabaseUser.user_metadata?.must_change_password || false
  };
};

// Auth provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Check if user is authenticated on mount and listen for auth changes
  useEffect(() => {
    if (!supabase) {
      console.warn('[Auth] Supabase not configured, running in demo mode');
      setIsLoading(false);
      return;
    }

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const mappedUser = await mapSupabaseUser(session.user);
          if (mappedUser) {
            setUser(mappedUser);
            setMustChangePassword(mappedUser.mustChangePassword || false);
          } else {
            // User has no valid role, sign them out
            await supabase.auth.signOut();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const mappedUser = await mapSupabaseUser(session.user);
        if (mappedUser) {
          setUser(mappedUser);
          setMustChangePassword(mappedUser.mustChangePassword || false);
        } else {
          // User has no valid role, sign them out
          await supabase.auth.signOut();
          setUser(null);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setMustChangePassword(false);
      } else if (event === 'USER_UPDATED' && session?.user) {
        const mappedUser = await mapSupabaseUser(session.user);
        if (mappedUser) {
          setUser(mappedUser);
          setMustChangePassword(mappedUser.mustChangePassword || false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check authentication status
  const checkAuth = async (): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const mappedUser = await mapSupabaseUser(session.user);

        // If user has no valid role, sign them out
        if (!mappedUser) {
          await supabase.auth.signOut();
          setUser(null);
          return false;
        }

        setUser(mappedUser);
        setMustChangePassword(mappedUser.mustChangePassword || false);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  };

  // Login function with Supabase Auth
  const login = async (email: string, password: string): Promise<LoginResult> => {
    if (!supabase) {
      throw new Error('Supabase non configuré. Veuillez configurer les variables d\'environnement.');
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Aucun utilisateur retourné');
      }

      const mappedUser = await mapSupabaseUser(data.user);

      // If user has no valid role, sign them out and reject login
      if (!mappedUser) {
        await supabase.auth.signOut();
        throw new Error('Compte non autorisé. Veuillez contacter l\'administrateur.');
      }

      const needsPasswordChange = data.user.user_metadata?.must_change_password === true;

      setUser(mappedUser);
      setMustChangePassword(needsPasswordChange);

      return {
        user: mappedUser,
        mustChangePassword: needsPasswordChange
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update password function
  const updatePassword = async (newPassword: string): Promise<void> => {
    if (!supabase) {
      throw new Error('Supabase non configuré');
    }

    try {
      setIsLoading(true);

      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (passwordError) {
        throw passwordError;
      }

      // Update metadata to remove must_change_password flag
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          must_change_password: false,
          first_login: false,
          password_changed_at: new Date().toISOString()
        }
      });

      if (metadataError) {
        throw metadataError;
      }

      // Update local state
      setMustChangePassword(false);
      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear must change password flag (for UI purposes)
  const clearMustChangePassword = () => {
    setMustChangePassword(false);
  };

  // Logout function
  const logout = async (): Promise<void> => {
    if (!supabase) {
      setUser(null);
      setMustChangePassword(false);
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // Clear user state
      setUser(null);
      setMustChangePassword(false);

      // Clear any cached data
      sessionStorage.clear();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    mustChangePassword,
    login,
    logout,
    checkAuth,
    updatePassword,
    clearMustChangePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
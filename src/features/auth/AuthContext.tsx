import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';
import { clearAppStore, restoreAppStore } from '@/features/family/familyStore';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isFamilyHead: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, phone?: string) => Promise<{ error?: string }>;
  updatePasswordDirectly: (newPassword: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ success?: boolean; email?: string; error?: string }>;
  sendResetOtp: (identifier: string) => Promise<{ success?: boolean; email?: string; error?: string }>;
  verifyOtpAndResetPassword: (email: string, otp: string, newPassword: string) => Promise<{ success?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'cf_persistent_auth_user_v1';

async function savePersistentAuth(user: User | null, profile: Profile | null): Promise<void> {
  try {
    if (!user) {
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
      }
      return;
    }

    const payload = JSON.stringify({ user, profile });
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, payload);
      }
    } else {
      await SecureStore.setItemAsync(AUTH_STORAGE_KEY, payload);
    }
  } catch (err) {
    console.warn('Failed to save persistent auth session:', err);
  }
}

async function loadPersistentAuth(): Promise<{ user: User | null; profile: Profile | null }> {
  try {
    let payload: string | null = null;
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.localStorage) {
        payload = window.localStorage.getItem(AUTH_STORAGE_KEY);
      }
    } else {
      payload = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
    }

    if (payload) {
      const parsed = JSON.parse(payload);
      return { user: parsed.user || null, profile: parsed.profile || null };
    }
  } catch (err) {
    console.warn('Failed to load persistent auth session:', err);
  }
  return { user: null, profile: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile:', error.message);
        return;
      }

      if (data) {
        setProfile(data as Profile);
        if (user) {
          await savePersistentAuth(user, data as Profile);
        }
      } else {
        const fallbackProfile: Profile = {
          id: userId,
          auth_user_id: userId,
          email: user?.email ?? null,
          phone: null,
          role: 'FAMILY_HEAD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        if (user) {
          await savePersistentAuth(user, fallbackProfile);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch profile:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // 1. Restore local app data & persistent auth
      await restoreAppStore();
      const stored = await loadPersistentAuth();

      if (stored.user) {
        setUser(stored.user);
        setProfile(stored.profile);
      }

      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        // 2. Check Supabase online session
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (session && session.user) {
          setSession(session);
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (stored.user) {
          // If offline or network slow, retain the valid stored persistent user
          setUser(stored.user);
          setProfile(stored.profile);
        }
      } catch (err) {
        console.warn('Error checking supabase session on boot:', err);
        // Retain local persistent user even if network request fails
        if (stored.user) {
          setUser(stored.user);
          setProfile(stored.profile);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 3. Listen for auth state changes from Supabase
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event: string, session: any) => {
          setSession(session);
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const resolveEmailFromIdentifier = async (identifier: string): Promise<string | null> => {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return trimmed;
    }

    // It's a mobile number: clean digits and lookup
    const cleanMobile = trimmed.replace(/[^0-9]/g, '');
    const last10 = cleanMobile.slice(-10);

    if (last10.length < 7) {
      return null;
    }

    if (!isSupabaseConfigured) {
      return `${cleanMobile}@community.dabgar.org`;
    }

    try {
      // 1. Check profiles table by phone
      const { data: profData } = await supabase
        .from('profiles')
        .select('email')
        .ilike('phone', `%${last10}%`)
        .limit(1)
        .maybeSingle();

      if (profData?.email) {
        return profData.email;
      }

      // 2. Check family_members table by mobile
      const { data: memberData } = await supabase
        .from('family_members')
        .select('family_id')
        .ilike('mobile', `%${last10}%`)
        .limit(1)
        .maybeSingle();

      if (memberData?.family_id) {
        const { data: famData } = await supabase
          .from('families')
          .select('head_user_id')
          .eq('id', memberData.family_id)
          .maybeSingle();

        if (famData?.head_user_id) {
          const { data: pData } = await supabase
            .from('profiles')
            .select('email')
            .eq('auth_user_id', famData.head_user_id)
            .maybeSingle();

          if (pData?.email) {
            return pData.email;
          }
        }
      }
    } catch (err) {
      console.warn('Error resolving email from phone:', err);
    }

    return null;
  };

  const signInWithEmail = async (identifier: string, password: string) => {
    const resolvedEmail = await resolveEmailFromIdentifier(identifier);

    if (!resolvedEmail && !identifier.includes('@')) {
      return { error: 'આ મોબાઈલ નંબર સાથે કોઈ એકાઉન્ટ મળ્યું નથી. કૃપા કરીને સાચો નંબર અથવા ઈમેઈલ નાખો.' };
    }

    const emailToUse = resolvedEmail || identifier.trim();

    if (!isSupabaseConfigured) {
      const mockUser = { id: 'user-' + Date.now(), email: emailToUse } as User;
      const mockProfile: Profile = {
        id: 'prof-' + Date.now(),
        auth_user_id: mockUser.id,
        email: emailToUse,
        phone: identifier.includes('@') ? null : identifier.trim(),
        role: 'FAMILY_HEAD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(mockUser);
      setProfile(mockProfile);
      await savePersistentAuth(mockUser, mockProfile);
      return {};
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id);
      }
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Login failed' };
    }
  };

  const signUpWithEmail = async (email: string, password: string, phone?: string) => {
    if (!isSupabaseConfigured) {
      const mockUser = { id: 'user-' + Date.now(), email: email.trim() } as User;
      const mockProfile: Profile = {
        id: 'prof-' + Date.now(),
        auth_user_id: mockUser.id,
        email: email.trim(),
        phone: phone || null,
        role: 'FAMILY_HEAD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(mockUser);
      setProfile(mockProfile);
      await savePersistentAuth(mockUser, mockProfile);
      return {};
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            phone: phone?.trim(),
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        let activeUser = data.user;
        let activeSession = data.session;

        // If signup did not immediately provide an active session, sign in automatically
        if (!activeSession && password) {
          try {
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            });
            if (signInData?.session) {
              activeSession = signInData.session;
              activeUser = signInData.user || activeUser;
            }
          } catch {}
        }

        setUser(activeUser);
        setSession(activeSession);
        await savePersistentAuth(activeUser, profile);

        // Ensure profile has phone number recorded
        if (phone?.trim()) {
          try {
            await supabase
              .from('profiles')
              .update({ phone: phone.trim() })
              .eq('auth_user_id', activeUser.id);
          } catch {}
        }
        await fetchProfile(activeUser.id);
      }
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Signup failed' };
    }
  };

  const updatePasswordDirectly = async (newPassword: string): Promise<{ error?: string }> => {
    if (!newPassword || newPassword.length < 6) {
      return { error: 'પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ.' };
    }

    if (!isSupabaseConfigured) {
      return {};
    }

    try {
      // 1. Resolve active access token from state or Supabase client
      let activeSession = session;
      if (!activeSession?.access_token) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          activeSession = sessionData.session;
          setSession(sessionData.session);
        }
      }

      const token = activeSession?.access_token;

      // 2. If token is found, make direct authenticated PUT call with JWT (immune to "Auth session missing!")
      if (token) {
        const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
          method: 'PUT',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: newPassword }),
        });

        const data = await res.json();
        if (!res.ok) {
          return { error: data.msg || data.message || 'પાસવર્ડ અપડેટ કરવામાં સમસ્યા આવી.' };
        }

        return {};
      }

      // 3. Fallback to standard updateUser if direct token not available
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        if (error.message?.includes('Auth session missing')) {
          return {
            error: 'સુરક્ષા ખાતર પાસવર્ડ બદલવા માટે આપનું લૉગિન સેશન પૂરું થયું છે. કૃપા કરીને એકવાર ફરીથી લૉગિન કરો અથવા Forgot Password દ્વારા બદલો.',
          };
        }
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      return { error: err?.message || 'પાસવર્ડ અપડેટ કરવામાં સમસ્યા આવી.' };
    }
  };

  const resetPassword = async (identifier: string): Promise<{ success?: boolean; email?: string; error?: string }> => {
    const resolvedEmail = await resolveEmailFromIdentifier(identifier);
    if (!resolvedEmail) {
      return {
        error: identifier.includes('@')
          ? 'આ ઈમેઈલ એડ્રેસ સાથે કોઈ ખાતું (Account) નોંધાયેલું નથી.'
          : 'આ મોબાઈલ નંબર સાથે કોઈ એકાઉન્ટ મળ્યું નથી. કૃપા કરીને રજીસ્ટર્ડ નંબર અથવા ઈમેઈલ તપાસો.',
      };
    }

    if (!isSupabaseConfigured) {
      return { success: true, email: resolvedEmail };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resolvedEmail);
      if (error) {
        return { error: error.message };
      }
      return { success: true, email: resolvedEmail };
    } catch (err: any) {
      return { error: err?.message || 'પાસવર્ડ રીસેટ રિક્વેસ્ટ મોકલવામાં સમસ્યા આવી.' };
    }
  };

  const sendResetOtp = async (identifier: string): Promise<{ success?: boolean; email?: string; error?: string }> => {
    const resolvedEmail = await resolveEmailFromIdentifier(identifier);
    if (!resolvedEmail) {
      return {
        error: identifier.includes('@')
          ? 'આ ઈમેઈલ એડ્રેસ સાથે કોઈ ખાતું (Account) નોંધાયેલું નથી.'
          : 'આ મોબાઈલ નંબર સાથે કોઈ એકાઉન્ટ મળ્યું નથી. કૃપા કરીને રજીસ્ટર્ડ નંબર અથવા ઈમેઈલ તપાસો.',
      };
    }

    if (!isSupabaseConfigured) {
      return { success: true, email: resolvedEmail };
    }

    try {
      // Single, dedicated password reset OTP call (Uses Password Recovery Template)
      const { error } = await supabase.auth.resetPasswordForEmail(resolvedEmail);

      if (error) {
        if (
          error.message?.toLowerCase().includes('rate limit') ||
          (error as any).code === 'over_email_send_rate_limit' ||
          (error as any).status === 429
        ) {
          return {
            error: 'ઈમેઈલ મોકલવાની મર્યાદા (Rate Limit) ઓળંગાઈ છે. સિક્યોરિટી ખાતર કૃપા કરીને ૬૦ સેકન્ડ (૧ મિનિટ) રાહ જોઈને ફરીથી પ્રયત્ન કરો.',
          };
        }
        return { error: error.message };
      }

      return { success: true, email: resolvedEmail };
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('rate limit')) {
        return {
          error: 'ઈમેઈલ મોકલવાની મર્યાદા (Rate Limit) ઓળંગાઈ છે. કૃપા કરીને ૧ મિનિટ પછી ફરીથી પ્રયાસ કરો.',
        };
      }
      return { error: err?.message || 'OTP મોકલવામાં સમસ્યા આવી.' };
    }
  };

  const verifyOtpAndResetPassword = async (
    email: string,
    otp: string,
    newPassword: string
  ): Promise<{ success?: boolean; error?: string }> => {
    const cleanOtp = otp.replace(/[^0-9]/g, '').trim();

    if (!cleanOtp || cleanOtp.length < 6) {
      return { error: 'કૃપા કરીને આપના ઈમેઈલ પર આવેલ ૬ આંકડાનો OTP દાખલ કરો.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { error: 'નવો પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ.' };
    }

    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      // 1. Verify OTP with 'recovery' type (matches resetPasswordForEmail)
      let verifyRes = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanOtp,
        type: 'recovery',
      });

      // 2. Fallback to 'email' type if 'recovery' doesn't match
      if (verifyRes.error) {
        verifyRes = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: cleanOtp,
          type: 'email',
        });
      }

      if (verifyRes.error) {
        return { error: 'ખોટો અથવા એક્સપાયર થયેલ OTP છે. કૃપા કરીને છેલ્લે આવેલો સાચો OTP દાખલ કરો.' };
      }

      const session = verifyRes.data?.session;
      const accessToken = session?.access_token;

      if (!accessToken) {
        return { error: 'OTP વેરિફિકેશન સેશન મળ્યું નથી. કૃપા કરીને ફરીથી પ્રયત્ન કરો.' };
      }

      // 1. Immediately synchronize Supabase client session in memory
      try {
        await supabase.auth.setSession(session);
      } catch {}

      // 2. Directly update user password using the verified session JWT (Guarantees no "Auth session missing!")
      const updateRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const updateData = await updateRes.json();

      if (!updateRes.ok) {
        return { error: updateData.msg || updateData.message || 'પાસવર્ડ અપડેટ કરવામાં સમસ્યા આવી.' };
      }

      if (verifyRes.data?.user) {
        setUser(verifyRes.data.user);
        setSession(session);
        await savePersistentAuth(verifyRes.data.user, profile);
      }

      return { success: true };
    } catch (err: any) {
      return { error: err?.message || 'પાસવર્ડ અપડેટ કરવામાં સમસ્યા આવી.' };
    }
  };

  const signOut = async () => {
    await savePersistentAuth(null, null);
    await clearAppStore();

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }

    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const role = profile?.role ?? (user ? 'FAMILY_HEAD' : null);
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isFamilyHead = role === 'FAMILY_HEAD';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin,
        isFamilyHead,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        updatePasswordDirectly,
        resetPassword,
        sendResetOtp,
        verifyOtpAndResetPassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

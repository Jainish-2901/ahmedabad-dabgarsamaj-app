import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { AppStorage } from '@/lib/storage/appStorage';
import { supabase, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';
import { clearAppStore, resetInMemoryStore } from '@/features/family/familyStore';

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

export const AUTH_STORAGE_KEY = 'cf_persistent_auth_user_v2';

export async function savePersistentAuth(user: User | null, profile: Profile | null, session?: Session | null): Promise<void> {
  try {
    if (!user) {
      await AppStorage.removeItem(AUTH_STORAGE_KEY);
      await AppStorage.removeItem('cf_persistent_auth_user_v1');
      return;
    }

    const payload = JSON.stringify({ user, profile, session: session || null });
    await AppStorage.setItem(AUTH_STORAGE_KEY, payload);
  } catch (err) {
    console.warn('Failed to save persistent auth session:', err);
  }
}

export async function loadPersistentAuth(): Promise<{ user: User | null; profile: Profile | null; session: Session | null }> {
  try {
    let payload = await AppStorage.getItem(AUTH_STORAGE_KEY);
    if (!payload) {
      payload = await AppStorage.getItem('cf_persistent_auth_user_v1');
    }
    if (payload) {
      const parsed = JSON.parse(payload);
      return {
        user: parsed.user || null,
        profile: parsed.profile || null,
        session: parsed.session || null,
      };
    }
  } catch (err) {
    console.warn('Failed to load persistent auth session:', err);
  }
  return { user: null, profile: null, session: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isExplicitSigningOut = useRef<boolean>(false);

  const fetchProfile = async (userId: string, activeUser?: User | null, activeSession?: Session | null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();

      const effectiveUser = activeUser || user;
      const effectiveSession = activeSession || session;

      if (data) {
        setProfile(data as Profile);
        if (effectiveUser) {
          await savePersistentAuth(effectiveUser, data as Profile, effectiveSession);
        }
      } else {
        const fallbackProfile: Profile = {
          id: userId,
          auth_user_id: userId,
          email: effectiveUser?.email ?? null,
          phone: null,
          role: 'FAMILY_HEAD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        if (effectiveUser) {
          await savePersistentAuth(effectiveUser, fallbackProfile, effectiveSession);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch profile:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // 1. Restore persistent user immediately from local storage
      const stored = await loadPersistentAuth();

      if (stored.user) {
        setUser(stored.user);
        setProfile(stored.profile);
        if (stored.session) {
          setSession(stored.session);
        }
      } else {
        resetInMemoryStore();
      }

      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        // 2. Check Supabase online session
        const { data: { session: onlineSession } } = await supabase.auth.getSession();
        if (onlineSession && onlineSession.user) {
          setSession(onlineSession);
          setUser(onlineSession.user);

          // If the online user is different from what was previously stored, clear old cache immediately
          if (stored.user && stored.user.id !== onlineSession.user.id) {
            resetInMemoryStore();
            await clearAppStore(stored.user.id);
          }

          await fetchProfile(onlineSession.user.id, onlineSession.user, onlineSession);
        } else if (stored.session && !onlineSession) {
          // Keep session alive offline or during network slow-down
          try {
            const res = await supabase.auth.setSession({
              access_token: stored.session.access_token,
              refresh_token: stored.session.refresh_token,
            });
            if (res.data?.session) {
              setSession(res.data.session);
              setUser(res.data.session.user);
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Error checking supabase session on boot:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 3. Listen for auth state changes from Supabase
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: string, authSession: any) => {
          // STRICT: ONLY wipe user session when user EXPLICITLY clicked Log Out!
          // Supabase emits 'SIGNED_OUT' on cold boots or token refresh glitches; ignore unless explicit.
          if (event === 'SIGNED_OUT') {
            if (isExplicitSigningOut.current) {
              resetInMemoryStore();
              setUser(null);
              setSession(null);
              setProfile(null);
              await savePersistentAuth(null, null);
              await clearAppStore();
            }
            return;
          }

          if (authSession?.user) {
            isExplicitSigningOut.current = false;

            // If account was switched on this device, clear stale store immediately
            if (user && user.id !== authSession.user.id) {
              resetInMemoryStore();
              await clearAppStore(user.id);
            }

            setSession(authSession);
            setUser(authSession.user);
            await fetchProfile(authSession.user.id, authSession.user, authSession);
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const resolveCandidateEmails = async (identifier: string): Promise<string[]> => {
    const trimmed = identifier.trim();
    const candidates: string[] = [];

    if (trimmed.includes('@')) {
      const inputEmail = trimmed.toLowerCase();
      candidates.push(inputEmail);

      if (isSupabaseConfigured) {
        try {
          // Check if this inputEmail belongs to a member in family_members
          const { data: memberData } = await supabase
            .from('family_members')
            .select('id, email, can_edit_family, family_id, occupation_details')
            .or(`email.ilike.${inputEmail},occupation_details->>email.ilike.${inputEmail}`)
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

              if (pData?.email && !candidates.includes(pData.email.toLowerCase())) {
                candidates.push(pData.email.toLowerCase());
              }
            }
          }
        } catch (e) {
          console.warn('Error resolving candidate head email for input email:', e);
        }
      }
      return candidates;
    }

    // It's a mobile number: clean digits and lookup
    const cleanMobile = trimmed.replace(/[^0-9]/g, '');
    const last10 = cleanMobile.slice(-10);

    if (last10.length < 7) {
      return [];
    }

    if (!isSupabaseConfigured) {
      return [`${cleanMobile}@community.dabgar.org`];
    }

    try {
      // 1. Check profiles table by phone (Family Head)
      const { data: profData } = await supabase
        .from('profiles')
        .select('email')
        .ilike('phone', `%${last10}%`)
        .limit(1)
        .maybeSingle();

      if (profData?.email && !candidates.includes(profData.email.toLowerCase())) {
        candidates.push(profData.email.toLowerCase());
      }

      // 2. Check family_members table by mobile
      const { data: memberData } = await supabase
        .from('family_members')
        .select('email, occupation_details, can_edit_family, family_id')
        .ilike('mobile', `%${last10}%`)
        .limit(1)
        .maybeSingle();

      if (memberData) {
        const memEmail = memberData.email || (memberData.occupation_details as any)?.email;
        if (memEmail && !candidates.includes(memEmail.toLowerCase())) {
          candidates.push(memEmail.toLowerCase());
        }

        if (memberData.family_id) {
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

            if (pData?.email && !candidates.includes(pData.email.toLowerCase())) {
              candidates.push(pData.email.toLowerCase());
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error resolving candidate emails from phone:', err);
    }

    return candidates;
  };

  const resolveEmailFromIdentifier = async (identifier: string): Promise<string | null> => {
    const candidates = await resolveCandidateEmails(identifier);
    return candidates.length > 0 ? candidates[0] : null;
  };

  const signInWithEmail = async (identifier: string, password: string) => {
    isExplicitSigningOut.current = false;
    resetInMemoryStore();
    if (user?.id) {
      await clearAppStore(user.id);
    }

    const candidateEmails = await resolveCandidateEmails(identifier);

    if (candidateEmails.length === 0 && !identifier.includes('@')) {
      return { error: 'આ મોબાઈલ નંબર સાથે કોઈ એકાઉન્ટ અથવા સભ્ય મળ્યા નથી. કૃપા કરીને સાચો નંબર અથવા ઈમેઈલ નાખો.' };
    }

    if (candidateEmails.length === 0 && identifier.includes('@')) {
      candidateEmails.push(identifier.trim().toLowerCase());
    }

    if (!isSupabaseConfigured) {
      const emailToUse = candidateEmails[0] || identifier.trim();
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
      resetInMemoryStore();
      setUser(mockUser);
      setProfile(mockProfile);
      await savePersistentAuth(mockUser, mockProfile);
      return {};
    }

    let lastError: any = null;

    // Try candidate emails in order:
    // 1. Direct member email / phone-resolved member email
    // 2. Head email (enables permitted members to login using the family's original password!)
    for (const emailToTry of candidateEmails) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToTry,
          password,
        });

        if (!error && data?.user) {
          resetInMemoryStore();
          setUser(data.user);
          setSession(data.session);
          await savePersistentAuth(data.user, null, data.session);
          await fetchProfile(data.user.id, data.user, data.session);
          return {};
        }

        lastError = error;
      } catch (err: any) {
        lastError = err;
      }
    }

    return {
      error:
        lastError?.message === 'Invalid login credentials'
          ? 'પાસવર્ડ ખોટો છે અથવા આ ઈમેઈલ/મોબાઈલ નંબર નોંધાયેલ નથી. કૃપા કરીને ચકાસો.'
          : (lastError?.message || 'Login failed'),
    };
  };

  const signUpWithEmail = async (email: string, password: string, phone?: string) => {
    // 1. Force a clean slate: sign out of any previous session in Supabase and local storage
    isExplicitSigningOut.current = true;
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    resetInMemoryStore();
    await clearAppStore();
    await savePersistentAuth(null, null);
    setUser(null);
    setSession(null);
    setProfile(null);
    isExplicitSigningOut.current = false;

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
      resetInMemoryStore();
      setUser(mockUser);
      setProfile(mockProfile);
      await savePersistentAuth(mockUser, mockProfile);
      return {};
    }

    try {
      // 2. Security Check: Prevent existing family members from registering as new family heads
      if (phone?.trim()) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const last10 = cleanPhone.slice(-10);
        if (last10.length >= 7) {
          const { data: existingMember } = await supabase
            .from('family_members')
            .select('id, name, relation, family_id')
            .ilike('mobile', `%${last10}%`)
            .eq('status', 'ACTIVE')
            .limit(1)
            .maybeSingle();

          if (existingMember) {
            return {
              error: `આ મોબાઈલ નંબર (${phone.trim()}) પહેલેથી જ પરિવારના સભ્ય (${existingMember.name}) તરીકે નોંધાયેલ છે. આપ નવું પરિવાર ખાતું બનાવી શકતા નથી. કૃપા કરીને આપના પરિવારના વડા (Head) નો સંપર્ક કરો અથવા લૉગિન કરો.`,
            };
          }

          const { data: existingProf } = await supabase
            .from('profiles')
            .select('id')
            .ilike('phone', `%${last10}%`)
            .limit(1)
            .maybeSingle();

          if (existingProf) {
            return {
              error: `આ મોબાઈલ નંબર (${phone.trim()}) સાથે પહેલેથી જ ખાતું નોંધાયેલું છે. કૃપા કરીને લૉગિન કરો.`,
            };
          }
        }
      }

      if (email?.trim()) {
        const cleanEmail = email.trim().toLowerCase();
        const { data: existingMemberByEmail } = await supabase
          .from('family_members')
          .select('id, name, relation, family_id')
          .or(`email.ilike.${cleanEmail},occupation_details->>email.ilike.${cleanEmail}`)
          .eq('status', 'ACTIVE')
          .limit(1)
          .maybeSingle();

        if (existingMemberByEmail) {
          return {
            error: `આ ઈમેઈલ (${email.trim()}) પહેલેથી જ પરિવારના સભ્ય (${existingMemberByEmail.name}) તરીકે નોંધાયેલ છે. આપ નવું પરિવાર ખાતું બનાવી શકતા નથી. કૃપા કરીને લૉગિન કરો અથવા પરિવારના વડા (Head) નો સંપર્ક કરો.`,
          };
        }
      }

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

        resetInMemoryStore();
        setUser(activeUser);
        setSession(activeSession);
        setProfile(null);
        await savePersistentAuth(activeUser, null, activeSession);

        // Ensure profile has phone number recorded
        if (phone?.trim()) {
          try {
            await supabase
              .from('profiles')
              .update({ phone: phone.trim() })
              .eq('auth_user_id', activeUser.id);
          } catch {}
        }
        await fetchProfile(activeUser.id, activeUser, activeSession);
      }
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Signup failed' };
    }
  };

  const updatePasswordDirectly = async (newPassword: string): Promise<{ error?: string }> => {
    if (!newPassword || newPassword.length < 8) {
      return { error: 'પાસવર્ડ ઓછામાં ઓછો ૮ અક્ષરનો હોવો જોઈએ.' };
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
    const trimmed = identifier.trim();
    if (!trimmed) {
      return { error: 'કૃપા કરીને આપનો રજીસ્ટર્ડ મોબાઈલ નંબર અથવા ઈમેઈલ દાખલ કરો.' };
    }

    if (!isSupabaseConfigured) {
      const mockEmail = trimmed.includes('@') ? trimmed : `${trimmed}@community.dabgar.org`;
      return { success: true, email: mockEmail };
    }

    try {
      let targetEmail: string | null = null;

      if (trimmed.includes('@')) {
        const cleanEmail = trimmed.toLowerCase();

        // 1. Check if it's a family member's registered email
        const { data: memberData } = await supabase
          .from('family_members')
          .select('id, name, relation, can_edit_family, occupation_details')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (memberData) {
          const hasEditRights =
            memberData.can_edit_family === true ||
            (memberData.occupation_details as any)?.can_edit_family === true ||
            memberData.relation === 'FAMILY_HEAD';

          if (!hasEditRights) {
            return {
              error: 'આ સભ્ય પાસે પાસવર્ડ રીસેટ કરવાની પરવાનગી નથી. માત્ર પરિવારના વડા (Head) અથવા એડિટ પરવાનગી ધરાવતા સભ્યો જ રીસેટ કરી શકે છે.',
            };
          }

          targetEmail = cleanEmail;
        } else {
          // 2. Check if it's the head profile's email
          const { data: profData } = await supabase
            .from('profiles')
            .select('email')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (profData?.email) {
            targetEmail = profData.email;
          }
        }
      } else {
        // It's a mobile number: clean digits and lookup
        const cleanMobile = trimmed.replace(/[^0-9]/g, '');
        const last10 = cleanMobile.slice(-10);

        if (last10.length < 7) {
          return { error: 'કૃપા કરીને સાચો મોબાઈલ નંબર અથવા ઈમેઈલ દાખલ કરો.' };
        }

        // 1. Check family_members by mobile
        const { data: memberData } = await supabase
          .from('family_members')
          .select('id, name, relation, email, can_edit_family, occupation_details, family_id')
          .ilike('mobile', `%${last10}%`)
          .maybeSingle();

        if (memberData) {
          const hasEditRights =
            memberData.can_edit_family === true ||
            (memberData.occupation_details as any)?.can_edit_family === true ||
            memberData.relation === 'FAMILY_HEAD';

          if (!hasEditRights) {
            return {
              error: 'આ સભ્ય પાસે પાસવર્ડ રીસેટ કરવાની પરવાનગી નથી. માત્ર પરિવારના વડા (Head) અથવા એડિટ પરવાનગી ધરાવતા સભ્યો જ રીસેટ કરી શકે છે.',
            };
          }

          if (memberData.relation === 'FAMILY_HEAD') {
            const memberEmail = memberData.email || (memberData.occupation_details as any)?.email;
            if (memberEmail) {
              targetEmail = memberEmail;
            } else if (memberData.family_id) {
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
                targetEmail = pData?.email || null;
              }
            }
          } else {
            // Authorized family member:
            const memberEmail = memberData.email || (memberData.occupation_details as any)?.email;
            if (!memberEmail) {
              return {
                error: `${memberData.name} પાસે એડિટ પરવાનગી છે પરંતુ ઈમેઈલ આઈડી નોંધાયેલ નથી. કૃપા કરીને વડા દ્વારા સભ્ય પ્રોફાઈલમાં ઈમેઈલ ઉમેરાવો.`,
              };
            }
            targetEmail = memberEmail;
          }
        } else {
          // 2. Check profiles table by phone
          const { data: profData } = await supabase
            .from('profiles')
            .select('email')
            .ilike('phone', `%${last10}%`)
            .limit(1)
            .maybeSingle();

          if (profData?.email) {
            targetEmail = profData.email;
          }
        }
      }

      if (!targetEmail) {
        return {
          error: trimmed.includes('@')
            ? 'આ ઈમેઈલ એડ્રેસ સાથે કોઈ ખાતું અથવા ઓથોરાઇઝ્ડ સભ્ય મળ્યો નથી.'
            : 'આ મોબાઈલ નંબર સાથે કોઈ એકાઉન્ટ અથવા ઓથોરાઇઝ્ડ સભ્ય મળ્યો નથી. કૃપા કરીને રજીસ્ટર્ડ નંબર અથવા ઈમેઈલ તપાસો.',
        };
      }

      // Pre-register target email with Supabase Auth so resetPasswordForEmail can send recovery OTP
      try {
        await fetch(`${supabaseUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: targetEmail.trim().toLowerCase(),
            password: 'TempPassword@' + Math.random().toString(36).slice(-8),
          }),
        });
      } catch {}

      // Dedicated password reset OTP call (Uses Password Recovery Template)
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail.trim().toLowerCase());

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
        if (
          error.message?.toLowerCase().includes('error sending recovery email') ||
          (error as any).status === 500
        ) {
          return {
            error:
              'ઈમેઈલ સર્વરમાંથી OTP મોકલવામાં સમસ્યા આવી (Error sending recovery email).\n\n💡 જો આપ પરિવારના સભ્ય છો, તો પરિવારના વડા (Head) ના મુખ્ય પાસવર્ડ વડે આપના મોબાઈલ નંબર અથવા ઈમેઈલથી સીધા જ લૉગિન કરી શકો છો, પાસવર્ડ રીસેટ કરવાની જરૂર નથી.',
          };
        }
        return { error: error.message };
      }

      return { success: true, email: targetEmail.trim().toLowerCase() };
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
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length < 6) {
      return { error: 'કૃપા કરીને આપના ઈમેઈલ પર આવેલ સાચો OTP દાખલ કરો.' };
    }

    if (!newPassword || newPassword.length < 8) {
      return { error: 'નવો પાસવર્ડ ઓછામાં ઓછો ૮ અક્ષરનો હોવો જોઈએ.' };
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
        await savePersistentAuth(verifyRes.data.user, profile, session);
      }

      // 3. If resetting member belongs to a family, also sync family head password
      try {
        const { data: memData } = await supabase
          .from('family_members')
          .select('family_id')
          .ilike('email', email.trim())
          .maybeSingle();

        if (memData?.family_id) {
          const { data: famData } = await supabase
            .from('families')
            .select('head_user_id')
            .eq('id', memData.family_id)
            .maybeSingle();

          if (famData?.head_user_id) {
            await supabase.rpc('sync_head_password', {
              p_head_user_id: famData.head_user_id,
              p_new_password: newPassword,
            });
          }
        }
      } catch (syncErr) {
        console.warn('Sync head password notice:', syncErr);
      }

      return { success: true };
    } catch (err: any) {
      return { error: err?.message || 'પાસવર્ડ અપડેટ કરવામાં સમસ્યા આવી.' };
    }
  };

  const signOut = async () => {
    isExplicitSigningOut.current = true;
    const currentUserId = user?.id;
    resetInMemoryStore();
    await clearAppStore(currentUserId);
    await savePersistentAuth(null, null);

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

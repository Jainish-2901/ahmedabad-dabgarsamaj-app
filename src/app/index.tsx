import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/features/auth/AuthContext';

export default function RootIndex() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/(auth)/login' as any);
      } else {
        router.replace('/(family)/home' as any);
      }
    }
  }, [user, isLoading, router]);

  return <LoadingState message="Starting અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા..." />;
}

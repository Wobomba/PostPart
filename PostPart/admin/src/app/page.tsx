'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Handle refresh token errors
      if (sessionError) {
        if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('refresh_token')) {
          console.warn('Invalid refresh token, clearing session:', sessionError.message);
          await supabase.auth.signOut();
          router.replace('/welcome');
          return;
        }
        throw sessionError;
      }
      
      if (session) {
        // Check if user has admin role before allowing dashboard access
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle(); // Use maybeSingle instead of single to handle no rows gracefully

        // If error occurred (not just "no rows") or no role or not admin
        if ((roleError && roleError.code !== 'PGRST116') || !roleData || roleData.role !== 'admin') {
          await supabase.auth.signOut();
          router.replace('/auth/login');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      router.replace('/welcome');
    }
  };

  // Don't render anything until mounted on client
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <img
          src="/postpart-logo.png"
          alt="PostPart"
          width={80}
          height={80}
          className="mx-auto mb-4"
        />
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#E91E63' }}>PostPart Admin</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        router.replace('/dashboard');
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

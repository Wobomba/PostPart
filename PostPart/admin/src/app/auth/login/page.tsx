'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Admin login with email/password
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (!authData.user) {
        throw new Error('Authentication failed');
      }

      // Check if user has admin role
      // Use a small delay to ensure session is fully established
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no rows gracefully

      // If there's a real error (not just empty object), log it
      if (roleError) {
        // Check if it's a meaningful error (has message or code)
        const hasErrorInfo = roleError.message || (roleError.code && roleError.code !== 'PGRST116');
        if (hasErrorInfo) {
          console.error('Error checking user role:', roleError.message || roleError.code || roleError);
        }
        // Treat any error as invalid credentials (could be RLS policy, network, etc.)
        await supabase.auth.signOut();
        setError('Invalid Credentials');
        setLoading(false);
        return;
      }

      // If no role found or user is not admin
      if (!roleData || roleData.role !== 'admin') {
        // Sign out the user since they're not authorized
        await supabase.auth.signOut();
        setError('Invalid Credentials');
        setLoading(false);
        return;
      }

      // User is authenticated and is an admin, redirect to dashboard
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-10">
        <div className="text-center">
          <img
            src="/postpart-logo.png"
            alt="PostPart"
            width={80}
            height={80}
            className="mx-auto mb-6"
          />
          <h2 className="text-3xl font-bold text-gray-900 mb-3">PostPart Admin</h2>
          <p className="text-base text-gray-600">
            Sign in to access the admin dashboard
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-6 border border-transparent text-base font-medium rounded-lg text-white bg-[#E91E63] hover:bg-[#C2185B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}


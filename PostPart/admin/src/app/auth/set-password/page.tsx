'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Supabase password reset links contain access_token and type in URL
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');

      // If we have tokens from the reset link, set the session first
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw new Error('Invalid or expired password reset link. Please request a new one.');
        }
      } else if (type === 'recovery') {
        // Try to get hash from URL
        const hash = searchParams.get('hash');
        if (hash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: hash,
            type: 'recovery',
          });

          if (verifyError) {
            throw verifyError;
          }
        } else {
          throw new Error('Invalid password reset link. Missing required parameters.');
        }
      } else {
        // Check if user is already authenticated (from email verification)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Please use the password reset link from your email.');
        }
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to set password. Please request a new password reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#F5F7FA',
          padding: 2,
        }}
      >
        <Container maxWidth="sm">
          <Card sx={{ textAlign: 'center', py: 6, px: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: '#E8F5E9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 50, color: '#4CAF50' }} />
                </Box>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                Password Set Successfully!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your password has been set. You can now log in with your new password.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Redirecting to login...
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F5F7FA',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ py: 4, px: 4 }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: '#FFE5EC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <LockIcon sx={{ fontSize: 32, color: '#E91E63' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
                Set Your Password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please set a secure password for your account
              </Typography>
            </Box>

            <form onSubmit={handleSetPassword}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  helperText="Minimum 6 characters"
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  disabled={loading}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    bgcolor: '#E91E63',
                    '&:hover': { bgcolor: '#C2185B' },
                    py: 1.5,
                    mt: 1,
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Set Password'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#F5F7FA',
            padding: 2,
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}

// Force dynamic rendering for search params
export const dynamic = 'force-dynamic';

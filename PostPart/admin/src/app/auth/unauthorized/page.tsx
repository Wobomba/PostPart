'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Typography, Button, Card, CardContent } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import { supabase } from '../../../lib/supabase';

export default function UnauthorizedPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically sign out unauthorized users
    const signOutUnauthorized = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // Check if user has admin role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        // If no role or not admin, sign them out
        if (roleError || !roleData || roleData.role !== 'admin') {
          await supabase.auth.signOut();
        }
      } else {
        // If not authenticated, redirect to login
        router.push('/auth/login');
      }
    };

    signOutUnauthorized();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleGoHome = () => {
    router.push('/');
  };

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
        <Card
          sx={{
            textAlign: 'center',
            py: 6,
            px: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: '#FFE5EC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BlockIcon
                  sx={{
                    fontSize: 60,
                    color: '#E91E63',
                  }}
                />
              </Box>
            </Box>

            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 2,
              }}
            >
              Access Denied
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: '#64748b',
                mb: 1,
              }}
            >
              You do not have permission to access this page.
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: '#94a3b8',
                mb: 4,
              }}
            >
              This area is restricted to administrators only. If you believe this is an error,
              please contact your system administrator.
            </Typography>

            <Box
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant="contained"
                startIcon={<HomeIcon />}
                onClick={handleGoHome}
                sx={{
                  bgcolor: '#E91E63',
                  '&:hover': {
                    bgcolor: '#C2185B',
                  },
                }}
              >
                Go to Home
              </Button>

              <Button
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  borderColor: '#E91E63',
                  color: '#E91E63',
                  '&:hover': {
                    borderColor: '#C2185B',
                    bgcolor: '#FFE5EC',
                  },
                }}
              >
                Sign Out
              </Button>
            </Box>

            <Box
              sx={{
                mt: 4,
                pt: 3,
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#94a3b8',
                }}
              >
                PostPart Admin Dashboard • Unauthorized Access
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}



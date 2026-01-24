'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../../../components/DashboardLayout';
import OrganizationForm from '../../../../../components/OrganizationForm';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import Link from 'next/link';
import { supabase } from '../../../../../lib/supabase';
import { createSlug } from '../../../../../lib/slug';
import type { Organization } from '../../../../../../../shared/types';

export default function EditOrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganization();
  }, [params.slug]);

  const loadOrganization = async () => {
    try {
      // Load all organizations and find by slug match
      const { data: allOrgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*');

      if (orgsError) throw orgsError;

      // Find organization by matching slug to name
      const orgData = allOrgs?.find(org => createSlug(org.name) === params.slug);

      if (!orgData) {
        router.push('/dashboard/organizations');
        return;
      }

      setOrganization(orgData);
    } catch (error) {
      console.error('Error loading organization:', error);
      router.push('/dashboard/organizations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress sx={{ color: '#E91E63' }} />
        </Box>
      </DashboardLayout>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: { xs: 4, sm: 5, md: 6 } }}>
          <Button
            component={Link}
            href={`/dashboard/organizations/${params.slug}`}
            startIcon={<ArrowBackIcon />}
            sx={{
              textTransform: 'none',
              color: '#64748b',
              '&:hover': {
                bgcolor: 'rgba(100, 116, 139, 0.08)',
              },
            }}
          >
            Back
          </Button>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            }}
          >
            Edit Organisation
          </Typography>
        </Box>

        <OrganizationForm 
          organization={organization}
          onSuccess={() => {
            router.push(`/dashboard/organizations/${params.slug}`);
          }}
        />
      </Box>
    </DashboardLayout>
  );
}


'use client';

import DashboardLayout from '../../../../components/DashboardLayout';
import OrganizationForm from '../../../../components/OrganizationForm';
import { Box, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import Link from 'next/link';
import { Button } from '@mui/material';

export default function NewOrganizationPage() {
  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: { xs: 4, sm: 5, md: 6 } }}>
          <Button
            component={Link}
            href="/dashboard/organizations"
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
            Add New Organisation
          </Typography>
        </Box>

        <OrganizationForm />
      </Box>
    </DashboardLayout>
  );
}


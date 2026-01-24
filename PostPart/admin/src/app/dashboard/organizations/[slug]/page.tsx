'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../../components/DashboardLayout';
import { supabase } from '../../../../lib/supabase';
import { createSlug } from '../../../../lib/slug';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Button,
  Grid,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationOnIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Description as DescriptionIcon,
  GetApp as GetAppIcon,
} from '@mui/icons-material';
import type { Organization } from '../../../../../../shared/types';

interface OrganizationDetail extends Organization {
  parentCount: number;
  checkInCount: number;
  todayCheckIns: number;
  weeklyCheckIns: number;
  lastCheckInDate: string | null;
}

interface Parent {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

interface CheckIn {
  id: string;
  check_in_time: string;
  check_out_time?: string | null;
  child_id: string;
  center_id: string;
  center?: { name: string };
  child?: { first_name: string; last_name: string };
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [organization, setOrganization] = useState<OrganizationDetail | null>(null);
  const [parents, setParents] = useState<Parent[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.slug]);

  const loadData = async () => {
    try {
      setLoading(true);
      
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

      // Load parent count and check-in stats
      const { count: parentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgData.id);

      const { data: parentIds } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', orgData.id);

      const parentIdList = parentIds?.map(p => p.id) || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { count: checkInCount } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .in('parent_id', parentIdList);

      const { count: todayCheckIns } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .in('parent_id', parentIdList)
        .gte('check_in_time', today.toISOString())
        .lte('check_in_time', todayEnd.toISOString());

      const { count: weeklyCheckIns } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .in('parent_id', parentIdList)
        .gte('check_in_time', weekAgo.toISOString());

      const { data: lastCheckIn } = await supabase
        .from('checkins')
        .select('check_in_time')
        .in('parent_id', parentIdList)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .single();

      // Load parents list
      const { data: parentsData } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('organization_id', orgData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Load recent check-ins
      const { data: checkInsData } = await supabase
        .from('checkins')
        .select(`
          id,
          check_in_time,
          check_out_time,
          child_id,
          center_id,
          centers(name),
          children(first_name, last_name)
        `)
        .in('parent_id', parentIdList)
        .order('check_in_time', { ascending: false })
        .limit(10);

      setOrganization({
        ...orgData,
        parentCount: parentCount || 0,
        checkInCount: checkInCount || 0,
        todayCheckIns: todayCheckIns || 0,
        weeklyCheckIns: weeklyCheckIns || 0,
        lastCheckInDate: lastCheckIn?.check_in_time || null,
      });

      setParents(parentsData || []);
      setRecentCheckIns(checkInsData || []);
    } catch (error) {
      console.error('Error loading organization details:', error);
      router.push('/dashboard/organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!organization) return;
    
    setDeleting(true);
    try {
      // Delete via API route
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete organisation');
      }

      router.push('/dashboard/organizations');
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      alert('Failed to delete organisation: ' + (error.message || 'Unknown error'));
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const generateReport = () => {
    if (!organization) return;

    const reportData = {
      organization: {
        name: organization.name,
        industry: organization.industry,
        status: organization.status,
        plan_type: organization.plan_type,
      },
      statistics: {
        totalParents: organization.parentCount,
        totalCheckIns: organization.checkInCount,
        todayCheckIns: organization.todayCheckIns,
        weeklyCheckIns: organization.weeklyCheckIns,
      },
      parents: parents.map(p => ({
        name: p.full_name,
        email: p.email,
        joined: new Date(p.created_at).toLocaleDateString(),
      })),
      recentCheckIns: recentCheckIns.map(c => ({
        date: new Date(c.check_in_time).toLocaleString(),
        center: c.center?.name || 'Unknown',
        child: c.child ? `${c.child.first_name} ${c.child.last_name}` : 'Unknown',
      })),
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${organization.name.replace(/\s+/g, '_')}_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#E8F5E9', color: '#2E7D32' };
      case 'inactive':
        return { bg: '#FFF3E0', color: '#E65100' };
      case 'suspended':
        return { bg: '#FFEBEE', color: '#C62828' };
      default:
        return { bg: '#F5F5F5', color: '#616161' };
    }
  };

  const getPlanTypeColor = (planType?: string) => {
    switch (planType) {
      case 'enterprise':
        return { bg: '#E91E63', color: '#ffffff' };
      case 'premium':
        return { bg: '#9C27B0', color: '#ffffff' };
      case 'standard':
        return { bg: '#2196F3', color: '#ffffff' };
      case 'basic':
        return { bg: '#4CAF50', color: '#ffffff' };
      default:
        return { bg: '#9E9E9E', color: '#ffffff' };
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

  const statusColors = getStatusColor(organization.status);
  const planColors = getPlanTypeColor(organization.plan_type);

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 4, sm: 5, md: 6 }, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              {organization.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                component={Link}
                href={`/dashboard/organizations/${params.slug}/edit`}
              variant="outlined"
              startIcon={<EditIcon />}
              sx={{
                textTransform: 'none',
                borderColor: '#E91E63',
                color: '#E91E63',
                '&:hover': {
                  borderColor: '#C2185B',
                  bgcolor: 'rgba(233, 30, 99, 0.04)',
                },
              }}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{
                textTransform: 'none',
                borderColor: '#d32f2f',
                color: '#d32f2f',
                '&:hover': {
                  borderColor: '#c62828',
                  bgcolor: 'rgba(211, 47, 47, 0.04)',
                },
              }}
            >
              Delete
            </Button>
            <Button
              variant="contained"
              startIcon={<GetAppIcon />}
              onClick={generateReport}
              sx={{
                textTransform: 'none',
                bgcolor: '#E91E63',
                '&:hover': {
                  bgcolor: '#C2185B',
                },
              }}
            >
              Generate Report
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Total Parents
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196F3' }}>
                  {organization.parentCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Total Check-ins
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                  {organization.checkInCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Today
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF9800' }}>
                  {organization.todayCheckIns}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  This Week
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#E91E63' }}>
                  {organization.weeklyCheckIns}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Organization Details */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon sx={{ color: '#E91E63' }} />
                  Organisation Details
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={organization.status.charAt(0).toUpperCase() + organization.status.slice(1)}
                      size="small"
                      sx={{
                        bgcolor: statusColors.bg,
                        color: statusColors.color,
                        fontWeight: 600,
                      }}
                    />
                    {organization.plan_type && (
                      <Chip
                        label={organization.plan_type.charAt(0).toUpperCase() + organization.plan_type.slice(1)}
                        size="small"
                        sx={{
                          bgcolor: planColors.bg,
                          color: planColors.color,
                          fontWeight: 500,
                        }}
                      />
                    )}
                  </Box>
                </Box>

                {organization.industry && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Industry
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {organization.industry}
                    </Typography>
                  </Box>
                )}

                {organization.size && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Employee Size
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {organization.size}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 3 }} />

                {organization.contact_name && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Contact Person
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {organization.contact_name}
                    </Typography>
                  </Box>
                )}

                {organization.contact_email && (
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon sx={{ fontSize: 18, color: '#64748b' }} />
                    <Typography variant="body1">
                      {organization.contact_email}
                    </Typography>
                  </Box>
                )}

                {organization.contact_phone && (
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 18, color: '#64748b' }} />
                    <Typography variant="body1">
                      {organization.contact_phone}
                    </Typography>
                  </Box>
                )}

                {organization.address && (
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <LocationOnIcon sx={{ fontSize: 18, color: '#64748b', mt: 0.5 }} />
                    <Typography variant="body1">
                      {organization.address}
                      {organization.city && `, ${organization.city}`}
                      {organization.state && `, ${organization.state}`}
                      {organization.zip_code && ` ${organization.zip_code}`}
                    </Typography>
                  </Box>
                )}

                {(organization.contract_start_date || organization.contract_end_date) && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Contract Period
                    </Typography>
                    {organization.contract_start_date && (
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        Start: {new Date(organization.contract_start_date).toLocaleDateString()}
                      </Typography>
                    )}
                    {organization.contract_end_date && (
                      <Typography variant="body2">
                        End: {new Date(organization.contract_end_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Parents & Activity */}
          <Grid item xs={12} md={6}>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon sx={{ color: '#E91E63' }} />
                    Parents ({organization.parentCount})
                  </Typography>
                  {organization.parentCount > 0 && (
                    <Button
                      component={Link}
                      href={`/dashboard/parents?organization=${organization?.id || ''}`}
                      size="small"
                      sx={{
                        textTransform: 'none',
                        color: '#E91E63',
                        '&:hover': {
                          bgcolor: 'rgba(233, 30, 99, 0.04)',
                        },
                      }}
                    >
                      View All
                    </Button>
                  )}
                </Box>

                {parents.length > 0 ? (
                  <Box>
                    {parents.slice(0, 5).map((parent) => (
                      <Box key={parent.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {parent.full_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {parent.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Joined: {new Date(parent.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No parents registered yet
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon sx={{ color: '#E91E63' }} />
                  Recent Check-ins
                </Typography>

                {recentCheckIns.length > 0 ? (
                  <Box>
                    {recentCheckIns.slice(0, 5).map((checkIn) => (
                      <Box key={checkIn.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {checkIn.child ? `${checkIn.child.first_name} ${checkIn.child.last_name}` : 'Unknown Child'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {checkIn.center?.name || 'Unknown Center'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Check-in: {new Date(checkIn.check_in_time).toLocaleString()}
                        </Typography>
                        {checkIn.check_out_time && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Check-out: {new Date(checkIn.check_out_time).toLocaleString()}
                          </Typography>
                        )}
                        {!checkIn.check_out_time && (
                          <Chip 
                            label="Active" 
                            size="small" 
                            color="warning"
                            sx={{ mt: 0.5, fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No check-ins yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Organisation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete <strong>{organization.name}</strong>? This action cannot be undone.
              {organization.parentCount > 0 && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  Warning: This organisation has {organization.parentCount} associated parent{organization.parentCount > 1 ? 's' : ''}. 
                  They must be removed or reassigned first.
                </Typography>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              color="error"
              variant="contained"
              disabled={deleting}
              sx={{ textTransform: 'none' }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}


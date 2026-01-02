'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '../../../components/DashboardLayout';
import ParentForm from '../../../components/ParentForm';
import { supabase } from '../../../../lib/supabase';
import { logActivity } from '../../../utils/activityLogger';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  GetApp as GetAppIcon,
  Block as BlockIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import type { Profile } from '../../../../../../../shared/types';

interface ParentWithMetrics extends Profile {
  organization?: { id: string; name: string; status: string };
  childrenCount: number;
  checkInCount: number;
  lastCheckInDate: string | null;
}

interface ParentStats {
  totalParents: number;
  activeParents: number;
  inactiveParents: number;
  suspendedParents: number;
  totalCheckIns: number;
  todayCheckIns: number;
}

export default function ParentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgFilter = searchParams.get('organization');
  
  const [parents, setParents] = useState<ParentWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>(orgFilter || 'all');
  const [stats, setStats] = useState<ParentStats>({
    totalParents: 0,
    activeParents: 0,
    inactiveParents: 0,
    suspendedParents: 0,
    totalCheckIns: 0,
    todayCheckIns: 0,
  });
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingParent, setViewingParent] = useState<ParentWithMetrics | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewChildren, setViewChildren] = useState<any[]>([]);
  const [viewRecentCheckIns, setViewRecentCheckIns] = useState<any[]>([]);
  const [viewFullDetails, setViewFullDetails] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Profile | null>(null);

  useEffect(() => {
    loadData();
    loadOrganizations();

    // Set up realtime subscription for instant parent updates
    const profileChannel = supabase
      .channel('admin-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Parent profile change detected:', payload);
          // Reload parents data
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, []);

  useEffect(() => {
    if (orgFilter) {
      setOrganizationFilter(orgFilter);
    }
  }, [orgFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadParents(),
        loadStats(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, status')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const loadParents = async () => {
    try {
      console.log('Loading parents...');
      // Load all parents - handle case where organization_id might be null
      const { data: parentsData, error: parentsError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Parents query result:', { parentsData, parentsError });

      if (parentsError) {
        console.error('Error loading parents:', parentsError);
        throw parentsError;
      }
      
      if (!parentsData || parentsData.length === 0) {
        console.log('No parents data found');
        setParents([]);
        return;
      }

      console.log(`Found ${parentsData.length} parents`);

      // Load organizations separately
      const orgIds = parentsData
        .map(p => p.organization_id)
        .filter(id => id != null);

      console.log('Organization IDs to fetch:', orgIds);

      let orgsMap = new Map();
      if (orgIds.length > 0) {
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name, status')
          .in('id', orgIds);
        
        console.log('Organizations query result:', { orgsData, orgsError });
        
        orgsData?.forEach(org => {
          orgsMap.set(org.id, org);
        });
      }
      
      console.log('Organizations map:', orgsMap);

      const parentIds = parentsData.map(p => p.id);

      // Load children count for each parent
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('id, parent_id')
        .in('parent_id', parentIds);

      if (childrenError) {
        console.error('Error loading children:', childrenError);
      }

      // Load check-ins count and last check-in
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('checkins')
        .select('id, parent_id, check_in_time')
        .in('parent_id', parentIds);

      if (checkInsError) {
        console.error('Error loading check-ins:', checkInsError);
      }

      // Create lookup maps
      const childrenCountMap = new Map<string, number>();
      const checkInCountMap = new Map<string, number>();
      const lastCheckInMap = new Map<string, string>();

      childrenData?.forEach(child => {
        childrenCountMap.set(child.parent_id, (childrenCountMap.get(child.parent_id) || 0) + 1);
      });

      checkInsData?.forEach(checkIn => {
        checkInCountMap.set(checkIn.parent_id, (checkInCountMap.get(checkIn.parent_id) || 0) + 1);
        
        const currentLast = lastCheckInMap.get(checkIn.parent_id);
        if (!currentLast || new Date(checkIn.check_in_time) > new Date(currentLast)) {
          lastCheckInMap.set(checkIn.parent_id, checkIn.check_in_time);
        }
      });

      // Combine data
      const parentsWithMetrics: ParentWithMetrics[] = parentsData.map(parent => ({
        ...parent,
        status: parent.status || 'active', // Default to active if not set
        organization: parent.organization_id ? orgsMap.get(parent.organization_id) : undefined,
        childrenCount: childrenCountMap.get(parent.id) || 0,
        checkInCount: checkInCountMap.get(parent.id) || 0,
        lastCheckInDate: lastCheckInMap.get(parent.id) || null,
      }));

      console.log('Parents with metrics:', parentsWithMetrics);
      setParents(parentsWithMetrics);
    } catch (error) {
      console.error('Error loading parents:', error);
      setParents([]); // Set empty array on error
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const [
        { count: totalParents },
        { count: activeParents },
        { count: inactiveParents },
        { count: suspendedParents },
        { count: totalCheckIns },
        { count: todayCheckIns },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).or('status.eq.active,status.is.null'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
        supabase.from('checkins').select('*', { count: 'exact', head: true }),
        supabase.from('checkins').select('*', { count: 'exact', head: true })
          .gte('check_in_time', today.toISOString())
          .lte('check_in_time', todayEnd.toISOString()),
      ]);

      setStats({
        totalParents: totalParents || 0,
        activeParents: activeParents || 0,
        inactiveParents: inactiveParents || 0,
        suspendedParents: suspendedParents || 0,
        totalCheckIns: totalCheckIns || 0,
        todayCheckIns: todayCheckIns || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filteredParents = parents.filter(parent => {
    const matchesSearch =
      parent.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parent.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parent.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || parent.status === statusFilter;
    const matchesOrg = organizationFilter === 'all' || parent.organization_id === organizationFilter;

    return matchesSearch && matchesStatus && matchesOrg;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#E8F5E9', color: '#2E7D32' };
      case 'inactive':
        return { bg: '#FFF3E0', color: '#E65100' };
      case 'suspended':
        return { bg: '#FFEBEE', color: '#C62828' };
      default:
        return { bg: '#E8F5E9', color: '#2E7D32' }; // Default to active
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return time.toLocaleDateString();
  };

  const handleViewClick = async (parent: ParentWithMetrics) => {
    setViewingParent(parent);
    setViewDialogOpen(true);
    setViewLoading(true);
    setViewFullDetails(false);

    try {
      // Log the admin viewing sensitive parent data (audit trail)
      const { data: { user } } = await supabase.auth.getUser();
      await logActivity({
        activityType: 'parent_details_updated',
        entityType: 'parent',
        entityId: parent.id,
        entityName: parent.full_name,
        description: `Admin viewed detailed information for parent ${parent.full_name}`,
        metadata: {
          action: 'view_parent_details',
          admin_user_id: user?.id,
          viewed_at: new Date().toISOString(),
          data_accessed: ['children', 'check_in_history', 'organisation'],
        },
      });

      // Load children with detailed information
      const { data: childrenData } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', parent.id)
        .order('created_at', { ascending: false });

      // Load ALL check-ins with comprehensive details
      const { data: checkInsData } = await supabase
        .from('checkins')
        .select(`
          id,
          check_in_time,
          child_id,
          center_id,
          notes,
          created_at,
          centers(
            id,
            name,
            address,
            city,
            state
          ),
          children(
            id,
            first_name,
            last_name,
            date_of_birth
          )
        `)
        .eq('parent_id', parent.id)
        .order('check_in_time', { ascending: false })
        .limit(50); // Increased limit for comprehensive history

      console.log('Check-ins loaded for parent:', parent.full_name, checkInsData);

      setViewChildren(childrenData || []);
      setViewRecentCheckIns(checkInsData || []);
    } catch (error) {
      console.error('Error loading view data:', error);
      setViewChildren([]);
      setViewRecentCheckIns([]);
    } finally {
      setViewLoading(false);
    }
  };

  const handleStatusChange = async (parent: ParentWithMetrics, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', parent.id);

      if (error) throw error;

      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('Error updating parent status:', error);
      alert('Failed to update parent status: ' + (error.message || 'Unknown error'));
    }
  };

  const generateParentReport = () => {
    if (!viewingParent) return;

    const reportData = {
      report_generated: new Date().toISOString(),
      report_type: 'Parent Detailed Report',
      parent: {
        id: viewingParent.id,
        name: viewingParent.full_name,
        email: viewingParent.email,
        phone: viewingParent.phone,
        status: viewingParent.status,
        organization: viewingParent.organization?.name || 'None',
        organization_id: viewingParent.organization_id,
        joined: new Date(viewingParent.created_at).toLocaleDateString(),
      },
      statistics: {
        childrenCount: viewingParent.childrenCount,
        totalCheckIns: viewingParent.checkInCount,
        lastActivity: viewingParent.lastCheckInDate
          ? new Date(viewingParent.lastCheckInDate).toLocaleString()
          : 'Never',
      },
      children: viewChildren.map(c => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        firstName: c.first_name,
        lastName: c.last_name,
        dateOfBirth: c.date_of_birth,
        age: Math.floor((new Date().getTime() - new Date(c.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365)),
        allergies: c.allergies || 'None',
        notes: c.notes || 'None',
        created: new Date(c.created_at).toLocaleDateString(),
      })),
      checkInHistory: viewRecentCheckIns.map((c: any) => {
        const child = Array.isArray(c.children) ? c.children[0] : c.children;
        const center = Array.isArray(c.centers) ? c.centers[0] : c.centers;
        return {
          id: c.id,
          date: new Date(c.check_in_time).toLocaleDateString(),
          time: new Date(c.check_in_time).toLocaleTimeString(),
          fullTimestamp: new Date(c.check_in_time).toISOString(),
          child: {
            id: child?.id,
            name: child ? `${child.first_name} ${child.last_name}` : 'Unknown',
            firstName: child?.first_name,
            lastName: child?.last_name,
          },
          center: {
            id: center?.id,
            name: center?.name || 'Unknown',
            city: center?.city,
            state: center?.state,
            address: center?.address,
            fullLocation: center ? `${center.city}, ${center.state}` : 'N/A',
          },
          notes: c.notes || 'None',
        };
      }),
      security: {
        access_logged: true,
        accessed_by: 'Admin User',
        accessed_at: new Date().toISOString(),
        data_classification: 'SENSITIVE - PERSONAL INFORMATION',
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${viewingParent.full_name.replace(/\s+/g, '_')}_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Log the export action
    logActivity({
      activityType: 'parent_details_updated',
      entityType: 'parent',
      entityId: viewingParent.id,
      entityName: viewingParent.full_name,
      description: `Admin exported detailed report for parent ${viewingParent.full_name}`,
      metadata: {
        action: 'export_parent_report',
        children_count: viewChildren.length,
        checkins_count: viewRecentCheckIns.length,
        exported_at: new Date().toISOString(),
      },
    });
  };

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: '#1e293b',
            }}
          >
            Parents Management
          </Typography>
        </Box>

        {/* Statistics Dashboard */}
        {!loading && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
              gap: 3,
              mb: 4,
            }}
          >
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PersonIcon sx={{ fontSize: 20, color: '#E91E63' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Total
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {stats.totalParents}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 20, color: '#4CAF50' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Active
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {stats.activeParents}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WarningIcon sx={{ fontSize: 20, color: '#FF9800' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Inactive
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {stats.inactiveParents}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BlockIcon sx={{ fontSize: 20, color: '#f44336' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Suspended
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {stats.suspendedParents}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 20, color: '#2196F3' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Total Check-ins
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {stats.totalCheckIns}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 20, color: '#9C27B0' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Today
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {stats.todayCheckIns}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Search and Filters */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'flex-end',
          }}>
            <Box sx={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Search parents by name, email, or organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                style={{ width: '100%' }}
              />
            </Box>

            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
                sx={{ height: 48 }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Organisation</InputLabel>
              <Select
                value={organizationFilter}
                onChange={(e) => setOrganizationFilter(e.target.value)}
                label="Organisation"
                sx={{ height: 48 }}
              >
                <MenuItem value="all">All Organisations</MenuItem>
                {organizations.map((org) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Parents Table */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: '#E91E63' }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading parents...
            </Typography>
          </Box>
        ) : filteredParents.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <PersonIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {searchQuery ? 'No parents found matching your search.' : 'No parents found in the system.'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Parents register through the mobile app
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Organisation</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Children</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Check-ins</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Last Activity</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredParents.map((parent) => {
                  const statusColors = getStatusColor(parent.status);
                  
                  return (
                    <TableRow 
                      key={parent.id} 
                      hover
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:hover': { bgcolor: '#f8f9fa' }
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {parent.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <EmailIcon sx={{ fontSize: 12 }} />
                            {parent.email}
                          </Typography>
                          {parent.phone && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PhoneIcon sx={{ fontSize: 12 }} />
                              {parent.phone}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {parent.organization ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BusinessIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="body2">
                              {parent.organization.name}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No Organisation
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={parent.status.charAt(0).toUpperCase() + parent.status.slice(1)}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            bgcolor: statusColors.bg,
                            color: statusColors.color,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: parent.childrenCount > 0 ? '#E91E63' : '#94a3b8' }}>
                          {parent.childrenCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: parent.checkInCount > 0 ? '#4CAF50' : '#94a3b8' }}>
                          {parent.checkInCount}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {parent.lastCheckInDate ? formatTimeAgo(parent.lastCheckInDate) : 'Never'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewClick(parent)}
                              sx={{ 
                                color: '#E91E63',
                                '&:hover': { bgcolor: 'rgba(233, 30, 99, 0.08)' }
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingParent(parent);
                                setEditDrawerOpen(true);
                              }}
                              sx={{ 
                                color: '#2196F3',
                                '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.08)' }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Generate Report">
                            <IconButton
                              size="small"
                              onClick={() => {
                                handleViewClick(parent);
                                // Will generate report when dialog opens
                                setTimeout(() => generateParentReport(), 1000);
                              }}
                              sx={{ 
                                color: '#9C27B0',
                                '&:hover': { bgcolor: 'rgba(156, 39, 176, 0.08)' }
                              }}
                            >
                              <DescriptionIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {parent.status === 'active' ? (
                            <Tooltip title="Disable">
                              <IconButton
                                size="small"
                                onClick={() => handleStatusChange(parent, 'inactive')}
                                sx={{ 
                                  color: '#FF9800',
                                  '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.08)' }
                                }}
                              >
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Enable">
                              <IconButton
                                size="small"
                                onClick={() => handleStatusChange(parent, 'active')}
                                sx={{ 
                                  color: '#4CAF50',
                                  '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.08)' }
                                }}
                              >
                                <CheckCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* View Parent Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">{viewingParent?.full_name}</Typography>
                <Chip 
                  label={viewingParent?.status || 'Unknown'} 
                  size="small" 
                  color={viewingParent?.status === 'active' ? 'success' : 'default'}
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <IconButton onClick={() => setViewDialogOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {viewLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: '#E91E63' }} />
              </Box>
            ) : viewingParent ? (
              <Box>
                {/* Security Notice */}
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="caption">
                    🔒 <strong>Sensitive Data:</strong> This information is protected and your access is being logged for audit purposes.
                  </Typography>
                </Alert>

                {/* Basic Information */}
                <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#E91E63' }}>
                    Basic Information
                  </Typography>
                  <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Email</Typography>
                      <Typography variant="body2">{viewingParent.email}</Typography>
                    </Box>
                    {viewingParent.phone && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Phone</Typography>
                        <Typography variant="body2">{viewingParent.phone}</Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary">Organisation</Typography>
                      <Typography variant="body2">{viewingParent.organization?.name || 'None'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Joined</Typography>
                      <Typography variant="body2">{new Date(viewingParent.created_at).toLocaleDateString()}</Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Statistics */}
                <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#E91E63' }}>
                    Statistics
                  </Typography>
                  <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', sm: '1fr 1fr 1fr' }} gap={2}>
                    <Box textAlign="center">
                      <Typography variant="h4" sx={{ color: '#2196F3', fontWeight: 700 }}>
                        {viewingParent.childrenCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Children</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h4" sx={{ color: '#4CAF50', fontWeight: 700 }}>
                        {viewingParent.checkInCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Total Check-ins</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h4" sx={{ color: '#FF9800', fontWeight: 700 }}>
                        {viewingParent.lastCheckInDate 
                          ? formatTimeAgo(viewingParent.lastCheckInDate)
                          : 'Never'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Last Activity</Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Children List */}
                {viewChildren.length > 0 && (
                  <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ color: '#E91E63' }}>
                      Children ({viewChildren.length})
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Date of Birth</TableCell>
                            <TableCell>Age</TableCell>
                            <TableCell>Allergies</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {viewChildren.map((child: any) => {
                            const age = child.date_of_birth 
                              ? Math.floor((new Date().getTime() - new Date(child.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))
                              : 'N/A';
                            return (
                              <TableRow key={child.id}>
                                <TableCell>{child.first_name} {child.last_name}</TableCell>
                                <TableCell>{new Date(child.date_of_birth).toLocaleDateString()}</TableCell>
                                <TableCell>{age} {typeof age === 'number' ? (age === 1 ? 'year' : 'years') : ''}</TableCell>
                                <TableCell>{child.allergies || 'None'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                )}

                {/* Check-in History */}
                {viewRecentCheckIns.length > 0 && (
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ color: '#E91E63' }}>
                      Check-in History ({viewRecentCheckIns.length})
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                      Showing the most recent check-ins across all children
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date & Time</TableCell>
                            <TableCell>Child</TableCell>
                            <TableCell>Day Care Centre</TableCell>
                            <TableCell>Location</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {viewRecentCheckIns.map((checkIn: any) => {
                            const child = Array.isArray(checkIn.children) ? checkIn.children[0] : checkIn.children;
                            const center = Array.isArray(checkIn.centers) ? checkIn.centers[0] : checkIn.centers;
                            return (
                              <TableRow key={checkIn.id}>
                                <TableCell>
                                  <Box>
                                    <Typography variant="body2">
                                      {new Date(checkIn.check_in_time).toLocaleDateString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {new Date(checkIn.check_in_time).toLocaleTimeString()}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={child ? `${child.first_name} ${child.last_name}` : 'Unknown'}
                                    size="small"
                                    sx={{ bgcolor: '#E3F2FD', color: '#1976D2' }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>
                                    {center?.name || 'Unknown'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">
                                    {center ? `${center.city}, ${center.state}` : 'N/A'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                )}

                {viewRecentCheckIns.length === 0 && (
                  <Alert severity="info">
                    No check-in history available for this parent.
                  </Alert>
                )}
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
            <Button 
              variant="contained" 
              startIcon={<GetAppIcon />}
              onClick={generateParentReport}
              sx={{ bgcolor: '#E91E63', '&:hover': { bgcolor: '#C2185B' } }}
            >
              Export Report
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Parent Drawer */}
        <Drawer
          anchor="right"
          open={editDrawerOpen}
          onClose={() => {
            setEditDrawerOpen(false);
            setEditingParent(null);
          }}
          PaperProps={{
            sx: { width: { xs: '100%', sm: '600px', md: '700px' }, maxWidth: '90vw' },
          }}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#E91E63' }}>
                Edit Parent
              </Typography>
              <IconButton onClick={() => { setEditDrawerOpen(false); setEditingParent(null); }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              {editingParent && (
                <ParentForm
                  parent={editingParent}
                  onSuccess={() => {
                    setEditDrawerOpen(false);
                    setEditingParent(null);
                    loadData();
                  }}
                  onCancel={() => {
                    setEditDrawerOpen(false);
                    setEditingParent(null);
                  }}
                />
              )}
            </Box>
          </Box>
        </Drawer>
      </Box>
    </DashboardLayout>
  );
}

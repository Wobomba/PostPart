'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import OrganizationForm from '../../../components/OrganizationForm';
import { supabase } from '../../../../lib/supabase';
import { createSlug } from '../../../lib/slug';
import { logActivity, ActivityDescriptions } from '../../../utils/activityLogger';
import {
  Box,
  Grid,
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
  Divider,
  Alert,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
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
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationOnIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Event as EventIcon,
  BarChart as BarChartIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  GetApp as GetAppIcon,
} from '@mui/icons-material';
import type { Organization } from '../../../../../shared/types';
import { generateOrganisationPDF } from '../../../utils/pdfExport';
import { generateOrganisationCSV } from '../../../utils/csvExport';
import ExportDialog from '../../../components/ExportDialog';

interface OrganizationStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalParents: number;
  totalCheckIns: number;
  todayCheckIns: number;
  weeklyCheckIns: number;
}

interface OrganizationWithMetrics extends Organization {
  parentCount: number;
  checkInCount: number;
  todayCheckIns: number;
  lastCheckInDate: string | null;
  contractExpiringSoon: boolean;
}

interface QuickInsight {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  count: number;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planTypeFilter, setPlanTypeFilter] = useState<string>('all');
  const [stats, setStats] = useState<OrganizationStats>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalParents: 0,
    totalCheckIns: 0,
    todayCheckIns: 0,
    weeklyCheckIns: 0,
  });
  const [quickInsights, setQuickInsights] = useState<QuickInsight[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState<OrganizationWithMetrics | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingOrganization, setViewingOrganization] = useState<OrganizationWithMetrics | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewParents, setViewParents] = useState<any[]>([]);
  const [viewRecentCheckIns, setViewRecentCheckIns] = useState<any[]>([]);
  const [viewFullDetails, setViewFullDetails] = useState(false);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(() => {
    loadData();

    // Set up optimized realtime subscription for instant organisation updates
    const organizationChannel = supabase
      .channel('admin-organizations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'organizations',
        },
        (payload) => {
          console.log('New organisation added:', payload);
          // Reload full data for new organisation with metrics
          loadData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
        },
        (payload) => {
          console.log('Organisation updated:', payload);
          // Update specific organisation in state
          const updatedOrg = payload.new as any;
          setOrganizations(prev => prev.map(org => 
            org.id === updatedOrg.id 
              ? { ...org, ...updatedOrg } 
              : org
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'organizations',
        },
        (payload) => {
          console.log('Organisation deleted:', payload);
          const deletedId = (payload.old as any).id;
          setOrganizations(prev => prev.filter(org => org.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(organizationChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadOrganizations(),
        loadStats(),
        loadQuickInsights(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      // Load all organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (orgsError) throw orgsError;
      if (!orgsData || orgsData.length === 0) {
        setOrganizations([]);
        return;
      }

      const orgIds = orgsData.map(org => org.id);

      // Load all parents with organization_id
      const { data: allParents } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .in('organization_id', orgIds);

      // Load all check-ins with parent info
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: allCheckIns } = await supabase
        .from('checkins')
        .select('id, parent_id, check_in_time')
        .in('parent_id', allParents?.map(p => p.id) || []);

      // Calculate week ago date for weekly check-ins
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Create lookup maps for efficient aggregation
      const parentCountMap = new Map<string, number>();
      const checkInCountMap = new Map<string, number>();
      const todayCheckInMap = new Map<string, number>();
      const weeklyCheckInMap = new Map<string, number>();
      const lastCheckInMap = new Map<string, string>();

      // Count parents per organization
      allParents?.forEach(parent => {
        if (parent.organization_id) {
          parentCountMap.set(parent.organization_id, (parentCountMap.get(parent.organization_id) || 0) + 1);
        }
      });

      // Create parent ID to organization ID map
      const parentToOrgMap = new Map<string, string>();
      allParents?.forEach(parent => {
        if (parent.organization_id) {
          parentToOrgMap.set(parent.id, parent.organization_id);
        }
      });

      // Aggregate check-ins per organization
      allCheckIns?.forEach(checkIn => {
        const orgId = parentToOrgMap.get(checkIn.parent_id);
        if (!orgId) return;

        // Total check-ins
        checkInCountMap.set(orgId, (checkInCountMap.get(orgId) || 0) + 1);

        // Today's check-ins
        const checkInTime = new Date(checkIn.check_in_time);
        if (checkInTime >= today && checkInTime <= todayEnd) {
          todayCheckInMap.set(orgId, (todayCheckInMap.get(orgId) || 0) + 1);
        }

        // Weekly check-ins (last 7 days)
        if (checkInTime >= weekAgo) {
          weeklyCheckInMap.set(orgId, (weeklyCheckInMap.get(orgId) || 0) + 1);
        }

        // Last check-in date
        const currentLast = lastCheckInMap.get(orgId);
        if (!currentLast || checkInTime > new Date(currentLast)) {
          lastCheckInMap.set(orgId, checkIn.check_in_time);
        }
      });

      // Combine organization data with metrics
      const orgsWithMetrics: OrganizationWithMetrics[] = orgsData.map(org => {
        const contractExpiringSoon = org.contract_end_date
          ? new Date(org.contract_end_date).getTime() - new Date().getTime() <= 30 * 24 * 60 * 60 * 1000
          : false;

        return {
          ...org,
          parentCount: parentCountMap.get(org.id) || 0,
          checkInCount: checkInCountMap.get(org.id) || 0,
          todayCheckIns: todayCheckInMap.get(org.id) || 0,
          weeklyCheckIns: weeklyCheckInMap.get(org.id) || 0,
          lastCheckInDate: lastCheckInMap.get(org.id) || null,
          contractExpiringSoon,
        };
      });

      setOrganizations(orgsWithMetrics);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [
        { count: totalOrganizations },
        { count: activeOrganizations },
        { count: totalParents },
        { count: totalCheckIns },
        { count: todayCheckIns },
        { count: weeklyCheckIns },
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('checkins').select('*', { count: 'exact', head: true }),
        supabase.from('checkins').select('*', { count: 'exact', head: true })
          .gte('check_in_time', today.toISOString())
          .lte('check_in_time', todayEnd.toISOString()),
        supabase.from('checkins').select('*', { count: 'exact', head: true })
          .gte('check_in_time', weekAgo.toISOString()),
      ]);

      setStats({
        totalOrganizations: totalOrganizations || 0,
        activeOrganizations: activeOrganizations || 0,
        totalParents: totalParents || 0,
        totalCheckIns: totalCheckIns || 0,
        todayCheckIns: todayCheckIns || 0,
        weeklyCheckIns: weeklyCheckIns || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadQuickInsights = async () => {
    try {
      const insights: QuickInsight[] = [];

      // Check for expiring contracts
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { count: expiringContracts } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .not('contract_end_date', 'is', null)
        .lte('contract_end_date', thirtyDaysFromNow.toISOString())
        .gte('contract_end_date', new Date().toISOString())
        .eq('status', 'active');

      if (expiringContracts && expiringContracts > 0) {
        insights.push({
          id: 'expiring-contracts',
          type: 'warning',
          title: 'Contracts Expiring Soon',
          message: `${expiringContracts} organisation contract${expiringContracts > 1 ? 's' : ''} expiring within 30 days`,
          count: expiringContracts,
        });
      }

      // Check for inactive organizations
      const { count: inactiveOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'inactive');

      if (inactiveOrgs && inactiveOrgs > 0) {
        insights.push({
          id: 'inactive-orgs',
          type: 'info',
          title: 'Inactive Organisations',
          message: `${inactiveOrgs} organisation${inactiveOrgs > 1 ? 's' : ''} marked as inactive`,
          count: inactiveOrgs,
        });
      }

      // Check for organizations with no parents (more efficient batch query)
      const { data: allOrgs } = await supabase.from('organizations').select('id');
      const { data: allParents } = await supabase.from('profiles').select('organization_id').not('organization_id', 'is', null);
      
      if (allOrgs && allParents) {
        const orgsWithParents = new Set(allParents.map(p => p.organization_id));
        const orgsWithNoParents = allOrgs.filter(org => !orgsWithParents.has(org.id)).length;
        
        if (orgsWithNoParents > 0) {
          insights.push({
            id: 'no-parents',
            type: 'info',
            title: 'Organisations Without Parents',
            message: `${orgsWithNoParents} organisation${orgsWithNoParents > 1 ? 's' : ''} have no registered parents`,
            count: orgsWithNoParents,
          });
        }
      }

      setQuickInsights(insights);
    } catch (error) {
      console.error('Error loading quick insights:', error);
      setQuickInsights([]);
    }
  };

  const filteredOrganizations = organizations.filter(
    (org) => {
      const matchesSearch = 
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.contact_email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
      const matchesPlanType = planTypeFilter === 'all' || org.plan_type === planTypeFilter;
      
      return matchesSearch && matchesStatus && matchesPlanType;
    }
  );

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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} year${years > 1 ? 's' : ''} ago`;
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

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <WarningIcon sx={{ fontSize: 20 }} />;
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 20 }} />;
      default:
        return <InfoIcon sx={{ fontSize: 20 }} />;
    }
  };

  const handleDeleteClick = (org: OrganizationWithMetrics) => {
    setOrganizationToDelete(org);
    setDeleteDialogOpen(true);
  };

  const handleViewClick = async (org: OrganizationWithMetrics) => {
    setViewingOrganization(org);
    setViewDialogOpen(true);
    setViewLoading(true);
    setViewFullDetails(false); // Reset to compact view

    try {
      // Load parents
      const { data: parentsData, error: parentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (parentsError) {
        console.error('Error loading parents:', parentsError);
      }

      // Load recent check-ins
      const { data: parentIds, error: parentIdsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', org.id);

      if (parentIdsError) {
        console.error('Error loading parent IDs:', parentIdsError);
      }

      const parentIdList = parentIds?.map((p: { id: string }) => p.id) || [];
      let checkInsData: any[] = [];

      // Only query check-ins if there are parents
      if (parentIdList.length > 0) {
        const { data: checkIns, error: checkInsError } = await supabase
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

        if (checkInsError) {
          console.error('Error loading check-ins:', checkInsError);
          // If foreign key relationships don't exist, try without them
          const { data: simpleCheckIns } = await supabase
            .from('checkins')
            .select('id, check_in_time, check_out_time, child_id, center_id')
            .in('parent_id', parentIdList)
            .order('check_in_time', { ascending: false })
            .limit(10);
          
          checkInsData = (simpleCheckIns || []) as any[];
        } else {
          checkInsData = (checkIns || []) as any[];
        }
      }

      setViewParents(parentsData || []);
      setViewRecentCheckIns(checkInsData || []);
    } catch (error) {
      console.error('Error loading view data:', error);
      // Set empty arrays on error to prevent UI issues
      setViewParents([]);
      setViewRecentCheckIns([]);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!organizationToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/organizations/${organizationToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete organisation');
      }

      // Log deletion activity
      await logActivity({
        activityType: 'organisation_deleted',
        entityType: 'organisation',
        entityId: organizationToDelete.id,
        entityName: organizationToDelete.name,
        description: ActivityDescriptions.organisationDeleted(organizationToDelete.name),
        metadata: {
          had_parents: organizationToDelete.parent_count > 0,
          parent_count: organizationToDelete.parent_count,
        },
      });

      // Remove the organization from the local state immediately
      setOrganizations(prev => prev.filter(org => org.id !== organizationToDelete.id));
      
      // Then reload all data in background
      await Promise.all([
        loadOrganizations(),
        loadStats(),
        loadQuickInsights(),
      ]);

      setDeleteDialogOpen(false);
      setOrganizationToDelete(null);
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      alert('Failed to delete organisation: ' + (error.message || 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  const handleExportClick = () => {
    if (!viewingOrganization) return;
    setExportDialogOpen(true);
  };

  const generateOrganizationReport = (format: 'pdf' | 'csv', dateRange?: { startDate?: Date; endDate?: Date }) => {
    if (!viewingOrganization) return;

    // Filter parents by date range if provided
    let filteredParents = viewParents;
    if (dateRange?.startDate || dateRange?.endDate) {
      filteredParents = viewParents.filter((p) => {
        const createdDate = new Date(p.created_at);
        if (dateRange.startDate && createdDate < dateRange.startDate) return false;
        if (dateRange.endDate) {
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (createdDate > endDate) return false;
        }
        return true;
      });
    }

    // Filter check-ins by date range if provided
    let filteredCheckIns = viewRecentCheckIns;
    if (dateRange?.startDate || dateRange?.endDate) {
      filteredCheckIns = viewRecentCheckIns.filter((c: any) => {
        const checkInDate = new Date(c.check_in_time);
        if (dateRange.startDate && checkInDate < dateRange.startDate) return false;
        if (dateRange.endDate) {
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (checkInDate > endDate) return false;
        }
        return true;
      });
    }

    const reportData = {
      name: viewingOrganization.name,
      industry: viewingOrganization.industry,
      status: viewingOrganization.status,
      plan_type: viewingOrganization.plan_type,
      size: viewingOrganization.size,
      contact_name: viewingOrganization.contact_name,
      contact_email: viewingOrganization.contact_email,
      contact_phone: viewingOrganization.contact_phone,
      address: viewingOrganization.address,
      city: viewingOrganization.city,
      parentCount: viewingOrganization.parentCount,
      checkInCount: viewingOrganization.checkInCount,
      todayCheckIns: viewingOrganization.todayCheckIns,
      lastCheckInDate: viewingOrganization.lastCheckInDate,
      parents: filteredParents,
      recentCheckIns: filteredCheckIns,
    };

    if (format === 'pdf') {
      generateOrganisationPDF(reportData, dateRange);
    } else {
      generateOrganisationCSV(reportData, dateRange);
    }

    // Log the export activity
    logActivity({
      activityType: 'report_exported',
      entityType: 'organisation',
      entityId: viewingOrganization.id,
      entityName: viewingOrganization.name,
      description: `Exported ${format.toUpperCase()} report for organisation: ${viewingOrganization.name}${dateRange ? ` (${dateRange.startDate?.toLocaleDateString()} - ${dateRange.endDate?.toLocaleDateString()})` : ''}`,
    });
  };

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 4, sm: 5, md: 6 }, flexWrap: 'wrap', gap: 2 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600,
              fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem' },
              color: '#1e293b',
            }}
          >
            Organisations
          </Typography>
          <Button
            onClick={() => setAddDrawerOpen(true)}
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              textTransform: 'none',
              bgcolor: '#E91E63',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: '#C2185B',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 16px -4px rgba(233, 30, 99, 0.4)',
              },
              px: { xs: 3, sm: 4 },
              py: { xs: 1.5, sm: 1.75 },
              '& .MuiButton-startIcon': {
                transition: 'transform 0.2s ease',
              },
              '&:hover .MuiButton-startIcon': {
                transform: 'rotate(90deg)',
              },
            }}
          >
            Add Organisation
          </Button>
        </Box>

        {/* Statistics Dashboard */}
        {!loading && (
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
              gap: { xs: 2, sm: 3, md: 4 },
              mb: { xs: 4, sm: 5, md: 6 },
              width: '100%',
            }}
          >
            {[
              { icon: <BusinessIcon />, label: 'Total', value: stats.totalOrganizations, color: '#E91E63' },
              { icon: <CheckCircleIcon />, label: 'Active', value: stats.activeOrganizations, color: '#4CAF50' },
              { icon: <PeopleIcon />, label: 'Parents', value: stats.totalParents, color: '#2196F3' },
              { icon: <BarChartIcon />, label: 'Total Check-ins', value: stats.totalCheckIns, color: '#9C27B0' },
              { icon: <AccessTimeIcon />, label: 'Today', value: stats.todayCheckIns, color: '#FF9800' },
              { icon: <TrendingUpIcon />, label: 'This Week', value: stats.weeklyCheckIns, color: '#E91E63' },
            ].map((stat, index) => (
              <Box key={index} sx={{ display: 'flex', width: '100%' }}>
                <Card sx={{ 
                  height: '100%', 
                  width: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'default',
                  animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                  '@keyframes fadeIn': {
                    '0%': {
                      opacity: 0,
                      transform: 'translateY(10px)',
                    },
                    '100%': {
                      opacity: 1,
                      transform: 'translateY(0)',
                    },
                  },
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px -10px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  },
                }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box
                        sx={{
                          fontSize: 20,
                          color: stat.color,
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'transform 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.1) rotate(5deg)',
                          },
                        }}
                      >
                        {stat.icon}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {stat.label}
                      </Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {stat.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        )}

        {/* Quick Insights Panel */}
        {!loading && quickInsights.length > 0 && (
          <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1rem', sm: '1.125rem' } }}>
              Quick Insights
            </Typography>
            <Grid container spacing={2}>
              {quickInsights.map((insight) => (
                <Grid item xs={12} sm={6} md={4} key={insight.id}>
                  <Alert
                    severity={insight.type === 'warning' ? 'warning' : insight.type === 'success' ? 'success' : 'info'}
                    icon={getInsightIcon(insight.type)}
                    sx={{
                      '& .MuiAlert-message': {
                        width: '100%',
                      },
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {insight.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {insight.message}
                    </Typography>
                  </Alert>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Search and Filters */}
        <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 3 },
            alignItems: { xs: 'stretch', sm: 'flex-end' },
          }}>
            {/* Search Box */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <input
                type="text"
                placeholder="Search organisations by name, industry, city, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                style={{ width: '100%' }}
              />
            </Box>

            {/* Status Filter */}
            <FormControl sx={{ minWidth: { xs: '100%', sm: 160 } }}>
              <InputLabel id="status-filter-label" sx={{ fontSize: '0.875rem' }}>Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
                sx={{
                  height: 48,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#d1d5db',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>

            {/* Plan Type Filter */}
            <FormControl sx={{ minWidth: { xs: '100%', sm: 160 } }}>
              <InputLabel id="plan-filter-label" sx={{ fontSize: '0.875rem' }}>Plan Type</InputLabel>
              <Select
                labelId="plan-filter-label"
                value={planTypeFilter}
                onChange={(e) => setPlanTypeFilter(e.target.value)}
                label="Plan Type"
                sx={{
                  height: 48,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#d1d5db',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                }}
              >
                <MenuItem value="all">All Plans</MenuItem>
                <MenuItem value="basic">Basic</MenuItem>
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
                <MenuItem value="enterprise">Enterprise</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Organizations Table */}
        <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress size={32} sx={{ color: '#E91E63' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading organisations...
              </Typography>
            </Box>
          ) : filteredOrganizations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body2" color="text.secondary">
                {searchQuery ? 'No organisations found matching your search.' : 'No organisations found'}
              </Typography>
            </Box>
          ) : (
            <TableContainer 
              component={Paper} 
              sx={{ 
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', 
                borderRadius: 2,
                transition: 'box-shadow 0.3s ease',
                '&:hover': {
                  boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12)',
                },
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Plan</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Industry</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Parents</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Check-ins</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Last Activity</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2, textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrganizations.map((org) => {
                    const statusColors = getStatusColor(org.status);
                    const planColors = getPlanTypeColor(org.plan_type);
                    
                    return (
                      <TableRow 
                        key={org.id}
                        sx={{ 
                          transition: 'background-color 0.2s ease',
                          '&:hover': { bgcolor: '#f9fafb' },
                          '&:last-child td': { borderBottom: 0 }
                        }}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {org.name}
                            </Typography>
                            {org.contact_name && (
                              <Typography variant="caption" color="text.secondary">
                                {org.contact_name}
                              </Typography>
                            )}
                            {org.contractExpiringSoon && (
                              <Box sx={{ mt: 0.5 }}>
                                <Chip 
                                  label="Expiring Soon" 
                                  size="small" 
                                  sx={{ 
                                    height: 18, 
                                    fontSize: '0.65rem',
                                    bgcolor: '#FFF3E0',
                                    color: '#F57C00'
                                  }} 
                                />
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                            size="small"
                            sx={{
                              height: 24,
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              bgcolor: statusColors.bg,
                              color: statusColors.color,
                              textTransform: 'capitalize',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {org.plan_type ? (
                            <Chip
                              label={org.plan_type.charAt(0).toUpperCase() + org.plan_type.slice(1)}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: '0.6875rem',
                                fontWeight: 500,
                                bgcolor: planColors.bg,
                                color: planColors.color,
                                textTransform: 'capitalize',
                              }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {org.industry || '-'}
                          </Typography>
                          {org.size && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {org.size} employees
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#2196F3' }}>
                            {org.parentCount}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                            {org.checkInCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Today: {org.todayCheckIns}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {org.lastCheckInDate ? formatTimeAgo(org.lastCheckInDate) : 'Never'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewClick(org)}
                                sx={{ 
                                  color: '#64748b',
                                  '&:hover': { color: '#E91E63', bgcolor: '#FCE4EC' }
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Allocations">
                              <IconButton
                                size="small"
                                onClick={() => router.push(`/dashboard/allocations?organization=${org.id}`)}
                                sx={{ 
                                  color: '#64748b',
                                  '&:hover': { color: '#2196F3', bgcolor: '#E3F2FD' }
                                }}
                              >
                                <TrendingUpIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Parents">
                              <IconButton
                                size="small"
                                onClick={() => router.push(`/dashboard/parents?organization=${org.id}`)}
                                sx={{ 
                                  color: '#64748b',
                                  '&:hover': { color: '#4CAF50', bgcolor: '#E8F5E9' }
                                }}
                              >
                                <PeopleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        {/* View Organization Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setViewFullDetails(false);
          }}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              maxHeight: '90vh',
            },
          }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
            <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
              {viewingOrganization?.name}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => {
                  setViewDialogOpen(false);
                  if (viewingOrganization) {
                    setEditingOrganization(viewingOrganization);
                    setEditDrawerOpen(true);
                  }
                }}
                sx={{
                  textTransform: 'none',
                  borderColor: '#2196F3',
                  color: '#2196F3',
                  '&:hover': {
                    borderColor: '#1976D2',
                    bgcolor: 'rgba(33, 150, 243, 0.04)',
                  },
                }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setViewDialogOpen(false);
                  if (viewingOrganization) {
                    handleDeleteClick(viewingOrganization);
                  }
                }}
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
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ overflowY: 'auto' }}>
            {viewLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: '#E91E63' }} />
              </Box>
            ) : viewingOrganization ? (
              <Box>
                {/* Status and Plan Type */}
                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  <Chip
                    label={viewingOrganization.status.charAt(0).toUpperCase() + viewingOrganization.status.slice(1)}
                    size="small"
                    sx={{
                      bgcolor: getStatusColor(viewingOrganization.status).bg,
                      color: getStatusColor(viewingOrganization.status).color,
                      fontWeight: 600,
                    }}
                  />
                  {viewingOrganization.plan_type && (
                    <Chip
                      label={viewingOrganization.plan_type.charAt(0).toUpperCase() + viewingOrganization.plan_type.slice(1)}
                      size="small"
                      sx={{
                        bgcolor: getPlanTypeColor(viewingOrganization.plan_type).bg,
                        color: getPlanTypeColor(viewingOrganization.plan_type).color,
                        fontWeight: 500,
                      }}
                    />
                  )}
                </Box>

                {/* Statistics */}
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Parents
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#2196F3' }}>
                        {viewingOrganization.parentCount}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Total Check-ins
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                        {viewingOrganization.checkInCount}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Today
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF9800' }}>
                        {viewingOrganization.todayCheckIns}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        This Week
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#E91E63' }}>
                        {viewingOrganization.weeklyCheckIns}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Organization Details */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Basic Information
                    </Typography>
                    {viewingOrganization.industry && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">Industry</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {viewingOrganization.industry}
                        </Typography>
                      </Box>
                    )}
                    {viewingOrganization.size && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">Employee Size</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {viewingOrganization.size}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Contact Information
                    </Typography>
                    {viewingOrganization.contact_name && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">Contact Person</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {viewingOrganization.contact_name}
                        </Typography>
                      </Box>
                    )}
                    {viewingOrganization.contact_email && (
                      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        <Typography variant="body1">
                          {viewingOrganization.contact_email}
                        </Typography>
                      </Box>
                    )}
                    {viewingOrganization.contact_phone && (
                      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhoneIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        <Typography variant="body1">
                          {viewingOrganization.contact_phone}
                        </Typography>
                      </Box>
                    )}
                    {viewingOrganization.address && (
                      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: '#64748b', mt: 0.5 }} />
                        <Typography variant="body1">
                          {viewingOrganization.address}
                          {viewingOrganization.city && `, ${viewingOrganization.city}`}
                          {viewingOrganization.state && `, ${viewingOrganization.state}`}
                          {viewingOrganization.zip_code && ` ${viewingOrganization.zip_code}`}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>

                {(viewingOrganization.contract_start_date || viewingOrganization.contract_end_date) && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Contract Period
                    </Typography>
                    {viewingOrganization.contract_start_date && (
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        Start: {new Date(viewingOrganization.contract_start_date).toLocaleDateString()}
                      </Typography>
                    )}
                    {viewingOrganization.contract_end_date && (
                      <Typography variant="body2">
                        End: {new Date(viewingOrganization.contract_end_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </>
                )}

                {/* Expanded Details - Parents & Check-ins */}
                {viewFullDetails && (
                  <>
                    {/* Parents List */}
                    {viewParents.length > 0 && (
                      <>
                        <Divider sx={{ my: 3 }} />
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                          Recent Parents ({viewingOrganization.parentCount} total)
                        </Typography>
                        <Box sx={{ maxHeight: '300px', overflowY: 'auto' }}>
                          {viewParents.map((parent) => (
                            <Box key={parent.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
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
                      </>
                    )}

                    {/* Recent Check-ins */}
                    {viewRecentCheckIns.length > 0 && (
                      <>
                        <Divider sx={{ my: 3 }} />
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                          Recent Check-ins
                        </Typography>
                        <Box sx={{ maxHeight: '300px', overflowY: 'auto' }}>
                          {viewRecentCheckIns.map((checkIn: any) => {
                            const child = Array.isArray(checkIn.children) ? checkIn.children[0] : checkIn.children;
                            const center = Array.isArray(checkIn.centers) ? checkIn.centers[0] : checkIn.centers;
                            return (
                              <Box key={checkIn.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {child ? `${child.first_name} ${child.last_name}` : 'Unknown Child'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {center?.name || 'Unknown Center'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Check-in: {checkIn.check_in_time ? new Date(checkIn.check_in_time).toLocaleString() : 'Unknown date'}
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
                            );
                          })}
                        </Box>
                      </>
                    )}
                  </>
                )}
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => {
                setViewDialogOpen(false);
                setViewFullDetails(false);
              }}
              sx={{
                textTransform: 'none',
                color: '#64748b',
              }}
            >
              Close
            </Button>
            {viewFullDetails && (
              <Button
                variant="outlined"
                startIcon={<GetAppIcon />}
                onClick={handleExportClick}
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
                Export Report
              </Button>
            )}
            <Button
              variant="contained"
              onClick={() => setViewFullDetails(!viewFullDetails)}
              sx={{
                textTransform: 'none',
                bgcolor: '#E91E63',
                '&:hover': {
                  bgcolor: '#C2185B',
                },
              }}
            >
              {viewFullDetails ? 'Show Less' : 'View Full Details'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Organisation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete <strong>{organizationToDelete?.name}</strong>? This action cannot be undone.
            </DialogContentText>
            {organizationToDelete && organizationToDelete.parentCount > 0 && (
              <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                Warning: This organisation has {organizationToDelete.parentCount} associated parent{organizationToDelete.parentCount > 1 ? 's' : ''}. 
                They must be removed or reassigned first.
              </Typography>
            )}
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
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={deleting}
              sx={{ textTransform: 'none' }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Organisation Drawer */}
        <Drawer
          anchor="right"
          open={addDrawerOpen}
          onClose={() => setAddDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: '600px', md: '700px' },
              maxWidth: '90vw',
            },
          }}
          ModalProps={{
            BackdropProps: {
              sx: {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
              },
            },
          }}
        >
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
            }}
          >
            {/* Drawer Header */}
            <Box
              sx={{
                p: 3,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: '#ffffff',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#E91E63' }}>
                Add New Organisation
              </Typography>
              <IconButton
                onClick={() => setAddDrawerOpen(false)}
                sx={{
                  color: '#64748b',
                  '&:hover': {
                    bgcolor: 'rgba(100, 116, 139, 0.08)',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Drawer Content */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 3,
                width: '100%',
                maxWidth: '100%',
              }}
            >
              <OrganizationForm
                onSuccess={() => {
                  setAddDrawerOpen(false);
                  loadOrganizations();
                  loadStats();
                  loadQuickInsights();
                }}
                onCancel={() => setAddDrawerOpen(false)}
              />
            </Box>
          </Box>
        </Drawer>

        {/* Edit Organisation Drawer */}
        <Drawer
          anchor="right"
          open={editDrawerOpen}
          onClose={() => {
            setEditDrawerOpen(false);
            setEditingOrganization(null);
          }}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: '600px', md: '700px' },
              maxWidth: '90vw',
            },
          }}
          ModalProps={{
            BackdropProps: {
              sx: {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
              },
            },
          }}
        >
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
            }}
          >
            {/* Drawer Header */}
            <Box
              sx={{
                p: 3,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: '#ffffff',
              }}
            >
              <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem', color: '#E91E63' }}>
                Edit Organisation
              </Box>
              <IconButton
                onClick={() => {
                  setEditDrawerOpen(false);
                  setEditingOrganization(null);
                }}
                sx={{
                  color: '#64748b',
                  '&:hover': {
                    bgcolor: 'rgba(100, 116, 139, 0.08)',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Drawer Content */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 3,
                width: '100%',
                maxWidth: '100%',
              }}
            >
              {editingOrganization && (
                <OrganizationForm
                  organization={editingOrganization}
                  onSuccess={() => {
                    setEditDrawerOpen(false);
                    setEditingOrganization(null);
                    loadOrganizations();
                    loadStats();
                    loadQuickInsights();
                  }}
                  onCancel={() => {
                    setEditDrawerOpen(false);
                    setEditingOrganization(null);
                  }}
                />
              )}
            </Box>
          </Box>
        </Drawer>
      </Box>
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={generateOrganizationReport}
        title="Export Organisation Report"
      />
    </DashboardLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import CenterForm from '../../../components/CenterForm';
import QRCodeManagement from '../../../components/QRCodeManagement';
import { supabase } from '../../../../lib/supabase';
import { logActivity } from '../../../utils/activityLogger';
import { generateCentrePDF } from '../../../utils/pdfExport';
import { generateCentreCSV } from '../../../utils/csvExport';
import ExportDialog from '../../../components/ExportDialog';
import { useDebounce } from '../../../hooks/useDebounce';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Tooltip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationOnIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
  People as PeopleIcon,
  ChildCare as ChildCareIcon,
  QrCode as QrCodeIcon,
  GetApp as GetAppIcon,
} from '@mui/icons-material';
import type { Center } from '../../../../../shared/types';

interface CenterWithMetrics extends Center {
  checkInCount: number;
  todayCheckIns: number;
  activeQRCodes: number;
}

interface CenterStats {
  totalCenters: number;
  verifiedCenters: number;
  unverifiedCenters: number;
  totalCheckIns: number;
  todayCheckIns: number;
  totalCapacity: number;
}

export default function CentersPage() {
  const router = useRouter();
  const [centers, setCenters] = useState<CenterWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState<CenterStats>({
    totalCenters: 0,
    verifiedCenters: 0,
    unverifiedCenters: 0,
    totalCheckIns: 0,
    todayCheckIns: 0,
    totalCapacity: 0,
  });
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingCenter, setViewingCenter] = useState<CenterWithMetrics | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState<CenterWithMetrics | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [qrCodeDialogOpen, setQRCodeDialogOpen] = useState(false);
  const [qrCodeCenter, setQRCodeCenter] = useState<Center | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(() => {
    loadData();

    // Set up optimized realtime subscription for instant center updates
    const centerChannel = supabase
      .channel('admin-centers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'centers',
        },
        (payload) => {
          console.log('New center added:', payload);
          // Reload full data for new center with metrics
          loadData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centers',
        },
        (payload) => {
          console.log('Center updated:', payload);
          // Update specific center in state
          const updatedCenter = payload.new as any;
          setCenters(prev => prev.map(c => 
            c.id === updatedCenter.id 
              ? { ...c, ...updatedCenter } 
              : c
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'centers',
        },
        (payload) => {
          console.log('Center deleted:', payload);
          const deletedId = (payload.old as any).id;
          setCenters(prev => prev.filter(c => c.id !== deletedId));
          loadStats(); // Update counts
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(centerChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCenters(),
        loadStats(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCenters = async () => {
    try {
      // Load all centers
      const { data: centersData, error: centersError } = await supabase
        .from('centers')
        .select('*')
        .order('name');

      if (centersError) throw centersError;
      if (!centersData || centersData.length === 0) {
        setCenters([]);
        return;
      }

      const centerIds = centersData.map(center => center.id);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // Load check-ins for all centers
      const { data: allCheckIns } = await supabase
        .from('checkins')
        .select('id, center_id, check_in_time')
        .in('center_id', centerIds);

      // Load QR codes for all centers
      const { data: allQRCodes } = await supabase
        .from('center_qrcodes')
        .select('id, center_id, is_active')
        .in('center_id', centerIds);

      // Create lookup maps
      const checkInCountMap = new Map<string, number>();
      const todayCheckInMap = new Map<string, number>();
      const qrCodeCountMap = new Map<string, number>();

      allCheckIns?.forEach((checkIn: any) => {
        checkInCountMap.set(checkIn.center_id, (checkInCountMap.get(checkIn.center_id) || 0) + 1);

        const checkInTime = new Date(checkIn.check_in_time);
        if (checkInTime >= today && checkInTime <= todayEnd) {
          todayCheckInMap.set(checkIn.center_id, (todayCheckInMap.get(checkIn.center_id) || 0) + 1);
        }
      });

      allQRCodes?.forEach((qr: any) => {
        if (qr.is_active) {
          qrCodeCountMap.set(qr.center_id, (qrCodeCountMap.get(qr.center_id) || 0) + 1);
        }
      });

      // Combine data
      const centersWithMetrics: CenterWithMetrics[] = centersData.map(center => ({
        ...center,
        checkInCount: checkInCountMap.get(center.id) || 0,
        todayCheckIns: todayCheckInMap.get(center.id) || 0,
        activeQRCodes: qrCodeCountMap.get(center.id) || 0,
      }));

      setCenters(centersWithMetrics);
    } catch (error) {
      console.error('Error loading centers:', error);
      setCenters([]);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const [
        { count: totalCenters },
        { count: verifiedCenters },
        { count: unverifiedCenters },
        { count: totalCheckIns },
        { count: todayCheckIns },
        { data: capacityData },
      ] = await Promise.all([
        supabase.from('centers').select('*', { count: 'exact', head: true }),
        supabase.from('centers').select('*', { count: 'exact', head: true }).eq('is_verified', true),
        supabase.from('centers').select('*', { count: 'exact', head: true }).eq('is_verified', false),
        supabase.from('checkins').select('*', { count: 'exact', head: true }),
        supabase.from('checkins').select('*', { count: 'exact', head: true })
          .gte('check_in_time', today.toISOString())
          .lte('check_in_time', todayEnd.toISOString()),
        supabase.from('centers').select('capacity'),
      ]);

      const totalCapacity = capacityData?.reduce((sum, center) => sum + (center.capacity || 0), 0) || 0;

      setStats({
        totalCenters: totalCenters || 0,
        verifiedCenters: verifiedCenters || 0,
        unverifiedCenters: unverifiedCenters || 0,
        totalCheckIns: totalCheckIns || 0,
        todayCheckIns: todayCheckIns || 0,
        totalCapacity,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filteredCenters = centers.filter((center) => {
    const matchesSearch =
      center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.region?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'verified' && center.is_verified) ||
      (statusFilter === 'unverified' && !center.is_verified);

    return matchesSearch && matchesStatus;
  });

  const handleDeleteClick = (center: CenterWithMetrics) => {
    setCenterToDelete(center);
    setDeleteDialogOpen(true);
  };

  const handleManageQRCodes = (center: Center) => {
    setQRCodeCenter(center);
    setQRCodeDialogOpen(true);
  };

  const handleExportClick = () => {
    if (!viewingCenter) return;
    setExportDialogOpen(true);
  };

  const generateCenterReport = async (format: 'pdf' | 'csv', dateRange?: { startDate?: Date; endDate?: Date }) => {
    if (!viewingCenter) return;

    try {
      // Build query for check-ins
      let checkInsQuery = supabase
        .from('checkins')
        .select(`
          check_in_time,
          profiles!inner(full_name),
          children!inner(first_name, last_name)
        `)
        .eq('center_id', viewingCenter.id);

      // Apply date range filter if provided
      if (dateRange?.startDate) {
        checkInsQuery = checkInsQuery.gte('check_in_time', dateRange.startDate.toISOString());
      }
      if (dateRange?.endDate) {
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        checkInsQuery = checkInsQuery.lte('check_in_time', endDate.toISOString());
      }

      // Fetch recent check-ins for this center
      const { data: recentCheckIns, error: checkInsError } = await checkInsQuery
        .order('check_in_time', { ascending: false })
        .limit(1000); // Increase limit when filtering by date range

      if (checkInsError) throw checkInsError;

      // Fetch unique parents count
      const { data: uniqueParentsData, error: parentsError } = await supabase
        .from('checkins')
        .select('parent_id')
        .eq('center_id', viewingCenter.id);

      if (parentsError) throw parentsError;

      const uniqueParents = new Set(uniqueParentsData?.map((c: any) => c.parent_id)).size;

      // Get weekly check-ins (only if no date range filter)
      let weeklyCheckIns = 0;
      let monthlyCheckIns = 0;
      if (!dateRange?.startDate && !dateRange?.endDate) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: weekly } = await supabase
          .from('checkins')
          .select('*', { count: 'exact', head: true })
          .eq('center_id', viewingCenter.id)
          .gte('check_in_time', sevenDaysAgo.toISOString());
        weeklyCheckIns = weekly || 0;

        // Get monthly check-ins
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { count: monthly } = await supabase
          .from('checkins')
          .select('*', { count: 'exact', head: true })
          .eq('center_id', viewingCenter.id)
          .gte('check_in_time', thirtyDaysAgo.toISOString());
        monthlyCheckIns = monthly || 0;
      } else {
        // If date range is provided, calculate counts within that range
        weeklyCheckIns = recentCheckIns?.length || 0;
        monthlyCheckIns = recentCheckIns?.length || 0;
      }

      // Format check-ins data
      const formattedCheckIns = (recentCheckIns || []).map((c: any) => ({
        check_in_time: c.check_in_time,
        parent: { full_name: c.profiles?.full_name || 'Unknown' },
        child: {
          first_name: c.children?.first_name || 'Unknown',
          last_name: c.children?.last_name || '',
        },
      }));

      // Parse age range
      let ageRangeMin = 0;
      let ageRangeMax = 18;
      if (viewingCenter.age_range) {
        const match = viewingCenter.age_range.match(/(\d+)\s*-\s*(\d+)/);
        if (match) {
          ageRangeMin = parseInt(match[1]);
          ageRangeMax = parseInt(match[2]);
        }
      }

      const reportData = {
        name: viewingCenter.name,
        address: viewingCenter.address,
        city: viewingCenter.city,
        district: viewingCenter.district,
        region: viewingCenter.region,
        capacity: viewingCenter.capacity || 0,
        is_verified: viewingCenter.is_verified,
        services_offered: viewingCenter.services_offered,
        operating_schedule: viewingCenter.operating_schedule,
        description: viewingCenter.description,
        age_range_min: ageRangeMin,
        age_range_max: ageRangeMax,
        totalCheckIns: viewingCenter.checkInCount,
        todayCheckIns: viewingCenter.todayCheckIns,
        weeklyCheckIns: weeklyCheckIns || 0,
        monthlyCheckIns: monthlyCheckIns || 0,
        uniqueParents: uniqueParents,
        recentCheckIns: formattedCheckIns,
      };

      // Generate export based on format
      if (format === 'pdf') {
        generateCentrePDF(reportData, dateRange);
      } else {
        generateCentreCSV(reportData, dateRange);
      }

      // Log the export activity
      logActivity({
        activityType: 'report_exported',
        entityType: 'center',
        entityId: viewingCenter.id,
        entityName: viewingCenter.name,
        description: `Exported ${format.toUpperCase()} report for centre: ${viewingCenter.name}${dateRange ? ` (${dateRange.startDate?.toLocaleDateString()} - ${dateRange.endDate?.toLocaleDateString()})` : ''}`,
      });
    } catch (error) {
      console.error('Error generating center report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!centerToDelete) return;

    try {
      setDeleting(true);

      // Check for dependencies
      const { count: qrCodeCount } = await supabase
        .from('center_qrcodes')
        .select('*', { count: 'exact', head: true })
        .eq('center_id', centerToDelete.id);

      const { count: checkInCount } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('center_id', centerToDelete.id);

      if (qrCodeCount && qrCodeCount > 0) {
        alert(`Cannot delete centre: ${qrCodeCount} QR code(s) are associated with this centre. Please delete them first.`);
        setDeleteDialogOpen(false);
        setCenterToDelete(null);
        return;
      }

      if (checkInCount && checkInCount > 0) {
        const confirmDelete = window.confirm(
          `This centre has ${checkInCount} check-in record(s). Are you sure you want to delete it? This action cannot be undone.`
        );
        if (!confirmDelete) {
          setDeleteDialogOpen(false);
          setCenterToDelete(null);
          return;
        }
      }

      // Delete the center
      const { error } = await supabase
        .from('centers')
        .delete()
        .eq('id', centerToDelete.id);

      if (error) throw error;

      // Log deletion
      await logActivity({
        activityType: 'center_deleted',
        entityType: 'center',
        entityId: centerToDelete.id,
        entityName: centerToDelete.name,
        description: `Centre ${centerToDelete.name} in ${centerToDelete.city}, ${centerToDelete.region} was deleted`,
        metadata: {
          city: centerToDelete.city,
          state: centerToDelete.region,
          had_check_ins: checkInCount && checkInCount > 0,
          check_in_count: checkInCount || 0,
        },
      });

      // Update UI immediately
      setCenters(prev => prev.filter(c => c.id !== centerToDelete.id));

      // Reload data in background
      await loadData();

      setDeleteDialogOpen(false);
      setCenterToDelete(null);
    } catch (error: any) {
      console.error('Error deleting centre:', error);
      alert('Failed to delete centre: ' + (error.message || 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: '#1e293b',
            }}
          >
            Daycare Centres
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDrawerOpen(true)}
            sx={{
              textTransform: 'none',
              bgcolor: '#E91E63',
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: '#C2185B',
                transform: 'translateX(4px)',
                boxShadow: '0 4px 12px rgba(233, 30, 99, 0.4)',
                '& .MuiButton-startIcon': {
                  transform: 'scale(1.2)',
                },
              },
              '& .MuiButton-startIcon': {
                transition: 'transform 0.3s ease',
              },
            }}
          >
            Add Centre
          </Button>
        </Box>

        {/* Statistics */}
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
            <Box sx={{ display: 'flex', width: '100%' }}>
              <Card sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                animation: 'fadeIn 0.5s ease-in',
                '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                  '& .stat-icon': { transform: 'scale(1.1) rotate(5deg)' },
                },
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationOnIcon className="stat-icon" sx={{ fontSize: 20, color: '#E91E63', transition: 'transform 0.3s ease' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Total
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {stats.totalCenters}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: 'flex', width: '100%' }}>
              <Card sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                animation: 'fadeIn 0.5s ease-in 0.1s backwards',
                '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                  '& .stat-icon': { transform: 'scale(1.1) rotate(5deg)' },
                },
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircleIcon className="stat-icon" sx={{ fontSize: 20, color: '#4CAF50', transition: 'transform 0.3s ease' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Verified
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {stats.verifiedCenters}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: 'flex', width: '100%' }}>
              <Card sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                animation: 'fadeIn 0.5s ease-in 0.2s backwards',
                '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                  '& .stat-icon': { transform: 'scale(1.1) rotate(5deg)' },
                },
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WarningIcon className="stat-icon" sx={{ fontSize: 20, color: '#FF9800', transition: 'transform 0.3s ease' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Unverified
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {stats.unverifiedCenters}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: 'flex', width: '100%' }}>
              <Card sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                animation: 'fadeIn 0.5s ease-in 0.3s backwards',
                '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                  '& .stat-icon': { transform: 'scale(1.1) rotate(5deg)' },
                },
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircleIcon className="stat-icon" sx={{ fontSize: 20, color: '#2196F3', transition: 'transform 0.3s ease' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Check-Ins
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {stats.totalCheckIns}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: 'flex', width: '100%' }}>
              <Card sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                animation: 'fadeIn 0.5s ease-in 0.4s backwards',
                '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                  '& .stat-icon': { transform: 'scale(1.1) rotate(5deg)' },
                },
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AccessTimeIcon className="stat-icon" sx={{ fontSize: 20, color: '#9C27B0', transition: 'transform 0.3s ease' }} />
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

            <Box sx={{ display: 'flex', width: '100%' }}>
              <Card sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                animation: 'fadeIn 0.5s ease-in 0.5s backwards',
                '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                  '& .stat-icon': { transform: 'scale(1.1) rotate(5deg)' },
                },
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PeopleIcon className="stat-icon" sx={{ fontSize: 20, color: '#FF5722', transition: 'transform 0.3s ease' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Capacity
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {stats.totalCapacity}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}

        {/* Filters */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          <TextField
            placeholder="Search centres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#E91E63' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputBase-root': {
                fontSize: '0.875rem',
              },
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: '#E91E63' },
                '&.Mui-focused fieldset': { borderColor: '#E91E63' },
              },
              '& input::placeholder': {
                fontSize: '0.875rem',
              },
            }}
          />

          <FormControl fullWidth>
            <InputLabel sx={{ fontSize: '0.875rem' }}>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
              MenuProps={{
                PaperProps: {
                  sx: {
                    '& .MuiMenuItem-root': {
                      fontSize: '0.875rem',
                    },
                  },
                },
              }}
              sx={{
                fontSize: '0.875rem',
                '& .MuiSelect-select': {
                  fontSize: '0.875rem',
                },
              }}
            >
              <MenuItem value="all">All Centres</MenuItem>
              <MenuItem value="verified">Verified Only</MenuItem>
              <MenuItem value="unverified">Unverified Only</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Centers Table */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: '#4CAF50' }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading centres...
            </Typography>
          </Box>
        ) : filteredCenters.length === 0 ? (
          <Card>
            <CardContent sx={{ py: 8, textAlign: 'center' }}>
              <LocationOnIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No centres found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first centre'}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Centre Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Capacity</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Services</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Check-ins</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCenters.map((center) => (
                  <TableRow key={center.id} hover>
                    {/* Centre Name */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {center.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {center.operating_schedule && (
                          <>
                            {center.operating_schedule === '6am-6pm' && '6AM - 6PM'}
                            {center.operating_schedule === '24/7' && '24/7 Service'}
                            {center.operating_schedule === 'weekdays' && 'Weekdays Only'}
                            {center.operating_schedule === 'weekends' && 'Weekends Only'}
                            {center.operating_schedule === 'custom' && (center.custom_hours || 'Custom Hours')}
                          </>
                        )}
                      </Typography>
                    </TableCell>

                    {/* Location */}
                    <TableCell>
                      <Typography variant="body2">
                        {center.city}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[center.district, center.region].filter(Boolean).join(', ')}
                      </Typography>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {center.is_verified ? (
                        <Chip
                          label="Verified"
                          size="small"
                          icon={<CheckCircleIcon />}
                          sx={{
                            bgcolor: '#E8F5E9',
                            color: '#2E7D32',
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: '#2E7D32' },
                          }}
                        />
                      ) : (
                        <Chip
                          label="Unverified"
                          size="small"
                          icon={<WarningIcon />}
                          sx={{
                            bgcolor: '#FFF3E0',
                            color: '#E65100',
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: '#E65100' },
                          }}
                        />
                      )}
                    </TableCell>

                    {/* Capacity */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {center.capacity || 'N/A'}
                      </Typography>
                    </TableCell>

                    {/* Services */}
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 200 }}>
                        {center.services_offered && center.services_offered.length > 0 ? (
                          <>
                            {center.services_offered.slice(0, 2).map((service, index) => (
                              <Chip
                                key={index}
                                label={service}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  height: 18,
                                  bgcolor: '#FFF4F6',
                                  color: '#E91E63',
                                }}
                              />
                            ))}
                            {center.services_offered.length > 2 && (
                              <Chip
                                label={`+${center.services_offered.length - 2}`}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  height: 18,
                                  bgcolor: '#F5F5F5',
                                  color: '#666',
                                }}
                              />
                            )}
                          </>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            None
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* Check-ins */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                        {center.todayCheckIns} today
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {center.checkInCount} total
                      </Typography>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setViewingCenter(center);
                              setViewDialogOpen(true);
                            }}
                            sx={{ color: '#64748b', '&:hover': { color: '#E91E63', bgcolor: '#FCE4EC' } }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingCenter(center);
                              setEditDrawerOpen(true);
                            }}
                            sx={{ color: '#64748b', '&:hover': { color: '#2196F3', bgcolor: '#E3F2FD' } }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Manage QR Codes">
                          <IconButton
                            size="small"
                            onClick={() => handleManageQRCodes(center)}
                            sx={{ color: '#64748b', '&:hover': { color: '#9C27B0', bgcolor: '#F3E5F5' } }}
                          >
                            <QrCodeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(center)}
                            sx={{ color: '#64748b', '&:hover': { color: '#F44336', bgcolor: '#FFEBEE' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add Centre Drawer */}
        <Drawer
          anchor="right"
          open={addDrawerOpen}
          onClose={() => setAddDrawerOpen(false)}
          PaperProps={{
            sx: { width: { xs: '100%', sm: '600px', md: '700px' }, maxWidth: '90vw' },
          }}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#E91E63' }}>
                Add New Centre
              </Typography>
              <IconButton onClick={() => setAddDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              <CenterForm
                onSuccess={() => {
                  setAddDrawerOpen(false);
                  loadData();
                }}
                onCancel={() => setAddDrawerOpen(false)}
              />
            </Box>
          </Box>
        </Drawer>

        {/* Edit Centre Drawer */}
        <Drawer
          anchor="right"
          open={editDrawerOpen}
          onClose={() => {
            setEditDrawerOpen(false);
            setEditingCenter(null);
          }}
          PaperProps={{
            sx: { width: { xs: '100%', sm: '600px', md: '700px' }, maxWidth: '90vw' },
          }}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#E91E63' }}>
                Edit Centre
              </Typography>
              <IconButton onClick={() => { setEditDrawerOpen(false); setEditingCenter(null); }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              {editingCenter && (
                <CenterForm
                  center={editingCenter}
                  onSuccess={() => {
                    setEditDrawerOpen(false);
                    setEditingCenter(null);
                    loadData();
                  }}
                  onCancel={() => {
                    setEditDrawerOpen(false);
                    setEditingCenter(null);
                  }}
                />
              )}
            </Box>
          </Box>
        </Drawer>

        {/* View Centre Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setViewingCenter(null);
          }}
          maxWidth="md"
          fullWidth
          scroll="paper"
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {viewingCenter?.name}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {viewingCenter?.is_verified ? (
                    <Chip
                      label="Verified"
                      size="small"
                      icon={<CheckCircleIcon />}
                      sx={{
                        bgcolor: '#E8F5E9',
                        color: '#2E7D32',
                        fontWeight: 600,
                        '& .MuiChip-icon': { color: '#2E7D32' },
                      }}
                    />
                  ) : (
                    <Chip
                      label="Unverified"
                      size="small"
                      icon={<WarningIcon />}
                      sx={{
                        bgcolor: '#FFF3E0',
                        color: '#E65100',
                        fontWeight: 600,
                        '& .MuiChip-icon': { color: '#E65100' },
                      }}
                    />
                  )}
                </Box>
              </Box>
              <IconButton onClick={() => { setViewDialogOpen(false); setViewingCenter(null); }} edge="end">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ p: 0 }}>
            {viewingCenter && (
              <Box>
                {/* Statistics Cards */}
                <Box sx={{ p: 3, bgcolor: '#F9FAFB' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#4CAF50', mb: 0.5 }}>
                          {viewingCenter.todayCheckIns}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Today's Check-ins
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#2196F3', mb: 0.5 }}>
                          {viewingCenter.checkInCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Check-ins
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#9C27B0', mb: 0.5 }}>
                          {viewingCenter.activeQRCodes}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Active QR Codes
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Centre Details */}
                <Box sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                    Centre Information
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Location */}
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 0.5 }}>
                        Address
                      </Typography>
                      <Typography variant="body2">
                        {viewingCenter.address}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[viewingCenter.city, viewingCenter.district, viewingCenter.region].filter(Boolean).join(', ')}
                      </Typography>
                      {viewingCenter.map_link && (() => {
                        try {
                          // Validate URL to prevent XSS
                          const url = new URL(viewingCenter.map_link);
                          if (url.protocol === 'http:' || url.protocol === 'https:') {
                            return (
                              <Button
                                size="small"
                                href={url.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                startIcon={<LocationOnIcon />}
                                sx={{
                                  mt: 1,
                                  textTransform: 'none',
                                  color: '#4CAF50',
                                  '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.04)' },
                                }}
                              >
                                Open in Maps
                              </Button>
                            );
                          }
                        } catch (e) {
                          // Invalid URL - don't render button
                        }
                        return null;
                      })()}
                    </Box>

                    {/* Capacity */}
                    {viewingCenter.capacity && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 0.5 }}>
                          Capacity
                        </Typography>
                        <Typography variant="body2">
                          {viewingCenter.capacity} children
                        </Typography>
                      </Box>
                    )}

                    {/* Operating Schedule */}
                    {viewingCenter.operating_schedule && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 0.5 }}>
                          Operating Hours
                        </Typography>
                        <Typography variant="body2">
                          {viewingCenter.operating_schedule === '6am-6pm' && '6:00 AM - 6:00 PM (Standard Day Care)'}
                          {viewingCenter.operating_schedule === '24/7' && '24/7 (Round the Clock)'}
                          {viewingCenter.operating_schedule === 'weekdays' && 'Weekdays Only (Monday - Friday)'}
                          {viewingCenter.operating_schedule === 'weekends' && 'Weekends Only (Saturday - Sunday)'}
                          {viewingCenter.operating_schedule === 'custom' && (viewingCenter.custom_hours || 'Custom Hours')}
                        </Typography>
                      </Box>
                    )}

                    {/* Age Range */}
                    {viewingCenter.age_range && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 0.5 }}>
                          Age Range
                        </Typography>
                        <Typography variant="body2">{viewingCenter.age_range}</Typography>
                      </Box>
                    )}

                    {/* Services Offered */}
                    {viewingCenter.services_offered && viewingCenter.services_offered.length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 1 }}>
                          Services Offered
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {viewingCenter.services_offered.map((service, index) => (
                            <Chip
                              key={index}
                              label={service}
                              size="small"
                              sx={{
                                bgcolor: '#FFF4F6',
                                color: '#E91E63',
                                fontWeight: 500,
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Description */}
                    {viewingCenter.description && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 0.5 }}>
                          About
                        </Typography>
                        <Typography variant="body2">{viewingCenter.description}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={handleExportClick}
              variant="outlined"
              startIcon={<GetAppIcon />}
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
            <Box sx={{ flex: 1 }} />
            <Button
              onClick={() => {
                if (viewingCenter) {
                  handleManageQRCodes(viewingCenter);
                  setViewDialogOpen(false);
                }
              }}
              variant="contained"
              startIcon={<QrCodeIcon />}
              sx={{
                bgcolor: '#9C27B0',
                '&:hover': { bgcolor: '#7B1FA2' },
                textTransform: 'none',
              }}
            >
              Manage QR Codes
            </Button>
            <Button
              onClick={() => { setViewDialogOpen(false); setViewingCenter(null); }}
              sx={{ textTransform: 'none' }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Centre?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete <strong>{centerToDelete?.name}</strong>?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setDeleteDialogOpen(false); setCenterToDelete(null); }} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={deleting}
            >
              {deleting ? <CircularProgress size={20} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* QR Code Management Dialog */}
        {qrCodeCenter && (
          <QRCodeManagement
            open={qrCodeDialogOpen}
            onClose={() => {
              setQRCodeDialogOpen(false);
              setQRCodeCenter(null);
            }}
            center={qrCodeCenter}
            onSuccess={loadData}
          />
        )}
      </Box>
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={generateCenterReport}
        title="Export Centre Report"
      />
    </DashboardLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/DashboardLayout';
import { supabase } from '../../../../lib/supabase';
import { generateActivityLogsPDF } from '../../../utils/pdfExport';
import { generateActivityLogsCSV } from '../../../utils/csvExport';
import ExportDialog from '../../../components/ExportDialog';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface ActivityLog {
  id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  related_entity_type?: string;
  related_entity_id?: string;
  related_entity_name?: string;
  admin_user_id?: string;
  admin_email?: string; // To store fetched admin email
  description: string;
  metadata?: any;
  created_at: string;
}

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Activity type categories for filtering
  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'admin_user_created', label: 'Admin User Created' },
    { value: 'user_account_created', label: 'Account Created' },
    { value: 'user_role_assigned', label: 'Role Assigned' },
    { value: 'user_role_changed', label: 'Role Changed' },
    { value: 'user_deleted', label: 'User Deleted' },
    { value: 'parent_created', label: 'Parent Profile Created' },
    { value: 'parent_organisation_assigned', label: 'Organisation Assigned' },
    { value: 'parent_organisation_updated', label: 'Organisation Changed' },
    { value: 'parent_status_changed', label: 'Status Changed' },
    { value: 'parent_details_updated', label: 'Details Updated' },
    { value: 'parent_deleted', label: 'Parent Deleted' },
    { value: 'checkin_completed', label: 'Check-in' },
    { value: 'organisation_created', label: 'Organisation Created' },
    { value: 'organisation_updated', label: 'Organisation Updated' },
    { value: 'organisation_deleted', label: 'Organisation Deleted' },
    { value: 'center_created', label: 'Center Created' },
    { value: 'center_updated', label: 'Center Updated' },
    { value: 'center_verified', label: 'Center Verified' },
    { value: 'center_deleted', label: 'Center Deleted' },
    { value: 'allocation_created', label: 'Allocation Created' },
    { value: 'allocation_updated', label: 'Allocation Updated' },
    { value: 'checkout_completed', label: 'Check-Out Completed' },
    { value: 'pickup_reminder_sent', label: 'Pickup Reminder Sent' },
    { value: 'report_exported', label: 'Report Exported' },
    { value: 'system_error', label: 'System Error' },
    { value: 'system_warning', label: 'System Warning' },
  ];

  const entityTypes = [
    { value: 'all', label: 'All Entities' },
    { value: 'user', label: 'User' },
    { value: 'parent', label: 'Parent' },
    { value: 'organisation', label: 'Organisation' },
    { value: 'center', label: 'Center' },
    { value: 'allocation', label: 'Allocation' },
    { value: 'checkin', label: 'Check-in' },
    { value: 'system', label: 'System' },
  ];

  useEffect(() => {
    loadLogs();
  }, [page, rowsPerPage]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, activityTypeFilter, entityTypeFilter, startDate, endDate]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      // Get total count
      const { count } = await supabase
        .from('activity_log')
        .select('*', { count: 'exact', head: true });

      setTotalCount(count || 0);

      // Get paginated data
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * rowsPerPage, (page + 1) * rowsPerPage - 1);

      if (error) throw error;

      // Fetch admin user emails for logs that have admin_user_id
      const logsWithAdminEmails = await Promise.all(
        (data || []).map(async (log) => {
          if (log.admin_user_id) {
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('email')
                .eq('id', log.admin_user_id)
                .single();
              
              return { ...log, admin_email: userData?.email || 'Unknown' };
            } catch {
              return { ...log, admin_email: 'Unknown' };
            }
          }
          return { ...log, admin_email: 'System' };
        })
      );

      setLogs(logsWithAdminEmails);
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Apply date range filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((log) => new Date(log.created_at) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.created_at) <= end);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.entity_name?.toLowerCase().includes(query) ||
          log.related_entity_name?.toLowerCase().includes(query) ||
          log.description?.toLowerCase().includes(query) ||
          log.activity_type?.toLowerCase().includes(query)
      );
    }

    // Apply activity type filter
    if (activityTypeFilter !== 'all') {
      filtered = filtered.filter((log) => log.activity_type === activityTypeFilter);
    }

    // Apply entity type filter
    if (entityTypeFilter !== 'all') {
      filtered = filtered.filter((log) => log.entity_type === entityTypeFilter);
    }

    setFilteredLogs(filtered);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    setPage(0);
    loadLogs();
  };

  const handleExportClick = () => {
    setExportDialogOpen(true);
  };

  const handleExport = (format: 'pdf' | 'csv', dateRange?: { startDate?: Date; endDate?: Date }) => {
    // Use date range from dialog if provided, otherwise use existing filters
    const filters = {
      startDate: dateRange?.startDate || (startDate ? new Date(startDate) : undefined),
      endDate: dateRange?.endDate || (endDate ? new Date(endDate) : undefined),
      activityType: activityTypeFilter !== 'all' ? activityTypeFilter : undefined,
      entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
    };

    // Filter logs by date range if provided
    let logsToExport = filteredLogs;
    if (dateRange?.startDate || dateRange?.endDate) {
      logsToExport = filteredLogs.filter((log) => {
        const logDate = new Date(log.created_at);
        if (dateRange.startDate && logDate < dateRange.startDate) return false;
        if (dateRange.endDate) {
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (logDate > endDate) return false;
        }
        return true;
      });
    }

    if (format === 'pdf') {
      generateActivityLogsPDF(logsToExport, filters);
    } else {
      generateActivityLogsCSV(logsToExport, filters);
    }
  };

  const getActivityIcon = (type: string) => {
    if (type.includes('user_') || type.includes('parent_')) {
      return <PersonIcon sx={{ fontSize: 20, color: '#2196F3' }} />;
    }
    if (type.includes('organisation_')) {
      return <BusinessIcon sx={{ fontSize: 20, color: '#E91E63' }} />;
    }
    if (type.includes('center_')) {
      return <LocationOnIcon sx={{ fontSize: 20, color: '#4CAF50' }} />;
    }
    if (type.includes('checkin_')) {
      return <CheckCircleIcon sx={{ fontSize: 20, color: '#4CAF50' }} />;
    }
    if (type.includes('error')) {
      return <ErrorIcon sx={{ fontSize: 20, color: '#F44336' }} />;
    }
    if (type.includes('warning')) {
      return <WarningIcon sx={{ fontSize: 20, color: '#FF9800' }} />;
    }
    return <InfoIcon sx={{ fontSize: 20, color: '#9C27B0' }} />;
  };

  const getActivityTypeColor = (type: string) => {
    if (type.includes('created')) return '#4CAF50';
    if (type.includes('updated')) return '#2196F3';
    if (type.includes('deleted')) return '#F44336';
    if (type.includes('status')) return '#FF9800';
    if (type.includes('checkin')) return '#9C27B0';
    if (type.includes('error')) return '#F44336';
    return '#64748b';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return time.toLocaleDateString() + ' ' + time.toLocaleTimeString();
  };

  const formatActivityType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: '#1e293b',
                mb: 0.5,
              }}
            >
              Activity Logs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete audit trail of all system activities
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={handleRefresh}
                sx={{
                  color: '#E91E63',
                  border: '1px solid #E91E63',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'rgba(233, 30, 99, 0.04)',
                    transform: 'rotate(180deg)',
                    borderColor: '#C2185B',
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Logs">
              <IconButton
                onClick={handleExportClick}
                sx={{
                  color: '#E91E63',
                  border: '1px solid #E91E63',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'rgba(233, 30, 99, 0.04)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(233, 30, 99, 0.3)',
                    borderColor: '#C2185B',
                  },
                }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Stats */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
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
                  <CheckCircleIcon className="stat-icon" sx={{ fontSize: 20, color: '#E91E63', transition: 'transform 0.3s ease' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Total Activities
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {loading ? <CircularProgress size={20} sx={{ color: '#E91E63' }} /> : totalCount}
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
                  <SearchIcon className="stat-icon" sx={{ fontSize: 20, color: '#2196F3', transition: 'transform 0.3s ease' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Showing on Page
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {filteredLogs.length}
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
                  <FilterListIcon className="stat-icon" sx={{ fontSize: 20, color: '#4CAF50', transition: 'transform 0.3s ease' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Active Filters
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {(activityTypeFilter !== 'all' ? 1 : 0) + (entityTypeFilter !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0)}
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
                  <InfoIcon className="stat-icon" sx={{ fontSize: 20, color: '#9C27B0', transition: 'transform 0.3s ease' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Current Page
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {page + 1}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 2 },
            alignItems: { xs: 'stretch', sm: 'flex-end' },
            mb: 2,
          }}>
            {/* Search Box */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <TextField
                placeholder="Search logs..."
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
                    '&:hover fieldset': {
                      borderColor: '#E91E63',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#E91E63',
                    },
                  },
                  '& input::placeholder': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Box>

            {/* Date Range Filters */}
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
                sx: { fontSize: '0.875rem' },
              }}
              sx={{
                minWidth: { xs: '100%', sm: 160 },
                '& .MuiInputBase-root': {
                  fontSize: '0.875rem',
                },
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#E91E63',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#E91E63',
                  },
                },
              }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
                sx: { fontSize: '0.875rem' },
              }}
              sx={{
                minWidth: { xs: '100%', sm: 160 },
                '& .MuiInputBase-root': {
                  fontSize: '0.875rem',
                },
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#E91E63',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#E91E63',
                  },
                },
              }}
            />
          </Box>

          {/* Activity Type and Entity Type Filters */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 2 },
            alignItems: { xs: 'stretch', sm: 'flex-start' },
          }}>
            <FormControl sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}>
              <InputLabel sx={{ fontSize: '0.875rem' }}>Activity Type</InputLabel>
              <Select
                value={activityTypeFilter}
                onChange={(e) => setActivityTypeFilter(e.target.value)}
                label="Activity Type"
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
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                }}
              >
                {activityTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}>
              <InputLabel sx={{ fontSize: '0.875rem' }}>Entity Type</InputLabel>
              <Select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                label="Entity Type"
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
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                }}
              >
                {entityTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Logs Table */}
        <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TableContainer component={Paper} sx={{ flexGrow: 1, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Entity</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Performed By</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Related To</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <CircularProgress sx={{ color: '#E91E63' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Loading activity logs...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <InfoIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        No activity logs found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your filters or refresh the page
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                          {formatTimeAgo(log.created_at)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.created_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getActivityIcon(log.activity_type)}
                          <Chip
                            label={formatActivityType(log.activity_type)}
                            size="small"
                            sx={{
                              bgcolor: getActivityTypeColor(log.activity_type) + '20',
                              color: getActivityTypeColor(log.activity_type),
                              fontWeight: 600,
                              fontSize: '0.6875rem',
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {log.entity_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.entity_type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{log.description}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 500,
                            color: log.admin_email === 'System' ? '#757575' : '#1e293b'
                          }}
                        >
                          {log.admin_email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {log.related_entity_name ? (
                          <>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {log.related_entity_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {log.related_entity_type}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: '0.875rem',
              },
            }}
          />
        </Card>
      </Box>
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExport}
        title="Export Activity Logs"
        showDateFilter={true}
        defaultStartDate={startDate}
        defaultEndDate={endDate}
      />
    </DashboardLayout>
  );
}


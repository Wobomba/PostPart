'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/DashboardLayout';
import { supabase } from '../../../../lib/supabase';
import { generateActivityLogsPDF } from '../../../utils/pdfExport';
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
  Grid,
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

  // Activity type categories for filtering
  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'user_account_created', label: 'Account Created' },
    { value: 'parent_created', label: 'Parent Profile Created' },
    { value: 'parent_organisation_assigned', label: 'Organisation Assigned' },
    { value: 'parent_organisation_updated', label: 'Organisation Changed' },
    { value: 'parent_status_changed', label: 'Status Changed' },
    { value: 'parent_details_updated', label: 'Details Updated' },
    { value: 'checkin_completed', label: 'Check-in' },
    { value: 'organisation_created', label: 'Organisation Created' },
    { value: 'organisation_updated', label: 'Organisation Updated' },
    { value: 'system_error', label: 'System Error' },
  ];

  const entityTypes = [
    { value: 'all', label: 'All Entities' },
    { value: 'user', label: 'User' },
    { value: 'parent', label: 'Parent' },
    { value: 'organisation', label: 'Organisation' },
    { value: 'center', label: 'Center' },
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

      setLogs(data || []);
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

  const handleExport = () => {
    generateActivityLogsPDF(filteredLogs, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      activityType: activityTypeFilter !== 'all' ? activityTypeFilter : undefined,
      entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
    });
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
                  '&:hover': { bgcolor: 'rgba(233, 30, 99, 0.04)' },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Logs">
              <IconButton
                onClick={handleExport}
                sx={{
                  color: '#E91E63',
                  border: '1px solid #E91E63',
                  '&:hover': { bgcolor: 'rgba(233, 30, 99, 0.04)' },
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
            <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 20, color: '#E91E63' }} />
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
            <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SearchIcon sx={{ fontSize: 20, color: '#2196F3' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Filtered Results
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {filteredLogs.length}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ display: 'flex', width: '100%' }}>
            <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <FilterListIcon sx={{ fontSize: 20, color: '#4CAF50' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Active Filters
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {(activityTypeFilter !== 'all' ? 1 : 0) + (entityTypeFilter !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0)}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ display: 'flex', width: '100%' }}>
            <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <InfoIcon sx={{ fontSize: 20, color: '#9C27B0' }} />
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

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterListIcon sx={{ color: '#E91E63', fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                Filters
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
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
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{
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
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{
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
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Activity Type</InputLabel>
                  <Select
                    value={activityTypeFilter}
                    onChange={(e) => setActivityTypeFilter(e.target.value)}
                    label="Activity Type"
                    sx={{
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
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Entity Type</InputLabel>
                  <Select
                    value={entityTypeFilter}
                    onChange={(e) => setEntityTypeFilter(e.target.value)}
                    label="Entity Type"
                    sx={{
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
              </Grid>
            </Grid>
          </CardContent>
        </Card>

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
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Related To</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <CircularProgress sx={{ color: '#E91E63' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Loading activity logs...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
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
    </DashboardLayout>
  );
}


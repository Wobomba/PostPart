'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { supabase } from '../../../lib/supabase';
import { useAdminData } from '../../contexts/AdminDataContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  LocationOn as LocationOnIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Info as InfoIcon,
  ExitToApp as ExitToAppIcon,
} from '@mui/icons-material';
import Link from 'next/link';

interface ActivityEvent {
  id: string;
  type: string;
  organizationId?: string;
  organizationName?: string;
  parentName: string;
  message: string;
  timestamp: string;
}

export default function DashboardPage() {
  const {
    dashboardStats,
    activityTimeline,
    loading,
    refreshing,
    refreshDashboardStats,
    refreshActivityTimeline,
  } = useAdminData();
  
  const stats = dashboardStats || {
    totalOrganizations: 0,
    totalParents: 0,
    totalCenters: 0,
    totalCheckins: 0,
    recentCheckins: [] as any[],
    todayCheckins: 0,
    todayNewParents: 0,
    activeCentersToday: 0,
    weeklyCheckins: 0,
    lastWeekCheckins: 0,
    unverifiedCenters: 0,
    unassociatedParents: 0,
    topCenters: [] as any[],
    recentNotifications: [] as any[],
  };

  // Context handles initial load and realtime subscriptions
  // No need for additional useEffect here

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'checkin':
      case 'checkin_completed':
        return <CheckCircleIcon sx={{ fontSize: 20, color: '#4CAF50' }} />;
      case 'checkout':
      case 'checkout_completed':
        return <ExitToAppIcon sx={{ fontSize: 20, color: '#2196F3' }} />;
      case 'pickup_reminder_sent':
        return <NotificationsIcon sx={{ fontSize: 20, color: '#FF9800' }} />;
      case 'parent_added':
      case 'parent_created':
        return <PeopleIcon sx={{ fontSize: 20, color: '#2196F3' }} />;
      case 'parent_organisation_assigned':
      case 'parent_organisation_updated':
        return <BusinessIcon sx={{ fontSize: 20, color: '#E91E63' }} />;
      case 'parent_status_changed':
      case 'parent_details_updated':
        return <InfoIcon sx={{ fontSize: 20, color: '#9C27B0' }} />;
      case 'organisation_created':
      case 'organisation_updated':
        return <BusinessIcon sx={{ fontSize: 20, color: '#E91E63' }} />;
      case 'organisation_deleted':
      case 'organisation_status_changed':
        return <WarningIcon sx={{ fontSize: 20, color: '#FF9800' }} />;
      case 'status_change':
        return <InfoIcon sx={{ fontSize: 20, color: '#FF9800' }} />;
      default:
        return <InfoIcon sx={{ fontSize: 20, color: '#64748b' }} />;
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

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600, 
            mb: { xs: 3, sm: 4, md: 5 },
            fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem' },
            color: '#1e293b',
          }}
        >
          Dashboard
        </Typography>

        {/* Stats Grid */}
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: { xs: 3, sm: 4, md: 4 },
            mb: { xs: 4, sm: 5, md: 6 },
            width: '100%',
          }}
        >
          <Box sx={{ display: 'flex', width: '100%' }}>
            <StatCard
              title="Organisations"
              value={stats.totalOrganizations}
              icon={<BusinessIcon />}
              loading={loading}
            />
          </Box>
          <Box sx={{ display: 'flex', width: '100%' }}>
            <StatCard
              title="Parents"
              value={stats.totalParents}
              icon={<PeopleIcon />}
              loading={loading}
            />
          </Box>
          <Box sx={{ display: 'flex', width: '100%' }}>
            <StatCard
              title="Centres"
              value={stats.totalCenters}
              icon={<LocationOnIcon />}
              loading={loading}
            />
          </Box>
          <Box sx={{ display: 'flex', width: '100%' }}>
            <StatCard
              title="Check-Ins"
              value={stats.totalCheckins}
              icon={<CheckCircleIcon />}
              loading={loading}
            />
          </Box>
        </Box>

        {/* Today's Activity & Quick Actions Row */}
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
            gap: { xs: 3, sm: 4, md: 4 },
            mb: { xs: 4, sm: 5, md: 6 },
            width: '100%',
          }}
        >
          {/* Today's Activity */}
          <Card
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 3.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <AccessTimeIcon 
                  sx={{ 
                    color: '#FF9800', 
                    fontSize: { xs: 20, sm: 24 },
                    transition: 'transform 0.2s ease',
                    '&:hover': {
                      transform: 'rotate(15deg) scale(1.1)',
                    },
                  }} 
                />
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.9375rem', sm: '1rem', md: '1.125rem' }, color: '#1e293b' }}>
                  Today's Activity
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                <ActivityMetric
                  label="Check-Ins Today"
                  value={stats.todayCheckins}
                  loading={loading}
                  trend={stats.todayCheckins > 0 ? 'up' : 'neutral'}
                />
                <ActivityMetric
                  label="New Parents"
                  value={stats.todayNewParents}
                  loading={loading}
                  trend={stats.todayNewParents > 0 ? 'up' : 'neutral'}
                />
                <ActivityMetric
                  label="Active Centres"
                  value={stats.activeCentersToday}
                  loading={loading}
                  trend="neutral"
                />
              </Box>
              {stats.weeklyCheckins > 0 && (
                <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Weekly Check-Ins
                    </Typography>
                    <Chip
                      label={`${stats.lastWeekCheckins > 0 ? Math.round(((stats.weeklyCheckins - stats.lastWeekCheckins) / stats.lastWeekCheckins) * 100) : 0}%`}
                      size="small"
                      icon={stats.weeklyCheckins >= stats.lastWeekCheckins ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                      color={stats.weeklyCheckins >= stats.lastWeekCheckins ? 'success' : 'error'}
                      sx={{ height: 24, fontSize: '0.75rem' }}
                    />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF9800' }}>
                    {loading ? <CircularProgress size={20} sx={{ color: '#FF9800' }} /> : stats.weeklyCheckins.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    vs {stats.lastWeekCheckins} last week
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 3.5 } }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, fontSize: { xs: '0.9375rem', sm: '1rem', md: '1.125rem' }, color: '#1e293b' }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  component={Link}
                  href="/dashboard/centers"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    borderColor: '#E91E63',
                    color: '#E91E63',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      bgcolor: '#E91E63',
                      color: '#ffffff',
                      borderColor: '#E91E63',
                      transform: 'translateX(4px)',
                    },
                    '& .MuiButton-startIcon': {
                      color: 'inherit',
                      transition: 'transform 0.2s ease',
                    },
                    '&:hover .MuiButton-startIcon': {
                      transform: 'scale(1.2)',
                    },
                  }}
                >
                  Add Centre
                </Button>
                <Button
                  component={Link}
                  href="/dashboard/bulk-notifications"
                  variant="outlined"
                  startIcon={<NotificationsIcon />}
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    borderColor: '#E91E63',
                    color: '#E91E63',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      bgcolor: '#E91E63',
                      color: '#ffffff',
                      borderColor: '#E91E63',
                      transform: 'translateX(4px)',
                    },
                    '& .MuiButton-startIcon': {
                      color: 'inherit',
                      transition: 'transform 0.2s ease',
                    },
                    '&:hover .MuiButton-startIcon': {
                      transform: 'scale(1.2)',
                    },
                  }}
                >
                  Send Notification
                </Button>
                <Button
                  component={Link}
                  href="/dashboard/allocations"
                  variant="outlined"
                  startIcon={<TrendingUpIcon />}
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    borderColor: '#E91E63',
                    color: '#E91E63',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      bgcolor: '#E91E63',
                      color: '#ffffff',
                      borderColor: '#E91E63',
                      transform: 'translateX(4px)',
                    },
                    '& .MuiButton-startIcon': {
                      color: 'inherit',
                      transition: 'transform 0.2s ease',
                    },
                    '&:hover .MuiButton-startIcon': {
                      transform: 'scale(1.2)',
                    },
                  }}
                >
                  Manage Allocations
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Alerts & Top Centres Row */}
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            gap: { xs: 3, sm: 4, md: 4 },
            mb: { xs: 4, sm: 5, md: 6 },
            width: '100%',
          }}
        >
          {/* Pending Actions / Alerts */}
          <Card
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 3.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <WarningIcon 
                  sx={{ 
                    color: '#FF5722', 
                    fontSize: { xs: 20, sm: 24 },
                    animation: stats.unassociatedParents > 0 || stats.unverifiedCenters > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                      '50%': { opacity: 0.7, transform: 'scale(1.1)' },
                    },
                  }} 
                />
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.9375rem', sm: '1rem', md: '1.125rem' }, color: '#1e293b' }}>
                  Pending Actions
                </Typography>
              </Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} sx={{ color: '#FF5722' }} />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {stats.unassociatedParents > 0 && (
                    <Box sx={{ p: 2, bgcolor: 'rgba(255, 152, 0, 0.06)', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Parents Without Organisation
                        </Typography>
                        <Chip label={stats.unassociatedParents} size="small" sx={{ bgcolor: '#FF9800', color: 'white' }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        New parents need to be assigned to an organisation
                      </Typography>
                      <Button
                        component={Link}
                        href="/dashboard/parents"
                        size="small"
                        sx={{ textTransform: 'none', color: '#FF9800', mt: 1 }}
                      >
                        Assign Now →
                      </Button>
                    </Box>
                  )}
                  {stats.unverifiedCenters > 0 && (
                    <Box sx={{ p: 2, bgcolor: 'rgba(33, 150, 243, 0.06)', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Unverified Centres
                        </Typography>
                        <Chip label={stats.unverifiedCenters} size="small" sx={{ bgcolor: '#2196F3', color: 'white' }} />
                      </Box>
                      <Button
                        component={Link}
                        href="/dashboard/centers"
                        size="small"
                        sx={{ textTransform: 'none', color: '#2196F3', mt: 1 }}
                      >
                        Review Now →
                      </Button>
                    </Box>
                  )}
                  {stats.recentNotifications.length > 0 && (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                        Recent Notifications
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {stats.recentNotifications.slice(0, 3).map((notif: any) => (
                          <Box key={notif.id} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                              {notif.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                  {stats.unassociatedParents === 0 && stats.unverifiedCenters === 0 && stats.recentNotifications.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      All clear! No pending actions.
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Top Active Centres */}
          <Card
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 3.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <TrendingUpIcon 
                  sx={{ 
                    color: '#9C27B0', 
                    fontSize: { xs: 20, sm: 24 },
                    transition: 'transform 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                    },
                  }} 
                />
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.9375rem', sm: '1rem', md: '1.125rem' }, color: '#1e293b' }}>
                  Top Active Centres
                </Typography>
              </Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} sx={{ color: '#9C27B0' }} />
                </Box>
              ) : stats.topCenters.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {stats.topCenters.map((center, index) => (
                    <Box key={index}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {center.name}
                          </Typography>
                          {center.is_verified && (
                            <Chip label="Verified" size="small" sx={{ height: 20, fontSize: '0.6875rem', bgcolor: '#E8F5E9', color: '#2E7D32' }} />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#9C27B0' }}>
                          {center.count}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min((center.count / (stats.topCenters[0]?.count || 1)) * 100, 100)}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: '#9C27B0',
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No check-in data available yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Recent Activity */}
        <Card sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          maxHeight: { xs: 500, md: 600 },
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12)',
          },
        }}>
          <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 2.5, md: 3 }, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.9375rem', sm: '1rem', md: '1.125rem' }, color: '#1e293b' }}>
              Recent Check-Ins
            </Typography>
          </Box>
          <TableContainer 
            component={Box}
            sx={{ 
              flexGrow: 1, 
              overflowX: 'auto',
              overflowY: 'auto',
              width: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              '&::-webkit-scrollbar': {
                height: 8,
                width: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'grey.100',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'grey.400',
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: 'grey.500',
                },
              },
            }}
          >
            <Table 
              sx={{ 
                minWidth: { xs: 500, sm: 600 },
                width: '100%',
              }}
              stickyHeader
            >
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                    py: { xs: 1.5, md: 2.5 }, 
                    px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    minWidth: { xs: 100, sm: 120 },
                  }}>
                    Time
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                    py: { xs: 1.5, md: 2.5 }, 
                    px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    minWidth: { xs: 100, sm: 120 },
                  }}>
                    Parent
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                    py: { xs: 1.5, md: 2.5 }, 
                    px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    minWidth: { xs: 100, sm: 120 },
                  }}>
                    Child
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                    py: { xs: 1.5, md: 2.5 }, 
                    px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    minWidth: { xs: 100, sm: 120 },
                  }}>
                    Centre
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                    py: { xs: 1.5, md: 2.5 }, 
                    px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    minWidth: { xs: 100, sm: 120 },
                  }}>
                    Check-Out
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : stats.recentCheckins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No check-ins yet
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentCheckins.map((checkin) => (
                    <TableRow key={checkin.id}>
                      <TableCell sx={{ 
                        py: { xs: 1.5, md: 2.5 }, 
                        px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                        fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        wordBreak: { xs: 'break-word', sm: 'normal' },
                      }}>
                        {new Date(checkin.check_in_time).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ 
                        py: { xs: 1.5, md: 2.5 }, 
                        px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                        fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        wordBreak: { xs: 'break-word', sm: 'normal' },
                      }}>
                        {checkin.parent?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell sx={{ 
                        py: { xs: 1.5, md: 2.5 }, 
                        px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                        fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        wordBreak: { xs: 'break-word', sm: 'normal' },
                      }}>
                        {checkin.child?.first_name} {checkin.child?.last_name}
                      </TableCell>
                      <TableCell sx={{ 
                        py: { xs: 1.5, md: 2.5 }, 
                        px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                        fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        wordBreak: { xs: 'break-word', sm: 'normal' },
                      }}>
                        {checkin.center?.name || 'Unknown'}
                      </TableCell>
                      <TableCell sx={{ 
                        py: { xs: 1.5, md: 2.5 }, 
                        px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                        fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        wordBreak: { xs: 'break-word', sm: 'normal' },
                      }}>
                        {checkin.check_out_time ? (
                          <Chip 
                            label={new Date(checkin.check_out_time).toLocaleString()} 
                            size="small" 
                            color="success"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ) : (
                          <Chip 
                            label="Active" 
                            size="small" 
                            color="warning"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Recent Activity Timeline */}
        <Card sx={{ 
          mt: 4,
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          maxHeight: { xs: 500, md: 600 },
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12)',
          },
        }}>
          <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 2.5, md: 3 }, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.9375rem', sm: '1rem', md: '1.125rem' }, color: '#1e293b' }}>
              Recent Activity
            </Typography>
            <Button
              component={Link}
              href="/dashboard/logs"
              variant="outlined"
              size="small"
              sx={{
                textTransform: 'none',
                borderColor: '#E91E63',
                color: '#E91E63',
                '&:hover': {
                  bgcolor: 'rgba(233, 30, 99, 0.04)',
                  borderColor: '#C2185B',
                },
              }}
            >
              View All Logs →
            </Button>
          </Box>
          <TableContainer 
            component={Box}
            sx={{ 
              flexGrow: 1, 
              overflowX: 'auto',
              overflowY: 'auto',
              width: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              '&::-webkit-scrollbar': {
                height: 8,
                width: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'grey.100',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'grey.400',
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: 'grey.500',
                },
              },
            }}
          >
            <Table 
              sx={{ 
                minWidth: { xs: 600, sm: 700 },
                width: '100%',
              }}
              stickyHeader
            >
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                    py: { xs: 1.5, md: 2.5 }, 
                    px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    minWidth: { xs: 60, sm: 80 },
                    width: { xs: '80px', sm: '100px' },
                  }}>
                    Type
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                    py: { xs: 1.5, md: 2.5 }, 
                    px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    minWidth: { xs: 120, sm: 150 },
                  }}>
                    Organisation
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                    py: { xs: 1.5, md: 2.5 }, 
                    px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    minWidth: { xs: 120, sm: 150 },
                  }}>
                    Parent
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                    py: { xs: 1.5, md: 2.5 }, 
                    px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    minWidth: { xs: 120, sm: 150 },
                  }}>
                    Activity
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                    py: { xs: 1.5, md: 2.5 }, 
                    px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    minWidth: { xs: 100, sm: 120 },
                  }}>
                    Time
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : activityTimeline.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No recent activity
                    </TableCell>
                  </TableRow>
                ) : (
                  activityTimeline.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell sx={{ 
                        py: { xs: 1.5, md: 2.5 }, 
                        px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                        fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getActivityIcon(event.type)}
                          <Typography variant="caption" sx={{ 
                            fontSize: { xs: '0.625rem', sm: '0.6875rem' },
                            textTransform: 'capitalize',
                            fontWeight: 500,
                          }}>
                            {event.type.replace('_', ' ')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ 
                        py: { xs: 1.5, md: 2.5 }, 
                        px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                        fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        wordBreak: { xs: 'break-word', sm: 'normal' },
                      }}>
                        {event.organizationName || '-'}
                      </TableCell>
                      <TableCell sx={{ 
                        py: { xs: 1.5, md: 2.5 }, 
                        px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                        fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        wordBreak: { xs: 'break-word', sm: 'normal' },
                      }}>
                        {event.parentName}
                      </TableCell>
                      <TableCell sx={{ 
                        py: { xs: 1.5, md: 2.5 }, 
                        px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                        fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        wordBreak: { xs: 'break-word', sm: 'normal' },
                      }}>
                        {event.message}
                      </TableCell>
                      <TableCell sx={{ 
                        py: { xs: 1.5, md: 2.5 }, 
                        px: { xs: 1, sm: 1.5, md: 2, lg: 3 },
                        fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        wordBreak: { xs: 'break-word', sm: 'normal' },
                      }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 'inherit' }}>
                          {formatTimeAgo(event.timestamp)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>
    </DashboardLayout>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
}

interface ActivityMetricProps {
  label: string;
  value: number;
  loading: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

function ActivityMetric({ label, value, loading, trend = 'neutral' }: ActivityMetricProps) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF9800' }}>
          {loading ? <CircularProgress size={20} sx={{ color: '#FF9800' }} /> : value.toLocaleString()}
        </Typography>
        {trend === 'up' && value > 0 && (
          <ArrowUpwardIcon sx={{ fontSize: 16, color: 'success.main' }} />
        )}
      </Box>
    </Box>
  );
}

function StatCard({ title, value, icon, loading }: StatCardProps) {
  // Determine icon color based on title
  const getIconColor = () => {
    if (title === 'Organisations') return '#E91E63';
    if (title === 'Parents') return '#2196F3';
    if (title === 'Centres') return '#4CAF50';
    if (title === 'Check-Ins') return '#9C27B0';
    return '#64748b';
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px -10px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        animation: 'fadeIn 0.5s ease-out',
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
      }}
    >
      <CardContent sx={{ 
        p: { xs: 2, sm: 3 }, 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1,
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Icon and Label Row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1,
          }}
        >
          <Box
            sx={{
              color: getIconColor(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s ease',
              '& svg': {
                fontSize: 20,
              },
              '&:hover': {
                transform: 'scale(1.1) rotate(5deg)',
              },
            }}
          >
            {icon}
          </Box>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              fontSize: '0.75rem',
              transition: 'color 0.2s ease',
            }}
          >
            {title}
          </Typography>
        </Box>

        {/* Value */}
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 700, 
            color: '#1e293b',
            transition: 'color 0.3s ease',
          }}
        >
          {loading ? (
            <CircularProgress 
              size={20} 
              sx={{ 
                color: getIconColor(),
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }} 
            />
          ) : (
            <span
              style={{
                display: 'inline-block',
                animation: 'countUp 0.5s ease-out',
              }}
            >
              {value.toLocaleString()}
            </span>
          )}
        </Typography>
      </CardContent>
    </Card>
  );
}


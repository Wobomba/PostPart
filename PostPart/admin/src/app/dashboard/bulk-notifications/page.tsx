'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { supabase } from '../../../../lib/supabase';
import { logActivity } from '../../../utils/activityLogger';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tab,
  Tabs,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Send as SendIcon,
  Visibility as VisibilityIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface NotificationLog {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  target_type: string;
  target_id?: string;
  created_by: string;
  created_at: string;
  recipient_count?: number;
}

export default function BulkNotificationsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'announcement' as 'announcement' | 'reminder' | 'approval' | 'center_update' | 'alert',
    priority: 'normal' as 'low' | 'normal' | 'high',
    target_type: 'all' as 'all' | 'organization' | 'center' | 'individual',
    target_id: '',
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [viewDialog, setViewDialog] = useState(false);
  const [viewingNotification, setViewingNotification] = useState<NotificationLog | null>(null);
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => {
    loadData();

    // Set up realtime subscription for instant notification history updates
    const notificationChannel = supabase
      .channel('admin-notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Listen to new notifications being sent
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('New notification sent:', payload);
          // Reload notification history
          loadNotificationHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, []);

  useEffect(() => {
    calculateRecipientCount();
  }, [formData.target_type, formData.target_id]);

  const loadData = async () => {
    await Promise.all([
      loadNotificationHistory(),
      loadOrganizations(),
      loadCenters(),
    ]);
  };

  const loadNotificationHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Load recipient counts for each notification
      const historyWithCounts = await Promise.all(
        (data || []).map(async (notif) => {
          const { count } = await supabase
            .from('parent_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('notification_id', notif.id);

          return { ...notif, recipient_count: count || 0 };
        })
      );

      setNotificationHistory(historyWithCounts);
    } catch (err: any) {
      console.error('Error loading notification history:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('id, name, status')
      .eq('status', 'active')
      .order('name');

    setOrganizations(data || []);
  };

  const loadCenters = async () => {
    const { data } = await supabase
      .from('centers')
      .select('id, name, city, state')
      .eq('is_verified', true)
      .order('name');

    setCenters(data || []);
  };

  const calculateRecipientCount = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (formData.target_type === 'organization' && formData.target_id) {
        query = query.eq('organization_id', formData.target_id);
      }

      const { count } = await query;
      setRecipientCount(count || 0);
    } catch (err) {
      console.error('Error calculating recipients:', err);
      setRecipientCount(0);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      setError('Please fill in title and message');
      return;
    }

    if (formData.target_type !== 'all' && !formData.target_id) {
      setError('Please select a target');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create notification
      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          title: formData.title,
          message: formData.message,
          type: formData.type,
          priority: formData.priority,
          target_type: formData.target_type,
          target_id: formData.target_id || null, // Convert empty string to null
          created_by: user.id,
        })
        .select()
        .single();

      if (notifError) throw notifError;

      // Get target parents
      let parentsQuery = supabase
        .from('profiles')
        .select('id')
        .eq('status', 'active');

      if (formData.target_type === 'organization' && formData.target_id) {
        parentsQuery = parentsQuery.eq('organization_id', formData.target_id);
      } else if (formData.target_type === 'individual' && formData.target_id) {
        parentsQuery = parentsQuery.eq('id', formData.target_id);
      }

      const { data: parents, error: parentsError } = await parentsQuery;

      if (parentsError) throw parentsError;

      // Create parent_notifications entries
      if (parents && parents.length > 0) {
        const parentNotifications = parents.map(parent => ({
          notification_id: notification.id,
          parent_id: parent.id,
          is_read: false,
        }));

        const { error: insertError } = await supabase
          .from('parent_notifications')
          .upsert(parentNotifications, { 
            onConflict: 'notification_id,parent_id',
            ignoreDuplicates: false 
          });

        if (insertError) {
          console.error('Error inserting parent_notifications:', insertError);
          throw insertError;
        }
      }

      // Log activity
      await logActivity({
        activityType: 'parent_details_updated',
        entityType: 'parent',
        entityId: notification.id,
        entityName: formData.title,
        description: `Bulk notification sent: "${formData.title}" to ${parents?.length || 0} parents`,
        metadata: {
          notification_type: formData.type,
          target_type: formData.target_type,
          recipient_count: parents?.length || 0,
          priority: formData.priority,
        },
      });

      setSuccess(`Notification sent successfully to ${parents?.length || 0} parents!`);
      setFormData({
        title: '',
        message: '',
        type: 'announcement',
        priority: 'normal',
        target_type: 'all',
        target_id: '',
      });
      
      await loadNotificationHistory();
    } catch (error: any) {
      console.error('Error sending notification:', error);
      setError('Error sending notification: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleViewNotification = async (notification: NotificationLog) => {
    setViewingNotification(notification);
    setViewDialog(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'alert': return { bg: '#FFEBEE', color: '#C62828' };
      case 'announcement': return { bg: '#E3F2FD', color: '#1976D2' };
      case 'reminder': return { bg: '#FFF3E0', color: '#E65100' };
      case 'approval': return { bg: '#F3E5F5', color: '#7B1FA2' };
      case 'center_update': return { bg: '#E8F5E9', color: '#2E7D32' };
      default: return { bg: '#F5F5F5', color: '#616161' };
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            mb: 3,
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
          }}
        >
          Bulk Notifications
        </Typography>

        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mb: 3 }}>
          <Tab label="Send Notification" />
          <Tab label="History" />
        </Tabs>

        {/* Send Notification Tab */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Card sx={{ maxWidth: 800, width: '100%' }}>
              <CardContent sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}
                
                {success && (
                  <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
                    {success}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSend}>
                  {/* Title Input */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e293b' }}>
                      Notification Title *
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="e.g., New Feature Announcement"
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
                  </Box>

                  {/* Message Input */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e293b' }}>
                      Message *
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      multiline
                      rows={5}
                      placeholder="Enter your message here..."
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
                  </Box>

                  {/* Type and Priority */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 3 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e293b' }}>
                        Type
                      </Typography>
                      <FormControl fullWidth>
                        <Select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                          sx={{
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#E91E63',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#E91E63',
                            },
                          }}
                        >
                          <MenuItem value="announcement">Announcement</MenuItem>
                          <MenuItem value="reminder">Reminder</MenuItem>
                          <MenuItem value="alert">Alert</MenuItem>
                          <MenuItem value="center_update">Centre Update</MenuItem>
                          <MenuItem value="approval">Approval Required</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e293b' }}>
                        Priority
                      </Typography>
                      <FormControl fullWidth>
                        <Select
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                          sx={{
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#E91E63',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#E91E63',
                            },
                          }}
                        >
                          <MenuItem value="normal">Normal</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                          <MenuItem value="low">Low</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>

                  {/* Send To */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e293b' }}>
                      Send To
                    </Typography>
                    <FormControl fullWidth>
                      <Select
                        value={formData.target_type}
                        onChange={(e) => setFormData({ ...formData, target_type: e.target.value as any, target_id: '' })}
                        sx={{
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#E91E63',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#E91E63',
                          },
                        }}
                      >
                        <MenuItem value="all">All Active Parents</MenuItem>
                        <MenuItem value="organization">Specific Organisation</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Organisation Selection */}
                  {formData.target_type === 'organization' && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e293b' }}>
                        Select Organisation
                      </Typography>
                      <FormControl fullWidth>
                        <Select
                          value={formData.target_id}
                          onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                          sx={{
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#E91E63',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#E91E63',
                            },
                          }}
                        >
                          {organizations.map((org) => (
                            <MenuItem key={org.id} value={org.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BusinessIcon sx={{ fontSize: 18, color: '#64748b' }} />
                                {org.name}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {/* Recipient Count */}
                  <Alert 
                    severity="info" 
                    icon={<PersonIcon />}
                    sx={{ 
                      mb: 3,
                      bgcolor: '#E3F2FD',
                      '& .MuiAlert-icon': {
                        color: '#1976D2',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Estimated Recipients:
                      </Typography>
                      <Typography variant="body2">
                        {recipientCount} active parent{recipientCount !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Alert>

                  {/* Send Button */}
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={sending || recipientCount === 0}
                    startIcon={sending ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SendIcon />}
                    sx={{ 
                      bgcolor: '#E91E63', 
                      '&:hover': { bgcolor: '#C2185B' },
                      py: 1.75,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 4px 6px -1px rgb(233 30 99 / 0.3)',
                      '&:hover': {
                        boxShadow: '0 10px 15px -3px rgb(233 30 99 / 0.4)',
                        bgcolor: '#C2185B',
                      },
                      '&:disabled': {
                        bgcolor: '#E0E0E0',
                        color: '#9E9E9E',
                      },
                    }}
                  >
                    {sending ? 'Sending...' : `Send to ${recipientCount} Parent${recipientCount !== 1 ? 's' : ''}`}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* History Tab */}
        {activeTab === 1 && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Notification History</Typography>
                <IconButton onClick={loadNotificationHistory} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Box>

              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Target</TableCell>
                        <TableCell>Recipients</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {notificationHistory.map((notif) => (
                        <TableRow key={notif.id}>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(notif.created_at).toLocaleTimeString()}
                            </Typography>
                          </TableCell>
                          <TableCell>{notif.title}</TableCell>
                          <TableCell>
                            <Chip 
                              label={notif.type} 
                              size="small"
                              sx={getTypeColor(notif.type)}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={notif.priority} 
                              size="small"
                              color={getPriorityColor(notif.priority) as any}
                            />
                          </TableCell>
                          <TableCell>
                            {notif.target_type === 'all' ? 'All Parents' : notif.target_type}
                          </TableCell>
                          <TableCell>
                            <Chip label={notif.recipient_count || 0} color="primary" size="small" />
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewNotification(notif)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* View Dialog */}
        <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Notification Details</DialogTitle>
          <DialogContent>
            {viewingNotification && (
              <Box>
                <Typography variant="h6" gutterBottom>{viewingNotification.title}</Typography>
                <Typography variant="body2" paragraph>{viewingNotification.message}</Typography>
                
                <Box display="flex" gap={1} mb={2}>
                  <Chip label={viewingNotification.type} size="small" sx={getTypeColor(viewingNotification.type)} />
                  <Chip label={viewingNotification.priority} size="small" color={getPriorityColor(viewingNotification.priority) as any} />
                </Box>

                <Typography variant="caption" color="text.secondary" display="block">
                  Sent: {new Date(viewingNotification.created_at).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Recipients: {viewingNotification.recipient_count}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}


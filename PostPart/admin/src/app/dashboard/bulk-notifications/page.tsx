'use client';

import { useState, useEffect, useCallback } from 'react';
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
    target_type: 'all' as 'all' | 'organization' | 'checked_in' | 'individual',
    target_id: '',
    check_in_start_date: '',
    check_in_end_date: '',
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

  const calculateRecipientCount = useCallback(async () => {
    try {
      if (formData.target_type === 'checked_in') {
        // Get all check-ins within the date range
        // This handles parents with multiple children checked in (same or different centers)
        let checkInsQuery = supabase
          .from('checkins')
          .select('parent_id');

        // Apply date range filter (only if dates are provided)
        if (formData.check_in_start_date && formData.check_in_start_date.trim() !== '') {
          const startDate = new Date(formData.check_in_start_date);
          startDate.setHours(0, 0, 0, 0);
          checkInsQuery = checkInsQuery.gte('check_in_time', startDate.toISOString());
        }

        if (formData.check_in_end_date && formData.check_in_end_date.trim() !== '') {
          const endDate = new Date(formData.check_in_end_date);
          endDate.setHours(23, 59, 59, 999);
          checkInsQuery = checkInsQuery.lte('check_in_time', endDate.toISOString());
        }

        const { data: checkIns, error: checkInsError } = await checkInsQuery;
        
        if (checkInsError) throw checkInsError;

        // Get unique parent IDs (handles multiple children per parent)
        // A parent with multiple children checked in will only be counted once
        const parentIds = [...new Set((checkIns || []).map((c: any) => c.parent_id).filter((id: string) => id && id.trim() !== ''))];
        
        if (parentIds.length === 0) {
          setRecipientCount(0);
          return;
        }

        // Count active parents from the check-in list
        // Split into chunks if needed (Supabase has a limit on .in() array size)
        const chunkSize = 1000;
        const parentChunks: string[][] = [];
        for (let i = 0; i < parentIds.length; i += chunkSize) {
          parentChunks.push(parentIds.slice(i, i + chunkSize));
        }

        let totalCount = 0;
        for (const chunk of parentChunks) {
          const { count, error: countError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .in('id', chunk);

          if (countError) throw countError;
          totalCount += count || 0;
        }

        setRecipientCount(totalCount);
      } else {
        // Original logic for other target types
        let query = supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        if (formData.target_type === 'organization' && formData.target_id) {
          query = query.eq('organization_id', formData.target_id);
        }

        const { count } = await query;
        setRecipientCount(count || 0);
      }
    } catch (err) {
      console.error('Error calculating recipients:', err);
      setRecipientCount(0);
    }
  }, [formData.target_type, formData.target_id, formData.check_in_start_date, formData.check_in_end_date]);

  useEffect(() => {
    calculateRecipientCount();
  }, [calculateRecipientCount]);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      setError('Please fill in title and message');
      return;
    }

    if (formData.target_type === 'organization' && !formData.target_id) {
      setError('Please select an organisation');
      return;
    }
    
    if (formData.target_type === 'checked_in' && formData.check_in_start_date && formData.check_in_end_date) {
      const startDate = new Date(formData.check_in_start_date);
      const endDate = new Date(formData.check_in_end_date);
      if (startDate > endDate) {
        setError('Start date must be before end date');
        return;
      }
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
      let parents: any[] = [];
      let parentsError: any = null;
      
      if (formData.target_type === 'checked_in') {
        // Get all check-ins within the date range
        // This handles parents with multiple children checked in (same or different centers)
        let checkInsQuery = supabase
          .from('checkins')
          .select('parent_id');

        // Apply date range filter (only if dates are provided)
        if (formData.check_in_start_date && formData.check_in_start_date.trim() !== '') {
          const startDate = new Date(formData.check_in_start_date);
          startDate.setHours(0, 0, 0, 0);
          checkInsQuery = checkInsQuery.gte('check_in_time', startDate.toISOString());
        }

        if (formData.check_in_end_date && formData.check_in_end_date.trim() !== '') {
          const endDate = new Date(formData.check_in_end_date);
          endDate.setHours(23, 59, 59, 999);
          checkInsQuery = checkInsQuery.lte('check_in_time', endDate.toISOString());
        }

        const { data: checkIns, error: checkInsError } = await checkInsQuery;
        
        if (checkInsError) {
          console.error('Error fetching check-ins:', checkInsError);
          throw new Error(`Failed to fetch check-ins: ${checkInsError.message}`);
        }

        // Get unique parent IDs (handles multiple children per parent)
        // A parent with multiple children checked in will only appear once in this set
        const parentIds = [...new Set((checkIns || []).map((c: any) => c.parent_id).filter((id: string) => id && id.trim() !== ''))];
        
        console.log(`Found ${parentIds.length} unique parents from ${checkIns?.length || 0} check-ins`);
        
        if (parentIds.length === 0) {
          setError('No parents found with check-ins in the specified date range');
          setSending(false);
          return;
        }

        // Get active parents from the check-in list
        // Split into chunks if needed (Supabase has a limit on .in() array size)
        const chunkSize = 1000;
        const parentChunks: string[][] = [];
        for (let i = 0; i < parentIds.length; i += chunkSize) {
          parentChunks.push(parentIds.slice(i, i + chunkSize));
        }

        const allParents: any[] = [];
        for (const chunk of parentChunks) {
          const { data: activeParents, error: chunkError } = await supabase
            .from('profiles')
            .select('id, push_token')
            .eq('status', 'active')
            .in('id', chunk);

          if (chunkError) {
            console.error('Error fetching parents chunk:', chunkError);
            parentsError = chunkError;
            break;
          }
          if (activeParents) {
            allParents.push(...activeParents);
          }
        }

        if (parentsError) {
          throw new Error(`Failed to fetch active parents: ${parentsError.message}`);
        }
        
        if (allParents.length === 0) {
          setError('No active parents found from the check-ins');
          setSending(false);
          return;
        }
        
        parents = allParents;
        console.log(`Found ${parents.length} active parents to notify`);
      } else {
        // Original logic for other target types
        let parentsQuery = supabase
          .from('profiles')
          .select('id, push_token')
          .eq('status', 'active');

        if (formData.target_type === 'organization' && formData.target_id) {
          parentsQuery = parentsQuery.eq('organization_id', formData.target_id);
        } else if (formData.target_type === 'individual' && formData.target_id) {
          parentsQuery = parentsQuery.eq('id', formData.target_id);
        }

        const { data: parentsData, error: queryError } = await parentsQuery;
        if (queryError) throw queryError;
        parents = parentsData || [];
      }

      // Get push tokens for parents (for checked_in, we need to fetch them separately)
      let pushTokens: string[] = [];
      if (formData.target_type === 'checked_in') {
        // Fetch push tokens for checked-in parents
        const parentIds = parents.map(p => p.id);
        if (parentIds.length > 0) {
          const chunkSize = 1000;
          const parentChunks: string[][] = [];
          for (let i = 0; i < parentIds.length; i += chunkSize) {
            parentChunks.push(parentIds.slice(i, i + chunkSize));
          }

          for (const chunk of parentChunks) {
            const { data: parentsWithTokens } = await supabase
              .from('profiles')
              .select('push_token')
              .in('id', chunk)
              .not('push_token', 'is', null);

            if (parentsWithTokens) {
              pushTokens.push(...parentsWithTokens.map(p => p.push_token).filter(Boolean));
            }
          }
        }
      } else {
        // For other target types, we already have push_token in the query
        pushTokens = parents
          .map((p: any) => p.push_token)
          .filter((token: string | null) => token && token.trim() !== '');
      }

      // Create parent_notifications entries
      if (parents && parents.length > 0) {
        const parentNotifications = parents.map(parent => ({
          notification_id: notification.id,
          parent_id: parent.id,
          is_read: false,
        }));

        console.log(`Inserting ${parentNotifications.length} parent notification entries`);

        // Insert in chunks to avoid potential size limits
        const chunkSize = 500;
        const notificationChunks: any[][] = [];
        for (let i = 0; i < parentNotifications.length; i += chunkSize) {
          notificationChunks.push(parentNotifications.slice(i, i + chunkSize));
        }

        for (const chunk of notificationChunks) {
          // Check for existing records to avoid duplicates
          // This handles cases where database triggers may have already created records
          const parentIds = chunk.map((pn: any) => pn.parent_id);
          const { data: existingRecords } = await supabase
            .from('parent_notifications')
            .select('parent_id')
            .eq('notification_id', notification.id)
            .in('parent_id', parentIds);

          const existingParentIds = new Set((existingRecords || []).map((r: any) => r.parent_id));
          
          // Filter out records that already exist
          const newRecords = chunk.filter((pn: any) => !existingParentIds.has(pn.parent_id));

          if (newRecords.length === 0) {
            console.log(`All records in chunk already exist, skipping. Chunk size: ${chunk.length}`);
            continue;
          }

          // Insert only new records
          const { data: insertedData, error: insertError } = await supabase
            .from('parent_notifications')
            .insert(newRecords)
            .select();

          if (insertError) {
            // Check if it's a duplicate key error - if so, it's okay, records might have been created between check and insert
            if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
              console.log(`Duplicate key error (records may have been created by trigger), continuing. Chunk size: ${chunk.length}, New records: ${newRecords.length}`);
              // Continue processing - duplicates are expected if trigger created them between our check and insert
              continue;
            }
            
            // For other errors, log and throw
            console.error('Error inserting parent_notifications chunk:', insertError);
            const errorParts: string[] = [];
            if (insertError.message) errorParts.push(insertError.message);
            if (insertError.details) errorParts.push(`Details: ${insertError.details}`);
            if (insertError.hint) errorParts.push(`Hint: ${insertError.hint}`);
            if (insertError.code) errorParts.push(`Code: ${insertError.code}`);
            
            const fullErrorMessage = errorParts.length > 0 
              ? errorParts.join(' | ')
              : `Database error: ${JSON.stringify(insertError)}`;
            
            throw new Error(`Failed to send notifications: ${fullErrorMessage}`);
          }
          
          console.log(`Successfully inserted ${newRecords.length} new notifications (${chunk.length - newRecords.length} already existed)`);
        }

        console.log('Successfully inserted all parent notifications');
      } else {
        console.warn('No parents to notify');
        setError('No parents found to send notifications to');
        setSending(false);
        return;
      }

      // Send push notifications
      if (pushTokens.length > 0) {
        try {
          console.log(`Sending push notifications to ${pushTokens.length} devices...`);
          const pushResponse = await fetch('/api/push-notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pushTokens,
              title: formData.title,
              message: formData.message,
              data: {
                notificationId: notification.id,
                type: formData.type,
                priority: formData.priority,
              },
            }),
          });

          if (pushResponse.ok) {
            const pushResult = await pushResponse.json();
            console.log(`Push notifications sent: ${pushResult.sent} successful, ${pushResult.failed} failed`);
          } else {
            console.warn('Failed to send push notifications, but in-app notifications were created');
          }
        } catch (pushError) {
          console.error('Error sending push notifications:', pushError);
          // Don't fail the entire operation if push notifications fail
        }
      } else {
        console.log('No push tokens available, skipping push notifications');
      }

      // Log activity
      const activityDescription = formData.target_type === 'checked_in'
        ? `Bulk notification sent: "${formData.title}" to ${parents?.length || 0} parents who checked in${formData.check_in_start_date || formData.check_in_end_date ? ` (${formData.check_in_start_date ? new Date(formData.check_in_start_date).toLocaleDateString() : 'all'} - ${formData.check_in_end_date ? new Date(formData.check_in_end_date).toLocaleDateString() : 'all'})` : ''}`
        : `Bulk notification sent: "${formData.title}" to ${parents?.length || 0} parents`;

      await logActivity({
        activityType: 'parent_details_updated',
        entityType: 'parent',
        entityId: notification.id,
        entityName: formData.title,
        description: activityDescription,
        metadata: {
          notification_type: formData.type,
          target_type: formData.target_type,
          recipient_count: parents?.length || 0,
          priority: formData.priority,
          ...(formData.target_type === 'checked_in' && {
            check_in_start_date: formData.check_in_start_date,
            check_in_end_date: formData.check_in_end_date,
          }),
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
        check_in_start_date: '',
        check_in_end_date: '',
      });
      
      await loadNotificationHistory();
    } catch (error: any) {
      console.error('Error sending notification - Full error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', error ? Object.keys(error) : 'no keys');
      
      // Better error message extraction
      let errorMessage = 'Unknown error occurred';
      if (error) {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.error) {
          errorMessage = typeof error.error === 'string' ? error.error : error.error?.message || JSON.stringify(error.error);
        } else if (error?.hint) {
          errorMessage = error.hint;
        } else if (error?.details) {
          errorMessage = error.details;
        } else if (error?.code) {
          errorMessage = `Database error (${error.code}): ${error.message || 'See console for details'}`;
        } else if (error.toString && error.toString() !== '[object Object]') {
          errorMessage = error.toString();
        } else {
          // Try to stringify the error object
          try {
            const stringified = JSON.stringify(error, null, 2);
            errorMessage = stringified !== '{}' ? stringified : 'An error occurred while sending the notification. Check the browser console for details.';
          } catch (stringifyError) {
            errorMessage = 'An error occurred while sending the notification. Check the browser console for details.';
          }
        }
      }
      
      setError(`Error sending notification: ${errorMessage}`);
      
      // If notification was created but parent_notifications failed, log it
      if (errorMessage?.includes('parent_notifications') || errorMessage?.includes('parent_notification') || errorMessage?.includes('unique constraint')) {
        console.error('Notification was created but failed to link to parents. Notification ID may be orphaned.');
        console.error('This might be due to a database trigger conflict. Check if the trigger handles "checked_in" target_type.');
      }
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
          variant="h5" 
          sx={{ 
            fontWeight: 600,
            fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem' },
            color: '#1e293b',
            mb: 3,
          }}
        >
          Bulk Notifications
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            mb: 3,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              '&:hover': {
                color: '#E91E63',
                transform: 'translateY(-2px)',
              },
              '&.Mui-selected': {
                color: '#E91E63',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#E91E63',
              height: 3,
            },
          }}
        >
          <Tab label="Send Notification" />
          <Tab label="History" />
        </Tabs>

        {/* Send Notification Tab */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Card sx={{
              maxWidth: 800,
              width: '100%',
              animation: 'fadeIn 0.5s ease-in',
              '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
            }}>
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
                        <MenuItem value="checked_in">Parents Who Checked In</MenuItem>
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

                  {/* Checked-In Parents Selection */}
                  {formData.target_type === 'checked_in' && (
                    <>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e293b' }}>
                          Check-In Date Range (Optional)
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                          <TextField
                            label="Start Date"
                            type="date"
                            value={formData.check_in_start_date}
                            onChange={(e) => setFormData({ ...formData, check_in_start_date: e.target.value })}
                            InputLabelProps={{
                              shrink: true,
                            }}
                            fullWidth
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
                          <TextField
                            label="End Date"
                            type="date"
                            value={formData.check_in_end_date}
                            onChange={(e) => setFormData({ ...formData, check_in_end_date: e.target.value })}
                            InputLabelProps={{
                              shrink: true,
                            }}
                            fullWidth
                            inputProps={{
                              min: formData.check_in_start_date || undefined,
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
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Leave empty to include all check-ins. Select dates to filter by check-in date range.
                        </Typography>
                      </Box>
                    </>
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
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: formData.target_type === 'checked_in' ? 1 : 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Estimated Recipients:
                        </Typography>
                        <Typography variant="body2">
                          {recipientCount} {formData.target_type === 'checked_in' ? 'parent' : 'active parent'}{recipientCount !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      {formData.target_type === 'checked_in' && (
                        <Typography variant="caption" color="text.secondary">
                          {formData.check_in_start_date || formData.check_in_end_date
                            ? `Parents who checked in${formData.check_in_start_date && formData.check_in_end_date ? ` between ${new Date(formData.check_in_start_date).toLocaleDateString()} and ${new Date(formData.check_in_end_date).toLocaleDateString()}` : formData.check_in_start_date ? ` from ${new Date(formData.check_in_start_date).toLocaleDateString()}` : ` until ${new Date(formData.check_in_end_date).toLocaleDateString()}`}`
                            : 'All parents who have checked in'}
                        </Typography>
                      )}
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
                      py: 1.75,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 4px 6px -1px rgb(233 30 99 / 0.3)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 10px 15px -3px rgb(233 30 99 / 0.4)',
                        bgcolor: '#C2185B',
                        transform: 'translateY(-2px)',
                        '& .MuiButton-startIcon': {
                          transform: 'translateX(4px)',
                        },
                      },
                      '&:disabled': {
                        bgcolor: '#E0E0E0',
                        color: '#9E9E9E',
                        transform: 'none',
                      },
                      '& .MuiButton-startIcon': {
                        transition: 'transform 0.3s ease',
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
                <IconButton
                  onClick={loadNotificationHistory}
                  disabled={loading}
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
                            {notif.target_type === 'all' 
                              ? 'All Parents' 
                              : notif.target_type === 'checked_in'
                              ? 'Checked-In Parents'
                              : notif.target_type === 'organization'
                              ? 'Organisation'
                              : notif.target_type}
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


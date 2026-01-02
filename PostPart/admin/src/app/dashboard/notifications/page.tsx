'use client';

import { useState } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { supabase } from '../../../../lib/supabase';
import { Box, Card, CardContent, Typography } from '@mui/material';

export default function NotificationsPage() {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'announcement' as 'announcement' | 'reminder' | 'approval' | 'center_update' | 'alert',
    priority: 'normal' as 'low' | 'normal' | 'high',
    target_type: 'all' as 'all' | 'organization' | 'center' | 'individual',
    target_id: '',
  });
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      alert('Please fill in title and message');
      return;
    }

    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .insert({
          ...formData,
          created_by: user.id,
        });

      if (error) throw error;

      alert('Notification sent successfully!');
      setFormData({
        title: '',
        message: '',
        type: 'announcement',
        priority: 'normal',
        target_type: 'all',
        target_id: '',
      });
    } catch (error: any) {
      alert('Error sending notification: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            mb: { xs: 3, sm: 4, md: 5 },
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
          }}
        >
          Send Notification
        </Typography>

        <Card>
          <CardContent component="form" onSubmit={handleSend} sx={{ p: { xs: 2.5, sm: 3, md: 4, lg: 5 } }}>
          <Box sx={{ mb: 3 }}>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              placeholder="Notification title"
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              id="message"
              required
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              placeholder="Notification message"
            />
          </Box>

          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: { xs: 3, sm: 4 },
            mb: 3,
          }}>
            <Box>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="announcement">Announcement</option>
                <option value="reminder">Reminder</option>
                <option value="approval">Approval</option>
                <option value="center_update">Center Update</option>
                <option value="alert">Alert</option>
              </select>
            </Box>

            <Box>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <label htmlFor="target_type" className="block text-sm font-medium text-gray-700 mb-2">
              Send To
            </label>
            <select
              id="target_type"
              value={formData.target_type}
              onChange={(e) => setFormData({ ...formData, target_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="all">All Parents</option>
              <option value="organization">Specific Organization</option>
              <option value="center">Parents at Specific Center</option>
              <option value="individual">Individual Parent</option>
            </select>
          </Box>

          {formData.target_type !== 'all' && (
            <Box sx={{ mb: 3 }}>
              <label htmlFor="target_id" className="block text-sm font-medium text-gray-700 mb-2">
                Target ID
              </label>
              <input
                id="target_id"
                type="text"
                value={formData.target_id}
                onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="Enter organization/center/parent ID"
              />
            </Box>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#E91E63' }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#C2185B')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#E91E63')}
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
          </CardContent>
        </Card>
      </Box>
    </DashboardLayout>
  );
}


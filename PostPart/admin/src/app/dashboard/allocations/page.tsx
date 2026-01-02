'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { supabase } from '../../../../lib/supabase';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import type { Allocation, Organization } from '../../../../../../../shared/types';

export default function AllocationsPage() {
  const [allocations, setAllocations] = useState<(Allocation & { organization?: Organization })[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    organization_id: '',
    visit_limit: 20,
    period: 'monthly' as 'monthly' | 'quarterly' | 'annually',
  });

  useEffect(() => {
    loadData();

    // Realtime subscription for allocations
    const allocationsChannel = supabase
      .channel('allocations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'allocations' }, payload => {
        console.log('Allocation change received!', payload);
        loadData(); // Reload data on any change
      })
      .subscribe();

    // Realtime subscription for check-ins (to catch allocation updates triggered by check-ins)
    const checkinsChannel = supabase
      .channel('checkins_for_allocations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins' }, payload => {
        console.log('Check-in detected! Reloading allocations...', payload);
        // Slight delay to ensure trigger has completed
        setTimeout(() => loadData(), 500);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(allocationsChannel);
      supabase.removeChannel(checkinsChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      const [orgsResult, allocsResult] = await Promise.all([
        supabase.from('organizations').select('*').order('name'),
        supabase.from('allocations').select('*, organization:organizations(*)').order('created_at', { ascending: false }),
      ]);

      setOrganizations(orgsResult.data || []);
      setAllocations(allocsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.organization_id) {
      setError('Please select an organisation');
      return;
    }

    if (formData.visit_limit < 1) {
      setError('Visit limit must be at least 1');
      return;
    }

    setSaving(true);

    try {
      const currentDate = new Date();
      let endDate = new Date();

      switch (formData.period) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'annually':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }

      const allocationData = {
        organization_id: formData.organization_id,
        visit_limit: formData.visit_limit,
        period: formData.period,
        period_start_date: currentDate.toISOString().split('T')[0],
        period_end_date: endDate.toISOString().split('T')[0],
        visits_used: 0,
      };

      console.log('Creating allocation with data:', allocationData);

      const { data, error } = await supabase
        .from('allocations')
        .insert(allocationData)
        .select()
        .single();

      if (error) {
        console.error('Allocation creation error:', error);
        throw error;
      }

      console.log('Allocation created successfully:', data);
      setSuccess('Allocation created successfully!');
      
      // Reset form after short delay
      setTimeout(() => {
        setShowForm(false);
        setSuccess(null);
        setFormData({
          organization_id: '',
          visit_limit: 20,
          period: 'monthly',
        });
      }, 2000);

      loadData();
    } catch (error: any) {
      console.error('Error creating allocation:', error);
      let errorMessage = 'Error creating allocation: ';
      
      if (error.code === '42501') {
        errorMessage += 'Permission denied. Please check RLS policies on allocations table.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 4, sm: 5, md: 6 }, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Visit Allocations
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setShowForm(!showForm);
              setError(null);
              setSuccess(null);
            }}
            sx={{
              bgcolor: '#E91E63',
              '&:hover': { bgcolor: '#C2185B' },
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              px: 3,
              py: 1.5,
            }}
          >
            {showForm ? 'Cancel' : '+ Create Allocation'}
          </Button>
        </Box>

        {/* Create Form */}
        {showForm && (
          <Box
            component="form"
            onSubmit={handleCreateAllocation}
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 2,
              p: { xs: 3, sm: 4, md: 5 },
              mb: { xs: 3, sm: 4, md: 5 },
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1e293b' }}>
              Create New Allocation
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Organisation Selection */}
              <FormControl fullWidth required disabled={saving}>
                <InputLabel>Organisation</InputLabel>
                <Select
                  value={formData.organization_id}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  label="Organisation"
                  sx={{
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E63' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E63' },
                  }}
                >
                  <MenuItem value="">
                    <em>Select organisation...</em>
                  </MenuItem>
                  {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Visit Limit and Period */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 3,
                }}
              >
                <TextField
                  label="Visit Limit"
                  type="number"
                  required
                  fullWidth
                  value={formData.visit_limit}
                  onChange={(e) => setFormData({ ...formData, visit_limit: parseInt(e.target.value) || 0 })}
                  disabled={saving}
                  inputProps={{ min: 1 }}
                  helperText="Number of visits allocated per period"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': { borderColor: '#E91E63' },
                      '&.Mui-focused fieldset': { borderColor: '#E91E63' },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
                  }}
                />

                <FormControl fullWidth required disabled={saving}>
                  <InputLabel>Period</InputLabel>
                  <Select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                    label="Period"
                    sx={{
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E63' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E63' },
                    }}
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly (3 months)</MenuItem>
                    <MenuItem value="annually">Annually (12 months)</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={saving}
                sx={{
                  mt: 2,
                  py: 1.5,
                  bgcolor: '#E91E63',
                  '&:hover': { bgcolor: '#C2185B' },
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {saving ? (
                  <>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    Creating...
                  </>
                ) : (
                  'Create Allocation'
                )}
              </Button>
            </Box>
          </Box>
        )}

        {/* Allocations Table */}
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, flexGrow: 1 }}>
          <Box sx={{ px: { xs: 3, sm: 4, md: 4 }, py: { xs: 2, sm: 2.5, md: 3 }, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Current Allocations
            </Typography>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Visits Used / Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : allocations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No allocations created yet
                    </td>
                  </tr>
                ) : (
                  allocations.map((allocation) => {
                    const percentage = (allocation.visits_used / allocation.visit_limit) * 100;
                    const isNearLimit = percentage >= 80;
                    
                    return (
                      <tr key={allocation.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {allocation.organization?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {allocation.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(allocation.period_start_date).toLocaleDateString()} - {new Date(allocation.period_end_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.visits_used} / {allocation.visit_limit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  isNearLimit ? 'bg-red-500' : ''
                                }`}
                                style={{
                                  backgroundColor: isNearLimit ? undefined : '#E91E63',
                                  width: `${Math.min(percentage, 100)}%`
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{percentage.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Box>
          </Box>
        </Box>
      </Box>
    </DashboardLayout>
  );
}


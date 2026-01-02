'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logActivity, ActivityDescriptions } from '../utils/activityLogger';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import type { Profile, Organization } from '../../../../shared/types';

interface ParentFormProps {
  parent?: Profile;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ParentForm({ parent, onSuccess, onCancel }: ParentFormProps) {
  const [formData, setFormData] = useState({
    email: parent?.email || '',
    phone: parent?.phone || '',
    full_name: parent?.full_name || '',
    organization_id: parent?.organization_id || '',
    status: parent?.status || 'active',
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

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
      setError('Failed to load organizations');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate required fields
      if (!formData.email || !formData.full_name || !formData.organization_id) {
        throw new Error('Please fill in all required fields');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (parent) {
        // Update existing parent
        console.log('Updating parent with data:', {
          phone: formData.phone || null,
          full_name: formData.full_name,
          organization_id: formData.organization_id,
          status: formData.status,
        });
        
        const { data, error } = await supabase
          .from('profiles')
          .update({
            phone: formData.phone || null,
            full_name: formData.full_name,
            organization_id: formData.organization_id,
            status: formData.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', parent.id)
          .select();

        console.log('Update result:', { data, error });
        
        if (error) throw error;

        // Log activity for different types of changes
        const changedFields: string[] = [];
        let activityLogged = false;

        // Check for organisation change
        if (parent.organization_id !== formData.organization_id) {
          const oldOrg = organizations.find(o => o.id === parent.organization_id);
          const newOrg = organizations.find(o => o.id === formData.organization_id);
          
          if (!parent.organization_id && formData.organization_id) {
            // Assigning organisation for the first time
            await logActivity({
              activityType: 'parent_organisation_assigned',
              entityType: 'parent',
              entityId: parent.id,
              entityName: formData.full_name,
              relatedEntityType: 'organisation',
              relatedEntityId: formData.organization_id,
              relatedEntityName: newOrg?.name || 'Unknown',
              description: ActivityDescriptions.parentOrganisationAssigned(
                formData.full_name,
                newOrg?.name || 'Unknown'
              ),
            });
            activityLogged = true;
          } else if (parent.organization_id && formData.organization_id) {
            // Changing organisation
            await logActivity({
              activityType: 'parent_organisation_updated',
              entityType: 'parent',
              entityId: parent.id,
              entityName: formData.full_name,
              relatedEntityType: 'organisation',
              relatedEntityId: formData.organization_id,
              relatedEntityName: newOrg?.name || 'Unknown',
              description: ActivityDescriptions.parentOrganisationUpdated(
                formData.full_name,
                oldOrg?.name || 'Unknown',
                newOrg?.name || 'Unknown'
              ),
              metadata: {
                old_organisation_id: parent.organization_id,
                old_organisation_name: oldOrg?.name,
                new_organisation_id: formData.organization_id,
                new_organisation_name: newOrg?.name,
              },
            });
            activityLogged = true;
          }
        }

        // Check for status change
        if (parent.status !== formData.status) {
          await logActivity({
            activityType: 'parent_status_changed',
            entityType: 'parent',
            entityId: parent.id,
            entityName: formData.full_name,
            description: ActivityDescriptions.parentStatusChanged(
              formData.full_name,
              parent.status || 'active',
              formData.status
            ),
            metadata: {
              old_status: parent.status,
              new_status: formData.status,
            },
          });
          activityLogged = true;
        }

        // Track other field changes
        if (parent.full_name !== formData.full_name) changedFields.push('name');
        if (parent.phone !== formData.phone) changedFields.push('phone');

        // Log general details update if other fields changed and no specific activity was logged
        if (changedFields.length > 0 && !activityLogged) {
          await logActivity({
            activityType: 'parent_details_updated',
            entityType: 'parent',
            entityId: parent.id,
            entityName: formData.full_name,
            description: ActivityDescriptions.parentDetailsUpdated(
              formData.full_name,
              changedFields
            ),
            metadata: {
              changed_fields: changedFields,
              old_values: {
                full_name: parent.full_name,
                phone: parent.phone,
              },
              new_values: {
                full_name: formData.full_name,
                phone: formData.phone,
              },
            },
          });
        }
        
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        // Note: Creating a new parent requires authentication flow
        // This should typically be done through the mobile app
        // For admin creation, we'd need to use Supabase Admin API
        throw new Error('Parent creation must be done through the mobile app registration flow');
      }
    } catch (error: any) {
      console.error('Error saving parent:', error);
      setError(error.message || 'Failed to save parent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  if (loadingOrgs) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress sx={{ color: '#E91E63' }} />
      </Box>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {!parent && (
          <Alert severity="info">
            <Typography variant="body2">
              Parents are typically registered through the mobile app. Use this form to update existing parent information and status.
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success">
            Parent {parent ? 'updated' : 'created'} successfully!
          </Alert>
        )}

        <TextField
          label="Full Name"
          required
          fullWidth
          value={formData.full_name}
          onChange={(e) => handleChange('full_name', e.target.value)}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: '#E91E63',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#E91E63',
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#E91E63',
            },
          }}
        />

        <TextField
          label="Email"
          type="email"
          required
          fullWidth
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          disabled={loading || !!parent} // Email cannot be changed for existing parents
          helperText={parent ? 'Email cannot be changed' : ''}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: '#E91E63',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#E91E63',
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#E91E63',
            },
          }}
        />

        <TextField
          label="Phone"
          type="tel"
          fullWidth
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: '#E91E63',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#E91E63',
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#E91E63',
            },
          }}
        />

        <FormControl
          fullWidth
          required
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: '#E91E63',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#E91E63',
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#E91E63',
            },
          }}
        >
          <InputLabel>Organisation</InputLabel>
          <Select
            value={formData.organization_id}
            onChange={(e) => handleChange('organization_id', e.target.value)}
            label="Organisation"
          >
            <MenuItem value="">
              <em>Select an organisation</em>
            </MenuItem>
            {organizations.map((org) => (
              <MenuItem key={org.id} value={org.id}>
                {org.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          fullWidth
          required
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: '#E91E63',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#E91E63',
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#E91E63',
            },
          }}
        >
          <InputLabel>Status</InputLabel>
          <Select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            label="Status"
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="suspended">Suspended</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Status Options:
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            <strong>Active:</strong> Parent can use the service normally
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            <strong>Inactive:</strong> Parent account is temporarily disabled
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            <strong>Suspended:</strong> Parent account is blocked (policy violation)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
            fullWidth
            sx={{
              textTransform: 'none',
              borderColor: '#64748b',
              color: '#64748b',
              '&:hover': {
                borderColor: '#475569',
                bgcolor: 'rgba(100, 116, 139, 0.04)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !parent}
            fullWidth
            sx={{
              textTransform: 'none',
              bgcolor: '#E91E63',
              '&:hover': {
                bgcolor: '#C2185B',
              },
              '&.Mui-disabled': {
                bgcolor: '#ccc',
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : parent ? (
              'Update Parent'
            ) : (
              'Parents register via mobile app'
            )}
          </Button>
        </Box>
      </Box>
    </form>
  );
}


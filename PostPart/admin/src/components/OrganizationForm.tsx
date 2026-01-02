'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Grid,
  Divider,
  CircularProgress,
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Cancel as CancelIcon,
  Business as BusinessIcon,
  ContactMail as ContactMailIcon,
  LocationOn as LocationOnIcon,
  Work as WorkIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import { createSlug } from '../lib/slug';
import type { Organization } from '../../../../shared/types';

interface OrganizationFormProps {
  organization?: Organization;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function OrganizationForm({ organization, onSuccess, onCancel }: OrganizationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: organization?.name || '',
    industry: organization?.industry || '',
    size: organization?.size || '',
    contact_name: organization?.contact_name || '',
    contact_email: organization?.contact_email || '',
    contact_phone: organization?.contact_phone || '',
    address: organization?.address || '',
    city: organization?.city || '',
    state: organization?.state || '',
    zip_code: organization?.zip_code || '',
    plan_type: organization?.plan_type || '',
    status: organization?.status || 'active',
    contract_start_date: organization?.contract_start_date 
      ? new Date(organization.contract_start_date).toISOString().split('T')[0]
      : '',
    contract_end_date: organization?.contract_end_date
      ? new Date(organization.contract_end_date).toISOString().split('T')[0]
      : '',
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Organisation name is required';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email address';
    }

    if (formData.contract_start_date && formData.contract_end_date) {
      const start = new Date(formData.contract_start_date);
      const end = new Date(formData.contract_end_date);
      if (end < start) {
        newErrors.contract_end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const dataToSubmit: any = {
        name: formData.name.trim(),
        industry: formData.industry.trim() || null,
        size: formData.size.trim() || null,
        contact_name: formData.contact_name.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zip_code: formData.zip_code.trim() || null,
        plan_type: formData.plan_type || null,
        status: formData.status,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
      };

      if (organization) {
        // Update existing organization via API route
        const response = await fetch('/api/organizations', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: organization.id,
            ...dataToSubmit,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update organisation');
        }

        const updatedOrg = await response.json();
        
        // Redirect to updated organization using slug
        if (!onSuccess) {
          router.push(`/dashboard/organizations/${createSlug(dataToSubmit.name)}`);
        }
      } else {
        // Create new organization via API route
        const response = await fetch('/api/organizations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSubmit),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create organisation');
        }

        const newOrg = await response.json();
        
        // Redirect to new organization using slug
        if (!onSuccess && newOrg) {
          router.push(`/dashboard/organizations/${createSlug(newOrg.name)}`);
        }
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error saving organization:', error);
      setErrors({ submit: error.message || 'Failed to save organisation' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: any) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card 
        elevation={0}
        sx={{ 
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          width: '100%',
          maxWidth: '100%',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4, md: 4 }, width: '100%', maxWidth: '100%' }}>
          {/* Basic Information Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <BusinessIcon sx={{ color: '#E91E63', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#E91E63' }}>
              Basic Information
            </Typography>
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 4, width: '100%', maxWidth: '100%' }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Organisation Name"
                value={formData.name}
                onChange={handleChange('name')}
                required
                error={!!errors.name}
                helperText={errors.name}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Industry"
                value={formData.industry}
                onChange={handleChange('industry')}
                placeholder="e.g., Technology, Healthcare, Finance"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6} sx={{ minWidth: 0, width: '100%' }}>
              <TextField
                fullWidth
                select
                label="Employee Size"
                value={formData.size}
                onChange={handleChange('size')}
                InputLabelProps={{
                  shrink: true,
                  sx: { '&.Mui-focused': { color: '#E91E63' } },
                }}
                sx={{
                  width: '100%',
                  minWidth: 0,
                  borderRadius: 1.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    width: '100%',
                    minWidth: 0,
                    '&:hover fieldset': { 
                      borderColor: '#E91E63', 
                      borderWidth: '2px',
                    },
                    '&.Mui-focused fieldset': { 
                      borderColor: '#E91E63', 
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                  '& .MuiSelect-select': {
                    width: '100%',
                    minWidth: 0,
                  },
                }}
              >
                <MenuItem value="">
                  <em>Not specified</em>
                </MenuItem>
                <MenuItem value="1-50">1-50</MenuItem>
                <MenuItem value="51-100">51-100</MenuItem>
                <MenuItem value="101-500">101-500</MenuItem>
                <MenuItem value="501-1000">501-1000</MenuItem>
                <MenuItem value="1000+">1000+</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3.5, borderColor: 'rgba(0, 0, 0, 0.08)' }} />

          {/* Contact Information Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <ContactMailIcon sx={{ color: '#E91E63', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#E91E63' }}>
              Contact Information
            </Typography>
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 4, width: '100%', maxWidth: '100%' }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Name"
                value={formData.contact_name}
                onChange={handleChange('contact_name')}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Email"
                type="email"
                value={formData.contact_email}
                onChange={handleChange('contact_email')}
                error={!!errors.contact_email}
                helperText={errors.contact_email}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Phone"
                type="tel"
                value={formData.contact_phone}
                onChange={handleChange('contact_phone')}
                placeholder="e.g., +1 (555) 123-4567"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3.5, borderColor: 'rgba(0, 0, 0, 0.08)' }} />

          {/* Address Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <LocationOnIcon sx={{ color: '#E91E63', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#E91E63' }}>
              Address
            </Typography>
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 4, width: '100%', maxWidth: '100%' }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={formData.address}
                onChange={handleChange('address')}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={handleChange('city')}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="State/Province"
                value={formData.state}
                onChange={handleChange('state')}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Zip/Postal Code"
                value={formData.zip_code}
                onChange={handleChange('zip_code')}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3.5, borderColor: 'rgba(0, 0, 0, 0.08)' }} />

          {/* Plan & Status Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <WorkIcon sx={{ color: '#E91E63', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#E91E63' }}>
              Plan & Status
            </Typography>
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 4, width: '100%', maxWidth: '100%' }}>
            <Grid item xs={12} md={6} sx={{ minWidth: 0, width: '100%' }}>
              <TextField
                fullWidth
                select
                label="Plan Type"
                value={formData.plan_type}
                onChange={handleChange('plan_type')}
                InputLabelProps={{
                  shrink: true,
                  sx: { '&.Mui-focused': { color: '#E91E63' } },
                }}
                sx={{
                  width: '100%',
                  minWidth: 0,
                  borderRadius: 1.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    width: '100%',
                    minWidth: 0,
                    '&:hover fieldset': { 
                      borderColor: '#E91E63', 
                      borderWidth: '2px',
                    },
                    '&.Mui-focused fieldset': { 
                      borderColor: '#E91E63', 
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                  '& .MuiSelect-select': {
                    width: '100%',
                    minWidth: 0,
                  },
                }}
              >
                <MenuItem value="">
                  <em>Not specified</em>
                </MenuItem>
                <MenuItem value="basic">Basic</MenuItem>
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
                <MenuItem value="enterprise">Enterprise</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id="status-label" sx={{ '&.Mui-focused': { color: '#E91E63' } }}>
                  Status
                </InputLabel>
                <Select
                  labelId="status-label"
                  id="status-select"
                  label="Status"
                  value={formData.status}
                  onChange={handleChange('status')}
                  inputProps={{
                    'aria-label': 'Status',
                  }}
                  sx={{
                    borderRadius: 1.5,
                    minWidth: '100%',
                    width: '100%',
                    '& .MuiSelect-select': {
                      width: '100%',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': { 
                      borderColor: '#E91E63',
                      borderWidth: '2px',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                      borderColor: '#E91E63',
                      borderWidth: '2px',
                    },
                  }}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3.5, borderColor: 'rgba(0, 0, 0, 0.08)' }} />

          {/* Contract Dates Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <CalendarTodayIcon sx={{ color: '#E91E63', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#E91E63' }}>
              Contract Dates
            </Typography>
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 4, width: '100%', maxWidth: '100%' }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contract Start Date"
                type="date"
                value={formData.contract_start_date}
                onChange={handleChange('contract_start_date')}
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contract End Date"
                type="date"
                value={formData.contract_end_date}
                onChange={handleChange('contract_end_date')}
                InputLabelProps={{ shrink: true }}
                error={!!errors.contract_end_date}
                helperText={errors.contract_end_date}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#E91E63', borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#E91E63',
                  },
                }}
              />
            </Grid>
          </Grid>

          {errors.submit && (
            <Box sx={{ mb: 3 }}>
              <Typography color="error" variant="body2">
                {errors.submit}
              </Typography>
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            justifyContent: 'flex-end', 
            mt: 5,
            pt: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => {
                if (onCancel) {
                  onCancel();
                } else {
                  router.push('/dashboard/organizations');
                }
              }}
              disabled={loading}
              sx={{
                textTransform: 'none',
                borderRadius: 1.5,
                px: 3,
                py: 1.25,
                borderColor: '#E91E63',
                color: '#E91E63',
                fontWeight: 500,
                '&:hover': {
                  borderColor: '#C2185B',
                  borderWidth: '2px',
                  bgcolor: 'rgba(233, 30, 99, 0.04)',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} sx={{ color: '#ffffff' }} /> : <SaveIcon />}
              disabled={loading}
              sx={{
                textTransform: 'none',
                borderRadius: 1.5,
                px: 4,
                py: 1.25,
                bgcolor: '#E91E63',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(233, 30, 99, 0.3)',
                '&:hover': {
                  bgcolor: '#C2185B',
                  boxShadow: '0 4px 12px rgba(233, 30, 99, 0.4)',
                },
                '&:disabled': {
                  bgcolor: '#E91E63',
                  opacity: 0.6,
                },
              }}
            >
              {loading ? 'Saving...' : organization ? 'Update Organisation' : 'Create Organisation'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </form>
  );
}


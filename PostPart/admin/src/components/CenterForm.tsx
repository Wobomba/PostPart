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
  FormControlLabel,
  Switch,
  Chip,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import type { Center } from '../../../../shared/types';

interface CenterFormProps {
  center?: Center;
  onSuccess: () => void;
  onCancel: () => void;
}

// Uganda Regions
const UGANDA_REGIONS = ['Central', 'Eastern', 'Northern', 'Western'];

// Major Districts in Uganda
const UGANDA_DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Entebbe', 'Jinja', 'Mbale',
  'Gulu', 'Lira', 'Mbarara', 'Fort Portal', 'Masaka', 'Kabale',
  'Soroti', 'Arua', 'Hoima', 'Kasese', 'Iganga', 'Tororo',
  'Bushenyi', 'Mityana', 'Masindi', 'Mubende', 'Kabarole'
].sort();

// Operating Schedule Options
const OPERATING_SCHEDULES = [
  { value: '6am-6pm', label: '6:00 AM - 6:00 PM (Standard Day Care)' },
  { value: '24/7', label: '24/7 (Round the Clock)' },
  { value: 'weekdays', label: 'Weekdays Only (Monday - Friday)' },
  { value: 'weekends', label: 'Weekends Only (Saturday - Sunday)' },
  { value: 'custom', label: 'Custom Hours' },
];

// Services Offered by Day Care Centres
const DAYCARE_SERVICES = [
  'Infant Care (0-12 months)',
  'Toddler Programs (1-3 years)',
  'Preschool (3-5 years)',
  'After School Care',
  'Full Day Care',
  'Half Day Care',
  'Meals & Snacks',
  'Educational Activities',
  'Play & Recreation',
  'Health Monitoring',
  'Transportation',
  'Weekend Care',
  'Holiday Programs',
  'Special Needs Support',
];

export default function CenterForm({ center, onSuccess, onCancel }: CenterFormProps) {
  const [formData, setFormData] = useState({
    name: center?.name || '',
    address: center?.address || '',
    city: center?.city || '',
    district: center?.district || '',
    region: center?.region || '',
    description: center?.description || '',
    operating_schedule: center?.operating_schedule || '',
    custom_hours: center?.custom_hours || '',
    capacity: center?.capacity?.toString() || '',
    age_range: center?.age_range || '',
    latitude: center?.latitude?.toString() || '',
    longitude: center?.longitude?.toString() || '',
    map_link: center?.map_link || '', // Map link for location
    is_verified: center?.is_verified || false,
  });
  const [servicesOffered, setServicesOffered] = useState<string[]>(center?.services_offered || []);
  const [newService, setNewService] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate required fields
      if (!formData.name || !formData.address || !formData.city) {
        throw new Error('Please fill in all required fields');
      }

      // Validate custom hours if operating schedule is custom
      if (formData.operating_schedule === 'custom' && !formData.custom_hours) {
        throw new Error('Please provide custom hours description when selecting Custom Hours');
      }

      // Validate at least one service is selected (only for new centers or if services field exists)
      if (servicesOffered.length === 0 && !center) {
        throw new Error('Please select at least one service offered');
      }

      const centerData = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        district: formData.district || null,
        region: formData.region || null,
        description: formData.description || null,
        services_offered: servicesOffered.length > 0 ? servicesOffered : null,
        operating_schedule: formData.operating_schedule || null,
        custom_hours: formData.operating_schedule === 'custom' ? formData.custom_hours : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        age_range: formData.age_range || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        map_link: formData.map_link || null, // Map link for Google Maps, etc.
        is_verified: formData.is_verified,
        verification_date: formData.is_verified 
          ? (!center?.is_verified ? new Date().toISOString() : center?.verification_date)
          : null, // Clear verification_date when unverifying
        updated_at: new Date().toISOString(),
      };

      if (center) {
        // Update existing center
        console.log('Updating center with ID:', center.id);
        console.log('Center data to update:', centerData);
        
        const { data, error } = await supabase
          .from('centers')
          .update(centerData)
          .eq('id', center.id)
          .select()
          .single();

        console.log('Update result:', { data, error });

        if (error) {
          console.error('Update error details:', error);
          throw error;
        }

        if (!data) {
          throw new Error('Failed to update centre: No data returned. This may be an RLS permissions issue.');
        }

        // Log verification change
        if (!center.is_verified && formData.is_verified) {
          await logActivity({
            activityType: 'center_verified',
            entityType: 'center',
            entityId: center.id,
            entityName: formData.name,
            description: `Centre ${formData.name} has been verified`,
          });
        } else if (center.is_verified && !formData.is_verified) {
          // Log unverification
          await logActivity({
            activityType: 'center_updated',
            entityType: 'center',
            entityId: center.id,
            entityName: formData.name,
            description: `Centre ${formData.name} has been unverified (hidden from parents)`,
            metadata: {
              verification_status_changed: true,
              old_status: 'verified',
              new_status: 'unverified',
            },
          });
        }

        // Log update
        await logActivity({
          activityType: 'center_updated',
          entityType: 'center',
          entityId: center.id,
          entityName: formData.name,
          description: `Centre ${formData.name} details updated`,
          metadata: {
            updated_fields: Object.keys(centerData),
          },
        });

        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        // Create new center
        const { data, error } = await supabase
          .from('centers')
          .insert([centerData])
          .select()
          .single();

        if (error) throw error;

        // Log creation
        await logActivity({
          activityType: 'center_created',
          entityType: 'center',
          entityId: data.id,
          entityName: formData.name,
          description: `New centre ${formData.name} created in ${formData.city}, ${formData.state}`,
          metadata: {
            city: formData.city,
            state: formData.state,
            is_verified: formData.is_verified,
          },
        });

        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error saving centre:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      
      let errorMessage = 'Failed to save centre. Please try again.';
      
      // Check for database column not found errors (common when migrations haven't been run)
      if (error?.code === '42703' || error?.message?.includes('column') || error?.message?.includes('does not exist')) {
        errorMessage = 'Database schema error: Please run the database migrations first. Missing columns: services_offered, operating_schedule, custom_hours. Run /supabase/update-centers-services-and-hours.sql in your Supabase SQL Editor.';
      } else if (error?.code === '42P01') {
        errorMessage = 'Database error: Table not found. Please check your database setup.';
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (error?.hint) {
        errorMessage = error.hint;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.details) {
        errorMessage = `Database error: ${error.details}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };


  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success">
            Centre {center ? 'updated' : 'created'} successfully!
          </Alert>
        )}

        {/* Basic Information */}
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mt: 2 }}>
          Basic Information
        </Typography>

        <TextField
          label="Centre Name"
          required
          fullWidth
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': { borderColor: '#E91E63' },
              '&.Mui-focused fieldset': { borderColor: '#E91E63' },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
          }}
        />

        <TextField
          label="Address"
          required
          fullWidth
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': { borderColor: '#E91E63' },
              '&.Mui-focused fieldset': { borderColor: '#E91E63' },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
          }}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
          <TextField
            label="City"
            required
            fullWidth
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: '#E91E63' },
                '&.Mui-focused fieldset': { borderColor: '#E91E63' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
            }}
          />

          <FormControl fullWidth disabled={loading}>
            <InputLabel>District (Optional)</InputLabel>
            <Select
              value={formData.district}
              onChange={(e) => handleChange('district', e.target.value)}
              label="District (Optional)"
              sx={{
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E63' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E63' },
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {/* Show current district if it's not in the predefined list (legacy data) */}
              {formData.district && !UGANDA_DISTRICTS.includes(formData.district) && (
                <MenuItem value={formData.district} sx={{ fontStyle: 'italic', color: '#666' }}>
                  {formData.district} (Legacy)
                </MenuItem>
              )}
              {UGANDA_DISTRICTS.map((district) => (
                <MenuItem key={district} value={district}>
                  {district}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={loading}>
            <InputLabel>Region (Optional)</InputLabel>
            <Select
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value)}
              label="Region (Optional)"
              sx={{
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E63' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E63' },
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {UGANDA_REGIONS.map((region) => (
                <MenuItem key={region} value={region}>
                  {region}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Services Offered */}
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mt: 2 }}>
          Services Offered *
        </Typography>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select all services provided by this day care centre
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {DAYCARE_SERVICES.map((service) => (
              <Chip
                key={service}
                label={service}
                onClick={() => {
                  if (servicesOffered.includes(service)) {
                    setServicesOffered(servicesOffered.filter(s => s !== service));
                  } else {
                    setServicesOffered([...servicesOffered, service]);
                  }
                }}
                color={servicesOffered.includes(service) ? 'primary' : 'default'}
                variant={servicesOffered.includes(service) ? 'filled' : 'outlined'}
                disabled={loading}
                sx={{
                  '&.MuiChip-filled': {
                    bgcolor: '#E91E63',
                    '&:hover': { bgcolor: '#C2185B' },
                  },
                }}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Add Custom Service"
              size="small"
              fullWidth
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newService.trim() && !servicesOffered.includes(newService.trim())) {
                    setServicesOffered([...servicesOffered, newService.trim()]);
                    setNewService('');
                  }
                }
              }}
              disabled={loading}
              placeholder="e.g., Swimming Lessons"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: '#E91E63' },
                  '&.Mui-focused fieldset': { borderColor: '#E91E63' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
              }}
            />
            <Button
              onClick={() => {
                if (newService.trim() && !servicesOffered.includes(newService.trim())) {
                  setServicesOffered([...servicesOffered, newService.trim()]);
                  setNewService('');
                }
              }}
              variant="outlined"
              disabled={loading || !newService.trim()}
              sx={{
                minWidth: 'auto',
                borderColor: '#E91E63',
                color: '#E91E63',
                '&:hover': { borderColor: '#C2185B', bgcolor: 'rgba(233, 30, 99, 0.04)' },
              }}
            >
              <AddIcon />
            </Button>
          </Box>
        </Box>

        {/* Additional Details */}
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mt: 2 }}>
          Additional Details
        </Typography>

        <TextField
          label="Description"
          multiline
          rows={3}
          fullWidth
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': { borderColor: '#E91E63' },
              '&.Mui-focused fieldset': { borderColor: '#E91E63' },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
          }}
        />

        {/* Operating Hours */}
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mt: 2 }}>
          Operating Hours
        </Typography>

        <FormControl fullWidth disabled={loading}>
          <InputLabel>Operating Schedule</InputLabel>
          <Select
            value={formData.operating_schedule}
            onChange={(e) => handleChange('operating_schedule', e.target.value)}
            label="Operating Schedule"
            sx={{
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E63' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E63' },
            }}
          >
            <MenuItem value="">
              <em>Select operating hours</em>
            </MenuItem>
            {OPERATING_SCHEDULES.map((schedule) => (
              <MenuItem key={schedule.value} value={schedule.value}>
                {schedule.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {formData.operating_schedule === 'custom' && (
          <TextField
            label="Custom Hours Description"
            required
            fullWidth
            multiline
            rows={2}
            value={formData.custom_hours}
            onChange={(e) => handleChange('custom_hours', e.target.value)}
            disabled={loading}
            placeholder="e.g., Mon-Thu: 6AM-8PM, Fri: 6AM-10PM, Sat-Sun: 8AM-6PM"
            helperText="Provide details about your custom operating hours"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: '#E91E63' },
                '&.Mui-focused fieldset': { borderColor: '#E91E63' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
            }}
          />
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <TextField
            label="Capacity"
            type="number"
            fullWidth
            value={formData.capacity}
            onChange={(e) => handleChange('capacity', e.target.value)}
            disabled={loading}
            placeholder="50"
            helperText="Maximum number of children"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: '#E91E63' },
                '&.Mui-focused fieldset': { borderColor: '#E91E63' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
            }}
          />

          <TextField
            label="Age Range"
            fullWidth
            value={formData.age_range}
            onChange={(e) => handleChange('age_range', e.target.value)}
            disabled={loading}
            placeholder="6 months - 5 years"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: '#E91E63' },
                '&.Mui-focused fieldset': { borderColor: '#E91E63' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
            }}
          />
        </Box>

        {/* Location & Map */}
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mt: 2 }}>
          Location & Map
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>How to add location:</strong>
          </Typography>
          <Typography variant="caption" component="div">
            1. Open Google Maps and search for your centre<br />
            2. Click "Share" button → "Copy link"<br />
            3. Paste the link below<br />
            <br />
            OR use any map service link (Apple Maps, OpenStreetMap, etc.)
          </Typography>
        </Alert>

        <TextField
          label="Map Link (Google Maps, Apple Maps, etc.)"
          fullWidth
          value={formData.map_link}
          onChange={(e) => handleChange('map_link', e.target.value)}
          disabled={loading}
          placeholder="https://maps.google.com/?q=..."
          helperText="Parents will use this link to find directions to your centre"
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': { borderColor: '#E91E63' },
              '&.Mui-focused fieldset': { borderColor: '#E91E63' },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
          }}
        />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Optional: Enter coordinates for more precise location (will auto-generate map link if not provided)
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <TextField
            label="Latitude"
            fullWidth
            value={formData.latitude}
            onChange={(e) => handleChange('latitude', e.target.value)}
            disabled={loading}
            placeholder="40.7128"
            helperText="e.g., 40.7128"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: '#E91E63' },
                '&.Mui-focused fieldset': { borderColor: '#E91E63' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
            }}
          />

          <TextField
            label="Longitude"
            fullWidth
            value={formData.longitude}
            onChange={(e) => handleChange('longitude', e.target.value)}
            disabled={loading}
            placeholder="-74.0060"
            helperText="e.g., -74.0060"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: '#E91E63' },
                '&.Mui-focused fieldset': { borderColor: '#E91E63' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#E91E63' },
            }}
          />
        </Box>


        {/* Verification */}
        <Box sx={{ mt: 2, p: 2, bgcolor: '#F5F5F5', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Centre Visibility
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_verified}
                onChange={(e) => handleChange('is_verified', e.target.checked)}
                disabled={loading}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#E91E63' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#E91E63' },
                }}
              />
            }
            label="Verified Centre"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 5, mt: 0.5 }}>
            {formData.is_verified 
              ? "✅ This centre is VISIBLE to parents on the mobile app"
              : "⚠️ This centre is HIDDEN from parents (admin only)"}
          </Typography>
          <Alert severity={formData.is_verified ? "success" : "warning"} sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>{formData.is_verified ? "Verified Centre" : "Unverified Centre"}</strong>
            </Typography>
            <Typography variant="caption">
              {formData.is_verified 
                ? "Parents can see this centre in the mobile app and check in here."
                : "This centre will only appear in the admin dashboard. Mark as verified to make it available to parents."}
            </Typography>
          </Alert>
        </Box>

        {/* Actions */}
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
              '&:hover': { borderColor: '#475569', bgcolor: 'rgba(100, 116, 139, 0.04)' },
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth
            sx={{
              textTransform: 'none',
              bgcolor: '#E91E63',
              '&:hover': { bgcolor: '#C2185B' },
              '&.Mui-disabled': { bgcolor: '#ccc' },
            }}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : center ? (
              'Update Centre'
            ) : (
              'Create Centre'
            )}
          </Button>
        </Box>
      </Box>
    </form>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  Alert,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Business as BusinessIcon,
  PersonAdd as PersonAddIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface PendingAction {
  id: string;
  type: 'unassociated_parent' | 'inactive_organisation' | 'unverified_centre' | 'pending_approval';
  title: string;
  description: string;
  count: number;
  route: string;
  priority: 'low' | 'medium' | 'high';
}

export default function NotificationBell() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadPendingActions();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadPendingActions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingActions = async () => {
    try {
      setLoading(true);
      const actions: PendingAction[] = [];

      // 1. Check for inactive parents pending review (with organization_name but inactive status)
      const { count: pendingReviewParents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'inactive')
        .not('organization_name', 'is', null);

      if (pendingReviewParents && pendingReviewParents > 0) {
        actions.push({
          id: 'pending_review_parents',
          type: 'pending_approval',
          title: 'New Accounts Pending Review',
          description: `${pendingReviewParents} new account${pendingReviewParents > 1 ? 's' : ''} ${pendingReviewParents === 1 ? 'is' : 'are'} waiting for review and activation`,
          count: pendingReviewParents,
          route: '/dashboard/parents?status=inactive&has_org_name=true',
          priority: 'high',
        });
      }

      // 2. Check for unassociated parents (active but no organization)
      const { count: unassociatedParents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('organization_id', null)
        .eq('status', 'active');

      if (unassociatedParents && unassociatedParents > 0) {
        actions.push({
          id: 'unassociated_parents',
          type: 'unassociated_parent',
          title: 'Parents Without Organisation',
          description: `${unassociatedParents} parent${unassociatedParents > 1 ? 's' : ''} need${unassociatedParents === 1 ? 's' : ''} to be assigned to an organisation`,
          count: unassociatedParents,
          route: '/dashboard/parents?filter=no_organisation',
          priority: 'high',
        });
      }

      // 3. Check for inactive organisations
      const { count: inactiveOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'inactive');

      if (inactiveOrgs && inactiveOrgs > 0) {
        actions.push({
          id: 'inactive_organisations',
          type: 'inactive_organisation',
          title: 'Inactive Organisations',
          description: `${inactiveOrgs} organisation${inactiveOrgs > 1 ? 's are' : ' is'} currently inactive`,
          count: inactiveOrgs,
          route: '/dashboard/organizations?status=inactive',
          priority: 'medium',
        });
      }

      // 4. Check for unverified centres
      const { count: unverifiedCentres } = await supabase
        .from('centers')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', false);

      if (unverifiedCentres && unverifiedCentres > 0) {
        actions.push({
          id: 'unverified_centres',
          type: 'unverified_centre',
          title: 'Unverified Centres',
          description: `${unverifiedCentres} centre${unverifiedCentres > 1 ? 's' : ''} pending verification`,
          count: unverifiedCentres,
          route: '/dashboard/centers?status=unverified',
          priority: 'medium',
        });
      }

      // 5. Check for suspended parents
      const { count: suspendedParents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'suspended');

      if (suspendedParents && suspendedParents > 0) {
        actions.push({
          id: 'suspended_parents',
          type: 'pending_approval',
          title: 'Suspended Parents',
          description: `${suspendedParents} parent${suspendedParents > 1 ? 's are' : ' is'} suspended and may need review`,
          count: suspendedParents,
          route: '/dashboard/parents?status=suspended',
          priority: 'low',
        });
      }

      setPendingActions(actions);
      setTotalCount(actions.reduce((sum, action) => sum + action.count, 0));
    } catch (error) {
      console.error('Error loading pending actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (route: string) => {
    router.push(route);
    handleClose();
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <WarningIcon fontSize="small" sx={{ color: '#F44336' }} />;
      case 'medium': return <InfoIcon fontSize="small" sx={{ color: '#FF9800' }} />;
      default: return <InfoIcon fontSize="small" sx={{ color: '#2196F3' }} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FFEBEE';
      case 'medium': return '#FFF3E0';
      default: return '#E3F2FD';
    }
  };

  const open = Boolean(anchorEl);

  return (
    <Box>
      <IconButton
        size="large"
        color="inherit"
        onClick={handleClick}
        sx={{
          color: totalCount > 0 ? '#E91E63' : 'inherit',
        }}
      >
        <Badge badgeContent={totalCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#F5F5F5' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Pending Actions
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Items requiring your attention
          </Typography>
        </Box>

        <Divider />

        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        ) : pendingActions.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No pending actions! 🎉
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Everything is up to date
            </Typography>
          </Box>
        ) : (
          [
            pendingActions.map((action) => (
              <MenuItem
                key={action.id}
                onClick={() => handleActionClick(action.route)}
                sx={{
                  py: 1.5,
                  px: 2,
                  bgcolor: getPriorityColor(action.priority),
                  borderBottom: '1px solid #E0E0E0',
                  '&:hover': {
                    bgcolor: getPriorityColor(action.priority),
                    opacity: 0.8,
                  },
                }}
              >
                <Box display="flex" alignItems="start" gap={1.5} width="100%">
                  {getPriorityIcon(action.priority)}
                  <Box flex={1}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="body2" fontWeight={600}>
                        {action.title}
                      </Typography>
                      <Chip 
                        label={action.count} 
                        size="small" 
                        color={action.priority === 'high' ? 'error' : 'primary'}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            )),
            <Divider key="divider" />,
            <Box key="button-container" sx={{ p: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={() => {
                  router.push('/dashboard');
                  handleClose();
                }}
                sx={{ textTransform: 'none' }}
              >
                View Dashboard
              </Button>
            </Box>
          ]
        )}
      </Menu>
    </Box>
  );
}


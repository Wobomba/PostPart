'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  InputAdornment,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Support as SupportIcon,
} from '@mui/icons-material';
import DashboardLayout from '../../../components/DashboardLayout';
import {
  getAllUsersWithRoles,
  assignUserRole,
  deleteUser,
  getRoleLabel,
  getRoleColor,
} from '../../../utils/roleManager';
import { logActivity, ActivityDescriptions } from '../../../utils/activityLogger';
import { UserWithRole, UserRole } from '../../../../shared/types';
import { supabase } from '../../../lib/supabase';

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  
  // Form states
  const [editUserRole, setEditUserRole] = useState<UserRole>('parent');
  
  // Error/success states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    
    // Set up realtime subscription for user_roles changes
    const subscription = supabase
      .channel('user-roles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
        },
        () => {
          loadUsers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getAllUsersWithRoles();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleEditRole = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await assignUserRole(selectedUser.id, editUserRole);

      if (!result.success) {
        setError(result.error || 'Failed to update role');
        return;
      }

      // Log activity
      await logActivity({
        activityType: 'user_role_changed',
        entityType: 'user',
        entityId: selectedUser.id,
        entityName: selectedUser.email,
        description: ActivityDescriptions.userRoleChanged(
          selectedUser.email,
          selectedUser.role || 'none',
          editUserRole
        ),
        metadata: { old_role: selectedUser.role, new_role: editUserRole },
      });

      setSuccess(`User role updated to ${getRoleLabel(editUserRole)}`);
      setEditDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      setError(error.message || 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await deleteUser(selectedUser.id);

      if (!result.success) {
        setError(result.error || 'Failed to delete user');
        return;
      }

      // Log activity
      await logActivity({
        activityType: 'user_deleted',
        entityType: 'user',
        entityId: selectedUser.id,
        entityName: selectedUser.email,
        description: ActivityDescriptions.userDeleted(selectedUser.email),
        metadata: { role: selectedUser.role },
      });

      setSuccess('User deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      setError(error.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleIcon = (role?: UserRole) => {
    if (!role) return <PersonIcon />;
    switch (role) {
      case 'admin':
        return <AdminIcon />;
      case 'parent':
        return <PersonIcon />;
      case 'support':
        return <SupportIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 600,
                fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem' },
                color: '#1e293b',
                mb: 0.5,
              }}
            >
              User Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage user accounts and role assignments
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={loadUsers} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Statistics */}
        {!loading && (
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              gap: { xs: 2, sm: 3, md: 4 },
              mb: { xs: 4, sm: 5, md: 6 },
              width: '100%',
            }}
          >
            {[
              { icon: <PersonIcon />, label: 'Total Users', value: users.length, color: '#2196F3' },
              { icon: <AdminIcon />, label: 'Admins', value: users.filter((u) => u.role === 'admin').length, color: '#E91E63' },
              { icon: <PersonIcon />, label: 'Parents', value: users.filter((u) => u.role === 'parent').length, color: '#4CAF50' },
              { icon: <SupportIcon />, label: 'Support Staff', value: users.filter((u) => u.role === 'support').length, color: '#FF9800' },
            ].map((stat, index) => (
              <Box key={index} sx={{ display: 'flex', width: '100%' }}>
                <Card sx={{ 
                  height: '100%', 
                  width: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'default',
                  animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
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
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px -10px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  },
                }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box
                        sx={{
                          fontSize: 20,
                          color: stat.color,
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'transform 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.1) rotate(5deg)',
                          },
                        }}
                      >
                        {stat.icon}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {stat.label}
                      </Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {stat.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3, p: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 3 },
            alignItems: { xs: 'stretch', sm: 'flex-end' },
          }}>
            {/* Search Box */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <TextField
                fullWidth
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    fontSize: '0.875rem',
                  },
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#E91E63',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#E91E63',
                    },
                  },
                  '& input::placeholder': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Box>

            {/* Role Filter */}
            <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }}>
              <InputLabel sx={{ fontSize: '0.875rem' }}>Filter by Role</InputLabel>
              <Select
                value={roleFilter}
                label="Filter by Role"
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      '& .MuiMenuItem-root': {
                        fontSize: '0.875rem',
                      },
                    },
                  },
                }}
                sx={{
                  height: 56,
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#d1d5db',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                  '& .MuiSelect-select': {
                    fontSize: '0.875rem',
                  },
                }}
              >
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
                <MenuItem value="parent">Parent</MenuItem>
                <MenuItem value="support">Support Staff</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Card>

        {/* Users Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Last Sign In</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <Typography color="text.secondary">
                        No users found matching your filters
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getRoleIcon(user.role)}
                          <Typography variant="body2">{user.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {user.role ? (
                          <Chip
                            label={getRoleLabel(user.role)}
                            size="small"
                            sx={{
                              bgcolor: `${getRoleColor(user.role)}20`,
                              color: getRoleColor(user.role),
                              fontWeight: 600,
                            }}
                          />
                        ) : (
                          <Chip label="No Role" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(user.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDateTime(user.last_sign_in_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit Role">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditUserRole(user.role || 'parent');
                              setEditDialogOpen(true);
                            }}
                            sx={{
                              color: '#64748b',
                              '&:hover': { color: '#2196F3', bgcolor: '#E3F2FD' },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                            sx={{
                              color: '#64748b',
                              '&:hover': { color: '#f44336', bgcolor: '#FFEBEE' },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Edit Role Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit User Role</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Editing role for: <strong>{selectedUser?.email}</strong>
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={editUserRole}
                  label="Role"
                  onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                >
                  <MenuItem value="admin">Administrator</MenuItem>
                  <MenuItem value="parent">Parent</MenuItem>
                  <MenuItem value="support">Support Staff</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleEditRole}
              variant="contained"
              disabled={actionLoading}
              sx={{ bgcolor: '#E91E63', '&:hover': { bgcolor: '#C2185B' } }}
            >
              {actionLoading ? <CircularProgress size={24} /> : 'Update Role'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Delete User</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This action cannot be undone. All user data will be permanently deleted.
            </Alert>
            <Typography variant="body2">
              Are you sure you want to delete the user: <strong>{selectedUser?.email}</strong>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUser}
              variant="contained"
              color="error"
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={24} /> : 'Delete User'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}



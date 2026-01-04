'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import NotificationBell from './NotificationBell';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  Avatar,
  Divider,
  IconButton,
  useMediaQuery,
  useTheme,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  LocationOn as LocationOnIcon,
  QrCode as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Description as DescriptionIcon,
  ExpandLess,
  ExpandMore,
  AdminPanelSettings as AdminPanelSettingsIcon,
} from '@mui/icons-material';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 264;

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [organisationsOpen, setOrganisationsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-expand Organisations submenu if on organisations or allocations page
  useEffect(() => {
    if (pathname?.startsWith('/dashboard/organizations') || pathname?.startsWith('/dashboard/allocations')) {
      setOrganisationsOpen(true);
    }
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Handle refresh token errors
      if (sessionError) {
        if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('refresh_token')) {
          console.warn('Invalid refresh token, clearing session:', sessionError.message);
          await supabase.auth.signOut();
          router.replace('/auth/login');
          return;
        }
        throw sessionError;
      }
      
      if (!session) {
        router.replace('/auth/login');
        return;
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no rows gracefully

      // If error occurred (not just "no rows")
      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error checking user role:', roleError);
        await supabase.auth.signOut();
        router.replace('/auth/unauthorized');
        return;
      }

      // If no role found or user is not admin
      if (!roleData || roleData.role !== 'admin') {
        // Sign out the user since they're not authorized
        await supabase.auth.signOut();
        router.replace('/auth/unauthorized');
        return;
      }

      setUser(session.user);
    } catch (error) {
      console.error('Error checking auth:', error);
      // Sign out on error for security
      await supabase.auth.signOut();
      router.replace('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F7FA' }}>
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  // Prevent hydration mismatch by not rendering responsive content until mounted
  if (!mounted) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F7FA' }}>
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { 
      href: '/dashboard/organizations', 
      label: 'Organisations', 
      icon: <BusinessIcon />,
      hasSubmenu: true,
      submenuItems: [
        { href: '/dashboard/organizations', label: 'Institutions', icon: <BusinessIcon /> },
        { href: '/dashboard/allocations', label: 'Allocations', icon: <TrendingUpIcon /> },
      ],
    },
    { href: '/dashboard/parents', label: 'Parents', icon: <PeopleIcon /> },
    { href: '/dashboard/centers', label: 'Centres', icon: <LocationOnIcon /> },
    { href: '/dashboard/users', label: 'User Management', icon: <AdminPanelSettingsIcon /> },
    { href: '/dashboard/logs', label: 'Activity Logs', icon: <DescriptionIcon /> },
    { href: '/dashboard/bulk-notifications', label: 'Bulk Notifications', icon: <NotificationsIcon /> },
  ];

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          py: 3,
          px: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box
            component="img"
            src="/postpart-logo.png"
            alt="PostPart"
            sx={{
              width: 40,
              height: 40,
              mr: 1.5,
            }}
          />
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 700, 
              color: '#E91E63',
              fontSize: '1.5rem',
              letterSpacing: '-0.5px',
            }}
          >
            PostPart
          </Typography>
        </Box>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}
        >
          Well Mamas Well Babies
        </Typography>
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, overflow: 'auto', py: { xs: 2, sm: 3 } }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isSubmenuActive = item.submenuItems?.some(sub => pathname === sub.href);
          
          return (
            <Box key={item.href}>
              <ListItem disablePadding>
                <ListItemButton
                  component={item.hasSubmenu ? 'div' : Link}
                  href={item.hasSubmenu ? undefined : item.href}
                  selected={isActive}
                  onClick={() => {
                    if (item.hasSubmenu) {
                      setOrganisationsOpen(!organisationsOpen);
                    } else {
                      if (!item.hasSubmenu) {
                        router.push(item.href);
                      }
                      isMobile && setMobileOpen(false);
                    }
                  }}
                  sx={{
                    px: { xs: 2, sm: 3 },
                    py: { xs: 1.5, sm: 2 },
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: '#E91E63',
                      color: '#ffffff',
                      borderRight: '4px solid',
                      borderColor: '#E91E63',
                      '&:hover': {
                        bgcolor: '#E91E63',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: { xs: 36, sm: 40 },
                      color: isActive ? '#ffffff' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                      fontWeight: isActive ? 600 : 400,
                    }}
                  />
                  {item.hasSubmenu && (
                    organisationsOpen ? <ExpandLess sx={{ color: isActive ? '#ffffff' : 'text.secondary' }} /> : <ExpandMore sx={{ color: isActive ? '#ffffff' : 'text.secondary' }} />
                  )}
                </ListItemButton>
              </ListItem>

              {/* Submenu Items */}
              {item.hasSubmenu && item.submenuItems && (
                <Collapse in={organisationsOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.submenuItems.map((subItem) => {
                      const isSubActive = pathname === subItem.href;
                      return (
                        <ListItem key={subItem.href} disablePadding>
                          <ListItemButton
                            component={Link}
                            href={subItem.href}
                            selected={isSubActive}
                            onClick={() => isMobile && setMobileOpen(false)}
                            sx={{
                              pl: { xs: 6, sm: 7 },
                              pr: { xs: 2, sm: 3 },
                              py: { xs: 1.25, sm: 1.5 },
                              mb: 0.5,
                              '&.Mui-selected': {
                                bgcolor: '#FCE4EC',
                                color: '#E91E63',
                                borderRight: '4px solid',
                                borderColor: '#E91E63',
                                '&:hover': {
                                  bgcolor: '#FCE4EC',
                                },
                              },
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: { xs: 32, sm: 36 },
                                color: isSubActive ? '#E91E63' : 'text.secondary',
                              }}
                            >
                              {subItem.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={subItem.label}
                              primaryTypographyProps={{
                                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                                fontWeight: isSubActive ? 600 : 400,
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              )}
            </Box>
          );
        })}
      </List>

      {/* User Info */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
            {user?.email || 'Admin'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6875rem', sm: '0.75rem' } }}>
            Administrator
          </Typography>
        </Box>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleSignOut}
          sx={{ 
            textTransform: 'none',
            fontSize: { xs: '0.8125rem', sm: '0.875rem' },
            py: { xs: 1, sm: 1.25 },
            borderColor: '#E91E63',
            color: '#E91E63',
            '&:hover': {
              bgcolor: '#E91E63',
              color: '#ffffff',
              borderColor: '#E91E63',
            },
            '& .MuiButton-startIcon': {
              color: 'inherit',
            },
          }}
        >
          Sign Out
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F5F7FA' }}>
      {/* Mobile App Bar */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: { xs: 56, sm: 64 },
            bgcolor: '#ffffff',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Box display="flex" alignItems="center">
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component="img"
                src="/postpart-logo.png"
                alt="PostPart"
                sx={{
                  width: 28,
                  height: 28,
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1rem' }}>
                PostPart
              </Typography>
            </Box>
          </Box>
          <NotificationBell />
        </Box>
      )}

      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: '#ffffff',
            ...(isMobile && {
              top: { xs: 56, sm: 64 },
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // Background image setup
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/children-background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            opacity: 0.25,
            zIndex: 0,
          },
          // Overlay for better readability
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(245, 247, 250, 0.80) 100%)',
            zIndex: 1,
          },
          // Ensure content is above overlays
          '& > *': {
            position: 'relative',
            zIndex: 2,
          },
          ...(isMobile && {
            mt: { xs: 7, sm: 8 },
          }),
        }}
      >
        {/* Desktop Header Bar with Notification Bell */}
        {!isMobile && (
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              bgcolor: '#ffffff',
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              px: { sm: 3, md: 4, lg: 5 },
              py: 2,
            }}
          >
            <NotificationBell />
          </Box>
        )}

        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4, lg: 5 },
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}


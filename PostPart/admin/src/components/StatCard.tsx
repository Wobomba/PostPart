import React from 'react';
import { Card, CardContent, Box, Typography, CircularProgress } from '@mui/material';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  loading?: boolean;
  animationDelay?: string;
}

/**
 * Memoized Stat Card Component
 * Prevents unnecessary re-renders when parent component state changes
 */
const StatCard = React.memo<StatCardProps>(({ icon, label, value, loading, animationDelay = '0s' }) => {
  return (
    <Card
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.5s ease-in',
        animationDelay,
        animationFillMode: 'backwards',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
          '& .stat-icon': { transform: 'scale(1.1) rotate(5deg)' },
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box className="stat-icon" sx={{ transition: 'transform 0.3s ease', display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
          {loading ? <CircularProgress size={20} sx={{ color: '#E91E63' }} /> : value}
        </Typography>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;


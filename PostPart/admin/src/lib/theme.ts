'use client';

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#E91E63', // PostPart pink/magenta (matching mobile app)
      light: '#F06292', // primaryLight
      dark: '#C2185B', // primaryDark
    },
    secondary: {
      main: '#9C27B0', // PostPart purple accent (matching mobile app)
    },
    background: {
      default: '#ffffff', // white
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b', // gray-900
      secondary: '#64748b', // slate-500
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },
    // Global compact table styles
    MuiTable: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#f8fafc',
            borderBottom: '2px solid #e2e8f0',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f9fafb',
          },
          '&:last-child td': {
            borderBottom: 0,
          },
        },
        head: {
          '&:hover': {
            backgroundColor: '#f8fafc !important',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          // Compact padding for all table cells
          padding: '10px 16px',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          borderBottom: '1px solid #e2e8f0',
        },
        head: {
          // Header cell specific styles
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#475569',
          padding: '12px 16px',
          whiteSpace: 'nowrap',
        },
        body: {
          // Body cell specific styles
          fontSize: '0.875rem',
          color: '#1e293b',
        },
        sizeSmall: {
          // Even more compact when size="small" is explicitly set
          padding: '8px 12px',
          '&.MuiTableCell-head': {
            padding: '10px 12px',
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          // Ensure proper scrolling behavior
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: '8px',
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f5f9',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#cbd5e1',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: '#94a3b8',
            },
          },
        },
      },
    },
  },
});


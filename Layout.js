import React from 'react';
import { Box, styled } from '@mui/material';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Main = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  backgroundColor: '#F8F9FA',
  minHeight: '100vh',
  transition: 'margin 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
  [theme.breakpoints.up('md')]: {
    marginLeft: 240,
    paddingLeft: 0,
  },
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
  },
  display: 'flex',
  flexDirection: 'column',
}));

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Main>
        <TopBar />
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            px: { xs: 2, sm: 3 },
          }}
        >
          {children}
        </Box>
      </Main>
    </Box>
  );
};

export default Layout;

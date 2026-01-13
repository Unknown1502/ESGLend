import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountBalance as LoanIcon,
  VerifiedUser as VerificationIcon,
  Assessment as ReportIcon,
  Storage as DataSourceIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  Nature as EcoIcon,
  TrendingUp as PricingIcon,
  Security as RiskIcon,
  Policy as SFDRIcon,
  GroupWork as CollaborationIcon,
  CloudDownload as ExportIcon,
} from '@mui/icons-material';
import { logout } from '../../store/slices/authSlice';
import ApiStatusIndicator from '../ApiStatusIndicator';

const drawerWidth = 260;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const user = useSelector((state: any) => state.auth.user);
  const isAdmin = user?.role === 'admin';

  const allMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['admin', 'viewer'] },
    { text: 'Loans', icon: <LoanIcon />, path: '/loans', roles: ['admin', 'viewer'] },
    { text: 'Loan Pricing', icon: <PricingIcon />, path: '/pricing', roles: ['admin', 'viewer'] },
    { text: 'Risk Assessment', icon: <RiskIcon />, path: '/risk', roles: ['admin', 'viewer'] },
    { text: 'SFDR Compliance', icon: <SFDRIcon />, path: '/sfdr', roles: ['admin', 'viewer'] },
    { text: 'Collaboration', icon: <CollaborationIcon />, path: '/collaboration', roles: ['admin', 'viewer'] },
    { text: 'Export', icon: <ExportIcon />, path: '/export', roles: ['admin', 'viewer'] },
    { text: 'Verifications', icon: <VerificationIcon />, path: '/verifications', roles: ['admin', 'viewer'] },
    { text: 'Reports', icon: <ReportIcon />, path: '/reports', roles: ['admin'] },
    { text: 'Data Sources', icon: <DataSourceIcon />, path: '/data-sources', roles: ['admin'] },
    { text: 'Users', icon: <PeopleIcon />, path: '/users', roles: ['admin'] },
  ];

  const menuItems = allMenuItems.filter(item => 
    item.roles.includes(user?.role || 'viewer')
  );

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          bgcolor: 'white',
          color: 'text.primary',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Sustainability-Linked Loan Verification Platform
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ApiStatusIndicator />
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" fontWeight="bold">
                {user?.full_name || 'User'}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: isAdmin ? 'success.main' : 'info.main',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {user?.role || 'viewer'}
              </Typography>
            </Box>
            <IconButton onClick={handleMenuOpen}>
              <Avatar sx={{ bgcolor: isAdmin ? 'success.main' : 'info.main' }}>
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant="body2" fontWeight="bold">{user?.email}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.organization}</Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#1B5E20',
            color: 'white',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center' }}>
          <EcoIcon sx={{ fontSize: 40, mr: 1 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              ESGLend
            </Typography>
            <Typography variant="caption">by LMA EDGE</Typography>
          </Box>
        </Box>
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'white' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;

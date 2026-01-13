import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Alert,
} from '@mui/material';
import {
  CloudQueue as WeatherIcon,
  Satellite as SatelliteIcon,
  Co2 as CarbonIcon,
  Assessment as ESGIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import apiClient from '../api/apiClient';

interface ApiStatus {
  service: string;
  available: boolean;
  message: string;
  last_check?: string;
  cache_hits?: number;
  total_calls?: number;
}

interface ApiStatusResponse {
  services: {
    weather: ApiStatus;
    satellite: ApiStatus;
    carbon: ApiStatus;
    esg_rating: ApiStatus;
  };
  overall_status: 'healthy' | 'degraded' | 'unavailable';
  timestamp: string;
}

const ApiStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<ApiStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchApiStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api-status/status');
      setStatus(response.data);
    } catch (err: any) {
      console.error('Failed to fetch API status:', err);
      setError(err.response?.data?.detail || 'Failed to fetch API status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiStatus();
    
    // Auto-refresh every 2 minutes if enabled
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchApiStatus, 120000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusColor = (overallStatus: string) => {
    switch (overallStatus) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unavailable':
        return 'error';
      default:
        return 'default';
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'weather':
        return <WeatherIcon />;
      case 'satellite':
        return <SatelliteIcon />;
      case 'carbon':
        return <CarbonIcon />;
      case 'esg_rating':
        return <ESGIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getServiceLabel = (service: string) => {
    switch (service) {
      case 'weather':
        return 'Weather API';
      case 'satellite':
        return 'Satellite API';
      case 'carbon':
        return 'Carbon API';
      case 'esg_rating':
        return 'ESG Rating API';
      default:
        return service;
    }
  };

  const handleChipClick = () => {
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
  };

  const handleRefresh = () => {
    fetchApiStatus();
  };

  if (loading && !status) {
    return (
      <Tooltip title="Loading API status...">
        <Chip
          icon={<CircularProgress size={16} />}
          label="Checking APIs..."
          size="small"
          variant="outlined"
        />
      </Tooltip>
    );
  }

  if (error) {
    return (
      <Tooltip title={error}>
        <Chip
          icon={<ErrorIcon />}
          label="API Status Error"
          size="small"
          color="error"
          onClick={handleChipClick}
        />
      </Tooltip>
    );
  }

  if (!status) return null;

  const availableCount = Object.values(status.services).filter(s => s.available).length;
  const totalCount = Object.values(status.services).length;

  return (
    <>
      <Tooltip title="Click to view detailed API status">
        <Chip
          icon={status.overall_status === 'healthy' ? <CheckIcon /> : 
                status.overall_status === 'degraded' ? <WarningIcon /> : 
                <ErrorIcon />}
          label={`Live Data: ${availableCount}/${totalCount}`}
          size="small"
          color={getStatusColor(status.overall_status) as any}
          onClick={handleChipClick}
          sx={{ cursor: 'pointer' }}
        />
      </Tooltip>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          External API Status
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert 
            severity={status.overall_status === 'healthy' ? 'success' : 
                     status.overall_status === 'degraded' ? 'warning' : 'error'}
            sx={{ mb: 2 }}
          >
            {status.overall_status === 'healthy' && 'All external data sources are operational'}
            {status.overall_status === 'degraded' && 'Some data sources are unavailable (using fallback data)'}
            {status.overall_status === 'unavailable' && 'External data sources unavailable (using cached/simulated data)'}
          </Alert>

          <List>
            {Object.entries(status.services).map(([service, serviceStatus]) => (
              <ListItem 
                key={service}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: serviceStatus.available ? 'success.light' : 'error.light',
                  opacity: serviceStatus.available ? 1 : 0.6,
                }}
              >
                <ListItemIcon>
                  {getServiceIcon(service)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {getServiceLabel(service)}
                      </Typography>
                      <Chip
                        label={serviceStatus.available ? 'Available' : 'Unavailable'}
                        size="small"
                        color={serviceStatus.available ? 'success' : 'error'}
                        icon={serviceStatus.available ? <CheckIcon /> : <ErrorIcon />}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        {serviceStatus.message}
                      </Typography>
                      {serviceStatus.cache_hits !== undefined && (
                        <Typography variant="caption" color="text.secondary">
                          Cache hits: {serviceStatus.cache_hits} / {serviceStatus.total_calls || 0} calls
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Last updated: {new Date(status.timestamp).toLocaleString()}
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApiStatusIndicator;

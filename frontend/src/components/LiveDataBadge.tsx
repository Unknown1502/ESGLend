import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import {
  CheckCircle as CheckIcon,
  CloudQueue as WeatherIcon,
  Satellite as SatelliteIcon,
  Co2 as CarbonIcon,
  Assessment as ESGIcon,
} from '@mui/icons-material';

interface LiveDataBadgeProps {
  source: 'weather' | 'satellite' | 'carbon' | 'esg_rating' | 'external' | 'verified';
  isLive?: boolean;
  label?: string;
  size?: 'small' | 'medium';
}

const LiveDataBadge: React.FC<LiveDataBadgeProps> = ({ 
  source, 
  isLive = true, 
  label,
  size = 'small'
}) => {
  const getSourceConfig = () => {
    switch (source) {
      case 'weather':
        return {
          icon: <WeatherIcon />,
          label: label || 'Weather Data',
          tooltip: 'Verified via OpenWeatherMap API',
          color: 'primary' as const,
        };
      case 'satellite':
        return {
          icon: <SatelliteIcon />,
          label: label || 'Satellite Data',
          tooltip: 'Verified via NASA FIRMS Satellite API',
          color: 'secondary' as const,
        };
      case 'carbon':
        return {
          icon: <CarbonIcon />,
          label: label || 'Carbon Data',
          tooltip: 'Verified via UK Carbon Intensity API',
          color: 'success' as const,
        };
      case 'esg_rating':
        return {
          icon: <ESGIcon />,
          label: label || 'ESG Rating',
          tooltip: 'Benchmarked via Alpha Vantage ESG API',
          color: 'info' as const,
        };
      case 'verified':
        return {
          icon: <CheckIcon />,
          label: label || 'Verified',
          tooltip: 'Data verified through multiple external sources',
          color: 'success' as const,
        };
      case 'external':
      default:
        return {
          icon: <CheckIcon />,
          label: label || 'Live Data',
          tooltip: 'Real-time data from external APIs',
          color: 'primary' as const,
        };
    }
  };

  const config = getSourceConfig();

  if (!isLive) {
    return (
      <Tooltip title="Using cached or simulated data">
        <Chip
          icon={config.icon}
          label={`${config.label} (Cached)`}
          size={size}
          variant="outlined"
          color="default"
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={config.tooltip}>
      <Chip
        icon={config.icon}
        label={`✓ ${config.label}`}
        size={size}
        color={config.color}
        variant="filled"
        sx={{
          fontWeight: 'bold',
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.8 },
          },
        }}
      />
    </Tooltip>
  );
};

export default LiveDataBadge;

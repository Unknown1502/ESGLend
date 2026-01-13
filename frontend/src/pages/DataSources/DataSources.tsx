import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider
} from '@mui/material';
import { Info, CheckCircle, Cloud, Satellite, Factory, Description } from '@mui/icons-material';
import { dataSourcesAPI } from '../../api/apiClient';

interface DataSource {
  id: number;
  name: string;
  provider: string;
  category: string;
  api_endpoint: string;
  authentication_type: string;
  is_active: boolean;
  cost_per_request: number;
  reliability_score: number;
  description: string;
  created_at: string;
  last_used_at: string;
}

const DataSources: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadDataSources();
  }, []);

  const loadDataSources = async () => {
    try {
      setLoading(true);
      const response = await dataSourcesAPI.getAll();
      setDataSources(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data sources');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (source: DataSource) => {
    setSelectedSource(source);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedSource(null);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'energy': return <Factory sx={{ color: '#ff9800' }} />;
      case 'environmental': return <Cloud sx={{ color: '#4caf50' }} />;
      case 'emissions': return <Satellite sx={{ color: '#f44336' }} />;
      case 'certification': return <Description sx={{ color: '#2196f3' }} />;
      case 'water': return <Cloud sx={{ color: '#03a9f4' }} />;
      default: return <Info />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      energy: '#ff9800',
      environmental: '#4caf50',
      emissions: '#f44336',
      certification: '#2196f3',
      water: '#03a9f4'
    };
    return colors[category] || '#757575';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalSources = dataSources.length;
  const activeSources = dataSources.filter(ds => ds.is_active).length;
  const avgReliability = dataSources.length > 0
    ? dataSources.reduce((sum, ds) => sum + ds.reliability_score, 0) / dataSources.length
    : 0;
  const avgCost = dataSources.length > 0
    ? dataSources.reduce((sum, ds) => sum + ds.cost_per_request, 0) / dataSources.length
    : 0;

  const categoryCounts = dataSources.reduce((acc, ds) => {
    acc[ds.category] = (acc[ds.category] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Data Sources
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 3 }}>
        Integrated third-party data providers for ESG verification
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Data Sources
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {totalSources}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Integrations
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {activeSources}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Reliability
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {avgReliability.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Cost/Request
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                ${avgCost.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Data Source</strong></TableCell>
                    <TableCell><strong>Category</strong></TableCell>
                    <TableCell><strong>Provider</strong></TableCell>
                    <TableCell align="center"><strong>Reliability</strong></TableCell>
                    <TableCell align="center"><strong>Cost</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                    <TableCell align="center"><strong>Details</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataSources.map((source) => (
                    <TableRow 
                      key={source.id} 
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleViewDetails(source)}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getCategoryIcon(source.category)}
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {source.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" noWrap>
                              {source.description.substring(0, 40)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={source.category}
                          size="small"
                          sx={{ 
                            backgroundColor: getCategoryColor(source.category),
                            color: 'white'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {source.provider}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ width: '100%' }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                            <Typography variant="caption">
                              {source.reliability_score.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={source.reliability_score}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: '#e0e0e0',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: source.reliability_score >= 95 ? '#4caf50' : 
                                               source.reliability_score >= 85 ? '#ff9800' : '#f44336'
                              }
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="medium">
                          ${source.cost_per_request.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {source.is_active ? (
                          <Chip 
                            icon={<CheckCircle />}
                            label="Active" 
                            color="success" 
                            size="small" 
                          />
                        ) : (
                          <Chip 
                            label="Inactive" 
                            color="default" 
                            size="small" 
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(source);
                          }}
                        >
                          <Info />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Coverage by Category
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {Object.entries(categoryCounts).map(([category, count]) => (
              <Box key={category} mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getCategoryIcon(category)}
                    <Typography variant="body2" textTransform="capitalize">
                      {category}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="medium">
                    {count} sources
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(count / totalSources) * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getCategoryColor(category)
                    }
                  }}
                />
              </Box>
            ))}
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Authentication Methods
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {Array.from(new Set(dataSources.map(ds => ds.authentication_type))).map(authType => {
              const count = dataSources.filter(ds => ds.authentication_type === authType).length;
              return (
                <Box key={authType} display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" textTransform="uppercase">
                    {authType.replace('_', ' ')}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {count}
                  </Typography>
                </Box>
              );
            })}
          </Paper>
        </Grid>
      </Grid>

      <Dialog 
        open={detailsOpen} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedSource && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={2}>
                {getCategoryIcon(selectedSource.category)}
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedSource.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedSource.provider}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {selectedSource.description}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" color="textSecondary">
                      Category
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      <Chip 
                        label={selectedSource.category}
                        size="small"
                        sx={{ 
                          backgroundColor: getCategoryColor(selectedSource.category),
                          color: 'white',
                          mt: 0.5
                        }}
                      />
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" color="textSecondary">
                      Authentication
                    </Typography>
                    <Typography variant="body1" fontWeight="medium" textTransform="uppercase">
                      {selectedSource.authentication_type.replace('_', ' ')}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" color="textSecondary">
                      Reliability Score
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">
                      {selectedSource.reliability_score.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" color="textSecondary">
                      Cost per Request
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      ${selectedSource.cost_per_request.toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" color="textSecondary">
                      API Endpoint
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ mt: 0.5 }}>
                      {selectedSource.api_endpoint}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="textSecondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selectedSource.created_at)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="textSecondary">
                    Last Used
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selectedSource.last_used_at)}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default DataSources;

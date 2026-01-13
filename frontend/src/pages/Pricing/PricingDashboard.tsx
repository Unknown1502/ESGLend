import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  Calculate, 
  History, 
  Timeline 
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface PricingData {
  loan_id: number;
  loan_number: string;
  esg_performance_score: number;
  pricing_tier: string;
  margin_adjustment_bps: number;
  current_rate: number;
  new_rate: number;
  annual_impact: number;
  last_update: string;
}

interface PricingHistory {
  id: number;
  effective_date: string;
  base_rate: number;
  margin: number;
  total_rate: number;
  esg_performance_score: number;
  adjustment_reason: string;
  adjustment_amount: number;
}

interface ScenarioData {
  scenario_name: string;
  esg_performance_score: number;
  pricing_tier: string;
  margin_adjustment_bps: number;
  projected_rate: number;
  annual_impact: number;
}

const PricingDashboard: React.FC = () => {
  const [loans, setLoans] = useState<any[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [history, setHistory] = useState<PricingHistory[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openScenarioDialog, setOpenScenarioDialog] = useState(false);
  
  // Scenario simulation inputs
  const [scenarioInputs, setScenarioInputs] = useState({
    environmental: 85,
    social: 78,
    governance: 82,
  });

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      const response = await apiClient.get('/loans/');
      const loansData = response.data.loans || response.data || [];
      const loansArray = Array.isArray(loansData) ? loansData : [];
      setLoans(loansArray);
      if (loansArray.length > 0) {
        setSelectedLoanId(loansArray[0].id);
        loadPricingData(loansArray[0].id);
      }
    } catch (err: any) {
      setLoans([]);
      setError('Failed to load loans: ' + (err.response?.data?.detail || err.message));
    }
  };

  const loadPricingData = async (loanId: number) => {
    setLoading(true);
    setError(null);
    try {
      // Calculate current pricing
      const pricingResponse = await apiClient.post('/pricing/calculate', {
        loan_id: loanId,
      });
      setPricingData(pricingResponse.data);

      // Load pricing history
      const historyResponse = await apiClient.get(`/pricing/history/${loanId}?limit=10`);
      setHistory(historyResponse.data.history || []);

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const runScenarioSimulation = async () => {
    if (!selectedLoanId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/pricing/scenarios/${selectedLoanId}`);
      
      // Convert scenarios object to array format for display
      const scenariosArray = Object.entries(response.data.scenarios).map(([tier, data]: [string, any]) => ({
        scenario_name: tier.charAt(0).toUpperCase() + tier.slice(1),
        esg_performance_score: data.threshold,
        pricing_tier: tier,
        margin_adjustment_bps: data.margin_adjustment * 100,
        projected_rate: data.new_total_rate,
        annual_impact: data.annual_impact
      }));

      setScenarios(scenariosArray);
      setOpenScenarioDialog(false);
    } catch (err: any) {
      setError('Failed to run scenario simulation: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: { [key: string]: string } = {
      excellent: '#4caf50',
      good: '#8bc34a',
      fair: '#ffc107',
      poor: '#ff9800',
      critical: '#f44336',
    };
    return colors[tier] || '#9e9e9e';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const ESGRadarChart = () => {
    if (!pricingData) return null;

    const radarData = [
      { category: 'Environmental', score: scenarioInputs.environmental },
      { category: 'Social', score: scenarioInputs.social },
      { category: 'Governance', score: scenarioInputs.governance },
    ];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="category" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar 
            name="ESG Scores" 
            dataKey="score" 
            stroke="#2e7d32" 
            fill="#4caf50" 
            fillOpacity={0.6} 
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const PricingHistoryChart = () => {
    if (history.length === 0) return null;

    const chartData = history.map((item) => ({
      date: new Date(item.effective_date).toLocaleDateString(),
      rate: item.total_rate,
      esg_score: item.esg_performance_score,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'ESG Score', angle: 90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="rate" stroke="#1976d2" name="Interest Rate" />
          <Line yAxisId="right" type="monotone" dataKey="esg_score" stroke="#4caf50" name="ESG Score" />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const ScenarioComparisonChart = () => {
    if (scenarios.length === 0) return null;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={scenarios}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="scenario_name" />
          <YAxis label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="projected_rate" fill="#1976d2" name="Projected Rate" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dynamic Loan Pricing Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        ESG-based dynamic interest rate management with real-time pricing adjustments
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Loan Selector */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Loan
              </Typography>
              <Grid container spacing={2}>
                {loans.slice(0, 5).map((loan) => (
                  <Grid item key={loan.id}>
                    <Chip
                      label={loan.loan_number}
                      onClick={() => {
                        setSelectedLoanId(loan.id);
                        loadPricingData(loan.id);
                      }}
                      color={selectedLoanId === loan.id ? 'primary' : 'default'}
                      variant={selectedLoanId === loan.id ? 'filled' : 'outlined'}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Current Pricing Summary */}
        {pricingData && (
          <>
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', bgcolor: getTierColor(pricingData.pricing_tier) + '22' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Pricing Tier
                  </Typography>
                  <Typography variant="h4" sx={{ textTransform: 'capitalize' }}>
                    {pricingData.pricing_tier}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ESG Score: {pricingData.esg_performance_score?.toFixed(1) || 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Margin Adjustment
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h4">
                      {(pricingData.margin_adjustment_bps || 0) > 0 ? '+' : ''}
                      {pricingData.margin_adjustment_bps?.toFixed(1) || '0.0'}
                    </Typography>
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      bps
                    </Typography>
                    {(pricingData.margin_adjustment_bps || 0) > 0 ? (
                      <TrendingUp color="error" sx={{ ml: 1 }} />
                    ) : (
                      <TrendingDown color="success" sx={{ ml: 1 }} />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Current Rate
                  </Typography>
                  <Typography variant="h4">
                    {pricingData.new_rate?.toFixed(2) || '0.00'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Previous: {pricingData.current_rate?.toFixed(2) || '0.00'}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', bgcolor: (pricingData.annual_impact || 0) > 0 ? '#f4433622' : '#4caf5022' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Annual Impact
                  </Typography>
                  <Typography variant="h4" color={pricingData.annual_impact > 0 ? 'error' : 'success'}>
                    {formatCurrency(Math.abs(pricingData.annual_impact))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pricingData.annual_impact > 0 ? 'Additional Cost' : 'Savings'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* ESG Performance Radar */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ESG Performance Breakdown
              </Typography>
              <ESGRadarChart />
            </CardContent>
          </Card>
        </Grid>

        {/* Pricing History */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pricing History
              </Typography>
              <PricingHistoryChart />
            </CardContent>
          </Card>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item>
                  <Button
                    variant="contained"
                    startIcon={<Calculate />}
                    onClick={() => selectedLoanId && loadPricingData(selectedLoanId)}
                    disabled={loading || !selectedLoanId}
                  >
                    Recalculate Pricing
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<Timeline />}
                    onClick={() => setOpenScenarioDialog(true)}
                    disabled={loading || !selectedLoanId}
                  >
                    Run Scenarios
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Scenario Comparison */}
        {scenarios.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Scenario Comparison
                </Typography>
                <ScenarioComparisonChart />
                <TableContainer sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Scenario</TableCell>
                        <TableCell>ESG Score</TableCell>
                        <TableCell>Tier</TableCell>
                        <TableCell>Adjustment</TableCell>
                        <TableCell>Rate</TableCell>
                        <TableCell>Annual Impact</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scenarios.map((scenario, index) => (
                        <TableRow key={index}>
                          <TableCell>{scenario.scenario_name}</TableCell>
                          <TableCell>{scenario.esg_performance_score?.toFixed(1) || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={scenario.pricing_tier} 
                              size="small"
                              sx={{ bgcolor: getTierColor(scenario.pricing_tier), color: 'white' }}
                            />
                          </TableCell>
                          <TableCell>{scenario.margin_adjustment_bps || 0} bps</TableCell>
                          <TableCell>{scenario.projected_rate?.toFixed(2) || '0.00'}%</TableCell>
                          <TableCell>{formatCurrency(scenario.annual_impact || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Pricing History Table */}
        {history.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Historical Adjustments
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>ESG Score</TableCell>
                        <TableCell>Tier</TableCell>
                        <TableCell>Adjustment</TableCell>
                        <TableCell>Rate</TableCell>
                        <TableCell>Impact</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{new Date(item.effective_date).toLocaleDateString()}</TableCell>
                          <TableCell>{item.esg_performance_score?.toFixed(1) || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={item.adjustment_reason || 'N/A'} 
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{((item.adjustment_amount || 0) * 100)?.toFixed(0) || 0} bps</TableCell>
                          <TableCell>{item.total_rate?.toFixed(2) || '0.00'}%</TableCell>
                          <TableCell>{item.adjustment_reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Scenario Dialog */}
      <Dialog open={openScenarioDialog} onClose={() => setOpenScenarioDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Scenario Parameters</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Environmental Score"
              type="number"
              value={scenarioInputs.environmental}
              onChange={(e) => setScenarioInputs({ ...scenarioInputs, environmental: Number(e.target.value) })}
              inputProps={{ min: 0, max: 100 }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Social Score"
              type="number"
              value={scenarioInputs.social}
              onChange={(e) => setScenarioInputs({ ...scenarioInputs, social: Number(e.target.value) })}
              inputProps={{ min: 0, max: 100 }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Governance Score"
              type="number"
              value={scenarioInputs.governance}
              onChange={(e) => setScenarioInputs({ ...scenarioInputs, governance: Number(e.target.value) })}
              inputProps={{ min: 0, max: 100 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenScenarioDialog(false)}>Cancel</Button>
          <Button onClick={runScenarioSimulation} variant="contained" disabled={loading}>
            Run Simulation
          </Button>
        </DialogActions>
      </Dialog>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default PricingDashboard;

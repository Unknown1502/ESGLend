import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Divider,
  IconButton
} from '@mui/material';
import { ArrowBack, PlayArrow } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { loansAPI, esgKpisAPI, verificationsAPI } from '../../api/apiClient';

interface LoanDetail {
  id: number;
  loan_number: string;
  borrower: {
    id: number;
    name: string;
    industry: string;
    country: string;
    credit_rating: string;
  };
  loan_type: string;
  amount: number;
  currency: string;
  interest_rate: number;
  base_margin: number;
  current_margin: number;
  maturity_date: string;
  status: string;
  sustainability_linked: boolean;
}

interface ESGKpi {
  id: number;
  kpi_name: string;
  kpi_category: string;
  target_value: number;
  current_value: number;
  baseline_value: number;
  unit: string;
  status: string;
  measurements: Array<{
    id: number;
    measured_value: number;
    verified_value: number;
    measurement_date: string;
    verification_status: string;
  }>;
}

interface Verification {
  id: number;
  verification_type: string;
  verification_date: string;
  status: string;
  confidence_score: number;
  risk_level: string;
}

const LoanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [esgKpis, setEsgKpis] = useState<ESGKpi[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningVerification, setRunningVerification] = useState(false);

  useEffect(() => {
    if (id) {
      loadLoanData();
    }
  }, [id]);

  const loadLoanData = async () => {
    try {
      setLoading(true);
      const [loanRes, kpisRes, verificationsRes] = await Promise.all([
        loansAPI.getById(Number(id)),
        loansAPI.getKpis(Number(id)),
        loansAPI.getVerifications(Number(id))
      ]);
      
      setLoan(loanRes.data);
      setEsgKpis(kpisRes.data || []);
      setVerifications(verificationsRes.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load loan details');
    } finally {
      setLoading(false);
    }
  };

  const handleRunVerification = async () => {
    try {
      setRunningVerification(true);
      await verificationsAPI.runVerification(Number(id));
      await loadLoanData();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run verification');
    } finally {
      setRunningVerification(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'on_track': return 'success';
      case 'at_risk': return 'warning';
      case 'breached': return 'error';
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const calculateProgress = (current: number, baseline: number, target: number) => {
    const range = target - baseline;
    const progress = current - baseline;
    return range !== 0 ? Math.min(100, Math.max(0, (progress / range) * 100)) : 0;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !loan) {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate('/loans')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            Loan Details
          </Typography>
        </Box>
        <Alert severity="error">
          {error || 'Loan not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/loans')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          {loan.loan_number}
        </Typography>
        <Box flexGrow={1} />
        <Button
          variant="contained"
          startIcon={runningVerification ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
          onClick={handleRunVerification}
          disabled={runningVerification}
        >
          Run Verification
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Loan Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Borrower</Typography>
                <Typography variant="body1" fontWeight="medium">{loan.borrower?.name || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Industry</Typography>
                <Typography variant="body1">{loan.borrower?.industry || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Country</Typography>
                <Typography variant="body1">{loan.borrower?.country || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Credit Rating</Typography>
                <Typography variant="body1">{loan.borrower?.credit_rating || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Loan Type</Typography>
                <Typography variant="body1">{loan.loan_type}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Amount</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatCurrency(loan.amount, loan.currency)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Interest Rate</Typography>
                <Typography variant="body1">{loan.interest_rate.toFixed(2)}%</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Current Margin</Typography>
                <Typography variant="body1">{loan.current_margin.toFixed(2)}%</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Maturity Date</Typography>
                <Typography variant="body1">{formatDate(loan.maturity_date)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Status</Typography>
                <Chip label={loan.status} color={getStatusColor(loan.status)} size="small" />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              ESG KPIs Performance
            </Typography>
            <Divider sx={{ mb: 3 }} />
            {esgKpis.map((kpi) => (
              <Box key={kpi.id} mb={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {kpi.kpi_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {kpi.kpi_category}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body2">
                      {kpi.current_value.toFixed(1)} / {kpi.target_value.toFixed(1)} {kpi.unit}
                    </Typography>
                    <Chip 
                      label={kpi.status.replace('_', ' ')} 
                      color={getStatusColor(kpi.status)} 
                      size="small" 
                    />
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculateProgress(kpi.current_value, kpi.baseline_value, kpi.target_value)}
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: kpi.status === 'on_track' ? '#4caf50' : '#ff9800'
                    }
                  }}
                />
                <Box display="flex" justifyContent="space-between" mt={0.5}>
                  <Typography variant="caption" color="textSecondary">
                    Baseline: {kpi.baseline_value.toFixed(1)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Progress: {calculateProgress(kpi.current_value, kpi.baseline_value, kpi.target_value).toFixed(0)}%
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                ESG Performance Score
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="success.main">
                {esgKpis.length > 0 
                  ? (esgKpis.reduce((sum, kpi) => 
                      sum + calculateProgress(kpi.current_value, kpi.baseline_value, kpi.target_value), 0
                    ) / esgKpis.length).toFixed(0)
                  : 0}%
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Average across {esgKpis.length} KPIs
              </Typography>
            </CardContent>
          </Card>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Recent Verifications
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {verifications.slice(0, 5).map((verification) => (
              <Box key={verification.id} mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">
                    {formatDate(verification.verification_date)}
                  </Typography>
                  <Chip 
                    label={verification.risk_level} 
                    color={getStatusColor(verification.risk_level)} 
                    size="small" 
                  />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  Confidence: {verification.confidence_score.toFixed(1)}%
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              ESG Measurement History
            </Typography>
            <Divider sx={{ mb: 3 }} />
            {esgKpis.map((kpi) => {
              if (!kpi.measurements || kpi.measurements.length === 0) return null;
              
              const chartData = kpi.measurements
                .sort((a, b) => new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime())
                .map(m => ({
                  date: new Date(m.measurement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  measured: m.measured_value,
                  verified: m.verified_value,
                  target: kpi.target_value
                }));

              return (
                <Box key={kpi.id} mb={4}>
                  <Typography variant="body1" fontWeight="medium" gutterBottom>
                    {kpi.kpi_name}
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                      <YAxis style={{ fontSize: '12px' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="measured" stroke="#8884d8" name="Measured" />
                      <Line type="monotone" dataKey="verified" stroke="#82ca9d" name="Verified" />
                      <Line type="monotone" dataKey="target" stroke="#ff7300" strokeDasharray="5 5" name="Target" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              );
            })}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LoanDetail;

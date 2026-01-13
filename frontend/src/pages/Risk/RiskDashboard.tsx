import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Paper,
} from '@mui/material';
import { 
  Warning, 
  CheckCircle, 
  Error, 
  TrendingUp,
  Assessment,
  Security
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
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface RiskAssessment {
  loan_id: number;
  loan_number: string;
  assessment_date: string;
  risk_score: number;
  risk_category: string;
  risk_level: string;
  covenant_breach_probability: number;
  esg_risk_score: number;
  financial_risk_score: number;
  predicted_breach_date: string | null;
  confidence_score: number;
  recommendations: string[];
  risk_factors: any;
}

interface PortfolioDashboard {
  total_loans: number;
  risk_distribution: {
    low: number;
    moderate: number;
    elevated: number;
    high: number;
  };
  high_risk_loans: Array<{
    loan_id: number;
    loan_number: string;
    borrower: string;
    risk_score: number;
    risk_category: string;
    principal_amount: number;
  }>;
  alerts: Array<{
    alert_id: string;
    severity: string;
    loan_id: number;
    loan_number: string;
    message: string;
    action_required: string;
  }>;
}

const RiskDashboard: React.FC = () => {
  const [loans, setLoans] = useState<any[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [portfolioDashboard, setPortfolioDashboard] = useState<PortfolioDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLoans();
    loadPortfolioDashboard();
  }, []);

  const loadLoans = async () => {
    try {
      const response = await apiClient.get('/loans');
      const loansData = response.data.loans || response.data || [];
      const loansArray = Array.isArray(loansData) ? loansData : [];
      setLoans(loansArray);
      if (loansArray.length > 0) {
        setSelectedLoanId(loansArray[0].id);
        runRiskAssessment(loansArray[0].id);
      }
    } catch (err: any) {
      setLoans([]);
      setError('Failed to load loans');
    }
  };

  const loadPortfolioDashboard = async () => {
    try {
      const response = await apiClient.get('/risk/dashboard');
      setPortfolioDashboard(response.data);
    } catch (err: any) {
      console.error('Failed to load portfolio dashboard:', err);
    }
  };

  const runRiskAssessment = async (loanId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(`/risk/assess/${loanId}`);
      setAssessment(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run risk assessment');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (category: string) => {
    const colors: { [key: string]: string } = {
      low: '#4caf50',
      moderate: '#ffc107',
      elevated: '#ff9800',
      high: '#f44336',
    };
    return colors[category] || '#9e9e9e';
  };

  const getRiskIcon = (category: string) => {
    if (category === 'low') return <CheckCircle sx={{ color: '#4caf50' }} />;
    if (category === 'moderate') return <Warning sx={{ color: '#ffc107' }} />;
    if (category === 'elevated') return <Error sx={{ color: '#ff9800' }} />;
    if (category === 'high') return <Error sx={{ color: '#f44336' }} />;
    return <Warning />;
  };

  const PortfolioRiskDistributionChart = () => {
    if (!portfolioDashboard) return null;

    const data = Object.entries(portfolioDashboard.risk_distribution).map(([category, count]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      count,
      color: getRiskColor(category),
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const RiskBreakdownChart = () => {
    if (!assessment) return null;

    const data = [
      {
        component: 'Covenant Risk',
        score: assessment.covenant_breach_probability * 100,
        weight: 40,
      },
      {
        component: 'ESG Risk',
        score: assessment.esg_risk_score,
        weight: 30,
      },
      {
        component: 'Financial Risk',
        score: assessment.financial_risk_score,
        weight: 30,
      },
    ];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="component" />
          <YAxis label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="score" fill="#1976d2" name="Risk Score" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Predictive Risk Assessment Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        ML-based risk scoring with covenant breach prediction and early warning system
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Portfolio Overview */}
        {portfolioDashboard && (
          <>
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Loans
                  </Typography>
                  <Typography variant="h3">
                    {portfolioDashboard.total_loans}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', bgcolor: '#4caf5022' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Low Risk
                  </Typography>
                  <Typography variant="h3" color="success.main">
                    {portfolioDashboard.risk_distribution.low}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', bgcolor: '#ffc10722' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Moderate Risk
                  </Typography>
                  <Typography variant="h3" color="warning.main">
                    {portfolioDashboard.risk_distribution.moderate}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', bgcolor: '#f4433622' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    High Risk
                  </Typography>
                  <Typography variant="h3" color="error.main">
                    {portfolioDashboard.risk_distribution.elevated + portfolioDashboard.risk_distribution.high}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Portfolio Risk Distribution
                  </Typography>
                  <PortfolioRiskDistributionChart />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Active Risk Alerts
                  </Typography>
                  {portfolioDashboard.alerts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CheckCircle sx={{ fontSize: 48, color: '#4caf50', mb: 2 }} />
                      <Typography color="text.secondary">
                        No active risk alerts
                      </Typography>
                    </Box>
                  ) : (
                    portfolioDashboard.alerts.map((alert) => (
                      <Alert 
                        key={alert.alert_id} 
                        severity={alert.severity as any} 
                        sx={{ mb: 1 }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {alert.loan_number}: {alert.message}
                        </Typography>
                        <Typography variant="caption">
                          {alert.action_required}
                        </Typography>
                      </Alert>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Loan Selector */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Loan Risk Assessment
              </Typography>
              <Grid container spacing={2} alignItems="center">
                {loans.slice(0, 5).map((loan) => (
                  <Grid item key={loan.id}>
                    <Chip
                      label={loan.loan_number}
                      onClick={() => {
                        setSelectedLoanId(loan.id);
                        runRiskAssessment(loan.id);
                      }}
                      color={selectedLoanId === loan.id ? 'primary' : 'default'}
                      variant={selectedLoanId === loan.id ? 'filled' : 'outlined'}
                    />
                  </Grid>
                ))}
                <Grid item>
                  <Button
                    variant="contained"
                    startIcon={<Assessment />}
                    onClick={() => selectedLoanId && runRiskAssessment(selectedLoanId)}
                    disabled={loading || !selectedLoanId}
                  >
                    Run Assessment
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Assessment Results */}
        {assessment && (
          <>
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', bgcolor: getRiskColor(assessment.risk_category) + '22' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {getRiskIcon(assessment.risk_category)}
                    <Typography color="text.secondary" sx={{ ml: 1 }}>
                      Risk Category
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ textTransform: 'capitalize' }}>
                    {assessment.risk_category}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Score: {(assessment.risk_score || 0).toFixed(1)}/100
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={assessment.risk_score} 
                    sx={{ 
                      mt: 1,
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getRiskColor(assessment.risk_category)
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Breach Probability
                  </Typography>
                  <Typography variant="h4">
                    {((assessment.covenant_breach_probability || 0) * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    30-day outlook
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={assessment.covenant_breach_probability * 100} 
                    color={assessment.covenant_breach_probability > 0.5 ? 'error' : 'warning'}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Predicted Breach Date
                  </Typography>
                  <Typography variant="h6">
                    {assessment.predicted_breach_date 
                      ? new Date(assessment.predicted_breach_date).toLocaleDateString()
                      : 'No breach predicted'
                    }
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {assessment.predicted_breach_date && (
                      `${Math.ceil((new Date(assessment.predicted_breach_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days away`
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Model Confidence
                  </Typography>
                  <Typography variant="h4">
                    {((assessment.confidence_score || 0) * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Prediction accuracy
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={assessment.confidence_score * 100} 
                    color="primary"
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Risk Breakdown Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Risk Component Breakdown
                  </Typography>
                  <RiskBreakdownChart />
                </CardContent>
              </Card>
            </Grid>

            {/* Risk Scores */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Detailed Risk Scores
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Covenant Risk (40% weight)</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {((assessment.covenant_breach_probability || 0) * 100).toFixed(1)}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={assessment.covenant_breach_probability * 100}
                        sx={{ height: 10, borderRadius: 4 }}
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">ESG Risk (30% weight)</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {(assessment.esg_risk_score || 0).toFixed(1)}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={assessment.esg_risk_score}
                        color="success"
                        sx={{ height: 10, borderRadius: 4 }}
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Financial Risk (30% weight)</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {(assessment.financial_risk_score || 0).toFixed(1)}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={assessment.financial_risk_score}
                        color="warning"
                        sx={{ height: 10, borderRadius: 4 }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Recommendations */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Risk Mitigation Recommendations
                  </Typography>
                  <Grid container spacing={2}>
                    {assessment.recommendations.map((rec, index) => (
                      <Grid item xs={12} md={6} key={index}>
                        <Alert severity="info" icon={<Security />}>
                          {rec}
                        </Alert>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* High Risk Loans Table */}
        {portfolioDashboard && portfolioDashboard.high_risk_loans.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  High Risk Loans Requiring Attention
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Loan Number</TableCell>
                        <TableCell>Borrower</TableCell>
                        <TableCell>Principal Amount</TableCell>
                        <TableCell>Risk Score</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {portfolioDashboard.high_risk_loans.map((loan) => (
                        <TableRow key={loan.loan_id}>
                          <TableCell>{loan.loan_number}</TableCell>
                          <TableCell>{loan.borrower}</TableCell>
                          <TableCell>{formatCurrency(loan.principal_amount)}</TableCell>
                          <TableCell>{(loan.risk_score || 0).toFixed(1)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={loan.risk_category}
                              size="small"
                              sx={{ 
                                bgcolor: getRiskColor(loan.risk_category),
                                color: 'white'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setSelectedLoanId(loan.loan_id);
                                runRiskAssessment(loan.loan_id);
                              }}
                            >
                              Assess
                            </Button>
                          </TableCell>
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

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default RiskDashboard;

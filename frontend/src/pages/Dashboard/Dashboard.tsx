import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dashboardAPI } from '../../api/apiClient';
import { DashboardStats, LoanPerformance, ESGTrend, Alert as AlertType } from '../../types';
import { useSelector } from 'react-redux';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: any) => state.auth.user);
  const isAdmin = user?.role === 'admin';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loanPerformance, setLoanPerformance] = useState<LoanPerformance[]>([]);
  const [esgTrends, setEsgTrends] = useState<ESGTrend[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, performanceRes, trendsRes, alertsRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getLoanPerformance(10),
        dashboardAPI.getESGTrends(30),
        dashboardAPI.getAlerts(),
      ]);

      setStats(statsRes.data as DashboardStats);
      setLoanPerformance(performanceRes.data as LoanPerformance[]);
      setEsgTrends(trendsRes.data as ESGTrend[]);
      
      // Handle alerts response (could be array or object with alerts property)
      const alertsData = alertsRes.data;
      if (Array.isArray(alertsData)) {
        setAlerts(alertsData);
      } else if (alertsData && 'alerts' in alertsData) {
        setAlerts(alertsData.alerts);
      } else {
        setAlerts([]);
      }
    } catch (error: unknown) {
      console.error('Failed to load dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setError(errorMessage);
      // Set empty defaults to prevent crashes
      setStats(null);
      setLoanPerformance([]);
      setEsgTrends([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      default:
        return 'default';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
        return 'success';
      case 'at_risk':
        return 'warning';
      case 'breached':
        return 'error';
      default:
        return 'default';
    }
  };

  const complianceData = [
    { name: 'Compliant', value: stats?.compliance_rate || 0, color: '#4CAF50' },
    { name: 'At Risk', value: 100 - (stats?.compliance_rate || 0), color: '#FFA726' },
  ];

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Loading dashboard data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="warning">
          <AlertTitle>No Data Available</AlertTitle>
          Dashboard data could not be loaded. Please try refreshing the page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          ESG Verification Dashboard
        </Typography>
        <Chip 
          label={isAdmin ? 'ADMIN ACCESS' : 'VIEWER ACCESS'}
          color={isAdmin ? 'success' : 'info'}
          sx={{ fontWeight: 'bold' }}
        />
      </Box>

      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Viewer Mode</AlertTitle>
          You have read-only access. Contact an administrator for full access to Reports and Data Sources.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Active Loans
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="primary">
                {stats?.total_loans || 0}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp color="success" fontSize="small" />
                <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                  All verified
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Portfolio Value
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="primary">
                {formatCurrency(stats?.total_loan_value || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Under ESG monitoring
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Compliance Rate
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="success.main">
                {stats?.compliance_rate || 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats?.compliance_rate || 0}
                sx={{ mt: 1, height: 8, borderRadius: 5 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Average ESG Score
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="primary">
                {stats?.average_esg_score?.toFixed(1) || 0}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <CheckCircle color="success" fontSize="small" />
                <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                  Above target
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {alerts.length > 0 && (
          <Grid item xs={12}>
            <Alert
              severity={alerts[0].severity === 'high' ? 'error' : 'warning'}
              icon={<Warning />}
            >
              <AlertTitle>Active Alerts ({alerts.length})</AlertTitle>
              {alerts.slice(0, 3).map((alert, index) => (
                <Typography key={index} variant="body2">
                  {alert.message}
                </Typography>
              ))}
            </Alert>
          </Grid>
        )}

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                ESG Performance Trends (Last 30 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={esgTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      try {
                        return new Date(value).toLocaleDateString();
                      } catch {
                        return value;
                      }
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => {
                      try {
                        return new Date(value).toLocaleDateString();
                      } catch {
                        return value;
                      }
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#2E7D32"
                    fill="#4CAF50"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Compliance Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={complianceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {complianceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {stats?.compliance_rate || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overall Compliance
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Loan Performance Overview
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Loan Number</strong></TableCell>
                      <TableCell><strong>Borrower</strong></TableCell>
                      <TableCell align="right"><strong>ESG Score</strong></TableCell>
                      <TableCell><strong>Compliance Status</strong></TableCell>
                      <TableCell><strong>Risk Level</strong></TableCell>
                      <TableCell><strong>Next Reporting</strong></TableCell>
                      <TableCell><strong>Action</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(loanPerformance || []).map((loan) => (
                      <TableRow
                        key={loan.loan_id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/loans/${loan.loan_id}`)}
                      >
                        <TableCell>{loan.loan_number || 'N/A'}</TableCell>
                        <TableCell>{loan.borrower_name || 'N/A'}</TableCell>
                        <TableCell align="right">
                          <Typography
                            fontWeight="bold"
                            color={(loan.esg_score || 0) >= 80 ? 'success.main' : 'warning.main'}
                          >
                            {(loan.esg_score || 0).toFixed(1)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={loan.compliance_status || 'Unknown'}
                            color={getComplianceColor(loan.compliance_status || 'unknown')}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={loan.risk_level || 'Unknown'}
                            color={getRiskColor(loan.risk_level || 'unknown')}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {loan.next_reporting_date
                            ? new Date(loan.next_reporting_date).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label="View Details"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

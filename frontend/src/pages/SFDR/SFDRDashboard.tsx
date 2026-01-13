import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Menu,
  MenuItem,
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
  Assessment as AssessmentIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface Loan {
  id: number;
  loan_number: string;
  borrower_name: string;
}

interface PAIIndicator {
  indicator_id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'improving' | 'stable' | 'declining';
  status: 'good' | 'moderate' | 'poor';
  target?: number;
  category: 'climate' | 'environmental' | 'social' | 'governance';
}

interface TaxonomyObjective {
  name: string;
  aligned: boolean;
  substantial_contribution: boolean;
  dnsh_compliant: boolean;
  minimum_safeguards: boolean;
  alignment_percentage: number;
  notes: string;
}

interface SFDRClassification {
  classification: string;
  description: string;
  sustainability_linked: boolean;
  criteria_met: string[];
  criteria_not_met: string[];
}

interface ComplianceHistory {
  date: string;
  compliance_score: number;
  pai_score: number;
  taxonomy_alignment: number;
  period: string;
}

const SFDRDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Loan selection
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  
  // Data states
  const [paiIndicators, setPaiIndicators] = useState<PAIIndicator[]>([]);
  const [taxonomyData, setTaxonomyData] = useState<Record<string, TaxonomyObjective>>({});
  const [classification, setClassification] = useState<SFDRClassification | null>(null);
  const [complianceHistory, setComplianceHistory] = useState<ComplianceHistory[]>([]);
  const [dnshAssessment, setDnshAssessment] = useState<any>(null);
  
  // Download dialog
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'json'>('pdf');
  const [downloadPeriod, setDownloadPeriod] = useState('2024-Q4');

  // API client
  const apiClient = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`
    }
  });

  useEffect(() => {
    loadLoans();
  }, []);

  useEffect(() => {
    if (selectedLoan) {
      loadAllData();
    }
  }, [selectedLoan]);

  const loadLoans = async () => {
    try {
      const response = await apiClient.get('/api/v1/loans');
      setLoans(response.data.loans || []);
      if (response.data.loans && response.data.loans.length > 0) {
        setSelectedLoan(response.data.loans[0]);
      }
    } catch (err: any) {
      console.error('Failed to load loans:', err);
    }
  };

  const loadAllData = async () => {
    if (!selectedLoan) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadPAIIndicators(),
        loadTaxonomyAlignment(),
        loadClassification(),
        loadComplianceHistory(),
        loadDNSHAssessment()
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load SFDR data');
    } finally {
      setLoading(false);
    }
  };

  const loadPAIIndicators = async () => {
    if (!selectedLoan) return;
    
    try {
      const response = await apiClient.get(`/api/v1/sfdr/pai-indicators/${selectedLoan.id}`);
      const indicators = response.data.pai_indicators;
      
      // Transform API data to component format
      const transformedIndicators: PAIIndicator[] = Object.entries(indicators).map(([key, value]: [string, any]) => ({
        indicator_id: key,
        name: value.name,
        value: value.value,
        unit: value.unit,
        trend: value.value < 70 ? 'improving' : value.value > 85 ? 'declining' : 'stable',
        status: value.value >= 80 ? 'good' : value.value >= 60 ? 'moderate' : 'poor',
        target: value.target,
        category: getCategoryFromIndicatorName(value.name)
      }));
      
      setPaiIndicators(transformedIndicators);
    } catch (err: any) {
      console.error('Failed to load PAI indicators:', err);
      throw err;
    }
  };

  const getCategoryFromIndicatorName = (name: string): 'climate' | 'environmental' | 'social' | 'governance' => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('ghg') || lowerName.includes('carbon') || lowerName.includes('emission')) {
      return 'climate';
    } else if (lowerName.includes('water') || lowerName.includes('waste') || lowerName.includes('biodiversity')) {
      return 'environmental';
    } else if (lowerName.includes('gender') || lowerName.includes('human rights') || lowerName.includes('social')) {
      return 'social';
    }
    return 'governance';
  };

  const loadTaxonomyAlignment = async () => {
    if (!selectedLoan) return;
    
    try {
      const response = await apiClient.get(`/api/v1/sfdr/taxonomy-alignment/${selectedLoan.id}`);
      setTaxonomyData(response.data.taxonomy_alignment);
    } catch (err: any) {
      console.error('Failed to load taxonomy alignment:', err);
      throw err;
    }
  };

  const loadClassification = async () => {
    if (!selectedLoan) return;
    
    try {
      const response = await apiClient.get(`/api/v1/sfdr/classification/${selectedLoan.id}`);
      setClassification({
        classification: response.data.sfdr_classification,
        description: response.data.classification_description,
        sustainability_linked: response.data.sustainability_linked,
        criteria_met: ['ESG KPIs tracked', 'Regular monitoring', 'Transparent reporting'],
        criteria_not_met: []
      });
    } catch (err: any) {
      console.error('Failed to load classification:', err);
      throw err;
    }
  };

  const loadComplianceHistory = async () => {
    if (!selectedLoan) return;
    
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/v1/sfdr/compliance-history/${selectedLoan.id}`);
      
      // Transform API response to match our ComplianceHistory interface
      const history: ComplianceHistory[] = response.data.history.map((item: any) => ({
        date: item.date,
        compliance_score: item.compliance_score,
        pai_score: item.pai_score,
        taxonomy_alignment: item.taxonomy_alignment,
        period: item.period
      }));
      
      setComplianceHistory(history);
    } catch (err: any) {
      console.error('Error loading compliance history:', err);
      setError(err.response?.data?.detail || 'Failed to load compliance history');
      // Fallback to empty array on error
      setComplianceHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDNSHAssessment = async () => {
    if (!selectedLoan) return;
    
    try {
      const response = await apiClient.get(`/api/v1/sfdr/dnsh-assessment/${selectedLoan.id}`);
      setDnshAssessment(response.data.dnsh_assessment);
    } catch (err: any) {
      console.error('Failed to load DNSH assessment:', err);
      throw err;
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedLoan) return;
    
    setLoading(true);
    try {
      const response = await apiClient.post(`/api/v1/sfdr/generate/${selectedLoan.id}`, null, {
        params: { period: downloadPeriod },
        responseType: downloadFormat === 'pdf' ? 'blob' : 'json'
      });
      
      if (downloadFormat === 'pdf') {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SFDR_Report_${selectedLoan.loan_number}_${downloadPeriod}.pdf`;
        link.click();
      } else {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SFDR_Report_${selectedLoan.loan_number}_${downloadPeriod}.json`;
        link.click();
      }
      
      setDownloadDialogOpen(false);
    } catch (err: any) {
      setError('Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'poor':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircleIcon />;
      case 'moderate':
        return <WarningIcon />;
      case 'poor':
        return <CancelIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'improving' ? <TrendingUpIcon color="success" /> : 
           trend === 'declining' ? <TrendingDownIcon color="error" /> : 
           <InfoIcon color="action" />;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            SFDR Compliance Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sustainable Finance Disclosure Regulation (EU 2019/2088) Reporting
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Autocomplete
            value={selectedLoan}
            onChange={(event, newValue) => setSelectedLoan(newValue)}
            options={loans}
            getOptionLabel={(option) => `${option.loan_number} - ${option.borrower_name}`}
            sx={{ width: 300 }}
            renderInput={(params) => <TextField {...params} label="Select Loan" size="small" />}
          />
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => setDownloadDialogOpen(true)}
            disabled={!selectedLoan}
          >
            Download Report
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && !selectedLoan && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {selectedLoan && (
        <>
          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="PAI Indicators" />
              <Tab label="EU Taxonomy" />
              <Tab label="SFDR Classification" />
              <Tab label="Compliance Timeline" />
              <Tab label="Reports & Downloads" />
            </Tabs>
          </Paper>

          {/* Tab 1: PAI Indicators */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              {/* Summary Cards */}
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Total Indicators
                    </Typography>
                    <Typography variant="h4">{paiIndicators.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      18 PAI Metrics Tracked
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Good Status
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {paiIndicators.filter(i => i.status === 'good').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Meeting Targets
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Improving Trends
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      {paiIndicators.filter(i => i.trend === 'improving').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Positive Trajectory
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Requires Attention
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {paiIndicators.filter(i => i.status === 'poor' || i.status === 'moderate').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Below Target
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* PAI Indicators Grid */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Principal Adverse Impact Indicators
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Indicator</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Value</TableCell>
                          <TableCell align="right">Target</TableCell>
                          <TableCell align="center">Trend</TableCell>
                          <TableCell align="center">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paiIndicators.map((indicator) => (
                          <TableRow key={indicator.indicator_id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {indicator.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={indicator.category} 
                                size="small" 
                                color={indicator.category === 'climate' ? 'primary' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {(indicator.value || 0).toFixed(2)} {indicator.unit}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="text.secondary">
                                {indicator.target ? `${indicator.target} ${indicator.unit}` : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {getTrendIcon(indicator.trend)}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                icon={getStatusIcon(indicator.status)}
                                label={indicator.status.toUpperCase()}
                                color={getStatusColor(indicator.status) as any}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* PAI Radar Chart */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    PAI Performance by Category
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={[
                      { category: 'Climate', score: paiIndicators.filter(i => i.category === 'climate').reduce((sum, i) => sum + i.value, 0) / paiIndicators.filter(i => i.category === 'climate').length || 0 },
                      { category: 'Environmental', score: paiIndicators.filter(i => i.category === 'environmental').reduce((sum, i) => sum + i.value, 0) / paiIndicators.filter(i => i.category === 'environmental').length || 0 },
                      { category: 'Social', score: paiIndicators.filter(i => i.category === 'social').reduce((sum, i) => sum + i.value, 0) / paiIndicators.filter(i => i.category === 'social').length || 0 },
                      { category: 'Governance', score: paiIndicators.filter(i => i.category === 'governance').reduce((sum, i) => sum + i.value, 0) / paiIndicators.filter(i => i.category === 'governance').length || 0 }
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar name="PAI Score" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Status Distribution */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Status Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { status: 'Good', count: paiIndicators.filter(i => i.status === 'good').length },
                      { status: 'Moderate', count: paiIndicators.filter(i => i.status === 'moderate').length },
                      { status: 'Poor', count: paiIndicators.filter(i => i.status === 'poor').length }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 2: EU Taxonomy */}
          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              {/* Taxonomy Overview */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      EU Taxonomy Alignment Assessment
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Assessment against the six environmental objectives defined in Regulation (EU) 2020/852
                    </Typography>
                    
                    {Object.entries(taxonomyData).map(([key, objective]) => (
                      <Box key={key} sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {objective.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {objective.aligned && (
                              <Chip icon={<CheckCircleIcon />} label="Aligned" color="success" size="small" />
                            )}
                            {!objective.aligned && (
                              <Chip icon={<CancelIcon />} label="Not Aligned" color="error" size="small" />
                            )}
                          </Box>
                        </Box>
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={objective.alignment_percentage} 
                          sx={{ height: 8, borderRadius: 1, mb: 1 }}
                          color={objective.alignment_percentage >= 75 ? 'success' : objective.alignment_percentage >= 50 ? 'warning' : 'error'}
                        />
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {objective.substantial_contribution ? (
                                <CheckCircleIcon color="success" fontSize="small" />
                              ) : (
                                <CancelIcon color="error" fontSize="small" />
                              )}
                              <Typography variant="body2">
                                Substantial Contribution
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {objective.dnsh_compliant ? (
                                <CheckCircleIcon color="success" fontSize="small" />
                              ) : (
                                <CancelIcon color="error" fontSize="small" />
                              )}
                              <Typography variant="body2">
                                DNSH Compliant
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {objective.minimum_safeguards ? (
                                <CheckCircleIcon color="success" fontSize="small" />
                              ) : (
                                <CancelIcon color="error" fontSize="small" />
                              )}
                              <Typography variant="body2">
                                Minimum Safeguards
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                        
                        {objective.notes && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {objective.notes}
                          </Typography>
                        )}
                        
                        <Divider sx={{ mt: 2 }} />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              {/* DNSH Assessment */}
              {dnshAssessment && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Do No Significant Harm (DNSH) Assessment
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Alert 
                          severity={dnshAssessment.overall_compliant ? 'success' : 'warning'}
                          icon={dnshAssessment.overall_compliant ? <CheckCircleIcon /> : <WarningIcon />}
                        >
                          <Typography variant="body2">
                            {dnshAssessment.overall_compliant 
                              ? 'Loan activities meet DNSH criteria across all environmental objectives'
                              : 'Some loan activities may cause significant harm to environmental objectives'}
                          </Typography>
                        </Alert>
                      </Grid>
                      
                      {Object.entries(dnshAssessment.objectives || {}).map(([key, value]: [string, any]) => (
                        <Grid item xs={12} md={6} key={key}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  {value.objective_name}
                                </Typography>
                                {value.compliant ? (
                                  <CheckCircleIcon color="success" fontSize="small" />
                                ) : (
                                  <WarningIcon color="warning" fontSize="small" />
                                )}
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {value.assessment}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </TabPanel>

          {/* Tab 3: SFDR Classification */}
          <TabPanel value={activeTab} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      SFDR Article Classification
                    </Typography>
                    {classification && (
                      <>
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                          <Chip 
                            label={classification.classification}
                            color="primary"
                            sx={{ fontSize: '1.5rem', height: 60, px: 3 }}
                          />
                        </Box>
                        <Typography variant="body1" paragraph>
                          {classification.description}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Sustainability Linked: {classification.sustainability_linked ? 'Yes' : 'No'}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Classification Criteria
                    </Typography>
                    {classification && (
                      <>
                        <Typography variant="subtitle2" color="success.main" gutterBottom>
                          Criteria Met:
                        </Typography>
                        <List dense>
                          {classification.criteria_met.map((criteria, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <CheckCircleIcon color="success" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={criteria} />
                            </ListItem>
                          ))}
                        </List>

                        {classification.criteria_not_met.length > 0 && (
                          <>
                            <Typography variant="subtitle2" color="error.main" gutterBottom sx={{ mt: 2 }}>
                              Criteria Not Met:
                            </Typography>
                            <List dense>
                              {classification.criteria_not_met.map((criteria, index) => (
                                <ListItem key={index}>
                                  <ListItemIcon>
                                    <CancelIcon color="error" fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText primary={criteria} />
                                </ListItem>
                              ))}
                            </List>
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Article Descriptions */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    SFDR Article Overview
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                            Article 6
                          </Typography>
                          <Typography variant="body2">
                            Products that do not promote environmental or social characteristics and do not have sustainable investment as their objective.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold" color="success.main" gutterBottom>
                            Article 8
                          </Typography>
                          <Typography variant="body2">
                            Products that promote environmental or social characteristics, provided that the companies invested in follow good governance practices.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold" color="secondary.main" gutterBottom>
                            Article 9
                          </Typography>
                          <Typography variant="body2">
                            Products that have sustainable investment as their objective and an index has been designated as a reference benchmark.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 4: Compliance Timeline */}
          <TabPanel value={activeTab} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Compliance Score Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={complianceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="compliance_score" stroke="#8884d8" name="Overall Compliance" strokeWidth={2} />
                      <Line type="monotone" dataKey="pai_score" stroke="#82ca9d" name="PAI Score" strokeWidth={2} />
                      <Line type="monotone" dataKey="taxonomy_alignment" stroke="#ffc658" name="Taxonomy Alignment" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    PAI Improvement Trajectory
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={complianceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="pai_score" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} name="PAI Score" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 5: Reports & Downloads */}
          <TabPanel value={activeTab} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Generate SFDR Report
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Download comprehensive SFDR compliance reports in PDF or JSON format
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={() => setDownloadDialogOpen(true)}
                      size="large"
                    >
                      Generate New Report
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<AssessmentIcon />}
                      size="large"
                    >
                      View Report History
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              {/* Report Templates */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Available Report Templates
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          SFDR Level 2 Disclosure
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Complete regulatory disclosure including PAI indicators, taxonomy alignment, and DNSH assessment
                        </Typography>
                        <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                          Download Template
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          Principal Adverse Impacts Report
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Detailed PAI statement with all 18 mandatory indicators and supporting documentation
                        </Typography>
                        <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                          Download Template
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          EU Taxonomy Report
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Taxonomy alignment analysis with detailed objective-by-objective assessment
                        </Typography>
                        <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                          Download Template
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          Article Classification Report
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          SFDR Article 6/8/9 classification with detailed justification and criteria assessment
                        </Typography>
                        <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                          Download Template
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </TabPanel>
        </>
      )}

      {/* Download Dialog */}
      <Dialog open={downloadDialogOpen} onClose={() => setDownloadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate SFDR Report</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Reporting Period"
              value={downloadPeriod}
              onChange={(e) => setDownloadPeriod(e.target.value)}
              fullWidth
              helperText="Format: YYYY-QN or YYYY (e.g., 2024-Q4 or 2024)"
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Report Format
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant={downloadFormat === 'pdf' ? 'contained' : 'outlined'}
                  onClick={() => setDownloadFormat('pdf')}
                  fullWidth
                >
                  PDF
                </Button>
                <Button
                  variant={downloadFormat === 'json' ? 'contained' : 'outlined'}
                  onClick={() => setDownloadFormat('json')}
                  fullWidth
                >
                  JSON
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDownloadReport} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SFDRDashboard;

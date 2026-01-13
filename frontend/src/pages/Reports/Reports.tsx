import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Download, 
  Description, 
  Add,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  AccountBalance as AccountBalanceIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { reportsAPI, loansAPI } from '../../api/apiClient';
import { 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import jsPDF from 'jspdf';
import axios from 'axios';

interface Report {
  id: number;
  loan_id: number;
  loan: {
    loan_number: string;
    borrower: {
      name: string;
    };
  };
  report_type: string;
  generated_date: string;
  report_period_start: string;
  report_period_end: string;
  status: string;
  file_url: string;
}

interface Loan {
  id: number;
  loan_number: string;
  borrower: {
    name: string;
  };
}

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

interface PortfolioAnalytics {
  total_loans: number;
  total_value: number;
  avg_esg_score: number;
  risk_distribution: { category: string; count: number }[];
  sector_breakdown: { sector: string; value: number }[];
  sustainability_linked_percentage: number;
}

interface ExecutiveSummary {
  key_metrics: {
    total_portfolio_value: number;
    avg_pricing_margin: number;
    avg_risk_score: number;
    sfdr_compliance_rate: number;
  };
  highlights: string[];
  risks: string[];
  recommendations: string[];
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Enhanced data states
  const [portfolioAnalytics, setPortfolioAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  
  const [formData, setFormData] = useState({
    loan_id: '',
    report_type: 'esg_performance',
    period_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsRes, loansRes] = await Promise.all([
        reportsAPI.getAll(),
        loansAPI.getAll()
      ]);
      const reportsData = reportsRes.data.reports || reportsRes.data || [];
      const loansData = loansRes.data.loans || loansRes.data || [];
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setLoans(Array.isArray(loansData) ? loansData : []);
      setError(null);
    } catch (err: any) {
      setReports([]);
      setLoans([]);
      setError(err.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      await reportsAPI.generate({
        loan_id: Number(formData.loan_id),
        report_type: formData.report_type,
        report_period_start: formData.period_start,
        report_period_end: formData.period_end
      });
      await loadData();
      setGenerateDialogOpen(false);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      // Fetch full report data
      const response = await reportsAPI.getById(report.id);
      const reportData = response.data;
      
      // Create PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;
      
      // Header - Green background
      pdf.setFillColor(27, 94, 32);
      pdf.rect(0, 0, pageWidth, 30, 'F');
      
      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ESG PERFORMANCE REPORT', pageWidth / 2, 15, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text('Sustainability-Linked Loan Verification Platform', pageWidth / 2, 22, { align: 'center' });
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      yPos = 45;
      
      // Report Information Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Report Information', 15, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const infoLines = [
        `Report ID: ${reportData.id}`,
        `Loan Number: ${reportData.loan?.loan_number || 'N/A'}`,
        `Borrower: ${reportData.loan?.borrower?.name || 'N/A'}`,
        `Report Type: ${getReportTypeLabel(reportData.report_type)}`,
        `Generated: ${formatDate(reportData.generated_date)}`,
        `Period: ${formatDate(reportData.report_period_start)} - ${formatDate(reportData.report_period_end)}`,
        `Status: ${reportData.status.toUpperCase()}`
      ];
      
      infoLines.forEach(line => {
        pdf.text(line, 15, yPos);
        yPos += 6;
      });
      
      yPos += 10;
      
      // Report Data Section
      if (reportData.report_data) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ESG Metrics & Analysis', 15, yPos);
        yPos += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        // Format report data
        const dataStr = JSON.stringify(reportData.report_data, null, 2);
        const lines = dataStr.split('\n');
        
        lines.forEach(line => {
          if (yPos > pageHeight - 20) {
            pdf.addPage();
            yPos = 20;
          }
          
          const trimmedLine = line.substring(0, 85); // Limit line length
          pdf.text(trimmedLine, 15, yPos);
          yPos += 5;
        });
      }
      
      // Footer
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Generated by ESGLend Platform | © ${new Date().getFullYear()} LMA EDGE`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      }
      
      // Save PDF
      const fileName = `ESG_Report_${reportData.loan?.loan_number}_${formatDate(reportData.generated_date).replace(/[\s,]/g, '_')}.pdf`;
      pdf.save(fileName);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to download report');
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedReports = reports.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'esg_performance': 'ESG Performance',
      'sfdr_level2': 'SFDR Level 2',
      'eu_taxonomy': 'EU Taxonomy',
      'covenant_compliance': 'Covenant Compliance',
      'verification_summary': 'Verification Summary'
    };
    return labels[type] || type;
  };

  const reportTypes = [
    { value: 'esg_performance', label: 'ESG Performance Report' },
    { value: 'sfdr_level2', label: 'SFDR Level 2 Compliance' },
    { value: 'eu_taxonomy', label: 'EU Taxonomy Alignment' },
    { value: 'covenant_compliance', label: 'Covenant Compliance Report' },
    { value: 'verification_summary', label: 'Verification Summary' }
  ];

  const totalReports = reports.length;
  const completedReports = reports.filter(r => r.status === 'completed').length;
  const recentReports = reports.filter(r => {
    const date = new Date(r.generated_date);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return date >= thirtyDaysAgo;
  }).length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          ESG Reports
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setGenerateDialogOpen(true)}
        >
          Generate Report
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Reports
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {totalReports}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed Reports
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {completedReports}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Last 30 Days
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {recentReports}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Generated</strong></TableCell>
                <TableCell><strong>Loan</strong></TableCell>
                <TableCell><strong>Borrower</strong></TableCell>
                <TableCell><strong>Report Type</strong></TableCell>
                <TableCell><strong>Period</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="textSecondary">
                      No reports generated yet
                    </Typography>
                    <Button 
                      variant="outlined" 
                      sx={{ mt: 2 }}
                      onClick={() => setGenerateDialogOpen(true)}
                    >
                      Generate Your First Report
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReports.map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(report.generated_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {report.loan?.loan_number || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {report.loan?.borrower?.name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getReportTypeLabel(report.report_type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(report.report_period_start)} - {formatDate(report.report_period_end)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={report.status}
                        color={getStatusColor(report.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {report.status === 'completed' && (
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleDownload(report)}
                        >
                          <Download />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={reports.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Dialog 
        open={generateDialogOpen} 
        onClose={() => setGenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Generate ESG Report
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Select Loan"
                  value={formData.loan_id}
                  onChange={(e) => setFormData({ ...formData, loan_id: e.target.value })}
                  required
                >
                  {loans.map((loan) => (
                    <MenuItem key={loan.id} value={loan.id}>
                      {loan.loan_number} - {loan.borrower.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Report Type"
                  value={formData.report_type}
                  onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                  required
                >
                  {reportTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Period Start"
                  value={formData.period_start}
                  onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Period End"
                  value={formData.period_end}
                  onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerateReport}
            variant="contained"
            disabled={generating || !formData.loan_id}
          >
            {generating ? <CircularProgress size={24} color="inherit" /> : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;

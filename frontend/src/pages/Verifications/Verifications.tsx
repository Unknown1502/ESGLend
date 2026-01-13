import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  Autocomplete
} from '@mui/material';
import { CheckCircle, Warning, Error as ErrorIcon, PlayArrow } from '@mui/icons-material';
import { verificationsAPI, loansAPI } from '../../api/apiClient';

interface Verification {
  id: number;
  loan_id: number;
  loan: {
    loan_number: string;
    borrower: {
      name: string;
    };
  };
  verification_type: string;
  verification_date: string;
  status: string;
  confidence_score: number;
  risk_level: string;
  data_sources: any;
  findings: any;
  recommendations: string;
}

const Verifications: React.FC = () => {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [loans, setLoans] = useState<any[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadVerifications();
    loadLoans();
  }, []);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      const response = await verificationsAPI.getAll();
      setVerifications(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  const loadLoans = async () => {
    try {
      const response = await loansAPI.getAll();
      const loansData = response.data.loans || response.data || [];
      setLoans(Array.isArray(loansData) ? loansData : []);
    } catch (err: any) {
      console.error('Failed to load loans:', err);
      setLoans([]);
    }
  };

  const handleRunVerification = async () => {
    if (!selectedLoan) return;
    
    setRunning(true);
    try {
      await verificationsAPI.runVerification(selectedLoan.id);
      setRunDialogOpen(false);
      setSelectedLoan(null);
      loadVerifications(); // Reload to show the new verification
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run verification');
    } finally {
      setRunning(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (verification: Verification) => {
    setSelectedVerification(verification);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedVerification(null);
  };

  const paginatedVerifications = verifications.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'medium': return <Warning sx={{ color: '#ff9800' }} />;
      case 'high': return <ErrorIcon sx={{ color: '#f44336' }} />;
      default: return null;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const totalVerifications = verifications.length;
  const avgConfidence = verifications.length > 0
    ? verifications.reduce((sum, v) => sum + v.confidence_score, 0) / verifications.length
    : 0;
  const lowRiskCount = verifications.filter(v => v.risk_level === 'low').length;

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
          ESG Verifications
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlayArrow />}
          onClick={() => setRunDialogOpen(true)}
        >
          Run Verification
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
                Total Verifications
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {totalVerifications}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Confidence
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {avgConfidence.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Low Risk Loans
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {lowRiskCount}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {totalVerifications > 0 ? ((lowRiskCount / totalVerifications) * 100).toFixed(0) : 0}% of total
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
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Loan</strong></TableCell>
                <TableCell><strong>Borrower</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell align="center"><strong>Confidence</strong></TableCell>
                <TableCell align="center"><strong>Risk Level</strong></TableCell>
                <TableCell align="center"><strong>KPIs Verified</strong></TableCell>
                <TableCell align="center"><strong>Discrepancies</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Details</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedVerifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      No verifications found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedVerifications.map((verification) => (
                  <TableRow 
                    key={verification.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleViewDetails(verification)}
                  >
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(verification.verification_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {verification.loan?.loan_number || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {verification.loan?.borrower?.name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {verification.verification_type.replace('_', ' ')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="medium">
                        {(verification.confidence_score || 0).toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                        {getRiskIcon(verification.risk_level)}
                        <Chip 
                          label={verification.risk_level}
                          color={getRiskColor(verification.risk_level)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {typeof verification.findings === 'object' && verification.findings !== null
                          ? verification.findings.verified_count || verification.findings.verified_kpis || 0
                          : 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={typeof verification.findings === 'object' && verification.findings !== null
                          ? verification.findings.breached_count || verification.findings.discrepancies_found || 0
                          : 0}
                        color={(typeof verification.findings === 'object' && verification.findings !== null
                          ? verification.findings.breached_count || verification.findings.discrepancies_found || 0
                          : 0) === 0 ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={verification.status}
                        color={getStatusColor(verification.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(verification);
                        }}
                      >
                        View
                      </Button>
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
          count={verifications.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Dialog 
        open={detailsOpen} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedVerification && (
          <>
            <DialogTitle>
              <Typography variant="h6" fontWeight="bold">
                Verification Details
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedVerification.loan.loan_number} - {selectedVerification.loan.borrower.name}
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" color="textSecondary">
                      Confidence Score
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {selectedVerification.confidence_score.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" color="textSecondary">
                      Average Accuracy
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      {typeof selectedVerification.findings === 'object' && selectedVerification.findings !== null && selectedVerification.findings.average_accuracy
                        ? selectedVerification.findings.average_accuracy.toFixed(1)
                        : selectedVerification.confidence_score.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Data Sources Used
                  </Typography>
                  <List dense>
                    {Array.isArray(selectedVerification.data_sources) ? (
                      selectedVerification.data_sources.map((source: any, index: number) => (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemText
                              primary={source.name || 'Unknown Source'}
                              secondary={`Type: ${source.type || 'N/A'}`}
                            />
                          </ListItem>
                          {index < selectedVerification.data_sources.length - 1 && <Divider />}
                        </React.Fragment>
                      ))
                    ) : selectedVerification.data_sources?.sources ? (
                      selectedVerification.data_sources.sources.map((source: any, index: number) => (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemText
                              primary={source.name}
                              secondary={`Status: ${source.status} | Confidence: ${source.confidence}%`}
                            />
                            <Chip 
                              label={source.status}
                              color={source.status === 'verified' ? 'success' : 'default'}
                              size="small"
                            />
                          </ListItem>
                          {index < selectedVerification.data_sources.sources.length - 1 && <Divider />}
                        </React.Fragment>
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText primary="No data sources available" />
                      </ListItem>
                    )}
                  </List>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Key Findings
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="ESG KPIs Verified"
                        secondary={typeof selectedVerification.findings === 'object' && selectedVerification.findings !== null
                          ? selectedVerification.findings.verified_count || selectedVerification.findings.verified_kpis || 0
                          : 0}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Issues Found"
                        secondary={typeof selectedVerification.findings === 'object' && selectedVerification.findings !== null
                          ? selectedVerification.findings.breached_count || selectedVerification.findings.discrepancies_found || 0
                          : 0}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Average Discrepancy"
                        secondary={typeof selectedVerification.findings === 'object' && selectedVerification.findings !== null && selectedVerification.findings.avg_discrepancy
                          ? `${selectedVerification.findings.avg_discrepancy.toFixed(2)}%`
                          : 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Risk Level"
                        secondary={
                          <Chip 
                            label={selectedVerification.risk_level}
                            color={getRiskColor(selectedVerification.risk_level)}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Recommendations
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="body2">
                      {selectedVerification.recommendations}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Run Verification Dialog */}
      <Dialog open={runDialogOpen} onClose={() => setRunDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Run ESG Verification</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select a loan to run automated ESG verification using external data sources.
          </Typography>
          <Autocomplete
            options={loans}
            getOptionLabel={(option) => `${option.loan_number} - ${option.borrower?.name || 'Unknown'}`}
            value={selectedLoan}
            onChange={(event, newValue) => setSelectedLoan(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Loan"
                placeholder="Search by loan number or borrower"
                required
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRunDialogOpen(false)} disabled={running}>
            Cancel
          </Button>
          <Button
            onClick={handleRunVerification}
            variant="contained"
            disabled={!selectedLoan || running}
            startIcon={running ? <CircularProgress size={20} /> : <PlayArrow />}
          >
            {running ? 'Running...' : 'Run Verification'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Verifications;

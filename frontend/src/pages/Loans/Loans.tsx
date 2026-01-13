import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Visibility, Search } from '@mui/icons-material';
import { loansAPI } from '../../api/apiClient';

interface Loan {
  id: number;
  loan_number: string;
  borrower: {
    id: number;
    name: string;
    industry: string;
    credit_rating: string;
  };
  loan_type: string;
  amount: number;
  currency: string;
  interest_rate: number;
  current_margin: number;
  maturity_date: string;
  status: string;
  sustainability_linked: boolean;
}

const Loans: React.FC = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const response = await loansAPI.getAll();
      const loansData = response.data.loans || response.data || [];
      setLoans(Array.isArray(loansData) ? loansData : []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load loans');
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = 
      loan.loan_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.borrower?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    const matchesIndustry = industryFilter === 'all' || loan.borrower?.industry === industryFilter;
    
    return matchesSearch && matchesStatus && matchesIndustry;
  });

  const paginatedLoans = filteredLoans.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const industries = Array.from(new Set(loans.map(loan => loan.borrower?.industry).filter(Boolean)));
  
  const totalAmount = loans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
  const activeLoanCount = loans.filter(loan => loan.status === 'active').length;
  const avgInterestRate = loans.length > 0 
    ? loans.reduce((sum, loan) => sum + (loan.interest_rate || 0), 0) / loans.length 
    : 0;

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
      case 'pending': return 'warning';
      case 'completed': return 'info';
      case 'defaulted': return 'error';
      default: return 'default';
    }
  };

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
        Loan Portfolio
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Portfolio Value
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(totalAmount, 'USD')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Loans
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {activeLoanCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Interest Rate
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {avgInterestRate.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search by loan number or borrower"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="defaulted">Defaulted</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Industry"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
            >
              <MenuItem value="all">All Industries</MenuItem>
              {industries.map(industry => (
                <MenuItem key={industry} value={industry}>{industry}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Loan Number</strong></TableCell>
                <TableCell><strong>Borrower</strong></TableCell>
                <TableCell><strong>Industry</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell align="right"><strong>Amount</strong></TableCell>
                <TableCell align="right"><strong>Interest Rate</strong></TableCell>
                <TableCell align="right"><strong>Margin</strong></TableCell>
                <TableCell><strong>Maturity</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>ESG Linked</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      No loans found matching your criteria
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLoans.map((loan) => (
                  <TableRow 
                    key={loan.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/loans/${loan.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {loan.loan_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {loan.borrower?.name || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {loan.borrower?.credit_rating || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>{loan.borrower?.industry || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {loan.loan_type}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(loan.amount, loan.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{(loan.interest_rate || 0).toFixed(2)}%</TableCell>
                    <TableCell align="right">{(loan.current_margin || 0).toFixed(2)}%</TableCell>
                    <TableCell>{formatDate(loan.maturity_date)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={loan.status}
                        color={getStatusColor(loan.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {loan.sustainability_linked ? (
                        <Chip label="Yes" color="success" size="small" />
                      ) : (
                        <Chip label="No" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log('Navigating to loan:', loan.id);
                          navigate(`/loans/${loan.id}`);
                        }}
                        title="View Loan Details"
                      >
                        <Visibility />
                      </IconButton>
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
          count={filteredLoans.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default Loans;

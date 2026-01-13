import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DashboardStats {
  total_loans: number;
  total_loan_value: number;
  active_verifications: number;
  compliance_rate: number;
  at_risk_loans: number;
  average_esg_score: number;
}

interface LoanPerformance {
  loan_id: number;
  loan_number: string;
  borrower_name: string;
  esg_score: number;
  compliance_status: string;
  risk_level: string;
  next_reporting_date: string | null;
}

interface ESGTrend {
  date: string;
  value: number;
  kpi_name: string;
  status: string;
}

interface Alert {
  type: string;
  severity: string;
  message: string;
  date?: string;
  loan_id?: number;
}

interface DashboardState {
  stats: DashboardStats | null;
  loanPerformance: LoanPerformance[];
  esgTrends: ESGTrend[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  stats: null,
  loanPerformance: [],
  esgTrends: [],
  alerts: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setStats: (state, action: PayloadAction<DashboardStats>) => {
      state.stats = action.payload;
    },
    setLoanPerformance: (state, action: PayloadAction<LoanPerformance[]>) => {
      state.loanPerformance = action.payload;
    },
    setESGTrends: (state, action: PayloadAction<ESGTrend[]>) => {
      state.esgTrends = action.payload;
    },
    setAlerts: (state, action: PayloadAction<Alert[]>) => {
      state.alerts = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setStats,
  setLoanPerformance,
  setESGTrends,
  setAlerts,
  setLoading,
  setError,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;

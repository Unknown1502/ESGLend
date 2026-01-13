/**
 * TypeScript interfaces for ESGLend application
 * Provides type safety across the frontend
 */

// User & Authentication
export interface User {
  id: number;
  email: string;
  full_name: string | null;
  organization: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

// Borrower
export interface Borrower {
  id: number;
  name: string;
  industry: string | null;
  country: string | null;
  credit_rating: string | null;
  description: string | null;
  website: string | null;
  created_at: string;
}

// Loan
export interface Loan {
  id: number;
  loan_number: string;
  borrower_id: number;
  borrower?: Borrower;
  loan_type: string | null;
  amount: number;
  currency: string;
  interest_rate: number | null;
  base_margin: number | null;
  current_margin: number | null;
  maturity_date: string | null;
  status: string;
  sustainability_linked: boolean;
  created_at: string;
  updated_at: string | null;
}

// ESG KPI
export interface ESGMeasurement {
  id: number;
  kpi_id: number;
  measured_value: number;
  verified_value: number | null;
  measurement_date: string;
  data_source: string | null;
  verification_status: string;
  discrepancy_percentage: number | null;
  notes: string | null;
  created_at: string;
}

export interface ESGKPI {
  id: number;
  loan_id: number;
  kpi_name: string;
  kpi_category: string | null;
  target_value: number;
  current_value: number | null;
  unit: string;
  baseline_value: number | null;
  target_date: string | null;
  measurement_frequency: string | null;
  status: string;
  created_at: string;
  measurements?: ESGMeasurement[];
}

// Verification
export interface DataSource {
  name: string;
  status: string;
  confidence: number;
}

export interface VerificationFinding {
  kpi_name: string;
  measured_value: number;
  verified_value: number;
  discrepancy: number;
  status: string;
}

export interface Verification {
  id: number;
  loan_id: number;
  loan?: Loan;
  verification_type: string;
  verification_date: string;
  status: string;
  confidence_score: number | null;
  data_sources: {
    sources: DataSource[];
  } | null;
  findings: {
    details: VerificationFinding[];
    summary: string;
  } | null;
  risk_level: string | null;
  recommendations: string | null;
  created_at: string;
}

// Report
export interface Report {
  id: number;
  loan_id: number;
  loan?: Loan;
  report_type: string;
  report_period_start: string | null;
  report_period_end: string | null;
  generated_date: string | null;
  file_path: string | null;
  file_url: string | null;
  status: string;
  report_metadata: Record<string, any> | null;
  created_at: string;
}

// Data Source
export interface DataSourceInfo {
  id: number;
  name: string;
  provider: string | null;
  category: string | null;
  api_endpoint: string | null;
  authentication_type: string | null;
  is_active: boolean;
  cost_per_request: number | null;
  reliability_score: number | null;
  description: string | null;
  created_at: string;
}

// Dashboard
export interface DashboardStats {
  total_loans: number;
  total_loan_value: number;
  active_verifications: number;
  compliance_rate: number;
  at_risk_loans: number;
  average_esg_score: number;
  avg_interest_rate?: number;
}

export interface LoanPerformance {
  loan_id: number;
  loan_number: string;
  borrower_name: string;
  esg_score: number;
  compliance_status: string;
  risk_level: string;
  next_reporting_date: string | null;
  amount?: number;
  industry?: string;
}

export interface ESGTrend {
  date: string;
  value: number;
  kpi_name: string;
  status: string;
}

export interface Alert {
  id: number;
  type: string;
  severity: string;
  message: string;
  loan_id: number | null;
  loan_number: string | null;
  created_at: string;
}

export interface DashboardAlerts {
  alerts: Alert[];
}

// API Response Types
export interface APIError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// Form Data Types
export interface LoanFormData {
  loan_number: string;
  borrower_id: number;
  loan_type: string;
  amount: number;
  currency: string;
  interest_rate: number;
  base_margin: number;
  maturity_date: string;
  sustainability_linked: boolean;
}

export interface ReportFormData {
  loan_id: number;
  report_type: string;
  report_period_start: string;
  report_period_end: string;
}

// Redux State Types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface DashboardState {
  stats: DashboardStats | null;
  loanPerformance: LoanPerformance[];
  esgTrends: ESGTrend[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

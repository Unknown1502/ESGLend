import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    return apiClient.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  register: (userData: any) => apiClient.post('/auth/register', userData),
  getCurrentUser: () => apiClient.get('/auth/me'),
  getAllUsers: () => apiClient.get('/auth/users'),
  updateUser: (userId: number, userData: any) => apiClient.patch(`/auth/users/${userId}`, userData),
};

export const dashboardAPI = {
  getStats: () => apiClient.get('/dashboard/stats'),
  getLoanPerformance: (limit?: number) => 
    apiClient.get('/dashboard/loan-performance', { params: { limit } }),
  getESGTrends: (days?: number) => 
    apiClient.get('/dashboard/esg-trends', { params: { days } }),
  getAlerts: () => apiClient.get('/dashboard/alerts'),
};

export const loansAPI = {
  getAll: (skip?: number, limit?: number) => 
    apiClient.get('/loans/', { params: { skip, limit } }),
  getById: (id: number) => apiClient.get(`/loans/${id}`),
  create: (loanData: any) => apiClient.post('/loans/', loanData),
  update: (id: number, loanData: any) => apiClient.put(`/loans/${id}`, loanData),
  delete: (id: number) => apiClient.delete(`/loans/${id}`),
  getKpis: (loanId: number) => apiClient.get(`/loans/${loanId}/esg-kpis`),
  getVerifications: (loanId: number) => apiClient.get(`/loans/${loanId}/verifications`),
};

export const borrowersAPI = {
  getAll: (skip?: number, limit?: number) => 
    apiClient.get('/borrowers/', { params: { skip, limit } }),
  getById: (id: number) => apiClient.get(`/borrowers/${id}`),
  create: (borrowerData: any) => apiClient.post('/borrowers/', borrowerData),
  update: (id: number, borrowerData: any) => 
    apiClient.put(`/borrowers/${id}`, borrowerData),
  delete: (id: number) => apiClient.delete(`/borrowers/${id}`),
};

export const esgKpisAPI = {
  getAll: (loanId?: number, skip?: number, limit?: number) => 
    apiClient.get('/esg-kpis/', { params: { loan_id: loanId, skip, limit } }),
  getById: (id: number) => apiClient.get(`/esg-kpis/${id}`),
  create: (kpiData: any) => apiClient.post('/esg-kpis/', kpiData),
  getMeasurements: (kpiId: number) => 
    apiClient.get(`/esg-kpis/${kpiId}/measurements`),
  createMeasurement: (kpiId: number, measurementData: any) => 
    apiClient.post(`/esg-kpis/${kpiId}/measurements`, measurementData),
};

export const covenantsAPI = {
  getAll: (loanId?: number, skip?: number, limit?: number) => 
    apiClient.get('/covenants/', { params: { loan_id: loanId, skip, limit } }),
  getById: (id: number) => apiClient.get(`/covenants/${id}`),
  create: (covenantData: any) => apiClient.post('/covenants/', covenantData),
  update: (id: number, covenantData: any) => 
    apiClient.put(`/covenants/${id}`, covenantData),
};

export const verificationsAPI = {
  getAll: (loanId?: number, skip?: number, limit?: number) => 
    apiClient.get('/verifications/', { params: { loan_id: loanId, skip, limit } }),
  getById: (id: number) => apiClient.get(`/verifications/${id}`),
  create: (verificationData: any) => apiClient.post('/verifications/', verificationData),
  runVerification: (loanId: number) => 
    apiClient.post(`/verifications/${loanId}/run`),
};

export const dataSourcesAPI = {
  getAll: (skip?: number, limit?: number) => 
    apiClient.get('/data-sources/', { params: { skip, limit } }),
  getById: (id: number) => apiClient.get(`/data-sources/${id}`),
  getByCategory: (category: string) => 
    apiClient.get(`/data-sources/category/${category}`),
  create: (dataSourceData: any) => apiClient.post('/data-sources/', dataSourceData),
};

export const reportsAPI = {
  getAll: (loanId?: number, skip?: number, limit?: number) => 
    apiClient.get('/reports/', { params: { loan_id: loanId, skip, limit } }),
  getById: (id: number) => apiClient.get(`/reports/${id}`),
  generate: (reportData: { loan_id: number; report_type: string; report_period_start: string; report_period_end: string }) => 
    apiClient.post('/reports/generate', reportData),
};

export const apiStatusAPI = {
  getStatus: () => apiClient.get('/api-status/status'),
  clearCache: () => apiClient.post('/api-status/clear-cache'),
  testWeather: (latitude: number, longitude: number) => 
    apiClient.get('/api-status/test/weather', { params: { latitude, longitude } }),
  testSatellite: (latitude: number, longitude: number) => 
    apiClient.get('/api-status/test/satellite', { params: { latitude, longitude } }),
  testCarbon: () => apiClient.get('/api-status/test/carbon'),
  testESGRating: (symbol: string) => 
    apiClient.get('/api-status/test/esg-rating', { params: { symbol } }),
};

export default apiClient;

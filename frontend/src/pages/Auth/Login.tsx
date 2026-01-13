import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
  Divider,
} from '@mui/material';
import { Nature } from '@mui/icons-material';
import { authAPI } from '../../api/apiClient';
import { loginStart, loginSuccess, loginFailure } from '../../store/slices/authSlice';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('admin@esglend.com');
  const [password, setPassword] = useState('Admin123!');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    dispatch(loginStart());

    try {
      const response = await authAPI.login(email, password);
      const { access_token } = response.data;

      // Save token to localStorage BEFORE calling getCurrentUser
      localStorage.setItem('access_token', access_token);

      const userResponse = await authAPI.getCurrentUser();
      const user = userResponse.data;

      dispatch(loginSuccess({ user, token: access_token }));
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Login failed. Please try again.';
      setError(errorMessage);
      dispatch(loginFailure(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await authAPI.register({
        email,
        password,
        full_name: fullName,
        organization,
        role: 'viewer'
      });

      setSuccess('Account created successfully! Please sign in.');
      setIsSignUp(false);
      setEmail('');
      setPassword('');
      setFullName('');
      setOrganization('');
    } catch (err: any) {
      // Handle FastAPI validation errors (422)
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          // Pydantic validation errors
          const validationErrors = err.response.data.detail
            .map((error: any) => error.msg || JSON.stringify(error))
            .join(', ');
          setError(validationErrors);
        } else if (typeof err.response.data.detail === 'string') {
          // String error message
          setError(err.response.data.detail);
        } else {
          // Object error - convert to string
          setError(JSON.stringify(err.response.data.detail));
        }
      } else {
        setError('Sign up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccess(null);
    setEmail('');
    setPassword('');
    setFullName('');
    setOrganization('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={24} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Nature sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sustainability-Linked Loan Verification Platform
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={isSignUp ? handleSignUp : handleLogin} sx={{ width: '100%' }}>
            {isSignUp && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="fullName"
                  label="Full Name"
                  name="fullName"
                  autoComplete="name"
                  autoFocus
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="organization"
                  label="Organization"
                  name="organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </>
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus={!isSignUp}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText={isSignUp ? 'Must be at least 8 characters with uppercase, lowercase, and number' : ''}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>

            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>

            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={toggleMode}
                  sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Link>
              </Typography>
            </Box>

            {!isSignUp && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: 'info.light',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'info.main',
                }}
              >
                <Typography variant="caption" display="block">
                  <strong>Admin Credentials:</strong>
                </Typography>
                <Typography variant="caption" display="block">
                  Email: admin@esglend.com
                </Typography>
                <Typography variant="caption" display="block">
                  Password: Admin123!
                </Typography>
              </Box>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            LMA EDGE Hackathon 2026 Submission
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;

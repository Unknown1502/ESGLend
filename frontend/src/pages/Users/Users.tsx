import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
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
  Chip,
  IconButton,
  Select,
  MenuItem,
  Switch,
  Alert,
  AlertTitle,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Edit, AdminPanelSettings, Visibility } from '@mui/icons-material';
import { authAPI } from '../../api/apiClient';

interface User {
  id: number;
  email: string;
  full_name: string;
  organization: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const Users: React.FC = () => {
  const currentUser = useSelector((state: any) => state.auth.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; userId: number | null; field: string; value: any }>({
    open: false,
    userId: null,
    field: '',
    value: null,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.getAllUsers();
      setUsers(response.data);
    } catch (err: any) {
      let errorMsg = 'Failed to load users';
      try {
        if (err.response?.data?.detail) {
          if (typeof err.response.data.detail === 'string') {
            errorMsg = err.response.data.detail;
          } else if (Array.isArray(err.response.data.detail)) {
            errorMsg = err.response.data.detail.map((e: any) => e.msg || String(e)).join(', ');
          }
        }
      } catch {
        errorMsg = 'Failed to load users';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    setConfirmDialog({
      open: true,
      userId,
      field: 'role',
      value: newRole,
    });
  };

  const handleActiveToggle = (userId: number, isActive: boolean) => {
    setConfirmDialog({
      open: true,
      userId,
      field: 'is_active',
      value: isActive,
    });
  };

  const confirmUpdate = async () => {
    if (!confirmDialog.userId) return;

    try {
      const updateData: any = {};
      if (confirmDialog.field === 'role') {
        updateData.role = confirmDialog.value;
      } else if (confirmDialog.field === 'is_active') {
        updateData.is_active = confirmDialog.value;
      }

      await authAPI.updateUser(confirmDialog.userId, updateData);
      await loadUsers();
      setConfirmDialog({ open: false, userId: null, field: '', value: null });
      setEditingUser(null);
    } catch (err: any) {
      let errorMsg = 'Failed to update user';
      try {
        if (err.response?.data?.detail) {
          if (typeof err.response.data.detail === 'string') {
            errorMsg = err.response.data.detail;
          } else if (Array.isArray(err.response.data.detail)) {
            errorMsg = err.response.data.detail.map((e: any) => e.msg || String(e)).join(', ');
          }
        }
      } catch {
        errorMsg = 'Failed to update user';
      }
      setError(errorMsg);
      setConfirmDialog({ open: false, userId: null, field: '', value: null });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'success';
      case 'manager':
        return 'primary';
      case 'analyst':
        return 'info';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <AdminPanelSettings fontSize="small" />;
      case 'viewer':
        return <Visibility fontSize="small" />;
      default:
        return null;
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          <AlertTitle>Access Denied</AlertTitle>
          You do not have permission to access user management.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
          User Management
        </Typography>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Loading users...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          User Management
        </Typography>
        <Chip 
          icon={<AdminPanelSettings />}
          label={`${users.length} Total Users`}
          color="primary"
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {typeof error === 'string' ? error : 'An error occurred'}
        </Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>User</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Organization</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Joined</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                    opacity: user.is_active ? 1 : 0.6,
                  }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {user.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.organization}</TableCell>
                  <TableCell>
                    {editingUser === user.id && user.id !== currentUser.id ? (
                      <Select
                        size="small"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="manager">Manager</MenuItem>
                        <MenuItem value="analyst">Analyst</MenuItem>
                        <MenuItem value="viewer">Viewer</MenuItem>
                      </Select>
                    ) : (
                      <Chip
                        icon={getRoleIcon(user.role) || undefined}
                        label={user.role.toUpperCase()}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {user.id !== currentUser.id ? (
                      <Tooltip title={user.is_active ? 'Click to deactivate' : 'Click to activate'}>
                        <Switch
                          checked={user.is_active}
                          onChange={(e) => handleActiveToggle(user.id, e.target.checked)}
                          color="success"
                        />
                      </Tooltip>
                    ) : (
                      <Chip label="Active" color="success" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(user.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {user.id !== currentUser.id && (
                      <Tooltip title="Edit role">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, userId: null, field: '', value: null })}>
        <DialogTitle>Confirm User Update</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.field === 'role' 
              ? `Are you sure you want to change this user's role to "${confirmDialog.value}"?`
              : `Are you sure you want to ${confirmDialog.value ? 'activate' : 'deactivate'} this user?`
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, userId: null, field: '', value: null })}>
            Cancel
          </Button>
          <Button onClick={confirmUpdate} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;

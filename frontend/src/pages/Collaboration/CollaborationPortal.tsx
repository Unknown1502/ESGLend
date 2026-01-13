import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  AvatarGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Menu,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  Badge,
  Autocomplete
} from '@mui/material';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import {
  Add as AddIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  MoreVert as MoreVertIcon,
  Assignment as AssignmentIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  PlayArrow as PlayArrowIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
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

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
}

interface Workflow {
  id: number;
  loan_id: number;
  loan_number: string;
  workflow_type: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'rejected';
  current_stage: string;
  initiated_by: User;
  assigned_to?: User;
  due_date?: string;
  created_date: string;
  updated_date: string;
  priority: 'low' | 'medium' | 'high';
  stages: WorkflowStage[];
  comments: WorkflowComment[];
  documents: WorkflowDocument[];
}

interface WorkflowStage {
  stage_name: string;
  stage_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  assigned_to?: User;
  completed_by?: User;
  completed_date?: string;
  decision?: string;
  comments?: string;
}

interface WorkflowComment {
  id: number;
  user: User;
  comment: string;
  timestamp: string;
  stage_name?: string;
}

interface WorkflowDocument {
  id: number;
  filename: string;
  file_url: string;
  uploaded_by: User;
  uploaded_date: string;
  version: number;
}

interface Loan {
  id: number;
  loan_number: string;
  borrower_name: string;
}

const CollaborationPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  
  // Form states
  const [newWorkflow, setNewWorkflow] = useState({
    loan_id: 0,
    workflow_type: 'loan_approval',
    title: '',
    description: '',
    due_date: ''
  });
  const [assignStage, setAssignStage] = useState({
    workflow_id: 0,
    stage_name: '',
    user_id: 0
  });
  const [newComment, setNewComment] = useState('');

  // Kanban columns
  const columns = {
    pending: workflows.filter(w => w.status === 'pending'),
    in_progress: workflows.filter(w => w.status === 'in_progress'),
    review: workflows.filter(w => w.status === 'review'),
    completed: workflows.filter(w => w.status === 'completed')
  };

  // API client
  const apiClient = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadWorkflows(),
        loadUsers(),
        loadLoans()
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      const response = await apiClient.get('/api/v1/collaboration/workflows');
      setWorkflows(response.data.workflows || []);
    } catch (err: any) {
      console.error('Failed to load workflows:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/api/v1/auth/users');
      setUsers(response.data.users || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    }
  };

  const loadLoans = async () => {
    try {
      const response = await apiClient.get('/api/v1/loans');
      setLoans(response.data.loans || []);
    } catch (err: any) {
      console.error('Failed to load loans:', err);
    }
  };

  const handleCreateWorkflow = async () => {
    setLoading(true);
    try {
      await apiClient.post('/api/v1/collaboration/workflows', newWorkflow);
      await loadWorkflows();
      setCreateDialogOpen(false);
      setNewWorkflow({
        loan_id: 0,
        workflow_type: 'loan_approval',
        title: '',
        description: '',
        due_date: ''
      });
    } catch (err: any) {
      setError('Failed to create workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStage = async () => {
    setLoading(true);
    try {
      await apiClient.post('/api/v1/collaboration/workflows/assign-stage', assignStage);
      await loadWorkflows();
      setAssignDialogOpen(false);
    } catch (err: any) {
      setError('Failed to assign stage');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedWorkflow || !newComment.trim()) return;
    
    setLoading(true);
    try {
      await apiClient.post('/api/v1/collaboration/workflows/add-comment', {
        workflow_id: selectedWorkflow.id,
        comment: newComment
      });
      await loadWorkflows();
      setNewComment('');
    } catch (err: any) {
      setError('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStage = async (workflow: Workflow, stageName: string, decision: string) => {
    setLoading(true);
    try {
      await apiClient.post('/api/v1/collaboration/workflows/complete-stage', {
        workflow_id: workflow.id,
        stage_name: stageName,
        decision,
        comments: `Stage ${stageName} ${decision}`
      });
      await loadWorkflows();
    } catch (err: any) {
      setError('Failed to complete stage');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const sourceStatus = result.source.droppableId;
    const destStatus = result.destination.droppableId;
    
    if (sourceStatus === destStatus) return;
    
    const workflowId = parseInt(result.draggableId.split('-')[1]);
    
    setLoading(true);
    try {
      await apiClient.put(`/api/v1/collaboration/workflows/${workflowId}/status`, {
        status: destStatus
      });
      await loadWorkflows();
    } catch (err: any) {
      setError('Failed to update workflow status');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'in_progress':
        return <PlayArrowIcon color="primary" />;
      case 'pending':
        return <PendingIcon color="action" />;
      case 'rejected':
        return <CancelIcon color="error" />;
      default:
        return <PendingIcon />;
    }
  };

  const getWorkflowTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      loan_approval: 'Loan Approval',
      verification_approval: 'Verification Approval',
      covenant_modification: 'Covenant Modification',
      kpi_target_adjustment: 'KPI Target Adjustment',
      report_generation: 'Report Generation'
    };
    return labels[type] || type;
  };

  const WorkflowCard: React.FC<{ workflow: Workflow; isDragging?: boolean }> = ({ workflow, isDragging }) => (
    <Card 
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        opacity: isDragging ? 0.5 : 1,
        '&:hover': { boxShadow: 3 }
      }}
      onClick={() => {
        setSelectedWorkflow(workflow);
        setDetailDialogOpen(true);
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {workflow.title}
          </Typography>
          <Chip 
            label={workflow.priority} 
            color={getPriorityColor(workflow.priority) as any} 
            size="small" 
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {workflow.loan_number}
        </Typography>
        
        <Typography variant="body2" noWrap sx={{ mb: 2 }}>
          {workflow.description}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chip 
            label={getWorkflowTypeLabel(workflow.workflow_type)} 
            size="small" 
            variant="outlined"
          />
          {workflow.assigned_to && (
            <Avatar sx={{ width: 32, height: 32 }}>
              {workflow.assigned_to.full_name?.charAt(0) || workflow.assigned_to.username.charAt(0)}
            </Avatar>
          )}
        </Box>
        
        {workflow.due_date && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Due: {new Date(workflow.due_date).toLocaleDateString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Collaboration Portal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Multi-party workflow management and approval chains
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Workflow
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Kanban Board" />
          <Tab label="Approval Chains" />
          <Tab label="Document Versions" />
        </Tabs>
      </Paper>

      {/* Tab 1: Kanban Board */}
      <TabPanel value={activeTab} index={0}>
        {loading && workflows.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Grid container spacing={2}>
              {Object.entries(columns).map(([columnId, columnWorkflows]) => (
                <Grid item xs={12} md={3} key={columnId}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', minHeight: 600 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {columnId.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Chip label={columnWorkflows.length} size="small" />
                    </Box>
                    
                    <Droppable droppableId={columnId}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          sx={{
                            bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                            minHeight: 500,
                            transition: 'background-color 0.2s'
                          }}
                        >
                          {columnWorkflows.map((workflow, index) => (
                            <Draggable
                              key={`workflow-${workflow.id}`}
                              draggableId={`workflow-${workflow.id}`}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <WorkflowCard workflow={workflow} isDragging={snapshot.isDragging} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </Box>
                      )}
                    </Droppable>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </DragDropContext>
        )}
      </TabPanel>

      {/* Tab 2: Approval Chains */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          {workflows.map((workflow) => (
            <Grid item xs={12} key={workflow.id}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6">{workflow.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {workflow.loan_number} • {getWorkflowTypeLabel(workflow.workflow_type)}
                    </Typography>
                  </Box>
                  <Chip label={workflow.status} icon={getStatusIcon(workflow.status)} />
                </Box>
                
                <Stepper activeStep={workflow.stages.findIndex(s => s.status === 'in_progress')} orientation="horizontal">
                  {workflow.stages.map((stage, index) => (
                    <Step key={stage.stage_name} completed={stage.status === 'completed'}>
                      <StepLabel
                        optional={
                          <Typography variant="caption">
                            {stage.assigned_to?.full_name || 'Unassigned'}
                          </Typography>
                        }
                        error={stage.status === 'rejected'}
                      >
                        {stage.stage_name}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
                
                {workflow.current_stage && (
                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => handleCompleteStage(workflow, workflow.current_stage, 'approved')}
                    >
                      Approve Stage
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      onClick={() => handleCompleteStage(workflow, workflow.current_stage, 'revision_required')}
                    >
                      Request Revision
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleCompleteStage(workflow, workflow.current_stage, 'rejected')}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PersonIcon />}
                      onClick={() => {
                        setAssignStage({
                          workflow_id: workflow.id,
                          stage_name: workflow.current_stage,
                          user_id: 0
                        });
                        setAssignDialogOpen(true);
                      }}
                    >
                      Assign
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Tab 3: Document Versions */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          {workflows.map((workflow) => (
            workflow.documents && workflow.documents.length > 0 && (
              <Grid item xs={12} md={6} key={workflow.id}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {workflow.title}
                  </Typography>
                  <Timeline>
                    {workflow.documents.map((doc, index) => (
                      <TimelineItem key={doc.id}>
                        <TimelineOppositeContent sx={{ color: 'text.secondary' }}>
                          <Typography variant="body2">
                            Version {doc.version}
                          </Typography>
                        </TimelineOppositeContent>
                        <TimelineSeparator>
                          <TimelineDot color={index === 0 ? 'primary' : 'grey'} />
                          {index < workflow.documents.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Typography variant="body2" fontWeight="medium">
                            {doc.filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {doc.uploaded_by.full_name} • {new Date(doc.uploaded_date).toLocaleDateString()}
                          </Typography>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                </Paper>
              </Grid>
            )
          ))}
        </Grid>
      </TabPanel>

      {/* Create Workflow Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              options={loans}
              getOptionLabel={(option) => `${option.loan_number} - ${option.borrower_name}`}
              onChange={(e, value) => setNewWorkflow({ ...newWorkflow, loan_id: value?.id || 0 })}
              renderInput={(params) => <TextField {...params} label="Loan" required />}
            />
            
            <FormControl fullWidth>
              <InputLabel>Workflow Type</InputLabel>
              <Select
                value={newWorkflow.workflow_type}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, workflow_type: e.target.value })}
                label="Workflow Type"
              >
                <MenuItem value="loan_approval">Loan Approval</MenuItem>
                <MenuItem value="verification_approval">Verification Approval</MenuItem>
                <MenuItem value="covenant_modification">Covenant Modification</MenuItem>
                <MenuItem value="kpi_target_adjustment">KPI Target Adjustment</MenuItem>
                <MenuItem value="report_generation">Report Generation</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Title"
              fullWidth
              required
              value={newWorkflow.title}
              onChange={(e) => setNewWorkflow({ ...newWorkflow, title: e.target.value })}
            />
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newWorkflow.description}
              onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
            />
            
            <TextField
              label="Due Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newWorkflow.due_date}
              onChange={(e) => setNewWorkflow({ ...newWorkflow, due_date: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateWorkflow} variant="contained" disabled={loading || !newWorkflow.loan_id || !newWorkflow.title}>
            {loading ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Stage Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign Stage</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              options={users}
              getOptionLabel={(option) => option.full_name || option.username}
              onChange={(e, value) => setAssignStage({ ...assignStage, user_id: value?.id || 0 })}
              renderInput={(params) => <TextField {...params} label="Assign To" required />}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignStage} variant="contained" disabled={loading || !assignStage.user_id}>
            {loading ? <CircularProgress size={24} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Workflow Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedWorkflow?.title}
        </DialogTitle>
        <DialogContent>
          {selectedWorkflow && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Loan Number</Typography>
                  <Typography variant="body2">{selectedWorkflow.loan_number}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Typography variant="body2">
                    <Chip label={selectedWorkflow.status} size="small" />
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body2">{selectedWorkflow.description}</Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>Comments</Typography>
              <List>
                {selectedWorkflow.comments?.map((comment) => (
                  <ListItem key={comment.id} alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>{comment.user.full_name?.charAt(0) || comment.user.username.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={comment.user.full_name || comment.user.username}
                      secondary={
                        <>
                          <Typography variant="body2" component="span">{comment.comment}</Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {new Date(comment.timestamp).toLocaleString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <IconButton color="primary" onClick={handleAddComment} disabled={!newComment.trim()}>
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CollaborationPortal;

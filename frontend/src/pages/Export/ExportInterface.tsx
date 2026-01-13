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
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  GetApp as GetAppIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
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
  loan_amount: number;
  currency: string;
  sustainability_linked: boolean;
}

interface FieldMapping {
  source_field: string;
  target_field: string;
  data_type: string;
  required: boolean;
  default_value?: string;
}

interface ExportTemplate {
  id: number;
  name: string;
  description: string;
  format: string;
  template_type: string;
  field_mappings: FieldMapping[];
  created_date: string;
  is_default: boolean;
}

interface ExportHistory {
  id: number;
  loan_ids: number[];
  loan_numbers: string[];
  format: string;
  template_name: string;
  exported_date: string;
  exported_by: string;
  file_url: string;
  status: 'completed' | 'failed' | 'in_progress';
}

interface SourceField {
  name: string;
  label: string;
  data_type: string;
  sample_value: string;
}

interface TargetField {
  name: string;
  label: string;
  data_type: string;
  required: boolean;
  lma_section: string;
}

const ExportInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Data states
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoans, setSelectedLoans] = useState<number[]>([]);
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'json' | 'xml' | 'excel'>('json');
  
  // Field mapping states
  const [sourceFields, setSourceFields] = useState<SourceField[]>([]);
  const [targetFields, setTargetFields] = useState<TargetField[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  
  // Dialog states
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // Export progress
  const [exportProgress, setExportProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  
  // New template form
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    format: 'json',
    template_type: 'facility_agreement'
  });

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
        loadLoans(),
        loadTemplates(),
        loadExportHistory(),
        loadFieldDefinitions()
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadLoans = async () => {
    try {
      const response = await apiClient.get('/api/v1/loans');
      setLoans(Array.isArray(response.data.loans) ? response.data.loans : []);
    } catch (err: any) {
      console.error('Failed to load loans:', err);
      setLoans([]);
      setError('Failed to load loans');
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await apiClient.get('/api/v1/export/templates');
      const templates = Array.isArray(response.data.templates) ? response.data.templates : [];
      setTemplates(templates);
      
      // Select default template if available
      const defaultTemplate = templates.find((t: ExportTemplate) => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate);
        setFieldMappings(Array.isArray(defaultTemplate.field_mappings) ? defaultTemplate.field_mappings : []);
      }
    } catch (err: any) {
      console.error('Failed to load templates:', err);
      setTemplates([]);
      setError('Failed to load templates');
    }
  };

  const loadExportHistory = async () => {
    try {
      const response = await apiClient.get('/api/v1/export/history');
      setExportHistory(Array.isArray(response.data.exports) ? response.data.exports : []);
    } catch (err: any) {
      console.error('Failed to load export history:', err);
      setExportHistory([]);
    }
  };

  const loadFieldDefinitions = async () => {
    try {
      const response = await apiClient.get('/api/v1/export/field-definitions');
      setSourceFields(Array.isArray(response.data.source_fields) ? response.data.source_fields : []);
      setTargetFields(Array.isArray(response.data.target_fields) ? response.data.target_fields : []);
    } catch (err: any) {
      console.error('Failed to load field definitions:', err);
      setSourceFields([]);
      setTargetFields([]);
    }
  };

  const handleSelectAllLoans = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedLoans(loans.map(loan => loan.id));
    } else {
      setSelectedLoans([]);
    }
  };

  const handleSelectLoan = (loanId: number) => {
    setSelectedLoans(prev => {
      if (prev.includes(loanId)) {
        return prev.filter(id => id !== loanId);
      } else {
        return [...prev, loanId];
      }
    });
  };

  const handleCreateTemplate = async () => {
    setLoading(true);
    try {
      await apiClient.post('/api/v1/export/templates', {
        ...newTemplate,
        field_mappings: fieldMappings
      });
      await loadTemplates();
      setTemplateDialogOpen(false);
      setSuccess('Template created successfully');
      setNewTemplate({
        name: '',
        description: '',
        format: 'json',
        template_type: 'facility_agreement'
      });
    } catch (err: any) {
      setError('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (selectedLoans.length === 0) {
      setError('Please select at least one loan');
      return;
    }
    
    setExporting(true);
    setExportProgress(0);
    setExportDialogOpen(true);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const response = await apiClient.post('/api/v1/export/bulk', {
        loan_ids: selectedLoans,
        format: exportFormat,
        template_id: selectedTemplate?.id,
        field_mappings: fieldMappings
      }, {
        responseType: exportFormat === 'json' ? 'json' : 'blob'
      });
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      // Download file
      if (exportFormat === 'json') {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `LMA_Export_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
      } else {
        const blob = new Blob([response.data], { 
          type: exportFormat === 'pdf' ? 'application/pdf' : 
                exportFormat === 'xml' ? 'application/xml' : 
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `LMA_Export_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        link.click();
      }
      
      await loadExportHistory();
      setSuccess('Export completed successfully');
      
      setTimeout(() => {
        setExportDialogOpen(false);
        setExporting(false);
      }, 1000);
      
    } catch (err: any) {
      setError('Export failed');
      setExporting(false);
    }
  };

  const handleReExport = async (historyItem: ExportHistory) => {
    setSelectedLoans(historyItem.loan_ids);
    await handleExport();
  };

  const handleDragStart = (fieldName: string) => {
    setDraggedField(fieldName);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetFieldName: string) => {
    if (draggedField) {
      const sourceField = sourceFields.find(f => f.name === draggedField);
      const targetField = targetFields.find(f => f.name === targetFieldName);
      
      if (sourceField && targetField) {
        setFieldMappings(prev => {
          const existing = prev.filter(m => m.target_field !== targetFieldName);
          return [...existing, {
            source_field: sourceField.name,
            target_field: targetField.name,
            data_type: targetField.data_type,
            required: targetField.required
          }];
        });
      }
      
      setDraggedField(null);
    }
  };

  const handleRemoveMapping = (targetField: string) => {
    setFieldMappings(prev => prev.filter(m => m.target_field !== targetField));
  };

  const getMappedSourceField = (targetField: string): string | null => {
    const mapping = fieldMappings.find(m => m.target_field === targetField);
    return mapping ? mapping.source_field : null;
  };

  const getTemplateTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      facility_agreement: 'Facility Agreement',
      pricing_report: 'Pricing Report',
      risk_assessment: 'Risk Assessment Report',
      esg_report: 'ESG Performance Report',
      covenant_report: 'Covenant Compliance Report'
    };
    return labels[type] || type;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Export Interface
          </Typography>
          <Typography variant="body2" color="text.secondary">
            LMA-compliant bulk export with custom field mapping
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setMappingDialogOpen(true)}
          >
            Configure Mapping
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={selectedLoans.length === 0}
          >
            Export ({selectedLoans.length})
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Loan Selection" />
          <Tab label="Export Templates" />
          <Tab label="Export History" />
        </Tabs>
      </Paper>

      {/* Tab 1: Loan Selection */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          {/* Format Selector */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Export Format
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {(['pdf', 'json', 'xml', 'excel'] as const).map((format) => (
                  <Card
                    key={format}
                    sx={{
                      cursor: 'pointer',
                      border: exportFormat === format ? 2 : 0,
                      borderColor: 'primary.main',
                      width: 150,
                      textAlign: 'center'
                    }}
                    onClick={() => setExportFormat(format)}
                  >
                    <CardContent>
                      <Typography variant="h6" color={exportFormat === format ? 'primary' : 'textSecondary'}>
                        {format.toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format === 'pdf' && 'Document'}
                        {format === 'json' && 'Data Exchange'}
                        {format === 'xml' && 'Structured Data'}
                        {format === 'excel' && 'Spreadsheet'}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Template Selector */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Export Template
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={() => setTemplateDialogOpen(true)}
                >
                  Save New Template
                </Button>
              </Box>
              <FormControl fullWidth>
                <InputLabel>Select Template</InputLabel>
                <Select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => {
                    const template = templates.find(t => t.id === e.target.value);
                    setSelectedTemplate(template || null);
                    if (template) {
                      setFieldMappings(template.field_mappings);
                    }
                  }}
                  label="Select Template"
                >
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name} ({getTemplateTypeLabel(template.template_type)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedTemplate && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {selectedTemplate.description}
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Loan Selection Table */}
          <Grid item xs={12}>
            <Paper>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Select Loans ({selectedLoans.length} selected)
                </Typography>
                <Checkbox
                  checked={selectedLoans.length === loans.length && loans.length > 0}
                  indeterminate={selectedLoans.length > 0 && selectedLoans.length < loans.length}
                  onChange={handleSelectAllLoans}
                />
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedLoans.length === loans.length && loans.length > 0}
                          indeterminate={selectedLoans.length > 0 && selectedLoans.length < loans.length}
                          onChange={handleSelectAllLoans}
                        />
                      </TableCell>
                      <TableCell>Loan Number</TableCell>
                      <TableCell>Borrower</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Currency</TableCell>
                      <TableCell>Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loans.length > 0 ? loans.map((loan) => (
                      <TableRow
                        key={loan.id}
                        hover
                        onClick={() => handleSelectLoan(loan.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox checked={selectedLoans.includes(loan.id)} />
                        </TableCell>
                        <TableCell>{loan.loan_number}</TableCell>
                        <TableCell>{loan.borrower_name}</TableCell>
                        <TableCell align="right">
                          {(loan.loan_amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>{loan.currency}</TableCell>
                        <TableCell>
                          {loan.sustainability_linked ? (
                            <Chip label="Sustainability-Linked" size="small" color="success" />
                          ) : (
                            <Chip label="Standard" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary">
                            {loading ? 'Loading loans...' : 'No loans available'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Export Templates */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          {templates.length > 0 ? templates.map((template) => (
            <Grid item xs={12} md={6} key={template.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {template.name}
                      </Typography>
                      <Chip
                        label={getTemplateTypeLabel(template.template_type)}
                        size="small"
                        color="primary"
                        sx={{ mb: 1 }}
                      />
                      {template.is_default && (
                        <Chip label="Default" size="small" color="success" sx={{ ml: 1, mb: 1 }} />
                      )}
                    </Box>
                    <Chip label={template.format.toUpperCase()} size="small" />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {template.description}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary">
                    {template.field_mappings.length} field mappings • Created {new Date(template.created_date).toLocaleDateString()}
                  </Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setFieldMappings(template.field_mappings);
                        setPreviewDialogOpen(true);
                      }}
                    >
                      Preview
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<GetAppIcon />}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setFieldMappings(template.field_mappings);
                        setActiveTab(0);
                      }}
                    >
                      Use Template
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {loading ? 'Loading templates...' : 'No templates available'}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Tab 3: Export History */}
      <TabPanel value={activeTab} index={2}>
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Export Date</TableCell>
                  <TableCell>Loans</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell>Exported By</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exportHistory.length > 0 ? exportHistory.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      {item.exported_date ? new Date(item.exported_date).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.loan_numbers.join(', ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.loan_ids.length} loan(s)
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={item.format.toUpperCase()} size="small" />
                    </TableCell>
                    <TableCell>{item.template_name}</TableCell>
                    <TableCell>{item.exported_by}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.status}
                        size="small"
                        color={item.status === 'completed' ? 'success' : item.status === 'failed' ? 'error' : 'default'}
                        icon={item.status === 'completed' ? <CheckCircleIcon /> : undefined}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleReExport(item)}
                        title="Re-export"
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">
                        {loading ? 'Loading export history...' : 'No export history available'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* Field Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onClose={() => setMappingDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Configure Field Mapping</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Drag source fields from the left to target LMA fields on the right to create mappings
          </Typography>
          
          <Grid container spacing={2}>
            {/* Source Fields */}
            <Grid item xs={5}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', minHeight: 400 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Source Fields
                </Typography>
                <List dense>
                  {sourceFields.map((field) => (
                    <ListItem
                      key={field.name}
                      draggable
                      onDragStart={() => handleDragStart(field.name)}
                      sx={{
                        cursor: 'grab',
                        mb: 1,
                        bgcolor: 'white',
                        border: 1,
                        borderColor: 'grey.300',
                        borderRadius: 1,
                        '&:active': { cursor: 'grabbing' }
                      }}
                    >
                      <ListItemText
                        primary={field.label}
                        secondary={`${field.data_type} • ${field.sample_value}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
            
            <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h4" color="text.secondary">→</Typography>
            </Grid>
            
            {/* Target Fields */}
            <Grid item xs={5}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', minHeight: 400 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  LMA Target Fields
                </Typography>
                
                {/* Group by LMA section */}
                {['General Information', 'Financial Terms', 'ESG Provisions', 'Covenants'].map((section) => (
                  <Accordion key={section} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">{section}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {targetFields
                          .filter(f => f.lma_section === section)
                          .map((field) => {
                            const mappedSource = getMappedSourceField(field.name);
                            return (
                              <ListItem
                                key={field.name}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(field.name)}
                                sx={{
                                  mb: 1,
                                  bgcolor: mappedSource ? 'success.light' : 'white',
                                  border: 1,
                                  borderColor: mappedSource ? 'success.main' : 'grey.300',
                                  borderRadius: 1
                                }}
                              >
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {field.label}
                                      {field.required && <Chip label="Required" size="small" color="error" />}
                                    </Box>
                                  }
                                  secondary={mappedSource ? `← ${sourceFields.find(f => f.name === mappedSource)?.label}` : 'Drop here'}
                                />
                                {mappedSource && (
                                  <ListItemSecondaryAction>
                                    <IconButton
                                      edge="end"
                                      size="small"
                                      onClick={() => handleRemoveMapping(field.name)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </ListItemSecondaryAction>
                                )}
                              </ListItem>
                            );
                          })}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Paper>
            </Grid>
          </Grid>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            {fieldMappings.length} fields mapped • {targetFields.filter(f => f.required).length - fieldMappings.filter(m => targetFields.find(t => t.name === m.target_field)?.required).length} required fields remaining
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappingDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => setMappingDialogOpen(false)} variant="contained">
            Apply Mappings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Export Template</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Template Name"
              fullWidth
              required
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            />
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={newTemplate.description}
              onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
            />
            
            <FormControl fullWidth>
              <InputLabel>Template Type</InputLabel>
              <Select
                value={newTemplate.template_type}
                onChange={(e) => setNewTemplate({ ...newTemplate, template_type: e.target.value })}
                label="Template Type"
              >
                <MenuItem value="facility_agreement">Facility Agreement</MenuItem>
                <MenuItem value="pricing_report">Pricing Report</MenuItem>
                <MenuItem value="risk_assessment">Risk Assessment Report</MenuItem>
                <MenuItem value="esg_report">ESG Performance Report</MenuItem>
                <MenuItem value="covenant_report">Covenant Compliance Report</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={newTemplate.format}
                onChange={(e) => setNewTemplate({ ...newTemplate, format: e.target.value })}
                label="Format"
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="xml">XML</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTemplate} variant="contained" disabled={loading || !newTemplate.name}>
            {loading ? <CircularProgress size={24} /> : 'Save Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Progress Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>Exporting Loans</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Exporting {selectedLoans.length} loan(s) in {exportFormat.toUpperCase()} format...
            </Typography>
            <LinearProgress variant="determinate" value={exportProgress} sx={{ mt: 2 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {exportProgress}% complete
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Template Preview: {selectedTemplate?.name}
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedTemplate.description}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Field Mappings ({selectedTemplate.field_mappings.length})
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Source Field</TableCell>
                      <TableCell>Target Field</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Required</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedTemplate.field_mappings.map((mapping, index) => (
                      <TableRow key={index}>
                        <TableCell>{mapping.source_field}</TableCell>
                        <TableCell>{mapping.target_field}</TableCell>
                        <TableCell>{mapping.data_type}</TableCell>
                        <TableCell>
                          {mapping.required ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          <Button
            onClick={() => {
              setPreviewDialogOpen(false);
              setActiveTab(0);
            }}
            variant="contained"
          >
            Use This Template
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ExportInterface;

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Box,
  Typography,
  TextField,
  Divider,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
} from '@mui/icons-material';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: 'pdf' | 'csv', dateRange?: { startDate?: Date; endDate?: Date }) => void;
  title?: string;
  showDateFilter?: boolean;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

export default function ExportDialog({
  open,
  onClose,
  onExport,
  title = 'Export Report',
  showDateFilter = true,
  defaultStartDate,
  defaultEndDate,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [startDate, setStartDate] = useState<string>(defaultStartDate || '');
  const [endDate, setEndDate] = useState<string>(defaultEndDate || '');

  const handleExport = () => {
    const dateRange = showDateFilter ? {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    } : undefined;
    
    onExport(format, dateRange);
    onClose();
    // Reset to default
    setFormat('pdf');
    setStartDate(defaultStartDate || '');
    setEndDate(defaultEndDate || '');
  };

  const handleClose = () => {
    onClose();
    // Reset to default
    setFormat('pdf');
    setStartDate(defaultStartDate || '');
    setEndDate(defaultEndDate || '');
  };

  // Update dates when defaults change
  useEffect(() => {
    if (defaultStartDate) setStartDate(defaultStartDate);
    if (defaultEndDate) setEndDate(defaultEndDate);
  }, [defaultStartDate, defaultEndDate]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 2 }}>
            Choose Export Format
          </FormLabel>
          <RadioGroup
            value={format}
            onChange={(e) => setFormat(e.target.value as 'pdf' | 'csv')}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <FormControlLabel
                value="pdf"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PdfIcon sx={{ color: '#E91E63' }} />
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        PDF Document
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Formatted report with tables and styling
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{
                  border: format === 'pdf' ? '2px solid #E91E63' : '2px solid #e2e8f0',
                  borderRadius: 2,
                  padding: 2,
                  margin: 0,
                  '&:hover': {
                    backgroundColor: '#f8fafc',
                  },
                }}
              />
              <FormControlLabel
                value="csv"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CsvIcon sx={{ color: '#2196F3' }} />
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        CSV (Excel)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Spreadsheet format for data analysis
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{
                  border: format === 'csv' ? '2px solid #2196F3' : '2px solid #e2e8f0',
                  borderRadius: 2,
                  padding: 2,
                  margin: 0,
                  '&:hover': {
                    backgroundColor: '#f8fafc',
                  },
                }}
              />
            </Box>
          </RadioGroup>
        </FormControl>

        {showDateFilter && (
          <>
            <Divider sx={{ my: 3 }} />
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ mb: 2 }}>
                Filter by Date Range (Optional)
              </FormLabel>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  fullWidth
                  inputProps={{
                    max: endDate || undefined,
                  }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  fullWidth
                  inputProps={{
                    min: startDate || undefined,
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Leave empty to export all data. Only data within the selected date range will be included.
              </Typography>
            </FormControl>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          sx={{
            backgroundColor: '#E91E63',
            '&:hover': {
              backgroundColor: '#C2185B',
            },
          }}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}


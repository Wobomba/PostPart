'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Alert,
  IconButton,
  Divider,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { Center, CenterQRCode } from '../../shared/types';
import { logActivity } from '../utils/activityLogger';

interface QRCodeManagementProps {
  open: boolean;
  onClose: () => void;
  center: Center;
  onSuccess: () => void;
}

export default function QRCodeManagement({ open, onClose, center, onSuccess }: QRCodeManagementProps) {
  const [qrCodes, setQRCodes] = useState<CenterQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadQRCodes();
    }
  }, [open, center.id]);

  const loadQRCodes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('center_qr_codes')
        .select('*')
        .eq('center_id', center.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setQRCodes(data || []);

      // If no QR codes exist, generate one automatically
      if (!data || data.length === 0) {
        await generateNewQRCode();
      }
    } catch (err: any) {
      console.error('Error loading QR codes:', err);
      setError(err.message || 'Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  };

  // Generate UUID v4 (compatible with all environments)
  const generateUUID = (): string => {
    // Check if crypto.randomUUID is available (modern browsers/Node.js 19+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback: Generate UUID v4 manually
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const generateNewQRCode = async () => {
    try {
      setGenerating(true);
      setError(null);

      // Generate a unique QR code value (UUID)
      const qrCodeValue = generateUUID();

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: insertError } = await supabase
        .from('center_qr_codes')
        .insert([
          {
            center_id: center.id,
            qr_code_value: qrCodeValue,
            is_active: true,
            activated_at: new Date().toISOString(),
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // Log activity
      await logActivity({
        activityType: 'center_updated',
        entityType: 'center',
        entityId: center.id,
        entityName: center.name,
        description: `New QR code generated for centre ${center.name}`,
        metadata: {
          qr_code_id: data.id,
        },
      });

      await loadQRCodes();
      onSuccess();
    } catch (err: any) {
      console.error('Error generating QR code:', err);
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setGenerating(false);
    }
  };

  const toggleQRCodeStatus = async (qrCode: CenterQRCode) => {
    try {
      const newStatus = !qrCode.is_active;

      const updateData: any = {
        is_active: newStatus,
      };

      if (newStatus) {
        updateData.activated_at = new Date().toISOString();
        updateData.revoked_at = null;
      } else {
        updateData.revoked_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('center_qr_codes')
        .update(updateData)
        .eq('id', qrCode.id);

      if (updateError) throw updateError;

      // Log activity
      await logActivity({
        activityType: 'center_updated',
        entityType: 'center',
        entityId: center.id,
        entityName: center.name,
        description: `QR code ${newStatus ? 'activated' : 'revoked'} for centre ${center.name}`,
        metadata: {
          qr_code_id: qrCode.id,
          action: newStatus ? 'activated' : 'revoked',
        },
      });

      await loadQRCodes();
      onSuccess();
    } catch (err: any) {
      console.error('Error toggling QR code status:', err);
      setError(err.message || 'Failed to update QR code status');
    }
  };

  const downloadQRCode = (qrCode: CenterQRCode) => {
    try {
      // Create a temporary canvas to render the QR code
      const svg = document.getElementById(`qr-code-${qrCode.id}`)?.querySelector('svg');
      if (!svg) {
        throw new Error('QR code not found');
      }

      // Convert SVG to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();

      img.onload = () => {
        canvas.width = 512;
        canvas.height = 600; // Extra space for text
        
        if (ctx) {
          // White background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw QR code
          ctx.drawImage(img, 56, 40, 400, 400);

          // Add center name
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(center.name, 256, 480);

          // Add instruction text
          ctx.font = '16px Arial';
          ctx.fillText('Scan this QR code to check in', 256, 510);

          // Add timestamp
          ctx.font = '12px Arial';
          ctx.fillStyle = '#666666';
          ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, 256, 540);

          // Convert to blob and download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${center.name.replace(/\s+/g, '-')}-QR-Code.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
          });
        }
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err: any) {
      console.error('Error downloading QR code:', err);
      setError('Failed to download QR code');
    }
  };

  const activeQRCode = qrCodes.find(qr => qr.is_active);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">QR Code Management</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          {center.name}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Active QR Code Display */}
            {activeQRCode ? (
              <Paper elevation={2} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Active QR Code
                </Typography>
                <Box
                  id={`qr-code-${activeQRCode.id}`}
                  display="flex"
                  justifyContent="center"
                  my={2}
                >
                  <QRCodeSVG
                    value={activeQRCode.qr_code_value}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Parents scan this QR code to check in at {center.name}
                </Typography>
                <Box display="flex" gap={1} justifyContent="center" mt={2}>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadQRCode(activeQRCode)}
                  >
                    Download QR Code
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<BlockIcon />}
                    onClick={() => toggleQRCodeStatus(activeQRCode)}
                  >
                    Revoke
                  </Button>
                </Box>
              </Paper>
            ) : (
              <Alert severity="warning" sx={{ mb: 3 }}>
                No active QR code found. Generate a new one to enable check-ins.
              </Alert>
            )}

            {/* QR Code History */}
            {qrCodes.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom>
                  QR Code History
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  {qrCodes.map((qrCode) => (
                    <Paper key={qrCode.id} elevation={1} sx={{ p: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Chip
                              label={qrCode.is_active ? 'Active' : 'Revoked'}
                              color={qrCode.is_active ? 'success' : 'default'}
                              size="small"
                              icon={qrCode.is_active ? <CheckCircleIcon /> : <BlockIcon />}
                            />
                            <Typography variant="caption" color="textSecondary">
                              Created: {new Date(qrCode.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="textSecondary" display="block">
                            Code: {qrCode.qr_code_value.slice(0, 8)}...
                          </Typography>
                          {qrCode.revoked_at && (
                            <Typography variant="caption" color="error" display="block">
                              Revoked: {new Date(qrCode.revoked_at).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                        <Box display="flex" gap={1}>
                          {!qrCode.is_active && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => toggleQRCodeStatus(qrCode)}
                            >
                              Activate
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={generating ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={generateNewQRCode}
          disabled={generating}
        >
          {generating ? 'Generating...' : 'Generate New QR Code'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


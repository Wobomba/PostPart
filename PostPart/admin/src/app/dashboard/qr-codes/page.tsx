'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '../../../components/DashboardLayout';
import { supabase } from '../../../../lib/supabase';
import type { CenterQRCode, Center } from '../../../../../shared/types';

function QRCodesPageContent() {
  const searchParams = useSearchParams();
  const centerId = searchParams.get('center');
  
  const [qrCodes, setQrCodes] = useState<(CenterQRCode & { center?: Center })[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState(centerId || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCenters();
  }, []);

  useEffect(() => {
    if (selectedCenterId) {
      loadQRCodes();
    }
  }, [selectedCenterId]);

  const loadCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('centers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCenters(data || []);
    } catch (error) {
      console.error('Error loading centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQRCodes = async () => {
    if (!selectedCenterId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('center_qr_codes')
        .select('*, center:centers(*)')
        .eq('center_id', selectedCenterId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQrCodes(data || []);
    } catch (error) {
      console.error('Error loading QR codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!selectedCenterId) {
      alert('Please select a center first');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate unique QR code value
      const qrValue = `POSTPART-${selectedCenterId}-${Date.now()}`;

      const { error } = await supabase
        .from('center_qr_codes')
        .insert({
          center_id: selectedCenterId,
          qr_code_value: qrValue,
          is_active: true,
          created_by: user.id,
          activated_at: new Date().toISOString(),
        });

      if (error) throw error;

      alert('QR Code generated successfully!');
      loadQRCodes();
    } catch (error: any) {
      alert('Error generating QR code: ' + error.message);
    }
  };

  const toggleQRCodeStatus = async (qrCodeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('center_qr_codes')
        .update({
          is_active: !currentStatus,
          revoked_at: !currentStatus ? null : new Date().toISOString(),
        })
        .eq('id', qrCodeId);

      if (error) throw error;

      loadQRCodes();
    } catch (error: any) {
      alert('Error updating QR code: ' + error.message);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: { xs: 4, sm: 5, md: 6 } }}>
          QR Code Management
        </Typography>

        {/* Centre Selector */}
        <Card sx={{ mb: { xs: 3, sm: 4, md: 5 } }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="body2" component="label" htmlFor="center" sx={{ display: 'block', fontWeight: 500, mb: 2 }}>
              Select Centre
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box component="select"
                id="center"
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                sx={{
                  flex: 1,
                  minWidth: '200px',
                  px: 2,
                  py: 1.5,
                  border: '1px solid',
                  borderColor: 'grey.300',
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  '&:focus': {
                    outline: 'none',
                    borderColor: '#E91E63',
                    ring: '2px',
                    ringColor: '#E91E63',
                  },
                }}
              >
                <option value="">Choose a centre...</option>
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </Box>
              <Box
                component="button"
                onClick={generateQRCode}
                disabled={!selectedCenterId}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: '#E91E63',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  '&:hover:not(:disabled)': {
                    bgcolor: '#C2185B',
                  },
                  '&:disabled': {
                    opacity: 0.5,
                    cursor: 'not-allowed',
                  },
                }}
              >
                + Generate QR Code
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* QR Codes List */}
        {selectedCenterId && (
          <Card sx={{ flexGrow: 1 }}>
            <Box sx={{ px: { xs: 3, sm: 4, md: 4 }, py: { xs: 2, sm: 2.5, md: 3 }, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                QR Codes for {centers.find(c => c.id === selectedCenterId)?.name}
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="thead" sx={{ bgcolor: 'grey.50' }}>
                  <Box component="tr">
                    <Box component="th" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 2.5 }, textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>
                      QR Code Value
                    </Box>
                    <Box component="th" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 2.5 }, textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>
                      Status
                    </Box>
                    <Box component="th" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 2.5 }, textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>
                      Created
                    </Box>
                    <Box component="th" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 2.5 }, textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>
                      Actions
                    </Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {loading ? (
                    <Box component="tr">
                      <Box component="td" colSpan={4} sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 4, textAlign: 'center', color: 'text.secondary' }}>
                        Loading...
                      </Box>
                    </Box>
                  ) : qrCodes.length === 0 ? (
                    <Box component="tr">
                      <Box component="td" colSpan={4} sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 4, textAlign: 'center', color: 'text.secondary' }}>
                        No QR codes generated yet
                      </Box>
                    </Box>
                  ) : (
                    qrCodes.map((qr) => (
                      <Box component="tr" key={qr.id}>
                        <Box component="td" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 2.5 }, fontSize: '0.875rem', fontFamily: 'monospace', color: 'text.primary' }}>
                          {qr.qr_code_value}
                        </Box>
                        <Box component="td" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 2.5 }, whiteSpace: 'nowrap' }}>
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: '16px',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              bgcolor: qr.is_active ? 'success.light' : 'error.light',
                              color: qr.is_active ? 'success.dark' : 'error.dark',
                            }}
                          >
                            {qr.is_active ? 'Active' : 'Inactive'}
                          </Box>
                        </Box>
                        <Box component="td" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 2.5 }, whiteSpace: 'nowrap', fontSize: '0.875rem', color: 'text.secondary' }}>
                          {new Date(qr.created_at).toLocaleDateString()}
                        </Box>
                        <Box component="td" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 2.5 }, whiteSpace: 'nowrap' }}>
                          <Box
                            component="button"
                            onClick={() => toggleQRCodeStatus(qr.id, qr.is_active)}
                            sx={{
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              color: '#E91E63',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              '&:hover': {
                                color: '#C2185B',
                              },
                            }}
                          >
                            {qr.is_active ? 'Deactivate' : 'Activate'}
                          </Box>
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            </Box>
          </Card>
        )}
      </Box>
    </DashboardLayout>
  );
}

export default function QRCodesPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          Loading...
        </div>
      </DashboardLayout>
    }>
      <QRCodesPageContent />
    </Suspense>
  );
}


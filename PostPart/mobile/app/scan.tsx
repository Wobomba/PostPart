import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { checkParentStatus } from '../utils/parentStatus';
import { Colors, Typography, Spacing, Layout, BorderRadius } from '../constants/theme';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkParentStatus();
      if (!status.isActive) {
        Alert.alert(
          'Account Inactive',
          status.message || 'Your account is currently inactive. Please contact your organization administrator for assistance.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
        );
      }
    };
    checkStatus();
  }, []);

  const verifyCanCheckIn = async () => {
    const status = await checkParentStatus();
    return status.isActive;
  };

  if (!permission) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconContainer}>
            <Ionicons name="camera" size={80} color={Colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            PostPart needs camera access to scan QR codes at daycare centers
          </Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            fullWidth
            style={styles.permissionButton}
          />
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="ghost"
            fullWidth
            style={styles.backButton}
          />
        </View>
      </Screen>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);

    try {
      // First, verify parent status
      const canCheckIn = await verifyCanCheckIn();
      
      if (!canCheckIn) {
        // Parent is not active - alert already shown by verifyCanCheckIn
        setScanned(false);
        setProcessing(false);
        return;
      }

      // Validate QR code and get center info
      const { data: qrCodeData, error: qrError } = await supabase
        .from('center_qr_codes')
        .select('*, center:centers(*)')
        .eq('qr_code_value', data)
        .eq('is_active', true)
        .single();

      if (qrError || !qrCodeData) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not recognized or is no longer active.',
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
        setProcessing(false);
        return;
      }

      // Navigate to check-in screen
      router.push({
        pathname: '/check-in',
        params: {
          qrCodeId: qrCodeData.id,
          centerId: qrCodeData.center_id,
          centerName: qrCodeData.center.name,
        },
      });
    } catch (error: any) {
      console.error('Error processing QR code:', error);
      Alert.alert(
        'Error',
        'Failed to process QR code. Please try again.',
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Button
          title="← Cancel"
          onPress={() => router.back()}
          variant="ghost"
        />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Scan QR Code</Text>
        <Text style={styles.instructionsText}>
          Position the QR code within the frame to check in
        </Text>
        {processing && (
          <Text style={styles.processingText}>Processing...</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
  },
  permissionContainer: {
    flex: 1,
    padding: Layout.screenPadding,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionIconContainer: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    marginBottom: Spacing.xl,
  },
  backButton: {
    marginTop: Spacing.md,
  },
  header: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.sm,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: BorderRadius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: BorderRadius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: BorderRadius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: BorderRadius.md,
  },
  instructions: {
    padding: Layout.screenPadding,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  instructionsText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
    textAlign: 'center',
  },
  processingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    marginTop: Spacing.md,
    fontWeight: Typography.fontWeight.medium,
  },
});


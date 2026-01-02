-- =====================================================
-- Create Center QR Codes Table
-- =====================================================
-- This table stores unique QR codes for each center
-- Parents scan these QR codes to check in

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS center_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  qr_code_value TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_center_qr_codes_center_id ON center_qr_codes(center_id);
CREATE INDEX IF NOT EXISTS idx_center_qr_codes_qr_code_value ON center_qr_codes(qr_code_value);
CREATE INDEX IF NOT EXISTS idx_center_qr_codes_is_active ON center_qr_codes(is_active);

-- Enable RLS
ALTER TABLE center_qr_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read all QR codes" ON center_qr_codes;
DROP POLICY IF EXISTS "Authenticated users can insert QR codes" ON center_qr_codes;
DROP POLICY IF EXISTS "Authenticated users can update QR codes" ON center_qr_codes;
DROP POLICY IF EXISTS "Authenticated users can delete QR codes" ON center_qr_codes;

-- RLS Policies

-- 1. Allow authenticated users (admins) to read all QR codes
CREATE POLICY "Authenticated users can read all QR codes"
ON center_qr_codes
FOR SELECT
TO authenticated
USING (true);

-- 2. Allow authenticated users (admins) to create QR codes
CREATE POLICY "Authenticated users can insert QR codes"
ON center_qr_codes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Allow authenticated users (admins) to update QR codes (for revoking/activating)
CREATE POLICY "Authenticated users can update QR codes"
ON center_qr_codes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Allow authenticated users (admins) to delete QR codes
CREATE POLICY "Authenticated users can delete QR codes"
ON center_qr_codes
FOR DELETE
TO authenticated
USING (true);

-- Add helpful comments
COMMENT ON TABLE center_qr_codes IS 'Stores unique QR codes for each center that parents scan for check-ins';
COMMENT ON COLUMN center_qr_codes.qr_code_value IS 'Unique identifier stored in QR code (UUID format)';
COMMENT ON COLUMN center_qr_codes.is_active IS 'Whether this QR code is currently active and can be used for check-ins';
COMMENT ON COLUMN center_qr_codes.activated_at IS 'When this QR code was first activated';
COMMENT ON COLUMN center_qr_codes.revoked_at IS 'When this QR code was revoked (if applicable)';

-- Verify the table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'center_qr_codes'
ORDER BY ordinal_position;


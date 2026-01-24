import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://etajqqnejfolsmslbsom.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const normalizePhone = (rawPhone: string) => {
  const trimmed = rawPhone.trim();
  const cleaned = trimmed.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) {
    return `+${cleaned.slice(2)}`;
  }
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  return `+${cleaned}`;
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/auth/verify-otp
 * Verify OTP code and confirm user's email in Supabase Auth
 * This replaces Supabase's email OTP verification with phone OTP via Africa's Talking
 */
export async function POST(request: NextRequest) {
  try {
    const { email, phone, code, type = 'signup' } = await request.json();
    const normalizedPhone = normalizePhone(phone || '');
    const isSignup = type === 'signup';

    // Validate input
    if ((isSignup && !email) || !normalizedPhone || !code) {
      return NextResponse.json(
        { error: 'Email, phone, and code are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Find the OTP code
    let otpQuery = supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('code', code)
      .eq('verified', false)
      .eq('type', type);

    if (email) {
      otpQuery = otpQuery.eq('email', email.toLowerCase().trim());
    }

    const { data: otpData, error: otpError } = await otpQuery
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if OTP has expired (10 minutes)
    const expiresAt = new Date(otpData.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_codes')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', otpData.id);

    // Handle different OTP types
    if (type === 'signup') {
      // For signup, verify the user's email in Supabase Auth
      // The user should already exist from registration
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

      if (userError) {
        console.error('Error finding user:', userError);
        return NextResponse.json(
          { error: 'User not found. Please complete registration first.' },
          { status: 404, headers: corsHeaders }
        );
      }

      const user = users.find((u) => u.email === email.toLowerCase().trim());

      if (!user) {
        return NextResponse.json(
          { error: 'User not found. Please complete registration first.' },
          { status: 404, headers: corsHeaders }
        );
      }

      // Confirm the user's email in Supabase Auth
      // This allows them to sign in after OTP verification
      const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });

      if (confirmError) {
        console.error('Error confirming email:', confirmError);
        return NextResponse.json(
          { error: 'Failed to verify account. Please try again.' },
          { status: 500, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Phone verified successfully. You can now sign in.',
          userId: user.id,
        },
        { headers: corsHeaders }
      );
    }

    if (type === 'login') {
      return NextResponse.json(
        {
          success: true,
          message: 'OTP verified. You can now sign in.',
        },
        { headers: corsHeaders }
      );
    }

    if (type === 'password_reset') {
      return NextResponse.json(
        {
          success: true,
          message: 'OTP verified. You can now reset your password.',
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'OTP verified successfully',
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

const buildPhoneCandidates = (rawPhone: string) => {
  const cleanedDigits = rawPhone.replace(/[^\d]/g, '');
  const candidates = new Set<string>();

  if (cleanedDigits) {
    candidates.add(`+${cleanedDigits}`);
    candidates.add(cleanedDigits);
  }

  if (cleanedDigits.startsWith('256')) {
    candidates.add(`0${cleanedDigits.slice(3)}`);
  } else if (cleanedDigits.startsWith('0')) {
    candidates.add(cleanedDigits);
  } else if (cleanedDigits.length === 9) {
    candidates.add(`0${cleanedDigits}`);
  }

  return Array.from(candidates);
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { phone, code, password } = await request.json();
    const normalizedPhone = normalizePhone(phone || '');

    if (!normalizedPhone || !code || !password) {
      return NextResponse.json(
        { error: 'Phone number, code, and new password are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: otpData, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('code', code)
      .eq('type', 'password_reset')
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400, headers: corsHeaders }
      );
    }

    const expiresAt = new Date(otpData.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const phoneCandidates = buildPhoneCandidates(phone || normalizedPhone);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .in('phone', phoneCandidates)
      .maybeSingle();

    if (profileError) {
      console.error('Error looking up profile by phone:', profileError);
      return NextResponse.json(
        { error: 'An unexpected error occurred. Please try again.' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!profile?.id) {
      return NextResponse.json(
        { error: 'No account found for that phone number' },
        { status: 404, headers: corsHeaders }
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
      password,
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset password. Please try again.' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Password reset successfully' },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}


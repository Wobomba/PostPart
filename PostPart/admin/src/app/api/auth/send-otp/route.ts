import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Africa's Talking credentials
const AT_API_KEY = process.env.AFRICAS_TALKING_API_KEY!;
const AT_USERNAME = process.env.AFRICAS_TALKING_USERNAME!;
const AT_SENDER_ID = process.env.AFRICAS_TALKING_SENDER_ID || process.env.AFRICAS_TALKING_FROM;

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/auth/send-otp
 * Generate and send OTP code via Africa's Talking SMS
 */
export async function POST(request: NextRequest) {
  try {
    const { email, phone, type: rawType } = await request.json();
    const type = rawType || (email ? 'signup' : 'password_reset');
    const normalizedPhone = normalizePhone(phone || '');
    const isPasswordReset = type === 'password_reset';

    // Validate type
    if (!['signup', 'login', 'password_reset'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid OTP type. Must be: signup, login, or password_reset' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate input
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (type === 'signup' && !email) {
      return NextResponse.json(
        { error: 'Required fields are missing' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate phone format (should be international format)
    if (!normalizedPhone.startsWith('+')) {
      return NextResponse.json(
        { error: 'Phone number must be in international format (e.g., +256700123456)' },
        { status: 400, headers: corsHeaders }
      );
    }

    let resolvedEmail = email?.toLowerCase().trim();
    const shouldVerifyAccount = type === 'login' || isPasswordReset;

    if (shouldVerifyAccount) {
      const phoneCandidates = buildPhoneCandidates(phone || normalizedPhone);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .in('phone', phoneCandidates)
        .maybeSingle();

      if (profileError) {
        console.error('Error looking up profile by phone:', profileError);
        return NextResponse.json(
          { error: 'An unexpected error occurred. Please try again.' },
          { status: 500, headers: corsHeaders }
        );
      }

      if (!profile?.email) {
        return NextResponse.json(
          {
            success: true,
            message: 'If an account exists for that number, an OTP will be shared.',
          },
          { headers: corsHeaders }
        );
      }

      resolvedEmail = profile.email.toLowerCase().trim();
    }

    // Check rate limiting (prevent abuse)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const { count: recentCount } = await supabase
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('phone', normalizedPhone)
      .gte('created_at', oneMinuteAgo.toISOString());

    if (recentCount && recentCount > 0) {
      return NextResponse.json(
        {
          error: 'Please wait 60 seconds before requesting another code',
          retryAfter: 60,
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any previous unverified OTPs for this email/phone
    await supabase
      .from('otp_codes')
      .update({ verified: true }) // Mark as "used" by setting verified
      .eq('email', resolvedEmail)
      .eq('phone', normalizedPhone)
      .eq('verified', false);

    // Store OTP in database
    const { error: dbError } = await supabase
      .from('otp_codes')
      .insert({
        email: resolvedEmail,
        phone: normalizedPhone,
        code: otp,
        type: type,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (dbError) {
      console.error('Error storing OTP:', dbError);
      return NextResponse.json(
        { error: 'Failed to generate OTP. Please try again.' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Send SMS via Africa's Talking
    // Check if credentials are available
    if (!AT_API_KEY || !AT_USERNAME) {
      console.error('Africa\'s Talking credentials missing:', {
        hasApiKey: !!AT_API_KEY,
        hasUsername: !!AT_USERNAME,
      });
      return NextResponse.json(
        { error: 'SMS service not configured. Please contact support.' },
        { status: 500, headers: corsHeaders }
      );
    }

    try {
      const smsBody = new URLSearchParams({
        username: AT_USERNAME,
        to: normalizedPhone,
        message: `Your PostPart verification code is: ${otp}. Valid for 10 minutes.`,
      });
      if (AT_SENDER_ID) {
        smsBody.append('from', AT_SENDER_ID);
      }

      const smsResponse = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          ApiKey: AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: smsBody,
      });

      // Check if response is ok before trying to parse JSON
      if (!smsResponse.ok) {
        const errorText = await smsResponse.text();
        console.error('Africa\'s Talking API HTTP error:', {
          status: smsResponse.status,
          statusText: smsResponse.statusText,
          body: errorText,
        });

        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = { raw: errorText };
        }

        return NextResponse.json(
          {
            error: 'Failed to send SMS. Please check your phone number and try again.',
            details: errorDetails,
          },
          { status: 500, headers: corsHeaders }
        );
      }

      const smsResult = await smsResponse.json();
      console.log('Africa\'s Talking API response:', smsResult);

      // Check if SMS was sent successfully
      const recipientStatus = smsResult.SMSMessageData?.Recipients?.[0]?.status;
      if (recipientStatus !== 'Success') {
        console.error('Africa\'s Talking SMS failed:', {
          status: recipientStatus,
          fullResponse: smsResult,
        });

        return NextResponse.json(
          {
            error: 'Failed to send SMS. Please check your phone number and try again.',
            details: smsResult,
          },
          { status: 500, headers: corsHeaders }
        );
      }

      console.log('OTP sent successfully to', normalizedPhone);

      return NextResponse.json(
        {
          success: true,
          message: isPasswordReset
            ? 'If an account exists for that number, an OTP will be shared.'
            : 'OTP code sent successfully',
          // Don't send the code back in production!
          // Only include in development for testing
          ...(process.env.NODE_ENV === 'development' && { code: otp }),
        },
        { headers: corsHeaders }
      );
    } catch (smsError: any) {
      console.error('Error sending SMS to Africa\'s Talking:', {
        message: smsError.message,
        stack: smsError.stack,
        name: smsError.name,
      });
      return NextResponse.json(
        {
          error: 'Failed to send SMS. Please try again later.',
          details: process.env.NODE_ENV === 'development' ? smsError.message : undefined,
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}


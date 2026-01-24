import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://etajqqnejfolsmslbsom.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create admin client with service role key (bypasses RLS)
const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// POST - Send password reset email to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your .env.local file.' 
        },
        { status: 500 }
      );
    }

    const { id } = await params;

    // Get user email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const email = userData.user.email;
    if (!email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Generate password recovery link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/set-password`,
      },
    });

    if (linkError) {
      console.error('Error generating password reset link:', linkError);
      return NextResponse.json(
        { error: linkError.message || 'Failed to generate password reset link' },
        { status: 400 }
      );
    }

    // Note: generateLink doesn't automatically send the email
    // We need to use the regular auth client to send the recovery email
    // For now, return the link (admin can send it manually or we can use edge functions)
    
    // Actually, let's use the admin API to send recovery email
    // We'll need to use the anon key client for this
    const supabaseAnon = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // Send password recovery email
    const { error: resetError } = await supabaseAnon.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/set-password`,
    });

    if (resetError) {
      console.error('Error sending password reset email:', resetError);
      return NextResponse.json(
        { error: resetError.message || 'Failed to send password reset email' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Password reset email sent successfully'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/users/[id]/send-reset:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}






















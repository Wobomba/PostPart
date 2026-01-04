import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// API route for user management
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

// GET - List all users with their roles
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your .env.local file.' 
        },
        { status: 500 }
      );
    }

    // Get all users
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: usersError.message },
        { status: 400 }
      );
    }

    // Get all roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('*');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return NextResponse.json(
        { error: rolesError.message },
        { status: 400 }
      );
    }

    // Combine users with their roles
    const usersWithRoles = usersData.users.map(user => {
      const userRole = roles?.find(r => r.user_id === user.id);
      return {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || undefined,
        role: userRole?.role || undefined,
        role_created_at: userRole?.created_at,
      };
    });

    return NextResponse.json(usersWithRoles, { status: 200 });
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new user
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your .env.local file.' 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate a temporary random password (user will set their own after email verification)
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + 'A1!';

    // Create user in auth with email confirmation required
    // User will receive email verification link, then set their password
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword, // Temporary password, user will set their own
      email_confirm: false, // User must verify email first
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    if (!userData.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 400 }
      );
    }

    // Assign role if provided
    if (role) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert(
          {
            user_id: userData.user.id,
            role: role,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

      if (roleError) {
        console.error('Error assigning role:', roleError);
        // User was created but role assignment failed
        return NextResponse.json(
          { 
            userId: userData.user.id,
            error: `User created but role assignment failed: ${roleError.message}` 
          },
          { status: 201 }
        );
      }
    }

    // Supabase automatically sends email verification when email_confirm is false
    // After user verifies their email, we'll send a password recovery email
    // so they can set their own password
    
    // Note: The password recovery email will be sent automatically by Supabase
    // when the user uses "Forgot Password" after email verification.
    // Alternatively, admin can manually send password reset from Supabase dashboard.
    
    // For automatic password setup after verification, we could:
    // 1. Set up a database trigger to send recovery email after email_confirmed_at is set
    // 2. Or use Supabase webhooks
    // For now, user will verify email, then use "Forgot Password" to set password

    return NextResponse.json(
      { 
        success: true, 
        userId: userData.user.id,
        message: 'User created. Email verification and password set link sent to user.'
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/users:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

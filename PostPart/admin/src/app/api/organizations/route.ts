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

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your .env.local file. Get it from Supabase Dashboard > Settings > API > service_role key' 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Error creating organization:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/organizations:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your .env.local file. Get it from Supabase Dashboard > Settings > API > service_role key' 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Get current organization to check if status is changing
    const { data: currentOrg } = await supabaseAdmin
      .from('organizations')
      .select('status')
      .eq('id', id)
      .single();

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating organization:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // If organization status changed, update parent statuses accordingly
    // Strategy: Store original status before changing, then restore when org becomes active
    if (currentOrg && updateData.status && currentOrg.status !== updateData.status) {
      if (updateData.status === 'inactive' || updateData.status === 'suspended') {
        // Organization is being deactivated/suspended: 
        // 1. Store the original status of active parents in status_before_org_change
        // 2. Update active parents to match organization status
        // This preserves the status of parents who are 'inactive' (waiting for review) 
        // or 'suspended' (individually suspended)
        
        // First, store the original status for active parents
        const { error: storeStatusError } = await supabaseAdmin
          .from('profiles')
          .update({ status_before_org_change: 'active' })
          .eq('organization_id', id)
          .eq('status', 'active')
          .is('status_before_org_change', null); // Only store if not already set

        if (storeStatusError) {
          console.error('Error storing original parent statuses:', storeStatusError);
        }

        // Then update active parents to match organization status
        const { error: parentUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({ status: updateData.status })
          .eq('organization_id', id)
          .eq('status', 'active'); // Only affect parents that are currently active

        if (parentUpdateError) {
          console.error('Error updating parent statuses:', parentUpdateError);
          // Don't fail the request, but log the error
        } else {
          console.log(`Updated active parent statuses to ${updateData.status} for organization ${id}`);
        }
      } else if (updateData.status === 'active' && (currentOrg.status === 'inactive' || currentOrg.status === 'suspended')) {
        // Organization is being reactivated: 
        // Restore parents to their original status (stored in status_before_org_change)
        // This ensures parents who were 'inactive' (waiting for review) remain 'inactive'
        // and parents who were 'active' are restored to 'active'
        
        // Get the organization's previous status to identify affected parents
        const orgPreviousStatus = currentOrg.status;
        
        // Restore parents that have status_before_org_change set (they were affected by org status change)
        // and currently match the org's previous status
        const { data: parentsToRestore } = await supabaseAdmin
          .from('profiles')
          .select('id, status_before_org_change')
          .eq('organization_id', id)
          .eq('status', orgPreviousStatus)
          .not('status_before_org_change', 'is', null);

        if (parentsToRestore && parentsToRestore.length > 0) {
          // Restore each parent to their original status
          for (const parent of parentsToRestore) {
            const originalStatus = parent.status_before_org_change;
            const { error: restoreError } = await supabaseAdmin
              .from('profiles')
              .update({ 
                status: originalStatus,
                status_before_org_change: null // Clear the stored status after restoration
              })
              .eq('id', parent.id);

            if (restoreError) {
              console.error(`Error restoring parent ${parent.id} to ${originalStatus}:`, restoreError);
            }
          }
          console.log(`Restored ${parentsToRestore.length} parents to their original statuses for organization ${id}`);
        }
      }
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Error in PUT /api/organizations:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


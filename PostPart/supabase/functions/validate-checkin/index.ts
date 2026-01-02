// Supabase Edge Function: Validate Check-In
// Validates QR code and enforces allocation limits before allowing check-in

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckInRequest {
  qr_code_value: string;
  parent_id: string;
  child_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify JWT
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { qr_code_value, parent_id, child_id }: CheckInRequest = await req.json();

    // Validate input
    if (!qr_code_value || !parent_id || !child_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify parent_id matches authenticated user
    if (user.id !== parent_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Parent ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Validate QR code exists and is active
    const { data: qrCode, error: qrError } = await supabaseClient
      .from('center_qr_codes')
      .select('*, center:centers(*)')
      .eq('qr_code_value', qr_code_value)
      .eq('is_active', true)
      .single();

    if (qrError || !qrCode) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive QR code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Check if child belongs to parent
    const { data: child, error: childError } = await supabaseClient
      .from('children')
      .select('*')
      .eq('id', child_id)
      .eq('parent_id', parent_id)
      .single();

    if (childError || !child) {
      return new Response(
        JSON.stringify({ error: 'Child not found or does not belong to parent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get parent's organization
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', parent_id)
      .single();

    const organizationId = profile?.organization_id;

    // Step 4: Check allocation limits (if organization has allocations)
    if (organizationId) {
      const currentDate = new Date();
      
      // Check for parent-specific allocation first
      let { data: allocation } = await supabaseClient
        .from('allocations')
        .select('*')
        .eq('parent_id', parent_id)
        .lte('period_start_date', currentDate.toISOString().split('T')[0])
        .gte('period_end_date', currentDate.toISOString().split('T')[0])
        .single();

      // Fall back to organization-level allocation
      if (!allocation) {
        const result = await supabaseClient
          .from('allocations')
          .select('*')
          .eq('organization_id', organizationId)
          .is('parent_id', null)
          .lte('period_start_date', currentDate.toISOString().split('T')[0])
          .gte('period_end_date', currentDate.toISOString().split('T')[0])
          .single();
        
        allocation = result.data;
      }

      // If allocation exists, check limits
      if (allocation) {
        if (allocation.visits_used >= allocation.visit_limit) {
          return new Response(
            JSON.stringify({ 
              error: 'Visit limit reached',
              message: `You have reached your visit limit of ${allocation.visit_limit} for this period.`
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Increment visits_used
        await supabaseClient
          .from('allocations')
          .update({ visits_used: allocation.visits_used + 1 })
          .eq('id', allocation.id);
      }
    }

    // Step 5: Create check-in record
    const { data: checkin, error: checkinError } = await supabaseClient
      .from('checkins')
      .insert({
        parent_id,
        center_id: qrCode.center_id,
        child_id,
        qr_code_id: qrCode.id,
        check_in_time: new Date().toISOString(),
      })
      .select('*, center:centers(name), child:children(first_name, last_name)')
      .single();

    if (checkinError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create check-in', details: checkinError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        checkin,
        message: 'Check-in successful'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is super_admin
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || callerProfile?.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can terminate sessions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user ID from request
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-termination
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot terminate your own session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Terminating sessions for user: ${userId}`);

    // First, sign out the user from all sessions using admin API
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(userId, 'global');

    if (signOutError) {
      console.error('Error signing out user:', signOutError);
      return new Response(
        JSON.stringify({ error: 'Failed to terminate session', details: signOutError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also update metadata to track when sessions were invalidated
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { 
        sessions_invalidated_at: new Date().toISOString() 
      }
    });

    if (updateError) {
      console.warn('Error updating user metadata:', updateError);
      // Don't fail - the signOut was successful
    }

    // Also invalidate any 2FA verifications for this user
    const { error: twoFaError } = await supabaseAdmin
      .from('session_2fa_verifications')
      .delete()
      .eq('user_id', userId);

    if (twoFaError) {
      console.warn('Error invalidating 2FA verifications:', twoFaError);
      // Don't fail the request for this
    }

    // Log the action
    await supabaseAdmin.from('logs').insert({
      entity_type: 'session',
      entity_id: userId,
      action: 'session_terminated',
      user_id: caller.id,
      new_values: { target_user_id: userId, terminated_by: caller.id },
    });

    console.log(`Successfully terminated sessions for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'User session terminated' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in terminate-user-session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is authenticated and is super_admin
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
        JSON.stringify({ error: 'Only super admins can view active sessions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all users from auth.users using admin API
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching auth users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get profiles for additional info
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, is_active')
      .is('deleted_at', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of profiles by id
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Get inactivity timeout from system settings (default 5 minutes)
    const { data: inactivitySetting } = await supabaseAdmin
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'inactivity_logout_minutes')
      .single();

    const inactivityMinutes = inactivitySetting?.setting_value 
      ? parseInt(inactivitySetting.setting_value, 10) 
      : 5;

    // Filter and map to active sessions
    // Consider a session "active" only if user signed in within the inactivity timeout
    // AND their session hasn't been invalidated after sign in
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - inactivityMinutes * 60 * 1000);

    const sessions = authUsers.users
      .filter(u => {
        const profile = profileMap.get(u.id);
        if (profile?.is_active === false) return false;
        
        // Only include users who signed in within the inactivity window
        if (!u.last_sign_in_at) return false;
        const signInTime = new Date(u.last_sign_in_at);
        if (signInTime < cutoffTime) return false;
        
        // Check if session was invalidated after sign in
        const sessionsInvalidatedAt = u.app_metadata?.sessions_invalidated_at;
        if (sessionsInvalidatedAt) {
          const invalidatedTime = new Date(sessionsInvalidatedAt);
          // If sessions were invalidated after the last sign in, exclude this user
          if (invalidatedTime > signInTime) {
            console.log(`Excluding user ${u.email}: session invalidated at ${sessionsInvalidatedAt}`);
            return false;
          }
        }
        
        return true;
      })
      .map(u => {
        const profile = profileMap.get(u.id);
        return {
          user_id: u.id,
          user_email: u.email || profile?.email || 'N/A',
          user_full_name: profile?.full_name || null,
          last_sign_in_at: u.last_sign_in_at,
          created_at: u.created_at,
        };
      })
      .sort((a, b) => {
        // Sort by last sign in, most recent first
        const dateA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
        const dateB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
        return dateB - dateA;
      });

    console.log(`Returning ${sessions.length} active sessions (cutoff: ${cutoffTime.toISOString()})`);

    return new Response(
      JSON.stringify({ sessions }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-active-sessions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with the session token for validation
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the current session user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller's profile
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch user profile' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is super_admin
    if (callerProfile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Only super admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is active
    if (!callerProfile.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Your account is not active' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetUserId, password } = await req.json();

    if (!targetUserId || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (targetUserId === user.id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          errorCode: 'CANNOT_DELETE_SELF',
          error: 'You cannot delete your own user account'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller's password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: callerProfile.email,
      password: password,
    });

    if (signInError) {
      console.error('Password verification failed:', signInError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          errorCode: 'INVALID_PASSWORD',
          error: 'Incorrect password'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for checking activity
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check for related records in various tables
    const tables = [
      { table: 'projects', columns: ['owner_user_id', 'responsible1_user_id', 'responsible2_user_id'] },
      { table: 'tasks', columns: ['created_by', 'responsible_user_id'] },
      { table: 'documents', columns: ['uploaded_by'] },
      { table: 'logs', columns: ['user_id'] },
    ];

    let totalActivity = 0;

    for (const { table, columns } of tables) {
      for (const column of columns) {
        const { count, error } = await serviceClient
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq(column, targetUserId);
        
        if (error) {
          console.error(`Error checking ${table}.${column}:`, error);
          continue;
        }
        
        totalActivity += count || 0;
      }
    }

    if (totalActivity > 0) {
      console.log(`User ${targetUserId} has ${totalActivity} related records, blocking deletion`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          errorCode: 'USER_HAS_ACTIVITY',
          error: 'This user cannot be deleted because there is already activity linked to them. Please set the user to inactive on the Users tab.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No activity found, proceed with hard delete
    console.log(`Deleting user ${targetUserId} (no activity found)`);

    // Broadcast session termination BEFORE deletion so the user gets logged out
    const channelName = `session-terminate-${targetUserId}`;
    const channel = serviceClient.channel(channelName);
    
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'terminate',
      payload: { reason: 'user_deleted' }
    });
    console.log(`Broadcast terminate event to channel ${channelName}`);
    
    // Small delay to ensure broadcast is sent
    await new Promise(resolve => setTimeout(resolve, 100));
    await serviceClient.removeChannel(channel);

    // Delete from locked_accounts
    const { error: lockedAccountsError } = await serviceClient
      .from('locked_accounts')
      .delete()
      .eq('user_id', targetUserId);

    if (lockedAccountsError) {
      console.error('Error deleting locked_accounts:', lockedAccountsError);
    }

    // Delete from login_attempts
    const { error: loginAttemptsError } = await serviceClient
      .from('login_attempts')
      .delete()
      .eq('user_id', targetUserId);

    if (loginAttemptsError) {
      console.error('Error deleting login_attempts:', loginAttemptsError);
    }

    // Delete from user_company_permissions
    const { error: permissionsError } = await serviceClient
      .from('user_company_permissions')
      .delete()
      .eq('user_id', targetUserId);

    if (permissionsError) {
      console.error('Error deleting user_company_permissions:', permissionsError);
    }

    // Delete from user_companies
    const { error: userCompaniesError } = await serviceClient
      .from('user_companies')
      .delete()
      .eq('user_id', targetUserId);

    if (userCompaniesError) {
      console.error('Error deleting user_companies:', userCompaniesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to delete user company mappings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete from profiles
    const { error: profilesError } = await serviceClient
      .from('profiles')
      .delete()
      .eq('id', targetUserId);

    if (profilesError) {
      console.error('Error deleting profile:', profilesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to delete user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete from auth.users
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(targetUserId);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to delete auth user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted user ${targetUserId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in admin-delete-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

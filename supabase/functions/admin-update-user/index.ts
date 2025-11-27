import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the Authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client with the request's auth context
    const requestSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await requestSupabase.auth.getUser();

    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the caller is a super admin
    const { data: callerProfile, error: profileError } = await requestSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching caller profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (callerProfile?.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can update user emails' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if email is already in use by another user
    const { data: existingUsers, error: checkError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (checkError) {
      console.error('Error checking existing users:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailExists = existingUsers.users.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase() && u.id !== userId
    );

    if (emailExists) {
      console.log('Email already registered:', email);
      return new Response(
        JSON.stringify({
          errorCode: 'EMAIL_ALREADY_REGISTERED',
          message: 'A user with this email address has already been registered',
          message_hu: 'Ezzel az e-mail címmel már létezik felhasználó. Adj meg másik címet vagy szerkeszd a meglévő felhasználót.',
          message_en: 'A user with this email address already exists. Please use a different email or edit the existing user.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the user's email in auth
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email }
    );

    if (updateError) {
      console.error('Error updating user email:', updateError);
      
      // Check if this is a duplicate email error
      if (updateError.message?.toLowerCase().includes('already') || 
          updateError.message?.toLowerCase().includes('registered')) {
        return new Response(
          JSON.stringify({
            errorCode: 'EMAIL_ALREADY_REGISTERED',
            message: updateError.message,
            message_hu: 'Ezzel az e-mail címmel már létezik felhasználó. Adj meg másik címet vagy szerkeszd a meglévő felhasználót.',
            message_en: 'A user with this email address already exists. Please use a different email or edit the existing user.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: updateError.message || 'Failed to update user email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the email in the profiles table
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ email })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Error updating profile email:', profileUpdateError);
      // Continue anyway, the auth email is updated
    }

    console.log('User email updated successfully:', userId);
    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'User email updated successfully',
        userId: updateData.user.id,
        email: updateData.user.email,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

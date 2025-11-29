import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('[admin-update-password] Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('[admin-update-password] Authorization header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('[admin-update-password] Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create request-bound client to validate caller
    const requestClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Create service client for admin operations
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Step 1: Get the caller's user from the request-bound client using the bearer token
    const token = authHeader.replace('Bearer', '').trim()
    const { data: { user }, error: authError } = await requestClient.auth.getUser(token)

    if (authError || !user) {
      console.error('[admin-update-password] No user in session (getUser with token):', authError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[admin-update-password] Caller user ID:', user.id)

    // Step 2: Check the caller's role in profiles table
    const { data: callerProfile, error: profileError } = await requestClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !callerProfile) {
      console.error('[admin-update-password] Profile not found:', profileError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[admin-update-password] Caller role:', callerProfile.role)

    // Only SA and Admin can update passwords
    if (callerProfile.role !== 'super_admin' && callerProfile.role !== 'admin') {
      console.warn('[admin-update-password] Caller is not super_admin or admin, role:', callerProfile.role)
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 3: Parse and validate request body
    const payload = await req.json() as {
      userId: string
      password: string
      mustChangePassword?: boolean
    }

    if (!payload.userId || !payload.password) {
      console.error('[admin-update-password] Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[admin-update-password] Updating password for user:', payload.userId)

    // Get target user's role to enforce permission rules
    const { data: targetProfile, error: targetProfileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', payload.userId)
      .single()

    if (targetProfileError) {
      console.error('[admin-update-password] Target profile not found:', targetProfileError.message)
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[admin-update-password] Target user role:', targetProfile.role)

    // Admin cannot edit SA users
    if (callerProfile.role === 'admin' && targetProfile.role === 'super_admin') {
      console.error('[admin-update-password] Admin attempted to change SA password')
      return new Response(
        JSON.stringify({ error: 'Admins cannot change Super Admin passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 4: Validate minimum length (Supabase Auth requires min 6 chars even with service role)
    if (payload.password.length < 6) {
      console.error('[admin-update-password] Password too short:', payload.password.length)
      return new Response(
        JSON.stringify({ 
          error: 'Password must be at least 6 characters (Supabase Auth platform requirement)',
          minLength: 6
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 5: Update the user's password using service client
    const { data: userData, error: updateError } = await serviceClient.auth.admin.updateUserById(
      payload.userId,
      { password: payload.password }
    )

    if (updateError) {
      console.error('[admin-update-password] Failed to update password:', updateError.message)
      
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[admin-update-password] Successfully updated password for user:', payload.userId)

    // Step 6: Update must_change_password flag if provided
    if (typeof payload.mustChangePassword === 'boolean') {
      const { error: flagError } = await serviceClient
        .from('profiles')
        .update({ must_change_password: payload.mustChangePassword })
        .eq('id', payload.userId)

      if (flagError) {
        console.error('[admin-update-password] Failed to update must_change_password flag:', flagError.message)
        // Continue anyway, password is updated
      } else {
        console.log('[admin-update-password] Updated must_change_password flag to:', payload.mustChangePassword)
      }
    }

    // Step 7: Return success
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[admin-update-password] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

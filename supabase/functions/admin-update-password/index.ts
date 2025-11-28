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
    const { data: profile, error: profileError } = await requestClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[admin-update-password] Profile not found:', profileError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[admin-update-password] Caller role:', profile.role)

    if (profile.role !== 'super_admin') {
      console.warn('[admin-update-password] Caller is not super_admin, role:', profile.role)
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 3: Parse and validate request body
    const payload = await req.json() as {
      userId: string
      password: string
    }

    if (!payload.userId || !payload.password) {
      console.error('[admin-update-password] Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[admin-update-password] Updating password for user:', payload.userId)

    // Step 4: Update the user's password using service client
    // Super Admin can set any password - using service role bypasses password policies
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

    // Step 5: Return success
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

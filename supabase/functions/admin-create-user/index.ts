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
      console.error('[admin-create-user] Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('[admin-create-user] Authorization header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('[admin-create-user] Missing authorization header')
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
      console.error('[admin-create-user] No user in session (getUser with token):', authError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[admin-create-user] Caller user ID:', user.id)

    // Step 2: Check the caller's role in profiles table
    const { data: callerProfile, error: profileError } = await requestClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !callerProfile) {
      console.error('[admin-create-user] Profile not found:', profileError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[admin-create-user] Caller role:', callerProfile.role)

    // Only SA and Admin can create users
    if (callerProfile.role !== 'super_admin' && callerProfile.role !== 'admin') {
      console.warn('[admin-create-user] Caller is not SA or Admin, role:', callerProfile.role)
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 3: Parse and validate request body
    const payload = await req.json() as {
      email: string
      password: string
      familyName: string
      givenName: string
      role: string
      isActive: boolean
      canDelete: boolean
      canViewLogs: boolean
      mustChangePassword?: boolean
    }

    if (!payload.email || !payload.password || !payload.familyName || !payload.givenName || !payload.role) {
      console.error('[admin-create-user] Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, familyName, givenName, and role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin cannot create SA users
    if (callerProfile.role === 'admin' && payload.role === 'super_admin') {
      console.error('[admin-create-user] Admin cannot create SA users')
      return new Response(
        JSON.stringify({ error: 'Admins cannot create Super Admin users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[admin-create-user] Creating user:', payload.email, 'Target role:', payload.role)

    // Validate password based on roles
    // SA creating non-SA or Admin creating non-SA/non-Admin: minimum 6 chars (platform requirement)
    // All other cases: full validation would be needed but Supabase handles this
    if (payload.password.length < 6) {
      console.error('[admin-create-user] Password too short')
      return new Response(
        JSON.stringify({ 
          ok: false,
          errorCode: 'PASSWORD_TOO_SHORT',
          error: 'Password must be at least 6 characters (Supabase Auth platform requirement)',
          minLength: 6
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build full name from family and given names
    const fullName = `${payload.familyName} ${payload.givenName}`

    // Step 4: Generate unique user_code
    const CODE_LENGTH = 5
    const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    
    function randomCode() {
      return Array.from({ length: CODE_LENGTH }, () =>
        CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
      ).join('')
    }

    async function generateUniqueUserCode() {
      for (let i = 0; i < 10; i++) {
        const code = randomCode()

        const { data, error } = await serviceClient
          .from('profiles')
          .select('id')
          .eq('user_code', code)
          .maybeSingle()

        if (!data && !error) {
          return code
        }
      }

      throw new Error('Could not generate unique user_code after several attempts')
    }

    const userCode = await generateUniqueUserCode()
    console.log('[admin-create-user] Generated user_code:', userCode)

    // Step 5: Create the auth user using service client
    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        family_name: payload.familyName,
        given_name: payload.givenName,
      },
    })

    if (createError || !created.user) {
      console.error('[admin-create-user] Failed to create auth user:', createError?.message)
      
      // Check if this is a duplicate email error
      const isDuplicateEmail = createError?.message?.toLowerCase().includes('already been registered') ||
                               createError?.message?.toLowerCase().includes('user already registered')
      
      if (isDuplicateEmail) {
        // Return 200 for validation errors to prevent runtime error display
        return new Response(
          JSON.stringify({ 
            ok: false,
            errorCode: 'EMAIL_ALREADY_REGISTERED',
            message: 'A user with this email address has already been registered',
            message_hu: 'Ezzel az e-mail címmel már létezik felhasználó. Adj meg másik címet vagy szerkeszd a meglévő felhasználót.',
            message_en: 'A user with this email address already exists. Please use a different email or edit the existing user.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Check if this is a weak password error
      const isWeakPassword = createError?.message?.toLowerCase().includes('weak') ||
                            createError?.message?.toLowerCase().includes('easy to guess')
      
      if (isWeakPassword) {
        // Return 200 for validation errors to prevent runtime error display
        return new Response(
          JSON.stringify({ 
            ok: false,
            errorCode: 'WEAK_PASSWORD',
            error: 'Password is too weak',
            message_hu: 'A jelszó túl gyenge. Használj legalább 8 karaktert, kis- és nagybetűt, valamint számot.',
            message_en: 'Password is too weak. Please use at least 8 characters, with lowercase and uppercase letters and a number.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ error: createError?.message ?? 'Failed to create user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = created.user.id
    console.log('[admin-create-user] Created auth user:', newUserId)

    // Step 6: Update the profile (already created by handle_new_user trigger)
    // The trigger creates the profile automatically, so we just update it with the correct values including user_code and must_change_password
    const { error: profileUpdateError } = await serviceClient
      .from('profiles')
      .update({
        family_name: payload.familyName,
        given_name: payload.givenName,
        full_name: fullName,
        role: payload.role,
        is_active: payload.isActive,
        user_code: userCode,
        must_change_password: payload.mustChangePassword === true,
      })
      .eq('id', newUserId)

    if (profileUpdateError) {
      console.error('[admin-create-user] Failed to update profile:', profileUpdateError.message)
      // Try to clean up the auth user
      await serviceClient.auth.admin.deleteUser(newUserId)
      return new Response(
        JSON.stringify({ error: profileUpdateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[admin-create-user] Successfully created user:', newUserId)

    // Step 7: If user is super_admin, assign them to all companies
    if (payload.role === 'super_admin') {
      console.log('[admin-create-user] User is SA, assigning to all companies')
      
      const { data: allCompanies, error: companiesError } = await serviceClient
        .from('companies')
        .select('id')
        .is('deleted_at', null)
      
      if (companiesError) {
        console.error('[admin-create-user] Failed to fetch companies:', companiesError.message)
      } else if (allCompanies && allCompanies.length > 0) {
        const companyAssignments = allCompanies.map(company => ({
          user_id: newUserId,
          company_id: company.id
        }))
        
        const { error: assignError } = await serviceClient
          .from('user_companies')
          .insert(companyAssignments)
        
        if (assignError) {
          console.error('[admin-create-user] Failed to assign SA to companies:', assignError.message)
        } else {
          console.log('[admin-create-user] SA assigned to', allCompanies.length, 'companies')
        }
      }
    }

    // Step 8: Return success
    return new Response(
      JSON.stringify({
        ok: true,
        userId: newUserId,
        userCode: userCode,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[admin-create-user] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

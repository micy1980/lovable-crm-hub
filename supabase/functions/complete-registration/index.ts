import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterRequest {
  email: string;
  userCode: string;
  familyName: string;
  givenName: string;
  password: string;
}

// Validate password complexity
function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "A jelszónak legalább 8 karakter hosszúnak kell lennie" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "A jelszónak tartalmaznia kell kisbetűt" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "A jelszónak tartalmaznia kell nagybetűt" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "A jelszónak tartalmaznia kell számot" };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: "A jelszónak tartalmaznia kell speciális karaktert (!@#$%^&* stb.)" };
  }
  return { valid: true, message: "" };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { email, userCode, familyName, givenName, password }: RegisterRequest = await req.json();

    // Validate required fields
    if (!email || !userCode || !familyName || !givenName || !password) {
      return new Response(
        JSON.stringify({ error: "missing_fields", message: "All fields are required" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate password complexity
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ error: "weak_password", message: passwordValidation.message }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find profile by email and validate
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, user_code, invitation_expires_at, registered_at")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (profileError || !profile) {
      console.error("Profile lookup error:", profileError);
      return new Response(
        JSON.stringify({ error: "user_not_found", message: "No invitation found for this email" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already registered
    if (profile.registered_at) {
      return new Response(
        JSON.stringify({ error: "already_registered", message: "User already registered" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if invitation expired
    if (!profile.invitation_expires_at || new Date(profile.invitation_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "invitation_expired", message: "Invitation has expired. Please request a new one." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate user code
    if (profile.user_code !== userCode.toUpperCase().trim()) {
      return new Response(
        JSON.stringify({ error: "invalid_code", message: "Invalid registration code" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update user password in auth.users
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password }
    );

    if (authUpdateError) {
      console.error("Auth update error:", authUpdateError);
      // Check for weak password error from Supabase (pwned passwords, etc.)
      if (authUpdateError.message?.includes('weak') || authUpdateError.message?.includes('pwned') || 
          (authUpdateError as any).code === 'weak_password') {
        return new Response(
          JSON.stringify({ 
            error: "weak_password", 
            message: "Ez a jelszó túl gyakori vagy ismert adatlopásban szerepelt. Kérjük, válasszon másik jelszót." 
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      return new Response(
        JSON.stringify({ error: "password_update_failed", message: "Failed to set password" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update profile with registration data
    const fullName = `${familyName} ${givenName}`;
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        family_name: familyName,
        given_name: givenName,
        registered_at: new Date().toISOString(),
        is_active: true,
        password_changed_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (profileUpdateError) {
      console.error("Profile update error:", profileUpdateError);
      return new Response(
        JSON.stringify({ error: "profile_update_failed", message: "Failed to update profile" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Registration completed for user: ${profile.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Registration completed successfully",
        userId: profile.id
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in complete-registration:", error);
    return new Response(
      JSON.stringify({ error: "server_error", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);

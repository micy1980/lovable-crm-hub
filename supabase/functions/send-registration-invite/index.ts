import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-registration-invite: Starting handler");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("send-registration-invite: No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("send-registration-invite: Auth header present");

    // Use service role client for all operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract JWT token and verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error("send-registration-invite: User verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("send-registration-invite: User verified:", user.id);

    // Verify SA status
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
      
    if (callerProfileError || !callerProfile || callerProfile.role !== "super_admin") {
      console.error("send-registration-invite: Not super admin:", callerProfile?.role);
      return new Response(
        JSON.stringify({ error: "Only super admins can send invitations" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("send-registration-invite: SA verified");

    const { userId }: InviteRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user already registered
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, registered_at, user_code, family_name, given_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (profile.registered_at) {
      return new Response(
        JSON.stringify({ error: "User already registered" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate new user_code
    const newUserCode = generateUserCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update profile with invitation data
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        user_code: newUserCode,
        invitation_sent_at: new Date().toISOString(),
        invitation_expires_at: expiresAt.toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to prepare invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get email settings
    const { data: emailSettings } = await supabaseAdmin
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["email_from_address", "email_from_name"]);

    const fromAddress = emailSettings?.find(s => s.setting_key === "email_from_address")?.setting_value || "onboarding@resend.dev";
    const fromName = emailSettings?.find(s => s.setting_key === "email_from_name")?.setting_value || "Mini CRM";

    // Build registration URL with names
    const baseUrl = req.headers.get("origin") || supabaseUrl.replace(".supabase.co", "");
    const registerUrl = `${baseUrl}/register?email=${encodeURIComponent(profile.email)}&code=${newUserCode}&familyName=${encodeURIComponent(profile.family_name || '')}&givenName=${encodeURIComponent(profile.given_name || '')}`;

    // Send email
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured", code: newUserCode }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: [profile.email],
      subject: "Regisztrációs meghívó - Mini CRM",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Üdvözöljük a Mini CRM rendszerben!</h1>
          <p>Ön meghívást kapott a Mini CRM rendszer használatára.</p>
          <p>A regisztráció befejezéséhez kattintson az alábbi linkre:</p>
          <p style="margin: 24px 0;">
            <a href="${registerUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Regisztráció befejezése
            </a>
          </p>
          <p>Vagy használja az alábbi kódot a regisztrációs oldalon:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #333; background: #f3f4f6; padding: 16px; text-align: center; border-radius: 8px;">
            ${newUserCode}
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            <strong>Fontos:</strong> Ez a link 24 órán belül lejár.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">
            Ha nem Ön kérte ezt a meghívót, kérjük hagyja figyelmen kívül ezt az e-mailt.
          </p>
        </div>
      `,
    });

    console.log("Registration email sent:", emailResponse);

    // Check for Resend API errors
    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      
      // Return user code so admin can share it manually
      return new Response(
        JSON.stringify({ 
          success: false,
          error: emailResponse.error.message || "Failed to send email",
          userCode: newUserCode,
          registerUrl: registerUrl,
          hint: "Email küldése sikertelen. A regisztrációs kód és link manuálisan megosztható."
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation sent successfully",
        userCode: newUserCode,
        expiresAt: expiresAt.toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-registration-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function generateUserCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(handler);

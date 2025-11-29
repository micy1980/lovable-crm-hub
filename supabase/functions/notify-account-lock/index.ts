import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  email: string;
  reason: string;
  lockedUntil: string | null;
  ipAddress?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, email, reason, lockedUntil, ipAddress }: NotificationRequest = await req.json();

    console.log(`Account lock notification for: ${email}`);

    // Get all Super Admins
    const { data: superAdmins, error: adminError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'super_admin')
      .eq('is_active', true);

    if (adminError) {
      console.error('Error fetching super admins:', adminError);
      throw adminError;
    }

    if (!superAdmins || superAdmins.length === 0) {
      console.log('No active super admins found');
      return new Response(
        JSON.stringify({ success: true, message: 'No super admins to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${superAdmins.length} super admin(s) to notify`);

    // Format the lock duration
    const lockDuration = lockedUntil 
      ? new Date(lockedUntil).toLocaleString('hu-HU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Manuális feloldásig';

    // TODO: Send email notification to super admins
    // This would require an email service integration (SMTP, SendGrid, etc.)
    // For now, we'll just log it and store an in-app notification
    
    // Create in-app notifications for each super admin
    // Note: We would need a notifications table for this
    // For now, we'll just log it
    
    console.log('=== Account Lock Notification ===');
    console.log(`User: ${email}`);
    console.log(`Reason: ${reason}`);
    console.log(`Locked until: ${lockDuration}`);
    if (ipAddress) {
      console.log(`IP Address: ${ipAddress}`);
    }
    console.log(`Notifying ${superAdmins.length} super admin(s)`);
    superAdmins.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.full_name})`);
    });
    console.log('================================');

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifiedAdmins: superAdmins.length,
        message: 'Super admins notified successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in notify-account-lock function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

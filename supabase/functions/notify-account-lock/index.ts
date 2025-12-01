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

    // Send email notifications to super admins
    if (superAdmins.length > 0) {
      // Check if account lock notifications are enabled
      const { data: emailSetting } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'email_notify_account_lock')
        .single();
      
      const shouldSendEmail = emailSetting?.setting_value === 'true';
      
      if (shouldSendEmail) {
        // Get from email settings
        const { data: fromSettings } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['email_from_address', 'email_from_name']);
        
        const fromEmail = fromSettings?.find(s => s.setting_key === 'email_from_address')?.setting_value || 'onboarding@resend.dev';
        const fromName = fromSettings?.find(s => s.setting_key === 'email_from_name')?.setting_value || 'Mini CRM';
        
        const emailRecipients = superAdmins.map((admin: any) => admin.email);
        
        const emailHtml = `
          <h2>Fiók zárolás értesítés</h2>
          <p>Egy felhasználói fiók zárolásra került a rendszerben.</p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Felhasználó ID:</strong> ${userId}</li>
            <li><strong>Ok:</strong> ${reason}</li>
            <li><strong>Zárolva eddig:</strong> ${lockDuration}</li>
            ${ipAddress ? `<li><strong>IP cím:</strong> ${ipAddress}</li>` : ''}
          </ul>
          <p>A fiókot feloldhatod az Admin felületen a <a href="${supabaseUrl}">Mini CRM</a> rendszerben.</p>
        `;

        try {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              to: emailRecipients,
              subject: 'Fiók zárolás értesítés - Mini CRM',
              html: emailHtml,
              from: `${fromName} <${fromEmail}>`,
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error('Failed to send email:', errorText);
          } else {
            console.log('Email sent successfully to super admins');
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      } else {
        console.log('Account lock email notifications are disabled');
      }
    }

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

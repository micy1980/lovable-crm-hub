import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventInvitationRequest {
  eventId: string;
}

const generateICS = (event: any, participant: any) => {
  const formatDate = (date: string) => {
    return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const uid = `${event.id}-${participant.id}@pipelit.app`;
  const dtstamp = formatDate(new Date().toISOString());
  const dtstart = formatDate(event.start_time);
  const dtend = event.end_time ? formatDate(event.end_time) : formatDate(new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000).toISOString());

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PipeLiT//Event Invitation//HU
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { eventId }: EventInvitationRequest = await req.json();

    if (!eventId) {
      return new Response(JSON.stringify({ error: "Event ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        *,
        created_by_user:profiles!events_created_by_fkey(full_name, email)
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Event fetch error:", eventError);
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch participants
    const { data: participants, error: participantsError } = await supabase
      .from("event_participants")
      .select(`
        *,
        user:profiles(full_name, email)
      `)
      .eq("event_id", eventId)
      .is("notified_at", null);

    if (participantsError) {
      console.error("Participants fetch error:", participantsError);
      return new Response(JSON.stringify({ error: "Failed to fetch participants" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!participants || participants.length === 0) {
      return new Response(JSON.stringify({ message: "No participants to notify" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get email settings
    const { data: emailSettings } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["email_from_address", "email_from_name"]);

    const fromAddress = emailSettings?.find(s => s.setting_key === "email_from_address")?.setting_value || "onboarding@resend.dev";
    const fromName = emailSettings?.find(s => s.setting_key === "email_from_name")?.setting_value || "PipeLiT";

    const results = [];

    if (resendApiKey) {
      for (const participant of participants) {
        const recipientEmail = participant.user?.email || participant.external_email;
        const recipientName = participant.user?.full_name || participant.external_name || recipientEmail;

        if (!recipientEmail) continue;

        const icsContent = generateICS(event, participant);

        const startDate = new Date(event.start_time);
        const formattedDate = startDate.toLocaleDateString("hu-HU", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Esemény meghívó: ${event.title}</h2>
            <p>Kedves ${recipientName}!</p>
            <p>Meghívást kaptál a következő eseményre:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${event.title}</h3>
              <p><strong>Időpont:</strong> ${formattedDate}</p>
              ${event.location ? `<p><strong>Helyszín:</strong> ${event.location}</p>` : ''}
              ${event.description ? `<p><strong>Leírás:</strong> ${event.description}</p>` : ''}
              <p><strong>Szervező:</strong> ${event.created_by_user?.full_name || event.created_by_user?.email}</p>
            </div>
            <p>A mellékelt .ics fájllal hozzáadhatod a naptáradhoz az eseményt.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Ez az email a PipeLiT rendszerből lett küldve.
            </p>
          </div>
        `;

        try {
          // Use fetch to call Resend API directly
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${fromName} <${fromAddress}>`,
              to: [recipientEmail],
              subject: `Esemény meghívó: ${event.title}`,
              html: emailHtml,
              attachments: [
                {
                  filename: "event.ics",
                  content: btoa(icsContent),
                },
              ],
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to send email");
          }

          // Update notified_at
          await supabase
            .from("event_participants")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", participant.id);

          results.push({ email: recipientEmail, status: "sent" });
        } catch (emailError: any) {
          console.error(`Failed to send email to ${recipientEmail}:`, emailError);
          results.push({ email: recipientEmail, status: "failed", error: emailError.message });
        }
      }

      // Create in-app notifications for internal users
      for (const participant of participants.filter(p => p.user_id)) {
        await supabase.from("notifications").insert({
          user_id: participant.user_id,
          company_id: event.company_id,
          type: "event_invitation",
          title: "Új esemény meghívó",
          message: `Meghívást kaptál: ${event.title}`,
          entity_type: "event",
          entity_id: event.id,
        });
      }
    } else {
      console.log("No Resend API key configured, skipping email sending");
      results.push({ message: "Email sending skipped - no API key" });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-event-invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);

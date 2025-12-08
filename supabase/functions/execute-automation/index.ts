import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutomationRule {
  id: string;
  company_id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
}

interface ExecutionContext {
  entityType: string;
  entityId: string;
  triggerData: Record<string, any>;
  companyId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { triggerType, context }: { triggerType: string; context: ExecutionContext } = await req.json();

    if (!triggerType || !context) {
      return new Response(
        JSON.stringify({ error: "Missing triggerType or context" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active automation rules for this trigger type and company
    const { data: rules, error: rulesError } = await supabaseClient
      .from("automation_rules")
      .select("*")
      .eq("company_id", context.companyId)
      .eq("trigger_type", triggerType)
      .eq("is_active", true);

    if (rulesError) {
      throw rulesError;
    }

    const results: { ruleId: string; success: boolean; error?: string }[] = [];

    for (const rule of rules || []) {
      try {
        const matchesTrigger = evaluateTriggerConditions(rule, context);
        
        if (matchesTrigger) {
          await executeAction(supabaseClient, rule, context);
          
          // Log successful execution
          await supabaseClient.from("automation_logs").insert({
            rule_id: rule.id,
            entity_type: context.entityType,
            entity_id: context.entityId,
            trigger_data: context.triggerData,
            success: true,
            action_result: { action: rule.action_type, config: rule.action_config },
          });

          results.push({ ruleId: rule.id, success: true });
        }
      } catch (actionError: any) {
        // Log failed execution
        await supabaseClient.from("automation_logs").insert({
          rule_id: rule.id,
          entity_type: context.entityType,
          entity_id: context.entityId,
          trigger_data: context.triggerData,
          success: false,
          error_message: actionError.message,
        });

        results.push({ ruleId: rule.id, success: false, error: actionError.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, executed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error executing automation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function evaluateTriggerConditions(rule: AutomationRule, context: ExecutionContext): boolean {
  const config = rule.trigger_config;
  const data = context.triggerData;

  switch (rule.trigger_type) {
    case "task_status_change":
      // Check if status change matches configured from/to statuses
      if (config.from_status && data.old_status !== config.from_status) return false;
      if (config.to_status && data.new_status !== config.to_status) return false;
      return true;

    case "task_created":
      return context.entityType === "task";

    case "deadline_approaching":
      // Check if deadline is within configured days
      if (!data.deadline_date) return false;
      const deadline = new Date(data.deadline_date);
      const now = new Date();
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= (config.days_before || 3) && daysUntil > 0;

    case "project_status_change":
      if (config.from_status && data.old_status !== config.from_status) return false;
      if (config.to_status && data.new_status !== config.to_status) return false;
      return true;

    case "sales_status_change":
      if (config.from_status && data.old_status !== config.from_status) return false;
      if (config.to_status && data.new_status !== config.to_status) return false;
      return true;

    case "contract_expiring":
      if (!data.expiry_date) return false;
      const expiryDate = new Date(data.expiry_date);
      const today = new Date();
      const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysToExpiry <= (config.days_before || 30) && daysToExpiry > 0;

    default:
      return false;
  }
}

async function executeAction(
  supabase: any,
  rule: AutomationRule,
  context: ExecutionContext
): Promise<void> {
  const config = rule.action_config;

  switch (rule.action_type) {
    case "send_notification":
      await createNotification(supabase, rule, context, config);
      break;

    case "change_status":
      await changeEntityStatus(supabase, context, config.new_status);
      break;

    case "assign_user":
      await assignUser(supabase, context, config.user_id);
      break;

    case "create_task":
      await createFollowUpTask(supabase, rule, context, config);
      break;

    case "send_email":
      // Could integrate with send-email edge function
      console.log("Email action triggered:", config);
      break;

    default:
      throw new Error(`Unknown action type: ${rule.action_type}`);
  }
}

async function createNotification(
  supabase: any,
  rule: AutomationRule,
  context: ExecutionContext,
  config: Record<string, any>
): Promise<void> {
  // Get users to notify - either specific user or all company admins
  let userIds: string[] = [];

  if (config.notify_user_id) {
    userIds = [config.notify_user_id];
  } else {
    // Notify all company admins
    const { data: admins } = await supabase
      .from("user_company_permissions")
      .select("user_id")
      .eq("company_id", context.companyId)
      .eq("role", "ADMIN");
    
    userIds = (admins || []).map((a: any) => a.user_id);
  }

  const title = config.title || `Automatizáció: ${rule.name}`;
  const message = config.message || `Trigger: ${rule.trigger_type}`;

  for (const userId of userIds) {
    await supabase.from("notifications").insert({
      user_id: userId,
      company_id: context.companyId,
      type: "automation",
      title,
      message,
      entity_type: context.entityType,
      entity_id: context.entityId,
    });
  }
}

async function changeEntityStatus(
  supabase: any,
  context: ExecutionContext,
  newStatus: string
): Promise<void> {
  const tableName = context.entityType === "task" ? "tasks" : 
                   context.entityType === "project" ? "projects" :
                   context.entityType === "sales" ? "sales" : null;

  if (!tableName) {
    throw new Error(`Cannot change status for entity type: ${context.entityType}`);
  }

  const { error } = await supabase
    .from(tableName)
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", context.entityId);

  if (error) throw error;
}

async function assignUser(
  supabase: any,
  context: ExecutionContext,
  userId: string
): Promise<void> {
  if (context.entityType === "task") {
    const { error } = await supabase
      .from("tasks")
      .update({ responsible_user_id: userId, updated_at: new Date().toISOString() })
      .eq("id", context.entityId);
    if (error) throw error;
  } else if (context.entityType === "event") {
    const { error } = await supabase
      .from("events")
      .update({ responsible_user_id: userId, updated_at: new Date().toISOString() })
      .eq("id", context.entityId);
    if (error) throw error;
  }
}

async function createFollowUpTask(
  supabase: any,
  rule: AutomationRule,
  context: ExecutionContext,
  config: Record<string, any>
): Promise<void> {
  const daysOffset = config.deadline_days || 7;
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + daysOffset);

  const { error } = await supabase.from("tasks").insert({
    company_id: context.companyId,
    title: config.task_title || `Követő feladat: ${rule.name}`,
    description: config.task_description || `Automatikusan létrehozva a "${rule.name}" szabály által`,
    deadline: deadline.toISOString(),
    status: "todo",
    created_by: null, // System created
    project_id: context.entityType === "project" ? context.entityId : null,
    sales_id: context.entityType === "sales" ? context.entityId : null,
  });

  if (error) throw error;
}
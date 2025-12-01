import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'jsr:@supabase/supabase-js@2';

let cachedResend: Resend | null = null;
let lastApiKey: string | null = null;

export async function getResendClient(): Promise<Resend> {
  // First try environment variable (RESEND_API_KEY secret)
  const envApiKey = Deno.env.get("RESEND_API_KEY");
  
  // If we have env key, use it
  if (envApiKey && envApiKey !== lastApiKey) {
    lastApiKey = envApiKey;
    cachedResend = new Resend(envApiKey);
    return cachedResend;
  }
  
  // Otherwise try to get from database settings
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'resend_api_key')
      .single();
    
    if (!error && data?.setting_value) {
      const dbApiKey = data.setting_value;
      if (dbApiKey !== lastApiKey) {
        lastApiKey = dbApiKey;
        cachedResend = new Resend(dbApiKey);
      }
      return cachedResend!;
    }
  } catch (error) {
    console.error('Error fetching API key from database:', error);
  }
  
  // Fallback: if we have cached client, use it
  if (cachedResend) {
    return cachedResend;
  }
  
  // Last resort: create with env key or throw
  if (envApiKey) {
    cachedResend = new Resend(envApiKey);
    return cachedResend;
  }
  
  throw new Error('RESEND_API_KEY not configured');
}

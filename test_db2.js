import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://dhetcnkvgtuatcchropm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZXRjbmt2Z3R1YXRjY2hyb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzAzNzMsImV4cCI6MjA5MTM0NjM3M30.5JA4vx2PN1kePf9L9qMp23ogORXhRnqZmtzw0BMJ8xs');

async function check() {
  const { data, error } = await supabase.from('site_config').select('*').eq('key', 'home_sponsors_new');
  console.log("DB DATA:", JSON.stringify(data, null, 2));
  console.log("DB ERROR:", error);
}

check();

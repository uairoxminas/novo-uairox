import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dhetcnkvgtuatcchropm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZXRjbmt2Z3R1YXRjY2hyb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzAzNzMsImV4cCI6MjA5MTM0NjM3M30.5JA4vx2PN1kePf9L9qMp23ogORXhRnqZmtzw0BMJ8xs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('training_locations').delete().eq('address', 'TEST');
  console.log('DELETE ERROR:', error);
}

test();

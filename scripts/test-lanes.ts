import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: heats, error: err1 } = await supabase.from('heats').select('id, title');
  console.log("Heats:", heats);

  if (heats && heats.length > 0) {
    const { data: lanes, error: err2 } = await supabase.from('heat_lane_assignments').select('*').eq('heat_id', heats[0].id);
    console.log("Lanes for heat[0]:", lanes);
  }
}
check();

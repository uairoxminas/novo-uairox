import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'content-type',
      },
    });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://dhetcnkvgtuatcchropm.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch all registrations
    const { data: regs, error: regErr } = await supabase
      .from('registrations')
      .select('athlete_name, athlete_phone, athlete_email, team_members');
    
    if (regErr) throw regErr;

    // Build deduped map by phone
    const contactMap = new Map();
    for (const r of regs) {
      const phone = (r.athlete_phone || '').replace(/\D/g, '');
      if (phone.length >= 8) {
        contactMap.set(phone, {
          name: r.athlete_name?.trim() || undefined,
          phone,
          email: r.athlete_email?.trim() || undefined,
        });
      }
      if (Array.isArray(r.team_members)) {
        for (const m of r.team_members) {
          const mPhone = (m.phone || '').replace(/\D/g, '');
          if (mPhone.length >= 8) {
            contactMap.set(mPhone, {
              name: m.name?.trim() || undefined,
              phone: mPhone,
              email: m.email?.trim() || undefined,
            });
          }
        }
      }
    }

    const rows = Array.from(contactMap.values()).map(c => ({
      ...c,
      source: 'registration',
      opt_out: false,
    }));

    if (rows.length === 0) {
      return Response.json({ synced: 0 });
    }

    // Upsert in batches of 100
    let synced = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase
        .from('marketing_contacts')
        .upsert(batch, { onConflict: 'phone', ignoreDuplicates: false });
      if (error) throw error;
      synced += batch.length;
    }

    // Fetch total for response
    const { count } = await supabase
      .from('marketing_contacts')
      .select('*', { count: 'exact', head: true });

    return Response.json({ synced, total: count });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

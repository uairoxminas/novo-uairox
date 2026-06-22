import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-rfid-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // API key auth — no JWT needed, called by the hardware bridge app
  const apiKey = req.headers.get('x-rfid-api-key');
  const expectedKey = Deno.env.get('RFID_GATEWAY_KEY');
  if (!expectedKey || apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    // Normalise payload — accept both our standard format and common M-ID40 native formats:
    //   Standard : { reader_id, antenna_index, tag_epc, rssi?, read_at? }
    //   M-ID40 A : { readerid, antennaid, epc, rssi?, timestamp? }
    //   M-ID40 B : { reader, antenna, tagid, signal?, time? }
    //   M-ID40 C : { ReaderID, AntennaID, EPC, RSSI?, Time? }
    const reader_id     = body.reader_id     ?? body.readerid    ?? body.reader    ?? body.ReaderID   ?? null;
    const antenna_index = body.antenna_index ?? body.antennaid   ?? body.antenna   ?? body.AntennaID  ?? 1;
    const tag_epc       = (body.tag_epc      ?? body.epc         ?? body.tagid     ?? body.EPC        ?? '').toString().toUpperCase();
    const rssi          = body.rssi          ?? body.signal      ?? body.RSSI      ?? null;
    const read_at       = body.read_at       ?? body.timestamp   ?? body.time      ?? body.Time       ?? null;

    if (!reader_id || !tag_epc) {
      return new Response(JSON.stringify({ error: 'Missing: reader_id and tag_epc (or epc / EPC / tagid) are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const readAt = read_at ? new Date(read_at).toISOString() : new Date().toISOString();

    // Helper: log read and return early
    const logAndReturn = async (
      skip_reason: string,
      extra: Record<string, unknown> = {},
    ) => {
      await supabase.from('rfid_reads').insert({
        reader_id, antenna_index, tag_epc, rssi,
        read_at: readAt,
        processed: false,
        skip_reason,
        ...extra,
      });
      return new Response(JSON.stringify({ status: skip_reason }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    };

    // 1. Find active wristband assignment
    const { data: assignment } = await supabase
      .from('rfid_tag_assignments')
      .select('registration_id, event_id')
      .eq('tag_epc', tag_epc)
      .eq('is_active', true)
      .maybeSingle();

    if (!assignment) {
      return logAndReturn('unknown_tag');
    }

    const { registration_id, event_id } = assignment;

    // 2. Find antenna config for this reader/port/event
    const { data: antenna } = await supabase
      .from('rfid_antennas')
      .select('checkpoint_id, entry_type, debounce_ms, label')
      .eq('event_id', event_id)
      .eq('reader_id', reader_id)
      .eq('antenna_index', antenna_index)
      .eq('is_active', true)
      .maybeSingle();

    if (!antenna) {
      return logAndReturn('no_antenna_config', { event_id, registration_id });
    }

    // 3. Debounce POR ATLETA (tag), independente de antena.
    //    Após uma passagem confirmada, a mesma pulseira fica bloqueada por
    //    debounce_seconds (config do evento, padrão 40s) em QUALQUER antena.
    const { data: eventCfg } = await supabase
      .from('events')
      .select('debounce_seconds, rfid_rssi_min')
      .eq('id', event_id)
      .maybeSingle();
    const debounceSeconds = (eventCfg?.debounce_seconds as number | null) ?? 40;

    // Corte de RSSI (zona de leitura): ignora sinal fraco (atleta longe da antena)
    const rssiMin = (eventCfg?.rfid_rssi_min as number | null) ?? 0;
    if (rssiMin > 0 && rssi !== null && rssi < rssiMin) {
      return logAndReturn('weak_signal', { event_id, registration_id });
    }
    const debounceFrom = new Date(
      new Date(readAt).getTime() - debounceSeconds * 1000,
    ).toISOString();

    const { data: recentRead } = await supabase
      .from('rfid_reads')
      .select('id')
      .eq('tag_epc', tag_epc)
      .eq('processed', true)          // qualquer antena
      .gte('read_at', debounceFrom)
      .limit(1)
      .maybeSingle();

    if (recentRead) {
      return logAndReturn('debounce', { event_id, registration_id });
    }

    // 4. Get bib_number from registrations
    const { data: registration } = await supabase
      .from('registrations')
      .select('bib_number')
      .eq('id', registration_id)
      .maybeSingle();

    const bibNumber = registration?.bib_number ? String(registration.bib_number) : '';

    // 5. Find a running heat for this registration + event (two-step to avoid FK name issues)
    const { data: laneRows } = await supabase
      .from('heat_lane_assignments')
      .select('heat_id')
      .eq('registration_id', registration_id);

    const heatIds = (laneRows ?? []).map((r: { heat_id: string }) => r.heat_id);

    if (!heatIds.length) {
      return logAndReturn('no_heat_assignment', { event_id, registration_id });
    }

    const { data: runningHeat } = await supabase
      .from('heats')
      .select('id')
      .eq('event_id', event_id)
      .eq('status', 'running')
      .in('id', heatIds)
      .maybeSingle();

    if (!runningHeat) {
      return logAndReturn('no_running_heat', { event_id, registration_id });
    }

    const heat_id = runningHeat.id;

    // 6. Insert into race_splits — same shape the judge panel uses
    const { error: splitError } = await supabase
      .from('race_splits')
      .insert({
        event_id,
        heat_id,
        registration_id,
        bib_number: bibNumber,
        checkpoint_id: antenna.checkpoint_id,
        split_timestamp: readAt,
      });

    if (splitError) throw splitError;

    // 7. Log successful read
    await supabase.from('rfid_reads').insert({
      reader_id, antenna_index, tag_epc, rssi,
      read_at: readAt,
      event_id,
      registration_id,
      processed: true,
    });

    return new Response(
      JSON.stringify({
        status: 'ok',
        event_id,
        heat_id,
        registration_id,
        bib_number: bibNumber,
        checkpoint_id: antenna.checkpoint_id,
        antenna_label: antenna.label,
        entry_type: antenna.entry_type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('rfid-gateway error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

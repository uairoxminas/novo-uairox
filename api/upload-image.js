import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://dhetcnkvgtuatcchropm.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400, headers: corsHeaders });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `marketing/email-header-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('public-assets')
      .upload(fileName, arrayBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (error) {
      // If bucket doesn't exist, create it
      if (error.message?.includes('not found') || error.statusCode === '404') {
        await supabase.storage.createBucket('public-assets', { public: true });
        const { error: retryErr } = await supabase.storage
          .from('public-assets')
          .upload(fileName, arrayBuffer, {
            contentType: file.type || 'image/jpeg',
            upsert: true,
          });
        if (retryErr) throw retryErr;
      } else {
        throw error;
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(fileName);

    return Response.json({ url: urlData.publicUrl }, { headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

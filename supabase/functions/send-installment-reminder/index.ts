import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPassword = Deno.env.get('GMAIL_PASSWORD')

    if (!gmailUser || !gmailPassword) {
      return new Response(JSON.stringify({ error: "Gmail credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const today = new Date().toISOString().split('T')[0]

    // 1. Find installments due today or overdue (not paid)
    const { data: dueInstallments, error: fetchError } = await supabase
      .from('registration_installments')
      .select('*, registrations!inner(id, athlete_name, athlete_email, athlete_phone, event_id, events!inner(title, date))')
      .in('status', ['pending'])
      .lte('due_date', today)

    if (fetchError) throw fetchError

    if (!dueInstallments || dueInstallments.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "Nenhuma parcela vencendo hoje." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Mark overdue
    const overdue = dueInstallments.filter((i: any) => i.due_date < today)
    if (overdue.length > 0) {
      await supabase
        .from('registration_installments')
        .update({ status: 'overdue' })
        .in('id', overdue.map((i: any) => i.id))
    }

    // 3. Send emails
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPassword }
    })

    let sentCount = 0
    const errors: string[] = []
    const siteUrl = Deno.env.get('SITE_URL') || 'https://uairox.com.br'

    for (const inst of dueInstallments) {
      const reg = inst.registrations as any
      const event = reg?.events as any
      const email = reg?.athlete_email
      const name = reg?.athlete_name || 'Atleta'
      const eventName = event?.title || 'Evento UAIROX'
      const amount = Number(inst.amount).toFixed(2)
      const dueDate = new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')
      const portalUrl = `${siteUrl}/pagamento/${reg?.id}`
      const isOverdue = inst.due_date < today
      const daysLate = isOverdue ? Math.ceil((Date.now() - new Date(inst.due_date).getTime()) / 86400000) : 0

      if (!email) continue

      const subject = isOverdue
        ? `⚠️ Parcela VENCIDA - ${eventName}`
        : `💰 Lembrete de Pagamento - ${eventName}`

      const statusText = isOverdue
        ? `<span style="color: #ef4444; font-weight: bold;">VENCIDA há ${daysLate} dia${daysLate > 1 ? 's' : ''}</span>`
        : `<span style="color: #EDAC02; font-weight: bold;">Vence HOJE</span>`

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #050505; color: #fff; padding: 30px; border-radius: 12px; border: 1px solid #1a1a1a;">
          <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #262626;">
            <h1 style="color: #EDAC02; font-style: italic; font-size: 28px; margin: 0; letter-spacing: -1px;">UAIROX</h1>
          </div>

          <h2 style="color: #fff; font-size: 20px; margin: 0 0 5px 0;">
            ${isOverdue ? '⚠️ Parcela Vencida' : '💰 Lembrete de Pagamento'}
          </h2>
          
          <p style="font-size: 15px; color: #e5e5e5; margin-top: 15px;">Olá, <strong>${name}</strong>!</p>
          
          <p style="font-size: 15px; color: #e5e5e5; line-height: 1.5;">
            Sua <strong>${inst.installment_number}ª parcela</strong> referente ao evento 
            <strong style="color: #EDAC02;">${eventName}</strong> 
            ${isOverdue ? 'está vencida' : 'vence hoje'}.
          </p>

          <div style="background: #111; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid ${isOverdue ? '#ef4444' : '#EDAC02'}33;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #aaa; font-size: 14px;">Parcela</td>
                <td style="padding: 8px 0; color: #fff; font-size: 14px; text-align: right; font-weight: bold;">${inst.installment_number}ª de ${inst.installment_number <= 2 ? '2 ou 3' : '3'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #aaa; font-size: 14px;">Valor</td>
                <td style="padding: 8px 0; color: #EDAC02; font-size: 18px; text-align: right; font-weight: bold;">R$ ${amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #aaa; font-size: 14px;">Vencimento</td>
                <td style="padding: 8px 0; text-align: right; font-size: 14px;">${statusText} — ${dueDate}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <p style="font-size: 14px; color: #aaa; margin-bottom: 15px;">Pague via PIX e envie o comprovante pelo portal:</p>
            <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #EDAC02; color: #000; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px;">
              Acessar Portal de Pagamento
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #262626; text-align: center;">
            <p style="font-size: 12px; color: #666; margin: 0;">&copy; Equipe UAIROX &bull; Eventos Esportivos</p>
            <p style="font-size: 10px; color: #444; margin-top: 5px;">Esta é uma mensagem automática.</p>
          </div>
        </div>
      `

      try {
        await transporter.sendMail({
          from: `"Equipe UAIROX" <${gmailUser}>`,
          to: email,
          subject,
          html
        })
        sentCount++
      } catch (emailErr: any) {
        errors.push(`${email}: ${emailErr.message}`)
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sent: sentCount, 
      total: dueInstallments.length,
      overdue_marked: overdue.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

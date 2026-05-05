import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { athlete_name, athlete_email, whatsapp_link, event_image_url } = await req.json()

    if (!athlete_email) {
      return new Response(JSON.stringify({ error: "Email não fornecido." }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Variáveis que você precisará configurar no Supabase:
    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPassword = Deno.env.get('GMAIL_PASSWORD')

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    })

    const mailOptions = {
      from: `"Equipe UAIROX" <${gmailUser}>`,
      to: athlete_email,
      subject: '🎉 Vaga Confirmada - UAIROX!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #050505; color: #fff; padding: 30px; border-radius: 12px; border: 1px solid #1a1a1a;">
          
          ${event_image_url ? `
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #262626;">
            <img src="${event_image_url}" alt="Capa do Evento" style="display: block; margin: 0 auto; max-width: 100%; height: auto; border-radius: 8px; outline: none; border: none; text-decoration: none;" />
          </div>
          ` : ''}

          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #22c55e; font-style: italic; text-transform: uppercase; font-size: 24px; margin: 0;">VAGA CONFIRMADA! ✅</h2>
          </div>
          
          <p style="font-size: 16px; color: #e5e5e5;">Fala, <strong>${athlete_name}</strong>!</p>
          <p style="font-size: 16px; color: #e5e5e5; line-height: 1.5;">O seu pagamento foi recebido e validado com sucesso. Sua vaga no evento está oficialmente <strong>garantida</strong>!</p>
          
          <div style="background: #111; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px dashed #22c55e;">
            <p style="margin: 0; font-size: 14px; color: #aaa;">Status da Inscrição:</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #22c55e;">CONFIRMADO</p>
          </div>

          <p style="font-size: 14px; color: #aaa; line-height: 1.5;">Prepare-se para o desafio! Fique de olho no nosso Instagram e nos grupos de WhatsApp para as próximas atualizações sobre o cronograma, baterias e retirada de kits.</p>

          ${whatsapp_link ? `
          <div style="margin-top: 30px; text-align: center;">
            <p style="font-size: 15px; color: #e5e5e5; margin-bottom: 15px; font-weight: bold;">Se ainda não entrou, acesse o grupo oficial:</p>
            <a href="${whatsapp_link}" target="_blank" style="display: inline-block; background-color: #25D366; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px;">
              Acessar Grupo do WhatsApp
            </a>
          </div>
          ` : ''}

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #262626; text-align: center;">
            <p style="font-size: 12px; color: #666; margin: 0;">&copy; Equipe UAIROX &bull; Eventos Esportivos</p>
            <p style="font-size: 10px; color: #444; margin-top: 5px;">Esta é uma mensagem automática, por favor, não responda.</p>
          </div>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    
    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

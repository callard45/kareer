import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message, type } = await req.json();

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Nom, email et message sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine subject line
    const subjectLine = subject 
      ? `[Kareer Contact] ${subject} - ${name}`
      : `[Kareer Contact] ${type === 'school' ? 'École' : type === 'student' ? 'Étudiant' : 'Nouveau message'} - ${name}`;

    // Beautiful HTML email template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1D2A41 0%, #2a3f5f 50%, #62C2FF 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
        Kareer
      </h1>
      <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0 0;">
        Nouveau message de contact
      </p>
    </div>
    
    <!-- Content -->
    <div style="background-color: #ffffff; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
      <!-- Info Card -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #bae6fd;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Nom</td>
            <td style="padding: 8px 0; color: #1D2A41; font-size: 15px; font-weight: 600; text-align: right;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Email</td>
            <td style="padding: 8px 0; text-align: right;">
              <a href="mailto:${email}" style="color: #1D8FFF; font-size: 15px; text-decoration: none; font-weight: 500;">${email}</a>
            </td>
          </tr>
          ${type ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Type</td>
            <td style="padding: 8px 0; color: #1D2A41; font-size: 15px; text-align: right;">
              <span style="background: ${type === 'school' ? '#10b981' : '#62C2FF'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                ${type === 'school' ? '🏫 École' : type === 'student' ? '🎓 Étudiant' : type}
              </span>
            </td>
          </tr>
          ` : ''}
          ${subject ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Sujet</td>
            <td style="padding: 8px 0; color: #1D2A41; font-size: 15px; text-align: right; font-weight: 500;">${subject}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      <!-- Message -->
      <div style="margin-bottom: 24px;">
        <h3 style="color: #1D2A41; font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; display: flex; align-items: center;">
          💬 Message
        </h3>
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${message}</p>
        </div>
      </div>
      
      <!-- Reply Button -->
      <div style="text-align: center; margin-top: 28px;">
        <a href="mailto:${email}?subject=Re: ${subjectLine}" style="display: inline-block; background: linear-gradient(135deg, #62C2FF 0%, #1D8FFF 100%); color: #ffffff; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(29, 143, 255, 0.35);">
          ↩️ Répondre à ${name}
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #1D2A41; border-radius: 0 0 16px 16px; padding: 24px; text-align: center;">
      <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
        Ce message a été envoyé via le formulaire de contact de
        <a href="https://kareer-edu.com" style="color: #62C2FF; text-decoration: none; font-weight: 600;">Kareer</a>
      </p>
      <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 8px 0 0 0;">
        © ${new Date().getFullYear()} Kareer - Votre Assistant de Carrière Alimenté par l'IA
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Kareer Contact <contact@kareer-edu.com>",
        to: [
          "tristan@kareer-edu.com",
          "vbaroux0@gmail.com",
          "clement@kareer-edu.com",
          "loic@kareer-edu.com"
        ],
        reply_to: email,
        subject: subjectLine,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'envoi de l'email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email envoyé avec succès" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


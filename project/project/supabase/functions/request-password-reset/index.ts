// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists and get their language
    const { data: userData, error: userError } = await supabase
      .from("students")
      .select("email, full_name, school_id, schools(language)")
      .eq("email", email.toLowerCase())
      .single();

    let userInfo = userData;
    let language = "en";

    // If not found in students, check school_admins
    if (!userInfo) {
      const { data: adminData } = await supabase
        .from("school_admins")
        .select("email, full_name, school_id, schools(language)")
        .eq("email", email.toLowerCase())
        .single();
      userInfo = adminData;
    }

    // If not found in school_admins, check coaches
    if (!userInfo) {
      const { data: coachData } = await supabase
        .from("coaches")
        .select("email, full_name, school_id, schools(language)")
        .eq("email", email.toLowerCase())
        .single();
      userInfo = coachData;
    }

    // If not found in coaches, check super_admins (default to English)
    if (!userInfo) {
      const { data: superAdminData } = await supabase
        .from("super_admins")
        .select("email, full_name")
        .eq("email", email.toLowerCase())
        .single();
      if (superAdminData) {
        userInfo = { ...superAdminData, schools: { language: "en" } };
      }
    }

    // Always return success (security: don't reveal if email exists)
    if (!userInfo) {
      return new Response(
        JSON.stringify({ success: true, message: "Si cet email existe, un code a été envoyé." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get language from school
    language = userInfo.schools?.language || "en";
    const userName = userInfo.full_name || "Utilisateur";

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing codes for this email
    await supabase.from("password_resets").delete().eq("email", email.toLowerCase());

    // Insert new code
    const { error: insertError } = await supabase.from("password_resets").insert({
      email: email.toLowerCase(),
      code,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Erreur lors de la création du code");
    }

    // Send email via Resend
    const emailHtml = getEmailTemplate(userName, code, language);
    const emailSubject = language === "fr" 
      ? "Réinitialisation de votre mot de passe Kareer" 
      : "Reset your Kareer password";

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Kareer <noreply@kareer-edu.com>",
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend error:", errorData);
      throw new Error("Erreur lors de l'envoi de l'email");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Code envoyé avec succès" }),
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

function getEmailTemplate(userName: string, code: string, language: string): string {
  // Template will be added in the next edit due to size
  return language === "fr" ? getEmailTemplateFR(userName, code) : getEmailTemplateEN(userName, code);
}

function getEmailTemplateFR(userName: string, code: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin:0;padding:0;font-family:'Open Sans',Arial,sans-serif;background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header with gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#1D2A41 0%,#2a3f5f 50%,#62C2FF 100%);padding:40px 30px;text-align:center;">
              <h1 style="margin:0;font-family:'Montserrat',Arial,sans-serif;font-size:32px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;">KAREER</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Plateforme de développement de carrière</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="margin:0 0 20px;font-family:'Montserrat',Arial,sans-serif;font-size:24px;color:#1D2A41;">Bonjour ${userName} 👋</h2>
              <p style="margin:0 0 25px;color:#555555;font-size:16px;line-height:1.6;">Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code de vérification :</p>
              <!-- Code Box -->
              <div style="background:linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%);border-radius:12px;padding:30px;text-align:center;margin:25px 0;border:2px solid #62C2FF;">
                <p style="margin:0 0 10px;color:#64748b;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Votre code de vérification</p>
                <div style="font-family:'Montserrat',monospace;font-size:42px;font-weight:700;color:#1D2A41;letter-spacing:8px;">${code}</div>
              </div>
              <!-- Warning -->
              <div style="background:#fef3c7;border-radius:8px;padding:15px;margin:25px 0;border-left:4px solid #f59e0b;">
                <p style="margin:0;color:#92400e;font-size:14px;">⏱️ <strong>Ce code expire dans 15 minutes.</strong></p>
              </div>
              <p style="margin:25px 0 0;color:#555555;font-size:16px;line-height:1.6;">Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:25px 30px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:13px;">© 2024 Kareer. Tous droits réservés.</p>
              <p style="margin:10px 0 0;color:#94a3b8;font-size:12px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getEmailTemplateEN(userName: string, code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;font-family:'Open Sans',Arial,sans-serif;background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header with gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#1D2A41 0%,#2a3f5f 50%,#62C2FF 100%);padding:40px 30px;text-align:center;">
              <h1 style="margin:0;font-family:'Montserrat',Arial,sans-serif;font-size:32px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;">KAREER</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Career Development Platform</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="margin:0 0 20px;font-family:'Montserrat',Arial,sans-serif;font-size:24px;color:#1D2A41;">Hello ${userName} 👋</h2>
              <p style="margin:0 0 25px;color:#555555;font-size:16px;line-height:1.6;">You have requested to reset your password. Here is your verification code:</p>
              <!-- Code Box -->
              <div style="background:linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%);border-radius:12px;padding:30px;text-align:center;margin:25px 0;border:2px solid #62C2FF;">
                <p style="margin:0 0 10px;color:#64748b;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Your verification code</p>
                <div style="font-family:'Montserrat',monospace;font-size:42px;font-weight:700;color:#1D2A41;letter-spacing:8px;">${code}</div>
              </div>
              <!-- Warning -->
              <div style="background:#fef3c7;border-radius:8px;padding:15px;margin:25px 0;border-left:4px solid #f59e0b;">
                <p style="margin:0;color:#92400e;font-size:14px;">⏱️ <strong>This code expires in 15 minutes.</strong></p>
              </div>
              <p style="margin:25px 0 0;color:#555555;font-size:16px;line-height:1.6;">If you did not request this reset, simply ignore this email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:25px 30px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:13px;">© 2024 Kareer. All rights reserved.</p>
              <p style="margin:10px 0 0;color:#94a3b8;font-size:12px;">This email was sent automatically, please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


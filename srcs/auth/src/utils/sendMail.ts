import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_TOKEN,
  },
});

export async function sendRealEmail(to: string, code: string) {
  try {
    const info = await transporter.sendMail({
      from: `Transcendance <${process.env.EMAIL_FROM}>`,
      to,
      subject: "🔐 Code de connexion Transcendance",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                          🎮 Transcendance
                        </h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                          Connexion sécurisée
                        </h2>
                        <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                          Voici ton code de vérification à deux facteurs pour te connecter à Transcendance :
                        </p>

                        <!-- Code Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                          <tr>
                            <td align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 30px;">
                              <div style="background-color: rgba(255, 255, 255, 0.95); border-radius: 6px; padding: 20px 40px; display: inline-block;">
                                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
                                  ${code}
                                </span>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                          ⏱️ <strong>Ce code est valable 5 minutes.</strong>
                        </p>
                        <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.6;">
                          Si tu n'as pas demandé ce code, ignore simplement cet email.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                          © 2025 Transcendance · Plateforme de gaming sécurisée
                        </p>
                        <p style="margin: 0; color: #cccccc; font-size: 11px;">
                          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });
    console.log("Email envoyé ✅ :", info.messageId);

  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email :", error);
    throw new Error("Failed to send 2FA email");
  }

}